import { createFileRoute } from "@tanstack/react-router";
import BuyerGuide from "@/pages/BuyerGuide";

export const Route = createFileRoute("/buyer-guide")({
  component: BuyerGuide,
});
