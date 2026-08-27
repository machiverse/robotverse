import { useMemo } from "react";

const SPARK_COUNT = 26;

interface HeroWeldSparksProps {
  /** Visible only while the welding slide is active. */
  active: boolean;
}

/**
 * CSS-only weld spatter shower over the right half of the hero, tied to the
 * welding photograph so the still frame reads as live.
 */
const HeroWeldSparks = ({ active }: HeroWeldSparksProps) => {
  const sparks = useMemo(
    () =>
      Array.from({ length: SPARK_COUNT }, () => ({
        left: 52 + Math.random() * 44,
        top: 30 + Math.random() * 40,
        size: 2 + Math.random() * 3,
        x: 40 + Math.random() * 140,
        y: 90 + Math.random() * 190,
        dur: 1.5 + Math.random() * 1.5,
        delay: Math.random() * 3,
        opacity: 0.4 + Math.random() * 0.45,
      })),
    [],
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[14] hidden overflow-hidden md:block"
      style={{ opacity: active ? 1 : 0, transition: "opacity 900ms ease" }}
    >
      {sparks.map((s, i) => (
        <span
          key={i}
          className="rv-spark absolute rounded-full mix-blend-screen"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              background:
                "radial-gradient(circle, #FFC24A 0%, rgba(255,194,74,0.65) 45%, rgba(255,194,74,0) 100%)",
              "--rv-spark-x": `${s.x}px`,
              "--rv-spark-y": `${s.y}px`,
              "--rv-spark-dur": `${s.dur}s`,
              "--rv-spark-delay": `${s.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default HeroWeldSparks;
