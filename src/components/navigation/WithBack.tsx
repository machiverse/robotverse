import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { useSmartBack } from "@/hooks/useSmartBack";

/**
 * A slim bar with Back and Home for pages that have no site header (dashboards, tools, 404),
 * so every page can be left without the browser's own back button — important in the installed app.
 */
export default function WithBack({ children, fallback, label }: { children: ReactNode; fallback?: string; label?: string }) {
  const back = useSmartBack(fallback);
  return (
    <>
      <div className="sticky top-0 z-30 flex h-11 items-center gap-1 border-b border-border bg-background/95 px-2 backdrop-blur sm:px-4">
        <button
          type="button"
          onClick={back}
          aria-label="Go back"
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {label && <span className="truncate text-sm text-muted-foreground">· {label}</span>}
        <Link
          to="/"
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-foreground/70 transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Home className="h-4 w-4" /> <span className="hidden sm:inline">RobotVerse home</span>
        </Link>
      </div>
      {children}
    </>
  );
}
