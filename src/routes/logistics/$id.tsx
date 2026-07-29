import { createFileRoute } from "@tanstack/react-router";
import LogisticsDetails from "@/pages/LogisticsDetails";

export const Route = createFileRoute("/logistics/$id")({
  component: LogisticsDetails,
});
