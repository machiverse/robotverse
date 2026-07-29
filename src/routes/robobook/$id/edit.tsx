import { createFileRoute } from "@tanstack/react-router";
import BlogEditor from "@/pages/BlogEditor";

export const Route = createFileRoute("/robobook/$id/edit")({
  component: BlogEditor,
});
