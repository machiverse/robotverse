import { createFileRoute } from "@tanstack/react-router";
import Parts from "@/pages/Parts";

export const Route = createFileRoute("/marketplace/parts")({
  component: Parts,
});
