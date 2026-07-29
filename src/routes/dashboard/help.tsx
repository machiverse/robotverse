import { createFileRoute } from "@tanstack/react-router";
import Help from "@/pages/dashboard/Help";

export const Route = createFileRoute("/dashboard/help")({
  component: Help,
});
