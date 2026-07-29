import { createFileRoute } from "@tanstack/react-router";
import ApplicationRobots from "@/pages/landing/ApplicationRobots";

export const Route = createFileRoute("/robots/application/$application")({
  component: ApplicationRobots,
});
