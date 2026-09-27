import { Bot, MoveHorizontal, Wrench } from "lucide-react";
import type { CatalogItem, CatalogKind } from "./directoryTypes";

const ICONS = { robots: Bot, tools: Wrench, axes: MoveHorizontal } as const;

// Placeholder visual until RobotVerse / OEM-approved product photos are added.
const ItemImage = ({ kind, item, large = false }: { kind: CatalogKind; item: CatalogItem; large?: boolean }) => {
  const Icon = ICONS[kind];
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 to-primary/15 text-primary"
      role="img"
      aria-label={`${item.n}`}
    >
      <Icon className={large ? "h-16 w-16" : "h-10 w-10"} strokeWidth={1.5} />
      <span className={`font-semibold uppercase tracking-wide text-foreground/70 ${large ? "text-sm" : "text-[11px]"}`}>
        {item.b}
      </span>
    </div>
  );
};

export default ItemImage;
