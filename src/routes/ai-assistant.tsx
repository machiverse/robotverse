import { createFileRoute } from "@tanstack/react-router";
import AIAssistant from "@/pages/AIAssistant";

export const Route = createFileRoute("/ai-assistant")({
  component: AIAssistant,
});
