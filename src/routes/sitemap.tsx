import { createFileRoute } from "@tanstack/react-router";
import Sitemap from "@/pages/Sitemap";

export const Route = createFileRoute("/sitemap")({
  component: Sitemap,
});
