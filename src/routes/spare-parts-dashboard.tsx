import { createFileRoute } from "@tanstack/react-router";
import SparePartsSellerDashboard from "@/pages/SparePartsSellerDashboard";

export const Route = createFileRoute("/spare-parts-dashboard")({
  component: SparePartsSellerDashboard,
});
