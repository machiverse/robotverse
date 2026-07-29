import { createFileRoute } from "@tanstack/react-router";
import RobotTalent from "@/pages/RobotTalent";

export const Route = createFileRoute("/robot-talent/")({
  component: RobotTalent,
});
