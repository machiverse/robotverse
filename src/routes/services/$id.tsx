import { createFileRoute } from "@tanstack/react-router";
import ServiceDetails from "@/pages/ServiceDetails";

export const Route = createFileRoute("/services/$id")({
  component: ServiceDetails,
});
