import { createFileRoute } from "@tanstack/react-router";
import FinancingDetails from "@/pages/FinancingDetails";

export const Route = createFileRoute("/financing/$id")({
  component: FinancingDetails,
});
