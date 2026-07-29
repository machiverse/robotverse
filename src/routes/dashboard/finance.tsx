import { createFileRoute } from "@tanstack/react-router";
import Finance from "@/pages/dashboard/Finance";

export const Route = createFileRoute("/dashboard/finance")({
  component: Finance,
});
