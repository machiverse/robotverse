import { createFileRoute } from "@tanstack/react-router";
import Quotations from "@/pages/dashboard/Quotations";

export const Route = createFileRoute("/dashboard/quotations")({
  component: Quotations,
});
