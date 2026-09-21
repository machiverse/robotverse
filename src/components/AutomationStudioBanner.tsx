import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const DISMISS_KEY = "rv_automation_studio_banner_dismissed";

const AutomationStudioBanner = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore storage failures */
    }
  };

  if (!visible) return null;

  const message = user
    ? "Automation Studio — Design your automation now"
    : "Try Automation Studio — Upload your process, get robot recommendations instantly";

  return (
    <div className="relative w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
      <div className="container mx-auto flex min-h-[38px] items-center justify-center gap-2 px-4 py-1.5 pr-10 text-center">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-xs font-medium sm:text-sm">{message}</p>
        <Link
          to="/automation-studio"
          className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-semibold underline-offset-2 transition-opacity duration-150 ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
        >
          Try Now <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss Automation Studio banner"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-opacity duration-150 ease-out hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AutomationStudioBanner;
