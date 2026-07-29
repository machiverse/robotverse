import { createFileRoute } from "@tanstack/react-router";
import ProfileSettings from "@/pages/ProfileSettings";

export const Route = createFileRoute("/settings")({
  component: ProfileSettings,
});
