import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/pages/dashboard/Settings";

export const Route = createFileRoute("/dashboard/settings")({
  component: Settings,
});
