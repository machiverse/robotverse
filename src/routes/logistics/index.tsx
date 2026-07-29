import { createFileRoute } from "@tanstack/react-router";
import Logistics from "@/pages/Logistics";

export const Route = createFileRoute("/logistics/")({
  component: Logistics,
});
