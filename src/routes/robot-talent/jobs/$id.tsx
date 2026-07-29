import { createFileRoute } from "@tanstack/react-router";
import TalentJobDetail from "@/pages/TalentJobDetail";

export const Route = createFileRoute("/robot-talent/jobs/$id")({
  component: TalentJobDetail,
});
