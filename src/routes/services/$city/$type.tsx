import { createFileRoute } from "@tanstack/react-router";
import CityServices from "@/pages/landing/CityServices";

export const Route = createFileRoute("/services/$city/$type")({
  component: CityServices,
});
