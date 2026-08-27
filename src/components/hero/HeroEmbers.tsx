import { useEffect, useMemo, useState } from "react";

const EMBER_COUNT = 28;

interface Ember {
  left: number;
  top: number;
  size: number;
  opacity: number;
  dur: number;
  delay: number;
  drift: number;
}

/**
 * Screen-wide ambient ember drift over the hero.
 * Sits above the readability overlays (z-10) but below the copy (z-20).
 * Disabled under reduced motion and below 768px (poster-fallback viewports).
 */
const HeroEmbers = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");
    const update = () => setEnabled(!reduce.matches && wide.matches);
    update();
    reduce.addEventListener("change", update);
    wide.addEventListener("change", update);
    return () => {
      reduce.removeEventListener("change", update);
      wide.removeEventListener("change", update);
    };
  }, []);

  const embers = useMemo<Ember[]>(
    () =>
      Array.from({ length: EMBER_COUNT }, () => ({
        left: 8 + Math.random() * 88,
        top: 20 + Math.random() * 78,
        size: 2 + Math.random() * 3,
        opacity: 0.35 + Math.random() * 0.35,
        dur: 14 + Math.random() * 12,
        delay: Math.random() * 18,
        drift: -(60 + Math.random() * 180),
      })),
    []
  );

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      {embers.map((e, i) => (
        <span
          key={i}
          className="rv-ember absolute rounded-full mix-blend-screen"
          style={
            {
              left: `${e.left}%`,
              top: `${e.top}%`,
              width: `${e.size}px`,
              height: `${e.size}px`,
              opacity: e.opacity,
              background:
                "radial-gradient(circle, #FFC24A 0%, rgba(255,194,74,0.55) 45%, rgba(255,194,74,0) 70%)",
              "--rv-ember-dur": `${e.dur}s`,
              "--rv-ember-delay": `${e.delay}s`,
              "--rv-ember-drift": `${e.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default HeroEmbers;
