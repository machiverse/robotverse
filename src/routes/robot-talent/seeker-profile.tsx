import { createFileRoute } from "@tanstack/react-router";
import TalentSeekerProfile from "@/pages/TalentSeekerProfile";

export const Route = createFileRoute("/robot-talent/seeker-profile")({
  component: TalentSeekerProfile,
});
