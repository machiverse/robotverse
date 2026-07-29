import { createFileRoute } from "@tanstack/react-router";
import RobotDetails from "@/pages/RobotDetails";

export const Route = createFileRoute("/robots/$id")({
  component: RobotDetails,
});
