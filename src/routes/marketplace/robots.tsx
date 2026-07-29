import { createFileRoute } from "@tanstack/react-router";
import Robots from "@/pages/Robots";

export const Route = createFileRoute("/marketplace/robots")({
  component: Robots,
});
