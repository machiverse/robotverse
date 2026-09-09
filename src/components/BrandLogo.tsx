import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-transparent.png";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "mark" | "full";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-8 w-8 md:h-9 md:w-9",
  lg: "h-12 w-12",
};

const dimensions = {
  sm: 32,
  md: 36,
  lg: 48,
};

const BrandLogo = ({ size = "md", variant = "full", className }: BrandLogoProps) => {
  const dimension = dimensions[size];

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5", className)}>
      <span className={cn("relative block shrink-0", sizeClasses[size])}>
        <img
          src={logoLight}
          alt="RobotVerse"
          width={dimension}
          height={dimension}
          loading="eager"
          decoding="async"
          className="block h-full w-full object-contain dark:hidden"
        />
        <img
          src={logoDark}
          alt="RobotVerse"
          width={dimension}
          height={dimension}
          loading="eager"
          decoding="async"
          className="hidden h-full w-full object-contain dark:block"
        />
      </span>
      {variant === "full" && (
        <span className="relative top-px hidden whitespace-nowrap text-base font-semibold tracking-[-0.01em] text-foreground min-[400px]:inline">
          RobotVerse
        </span>
      )}
    </span>
  );
};

export default BrandLogo;