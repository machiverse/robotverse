import { createFileRoute } from "@tanstack/react-router";
import Reports from "@/pages/dashboard/Reports";

export const Route = createFileRoute("/dashboard/reports")({
  component: Reports,
});
