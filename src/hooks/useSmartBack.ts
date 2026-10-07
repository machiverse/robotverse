import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Section pages a "back" can always land on. */
const SECTIONS = new Set([
  "/robots", "/parts", "/services", "/logistics", "/financing", "/robobook", "/community", "/blogs",
  "/dashboard", "/robot-talent", "/automation-studio", "/auctions", "/directory", "/whatsapp-bot", "/marketplace/robots",
]);

/** The page one level up: /robots/123 → /robots, /dashboard/robots → /dashboard, /dashboard → /. */
export function parentPath(pathname: string): string {
  // Sections whose detail pages live under another address.
  if (pathname.startsWith("/spares/")) return "/parts";
  if (pathname.startsWith("/blog/") || pathname.startsWith("/community/")) return "/robobook";
  if (pathname.startsWith("/compare/")) return "/robots";
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  while (parts.length > 1) {
    parts.pop();
    const p = `/${parts.join("/")}`;
    if (SECTIONS.has(p)) return p;
  }
  return "/";
}

/** True when there is an earlier page of this site in the tab's history. */
export const canGoBackInApp = () => {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" && idx > 0;
};

/**
 * Back that never leaves RobotVerse: the previous page when the visitor came from inside the site,
 * otherwise the parent page (or the given fallback). Works the same in the browser and the installed app.
 */
export function useSmartBack(fallback?: string) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(() => {
    if (canGoBackInApp()) navigate(-1);
    else navigate(fallback ?? parentPath(pathname), { replace: true });
  }, [navigate, pathname, fallback]);
}
