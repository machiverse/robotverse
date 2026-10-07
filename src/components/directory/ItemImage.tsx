import { useEffect, useState } from "react";
import { Bot, MoveHorizontal, Wrench } from "lucide-react";
import { imageFunctionUrl, storedImageUrl, type CatalogItem, type CatalogKind, type Photo } from "./directoryTypes";

const ICONS = { robots: Bot, tools: Wrench, axes: MoveHorizontal } as const;
const INTERVAL = 3500;

interface Props {
  kind: CatalogKind;
  item: CatalogItem;
  photo?: Photo;
  large?: boolean;
}

/** One slide: tries its sources in order and reports when none of them load. */
const Slide = ({ srcs, alt, visible, onFail }: { srcs: string[]; alt: string; visible: boolean; onFail: () => void }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [srcs[0]]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (index >= srcs.length) onFail();
  }, [index, srcs.length, onFail]);
  const src = srcs[index];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setIndex((i) => i + 1)}
      className={`absolute inset-0 m-auto max-h-full max-w-full object-contain p-3 transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
      aria-hidden={!visible}
    />
  );
};

// Shows the real photo and the product render as a small slideshow when both exist,
// otherwise whichever one loads, and finally a branded icon.
const ItemImage = ({ kind, item, photo, large = false }: Props) => {
  const photoSrc = photo ? (large ? photo.img : photo.sm || photo.img) : "";
  const render = [storedImageUrl(kind, item.id, !large), imageFunctionUrl(kind, item, !large)];
  const slides = [...(photoSrc ? [{ key: "photo", srcs: [photoSrc] }] : []), { key: "render", srcs: render }];

  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    setFailed({});
    setActive(0);
  }, [photoSrc, item.id]);

  const live = slides.filter((s) => !failed[s.key]);
  const current = live.length ? live[active % live.length].key : "";

  useEffect(() => {
    if (live.length < 2 || paused) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => a + 1), INTERVAL);
    return () => clearInterval(t);
  }, [live.length, paused]);

  if (!live.length) {
    const Icon = ICONS[kind];
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 to-primary/15 text-primary"
        role="img"
        aria-label={item.n}
      >
        <Icon className={large ? "h-16 w-16" : "h-10 w-10"} strokeWidth={1.5} />
        <span className={`font-semibold uppercase tracking-wide text-foreground/70 ${large ? "text-sm" : "text-[11px]"}`}>{item.b}</span>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {live.map((s) => (
        <Slide
          key={s.key}
          srcs={s.srcs}
          alt={item.n}
          visible={s.key === current}
          onFail={() => setFailed((f) => (f[s.key] ? f : { ...f, [s.key]: true }))}
        />
      ))}
      {live.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1.5" role="tablist" aria-label="Images">
          {live.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={s.key === current}
              aria-label={s.key === "photo" ? "Real photo" : "Product image"}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActive(i);
              }}
              className={`h-1.5 rounded-full transition-all ${s.key === current ? "w-4 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemImage;
