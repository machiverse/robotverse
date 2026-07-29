import { createFileRoute } from "@tanstack/react-router";
import CityRobots from "@/pages/landing/CityRobots";

export const Route = createFileRoute("/robots/city/$city")({
  component: CityRobots,
});
