import { createFileRoute } from "@tanstack/react-router";
import CategoryParts from "@/pages/landing/CategoryParts";

export const Route = createFileRoute("/parts/category/$cat")({
  component: CategoryParts,
});
