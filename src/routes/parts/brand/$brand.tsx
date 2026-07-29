import { createFileRoute } from "@tanstack/react-router";
import BrandParts from "@/pages/landing/BrandParts";

export const Route = createFileRoute("/parts/brand/$brand")({
  component: BrandParts,
});
