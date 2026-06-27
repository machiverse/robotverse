## Coupon Code Management System

Add a complete seller-managed coupon system to RobotVerse without modifying any existing tables, routes, or UI. All work is additive.

### 1. Database (new migration)

New tables in `public`:

- **`seller_coupons`** — one row per coupon
  - `seller_id` (→ profiles.user_id), `code` (unique per seller, uppercased)
  - `name`, `description`
  - `discount_type` enum (`percentage` | `fixed`)
  - `discount_value`, `min_order_amount`, `max_discount_amount`
  - `start_date`, `expiry_date`
  - `usage_limit`, `usage_limit_per_customer`, `times_used` (counter)
  - `applies_to` enum (`all` | `robots` | `categories` | `brands`)
  - `applicable_robot_ids uuid[]`, `applicable_categories text[]`, `applicable_brands text[]`
  - `is_active boolean`, `admin_disabled boolean` (admin kill-switch)
  - timestamps

- **`coupon_usages`** — audit + enforcement
  - `coupon_id`, `seller_id`, `customer_id`, `robot_id`
  - `original_price`, `discount_amount`, `final_price`
  - `order_reference` (nullable text — links to deal/quote when available)
  - `created_at`

Constraints/indexes: unique `(seller_id, code)`, indexes on `seller_id`, `code`, `(coupon_id, customer_id)`.

**RLS & GRANTs:**
- `seller_coupons`: sellers manage their own rows; `authenticated` can SELECT active non-disabled coupons (needed for validation/badges); admins full access via `is_admin()`.
- `coupon_usages`: customer can insert own usage; seller can read their own coupon usages; admin full read.
- GRANTs set explicitly for `authenticated` + `service_role`.

**RPC `validate_and_apply_coupon(p_code, p_seller_id, p_robot_id, p_order_amount)`** — SECURITY DEFINER. Returns JSON `{ valid, error, discount_amount, final_price, coupon_id }`. Checks: exists, belongs to seller, active, not admin_disabled, within date window, usage_limit, per-customer limit, min_order, applies_to scope. Atomic — does not record usage (only previews).

**RPC `record_coupon_usage(p_coupon_id, p_robot_id, p_original_price, p_order_reference)`** — re-validates, inserts into `coupon_usages`, increments `times_used`.

### 2. Frontend — Seller Dashboard

New tab "Coupons" inside `CommissionSellerDashboard` (and parallel seller dashboards where relevant) — additive only, no existing tab touched.

New component tree under `src/components/coupons/`:
- `SellerCouponsSection.tsx` — list/table view with usage count + total discount given
- `CouponFormDialog.tsx` — create/edit form (zod-validated)
- `CouponUsageDialog.tsx` — list of orders that used the coupon
- `useCoupons.tsx` hook — CRUD + analytics

Actions: create, edit, delete, toggle active, view usages.

### 3. Frontend — Robot Listing & Checkout

- `src/components/coupons/CouponBadge.tsx` — shown on robot cards/detail when at least one valid coupon exists for that robot (queried via a lightweight hook `useRobotCoupons(robotId, sellerId)`). Hidden otherwise.
- `src/components/coupons/AvailableOffersDialog.tsx` — "View Available Offers" listing valid coupons for that robot with one-click copy.
- `src/components/coupons/CouponApplyBox.tsx` — input + Apply button used inside the existing checkout/quote flow. Shows: original price, discount, final price, validation message. Calls `validate_and_apply_coupon` RPC.

Integration points (read-only additions, no layout changes):
- `RobotDetails.tsx` — render `CouponBadge` + "View Available Offers" link in the existing sidebar CTA area.
- The existing quote/checkout modal (`RobotQuoteModal.tsx`) — append `CouponApplyBox` below price summary; on successful apply, pass `final_price` into the quote payload.

### 4. Frontend — Admin Dashboard

New panel `src/components/admin/AdminCouponsPanel.tsx` mounted as a new tab in the existing admin dashboard:
- Search across all coupons (by code, seller, status)
- Toggle `admin_disabled`
- Delete coupon
- Per-seller analytics (count, total discount given, usage)

### 5. Validation rules (shared)

- Code: 3–20 chars, `[A-Z0-9_-]`, auto-uppercased
- `discount_value > 0`; percentage ≤ 100
- `expiry_date > start_date`
- `usage_limit >= 0`, `usage_limit_per_customer >= 0` (0 = unlimited)
- Server enforces all rules via the RPC; client mirrors for UX

### 6. Out of scope / preserved

- No edits to existing tables (`robots`, `profiles`, `deals`, `auctions`, etc.).
- No changes to existing routes, layouts, or styles beyond appending new sections inside existing containers.
- "Orders" linkage uses an optional text `order_reference` since there is no formal orders table — keeps it forward-compatible without schema churn elsewhere.

### Technical sequence

1. Run migration (tables + enums + RPCs + RLS + GRANTs).
2. Generate types (auto after migration approval).
3. Add `useCoupons` hook + shared components.
4. Mount Seller "Coupons" tab.
5. Wire `CouponBadge` + `CouponApplyBox` into robot detail and quote modal.
6. Mount Admin coupons panel.

Approve to proceed with the migration as step 1.
