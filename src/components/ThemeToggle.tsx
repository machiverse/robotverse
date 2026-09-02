import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const CROSSFADE =
  "opacity 150ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.4,0,0.2,1)";

/** 36px ghost icon button. Icon swap is an opacity + scale crossfade only. */
const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-[background-color,color] duration-150 hover:bg-accent hover:text-foreground active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      <Sun
        aria-hidden="true"
        className="absolute h-[18px] w-[18px]"
        style={{
          transition: CROSSFADE,
          opacity: isDark ? 1 : 0,
          transform: isDark ? "scale(1)" : "scale(0.96)",
        }}
      />
      <Moon
        aria-hidden="true"
        className="absolute h-[18px] w-[18px]"
        style={{
          transition: CROSSFADE,
          opacity: isDark ? 0 : 1,
          transform: isDark ? "scale(0.96)" : "scale(1)",
        }}
      />
    </button>
  );
};

export default ThemeToggle;
