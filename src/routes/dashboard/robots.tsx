import { createFileRoute } from "@tanstack/react-router";
import MyRobots from "@/pages/dashboard/MyRobots";

export const Route = createFileRoute("/dashboard/robots")({
  component: MyRobots,
});
