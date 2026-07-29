import { createFileRoute } from "@tanstack/react-router";
import BrandRobots from "@/pages/landing/BrandRobots";

export const Route = createFileRoute("/robots/brand/$brand")({
  component: BrandRobots,
});
