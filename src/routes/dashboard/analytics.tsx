import { createFileRoute } from "@tanstack/react-router";
import Analytics from "@/pages/dashboard/Analytics";

export const Route = createFileRoute("/dashboard/analytics")({
  component: Analytics,
});
