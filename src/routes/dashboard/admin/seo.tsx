import { createFileRoute } from "@tanstack/react-router";
import SEODashboard from "@/pages/dashboard/admin/SEODashboard";

export const Route = createFileRoute("/dashboard/admin/seo")({
  component: SEODashboard,
});
