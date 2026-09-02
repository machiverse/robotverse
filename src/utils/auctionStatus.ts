// Single source of truth for auction status derived from server timestamps.
// The persisted `status` column is authoritative for terminal states
// (sold / cancelled / ended after finalization). For live/upcoming we
// always recompute from current time so a stale "Live" never lingers.

export type DerivedAuctionStatus =
  | 'upcoming'
  | 'live'
  | 'ending_soon'
  | 'ended'
  | 'sold'
  | 'cancelled';

interface AuctionLike {
  status: string;
  start_time: string;
  end_time: string;
}

export function getAuctionStatus(a: AuctionLike, now: Date = new Date()): DerivedAuctionStatus {
  // Terminal persisted states win
  if (a.status === 'sold') return 'sold';
  if (a.status === 'cancelled') return 'cancelled';

  const nowMs = now.getTime();
  const start = new Date(a.start_time).getTime();
  const end = new Date(a.end_time).getTime();

  if (nowMs < start) return 'upcoming';
  if (nowMs >= end) return 'ended';

  // Live — flag ending soon (< 1 hour)
  if (end - nowMs < 60 * 60 * 1000) return 'ending_soon';
  return 'live';
}

export function isBiddable(a: AuctionLike, now: Date = new Date()): boolean {
  const s = getAuctionStatus(a, now);
  return s === 'live' || s === 'ending_soon';
}

export const STATUS_LABEL: Record<DerivedAuctionStatus, string> = {
  upcoming: 'Upcoming',
  live: 'Live',
  ending_soon: 'Ending Soon',
  ended: 'Ended',
  sold: 'Sold',
  cancelled: 'Cancelled',
};

export const STATUS_CLASSES: Record<DerivedAuctionStatus, string> = {
  upcoming: 'bg-primary/10 text-primary border-primary/30',
  live: 'bg-success/10 text-success border-success/30',
  ending_soon: 'bg-warning/10 text-warning border-warning/30 animate-pulse',
  ended: 'bg-destructive/10 text-destructive border-destructive/30',
  sold: 'bg-primary/10 text-primary border-primary/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};
