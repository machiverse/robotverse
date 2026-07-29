import { createFileRoute } from "@tanstack/react-router";
import ApiKeys from "@/pages/dashboard/ApiKeys";

export const Route = createFileRoute("/dashboard/api-keys")({
  component: ApiKeys,
});
