import { createFileRoute } from "@tanstack/react-router";
import MyRequests from "@/pages/dashboard/MyRequests";

export const Route = createFileRoute("/dashboard/my-requests")({
  component: MyRequests,
});
