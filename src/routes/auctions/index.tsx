import { createFileRoute } from "@tanstack/react-router";
import Auctions from "@/pages/Auctions";

export const Route = createFileRoute("/auctions/")({
  component: Auctions,
});
