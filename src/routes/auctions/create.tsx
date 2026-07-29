import { createFileRoute } from "@tanstack/react-router";
import CreateAuction from "@/pages/CreateAuction";

export const Route = createFileRoute("/auctions/create")({
  component: CreateAuction,
});
