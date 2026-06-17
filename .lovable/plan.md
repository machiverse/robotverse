
# Auction Platform Overhaul Plan

Comprehensive redesign of the auction workflow covering status automation, security, anti-sniping, analytics, and admin tooling. The existing `auctions`, `auction_bids`, and `auction_watchlist` tables already include most of the fields we need (status enum, `auto_extend_minutes`, `current_highest_bid`, `winner_id`, `winner_notified`, etc.) — so most work is logic, not schema rewrites.

## 1. Database Migration (additive)

Add the missing pieces:

- `auctions.extensions_count int default 0` — track anti-sniping extensions (cap at 3).
- `auctions.original_end_time timestamptz` — populated when first extension happens.
- `auctions.first_bid_at timestamptz` — set by trigger on first bid; used to lock edits.
- `auctions.admin_status text default 'approved'` — `pending | approved | rejected | suspended`.
- `auctions.cancelled_at timestamptz`, `auctions.cancellation_reason text`.
- New enum value `'sold'` on `auction_status` (if missing) plus `'cancelled'`.
- New table `auction_audit_log` (auction_id, actor_id, action, before jsonb, after jsonb, created_at) with RLS — seller can read own, admins read all.
- New table `auction_winners` (auction_id unique, winner_id, winning_bid, finalized_at, seller_notified bool, winner_notified bool).
- Trigger `lock_auction_edits_after_bid()` on `auctions UPDATE` — if `first_bid_at IS NOT NULL`, raise exception when `start_time`, `end_time`, `starting_price`, or `reserve_price` change. Bypass for `service_role` / admin function.
- Trigger `set_first_bid_at()` on `auction_bids INSERT` — sets `auctions.first_bid_at` if null.
- RPC `place_auction_bid(auction_id, amount)` — already exists; rewrite to enforce:
  - auction status='live' AND `now() between start_time and end_time`
  - bidder != seller
  - amount >= `current_highest_bid + min_increment` (or `starting_price` if first bid)
  - apply anti-sniping: if `end_time - now() < 5 min` AND `extensions_count < 3`, extend `end_time += 5 min`, increment counter, set `original_end_time` if null, insert audit row.
  - update `current_highest_bid`, `highest_bidder_id`, `total_bids`, `total_bidders`.
- RPC `finalize_auction(auction_id)` — idempotent. If `now() > end_time` and status != ended/sold: set status to `sold` (winner exists & reserve met) or `ended` (no winner / reserve not met); populate `winner_id`, insert into `auction_winners`, insert notifications for seller + winner.
- Function `finalize_due_auctions()` — selects all auctions where `end_time < now()` and status in ('live','upcoming'), calls `finalize_auction` for each.
- `pg_cron` job: every 1 minute call `finalize_due_auctions()` (uses pg_net to invoke an edge function so notifications go out via existing channels).

## 2. Edge Function: `auction-finalizer`

- Scheduled via pg_cron (every minute).
- Calls `finalize_due_auctions()` then fetches auctions just finalized and sends Zoho SMTP notifications to seller + winner using existing notification pipeline.
- Idempotent: skips already-notified.

## 3. Frontend Status Logic

Single source of truth: `src/utils/auctionStatus.ts`

```ts
export type DerivedStatus = 'upcoming' | 'live' | 'ending_soon' | 'ended' | 'sold' | 'cancelled';
export function getAuctionStatus(a: Auction, now = new Date()): DerivedStatus
```

Rules: compare `now` against `start_time`/`end_time`; respect persisted `sold`/`cancelled`. `ending_soon` when `live` AND end within 1 hour.

Replace direct reads of `auction.status` in `AuctionCard`, `Auctions`, `AuctionDetail`, `MyAuctions`, dashboards with `getAuctionStatus()`. Card already has `AuctionCountdown` — wire its `onComplete` to trigger a React Query invalidation so UI flips to "Ended" without reload.

Status badge colors:
- Upcoming → blue, Live → green, Ending Soon → orange, Ended → red, Sold → purple, Cancelled → gray.

## 4. Auction Detail / Bidding UI

- Disable bid form when derived status != 'live'.
- Show banner "Auction extended due to last-minute bidding" when `extensions_count > 0` (compare original_end_time vs end_time).
- Show winner card when status is `sold`: winner name (own-name if viewer is winner/seller, else masked), winning bid, finalized timestamp.
- Real-time subscription to `auctions` row + `auction_bids` for live updates.

## 5. Create / Edit Auction Forms

