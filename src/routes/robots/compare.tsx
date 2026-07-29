import { createFileRoute } from "@tanstack/react-router";
import RobotComparison from "@/pages/RobotComparison";

export const Route = createFileRoute("/robots/compare")({
  component: RobotComparison,
});
