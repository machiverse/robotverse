import { createFileRoute } from "@tanstack/react-router";
import EditAuction from "@/pages/EditAuction";

export const Route = createFileRoute("/auctions/$id/edit")({
  component: EditAuction,
});
