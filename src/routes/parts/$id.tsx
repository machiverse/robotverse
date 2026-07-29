import { createFileRoute } from "@tanstack/react-router";
import SparePartDetails from "@/pages/SparePartDetails";

export const Route = createFileRoute("/parts/$id")({
  component: SparePartDetails,
});
