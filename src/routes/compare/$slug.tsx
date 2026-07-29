import { createFileRoute } from "@tanstack/react-router";
import CompareRobots from "@/pages/landing/CompareRobots";

export const Route = createFileRoute("/compare/$slug")({
  component: CompareRobots,
});
