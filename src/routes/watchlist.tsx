import { createFileRoute } from "@tanstack/react-router";
import WatchlistDashboard from "@/pages/WatchlistDashboard";

export const Route = createFileRoute("/watchlist")({
  component: WatchlistDashboard,
});
