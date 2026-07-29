import { createFileRoute } from "@tanstack/react-router";
import UsedBrandRobots from "@/pages/landing/UsedBrandRobots";

export const Route = createFileRoute("/robots/$brand/used")({
  component: UsedBrandRobots,
});
