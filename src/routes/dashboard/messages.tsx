import { createFileRoute } from "@tanstack/react-router";
import Messages from "@/pages/dashboard/Messages";

export const Route = createFileRoute("/dashboard/messages")({
  component: Messages,
});
