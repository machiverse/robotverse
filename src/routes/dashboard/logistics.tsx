import { createFileRoute } from "@tanstack/react-router";
import LogisticsDashboard from "@/pages/dashboard/Logistics";

export const Route = createFileRoute("/dashboard/logistics")({
  component: LogisticsDashboard,
});
