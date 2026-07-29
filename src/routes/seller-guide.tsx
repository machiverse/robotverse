import { createFileRoute } from "@tanstack/react-router";
import SellerGuide from "@/pages/SellerGuide";

export const Route = createFileRoute("/seller-guide")({
  component: SellerGuide,
});
