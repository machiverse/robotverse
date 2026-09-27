import { useState } from "react";
import { Bot, MoveHorizontal, Wrench } from "lucide-react";
import { imageCandidates, type CatalogItem, type CatalogKind } from "./directoryTypes";

const ICONS = { robots: Bot, tools: Wrench, axes: MoveHorizontal } as const;

interface Props {
  kind: CatalogKind;
  item: CatalogItem;
  photo?: string;
  large?: boolean;
}

// Shows the real OEM photo when one is set, otherwise the product render,
// and finally a branded icon if no image loads.
const ItemImage = ({ kind, item, photo, large = false }: Props) => {
  const candidates = imageCandidates(kind, item, photo, large);
  const [index, setIndex] = useState(0);
  const src = candidates[index];

  if (!src) {
    const Icon = ICONS[kind];
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 to-primary/15 text-primary"
        role="img"
        aria-label={item.n}
      >
        <Icon className={large ? "h-16 w-16" : "h-10 w-10"} strokeWidth={1.5} />
        <span className={`font-semibold uppercase tracking-wide text-foreground/70 ${large ? "text-sm" : "text-[11px]"}`}>
          {item.b}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-white p-3">
      <img
        src={src}
        alt={item.n}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setIndex((i) => i + 1)}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
};

export default ItemImage;
