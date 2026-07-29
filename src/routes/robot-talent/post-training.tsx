import { createFileRoute } from "@tanstack/react-router";
import TalentPostTraining from "@/pages/TalentPostTraining";

export const Route = createFileRoute("/robot-talent/post-training")({
  component: TalentPostTraining,
});
