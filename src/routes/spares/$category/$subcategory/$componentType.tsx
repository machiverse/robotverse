import { createFileRoute } from "@tanstack/react-router";
import Parts from "@/pages/Parts";

export const Route = createFileRoute("/spares/$category/$subcategory/$componentType")({
  component: Parts,
});
