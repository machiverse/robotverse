import { createFileRoute } from "@tanstack/react-router";
import Financing from "@/pages/Financing";

export const Route = createFileRoute("/financing/")({
  component: Financing,
});
