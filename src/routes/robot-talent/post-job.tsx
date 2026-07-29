import { createFileRoute } from "@tanstack/react-router";
import TalentPostJob from "@/pages/TalentPostJob";

export const Route = createFileRoute("/robot-talent/post-job")({
  component: TalentPostJob,
});
