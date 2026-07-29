import { createFileRoute } from "@tanstack/react-router";
import Privacy from "@/pages/dashboard/Privacy";

export const Route = createFileRoute("/dashboard/privacy")({
  component: Privacy,
});
