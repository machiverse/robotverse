import { createFileRoute } from "@tanstack/react-router";
import CommunityPostDetails from "@/pages/CommunityPostDetails";

export const Route = createFileRoute("/robobook/$id/")({
  component: CommunityPostDetails,
});
