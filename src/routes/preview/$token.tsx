import { createFileRoute } from "@tanstack/react-router";
import PostPreview from "@/pages/PostPreview";

export const Route = createFileRoute("/preview/$token")({
  component: PostPreview,
});
