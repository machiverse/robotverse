import { createFileRoute } from "@tanstack/react-router";
import AuctionDetail from "@/pages/AuctionDetail";

export const Route = createFileRoute("/auctions/$id/")({
  component: AuctionDetail,
});
