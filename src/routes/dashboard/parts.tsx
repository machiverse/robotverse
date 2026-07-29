import { createFileRoute } from "@tanstack/react-router";
import PartsManagement from "@/pages/dashboard/PartsManagement";

export const Route = createFileRoute("/dashboard/parts")({
  component: PartsManagement,
});
