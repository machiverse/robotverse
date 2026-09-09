import logo from "@/assets/robotverse-logo.png.asset.json";
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
      <img
        src={logo.url}
        alt="RobotVerse"
        width={dimension}
        height={dimension}
        loading="eager"
        decoding="async"
        className={cn("block shrink-0 object-contain", sizeClasses[size])}
      />
      {variant === "full" && (
        <span className="relative top-px hidden min-[400px]:flex flex-col whitespace-nowrap">
          <span className="text-base font-semibold tracking-[-0.01em] text-foreground">RobotVerse</span>
          <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Industrial Robotics Marketplace
          </span>
        </span>
      )}
    </span>
  );
};

export default BrandLogo;