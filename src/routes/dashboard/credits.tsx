import { createFileRoute } from "@tanstack/react-router";
import Credits from "@/pages/dashboard/Credits";

export const Route = createFileRoute("/dashboard/credits")({
  component: Credits,
});