`CreateAuction.tsx`:
- Zod schema: required title, category, robot_type, ≥1 image, starting_price > 0, start_time ≥ now (allow 1 min grace), end_time > start_time + 15 min, seller info from profile.
- Submit creates auction with `admin_status='approved'` (no review queue unless user wants it — flag-controlled).

`EditAuction` (new page or modal in MyAuctions):
- Query auction; if `first_bid_at` is set → lock start_time/end_time/starting_price/reserve_price (disabled inputs with tooltip "Locked — bids received").
- Allow description, additional images, product info always (until ended).
- Banner: "Auction parameters cannot be modified after receiving bids."
- After ended/sold/cancelled: read-only.

## 6. Seller Auction Analytics

New tab in seller dashboard `/dashboard/auctions` (extend `MyAuctions`):

Per-auction analytics panel:
- Total views (reuse `item_view_counts` keyed by auction_id), watchlist count (`auction_watchlist`), total_bids, unique bidders, highest bid, time remaining, status.
- Charts via Recharts (already in stack):
  - Daily views (last 14 days) — bar chart
  - Bid activity timeline — line chart of bids over time

## 7. Admin Control Panel

Extend `src/components/admin` with `AuctionAdminPanel.tsx`:
- Tabs: All / Pending / Live / Upcoming / Ended / Sold / Suspended.
- Actions per row (admin role only, via has_role): Approve, Reject, Suspend, End Now, View Bids, View Winner.
- "End Now" calls RPC `admin_end_auction(auction_id)` which forces `end_time = now()` then runs finalize. Bypasses lock trigger via SECURITY DEFINER.
- Suspicious bidding detection: list auctions where same bidder placed >10 bids in <1 min, or unique IP collisions (best-effort via session metadata if available — otherwise flag rapid bid bursts only).
- Metrics tiles: Total / Live / Upcoming / Ended / Sold counts and Total bid value (sum of `current_highest_bid` for sold).

## 8. Bid Increments

Helper `getBidIncrement(currentBid)`:
- < ₹10k → ₹500
- ₹10k–₹1L → ₹1,000
- > ₹1L → ₹5,000

Used both client-side (suggest next bid buttons) and server-side (RPC validates `amount >= currentBid + computedIncrement` OR explicit `min_increment` if seller set custom).

## 9. UI: Listing Cards

Update `AuctionCard.tsx`:
- Show seller name, bid count, current highest bid, countdown, derived status badge (with new colors).
- "Ending Soon" pulse when applicable.

## 10. Timezone

All comparisons in DB use `timestamptz` (already correct). Frontend uses `new Date()` against ISO strings — already timezone-safe. Confirm no `.toLocaleDateString()` truncation when sending to DB; always send ISO.

## Files to Create

- `supabase/migrations/<ts>_auction_overhaul.sql`
- `supabase/functions/auction-finalizer/index.ts`
- `src/utils/auctionStatus.ts`
- `src/utils/bidIncrements.ts`
- `src/components/auction/AuctionStatusBadge.tsx`
- `src/components/auction/AuctionAnalyticsPanel.tsx`
- `src/components/auction/EditAuctionModal.tsx`
- `src/components/admin/AuctionAdminPanel.tsx`
- `src/pages/dashboard/MyAuctions.tsx` (if not present, extend existing)

## Files to Edit

- `src/components/auction/AuctionCard.tsx` — derived status, new badge, seller/bid info.
- `src/components/auction/AuctionCountdown.tsx` — emit onComplete callback.
- `src/hooks/useAuctions.tsx` — invalidate on countdown end, expose `useAuctionAnalytics`.
- `src/pages/AuctionDetail.tsx` — disable bidding past end, extension banner, winner card.
- `src/pages/CreateAuction.tsx` — full Zod validation.
- `src/pages/Auctions.tsx` — derived filtering.
- `src/components/UnifiedDashboard.tsx` / admin routes — add admin panel link.

## Out of Scope (will note for user)

- Payment escrow / checkout flow after `sold` (would need Razorpay integration on top of existing module — call out separately).
- IP-based bid fraud (no IP collection currently); using rapid-bid heuristic instead.

## Rollout Order

1. DB migration (triggers + RPCs + audit log + cron).
2. Edge function for notifications.
3. Status util + badge + card update.
4. Detail page bidding + extension banner.
5. Create/Edit validation & locking.
6. Seller analytics.
7. Admin panel.

Approve to proceed — I'll start with the migration (it requires your review before running).
