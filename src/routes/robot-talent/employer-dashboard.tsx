import { createFileRoute } from "@tanstack/react-router";
import TalentEmployerDashboard from "@/pages/TalentEmployerDashboard";

export const Route = createFileRoute("/robot-talent/employer-dashboard")({
  component: TalentEmployerDashboard,
});
