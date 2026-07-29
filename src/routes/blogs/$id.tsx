import { createFileRoute } from "@tanstack/react-router";
import BlogDetails from "@/pages/BlogDetails";

export const Route = createFileRoute("/blogs/$id")({
  component: BlogDetails,
});
