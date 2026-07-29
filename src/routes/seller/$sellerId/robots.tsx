import { createFileRoute } from "@tanstack/react-router";
import SellerRobots from "@/pages/SellerRobots";

export const Route = createFileRoute("/seller/$sellerId/robots")({
  component: SellerRobots,
});
