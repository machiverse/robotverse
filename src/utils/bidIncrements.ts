// Tiered bid increments (INR). Sellers may override via auction.min_increment.
export function getBidIncrement(currentBid: number): number {
  if (currentBid < 10_000) return 500;
  if (currentBid < 100_000) return 1_000;
  return 5_000;
}

export function getMinNextBid(currentBid: number, startingPrice: number, sellerIncrement?: number): number {
  if (!currentBid || currentBid <= 0) return startingPrice;
  const inc = sellerIncrement && sellerIncrement > 0 ? sellerIncrement : getBidIncrement(currentBid);
  return currentBid + inc;
}
