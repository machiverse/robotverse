import { Link, useLocation } from "react-router-dom";
import { Scale, X } from "lucide-react";
import { useRobotComparison } from "@/contexts/RobotComparisonContext";

/**
 * Phones and the app have no room for the header's compare menu, so once a robot is
 * picked for comparison this bar stays at the bottom of the screen with a link to compare.
 */
export default function CompareTray() {
  const { selectedRobots, maxRobots, removeRobot } = useRobotComparison();
  const { pathname } = useLocation();
  if (!selectedRobots.length || pathname.startsWith("/robots/compare") || pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;
  const ready = selectedRobots.length >= 2;
  return (
    <div
      className="fixed inset-x-3 z-40 sm:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)", right: "5.5rem" }}
      role="region"
      aria-label="Robot comparison"
    >
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {selectedRobots.map((r) => (
            <span key={r.id} className="inline-flex max-w-[7.5rem] shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-1 text-[11px]">
              <span className="truncate">{r.name}</span>
              <button type="button" aria-label={`Remove ${r.name} from comparison`} onClick={() => removeRobot(r.id)} className="shrink-0 rounded p-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <Link
          to="/robots/compare"
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold ${ready ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          <Scale className="h-3.5 w-3.5" /> {ready ? "Compare" : `${selectedRobots.length}/${maxRobots}`}
        </Link>
      </div>
    </div>
  );
}
