import { createFileRoute } from "@tanstack/react-router";
import CRM from "@/pages/CRM";

export const Route = createFileRoute("/crm")({
  component: CRM,
});
