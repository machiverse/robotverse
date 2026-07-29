import { createFileRoute } from "@tanstack/react-router";
import Robots from "@/pages/Robots";

export const Route = createFileRoute("/robots/")({
  component: Robots,
});
