import { createFileRoute } from "@tanstack/react-router";
import ServicesManagement from "@/pages/dashboard/ServicesManagement";

export const Route = createFileRoute("/dashboard/services")({
  component: ServicesManagement,
});
