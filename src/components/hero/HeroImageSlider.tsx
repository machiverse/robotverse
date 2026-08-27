import { useEffect, useState } from "react";

import heroWelding from "@/assets/hero-welding.jpg";
import heroPickPlace from "@/assets/hero-pick-place.jpg";
import heroPalletizing from "@/assets/hero-palletizing.jpg";
import heroAssembly from "@/assets/hero-assembly.jpg";
import heroMachineTending from "@/assets/hero-machine-tending.jpg";

export const HERO_SLIDES = [
  {
    src: heroWelding,
    alt: "Industrial robot arm performing arc welding on a steel assembly in a factory jig",
  },
  {
    src: heroPickPlace,
    alt: "Six-axis robot arm with a gripper picking a metal component off a moving conveyor belt",
  },
  {
    src: heroPalletizing,
    alt: "Heavy-payload palletizing robot stacking boxes onto a pallet in a warehouse facility",
  },
  {
    src: heroAssembly,
    alt: "Multiple robot arms welding a car body on an automotive assembly line",
  },
  {
    src: heroMachineTending,
    alt: "Robot arm loading a metal part into a CNC machining centre for machine tending",
  },
] as const;

export const HERO_SLIDE_MS = 7000;

interface HeroImageSliderProps {
  /** Active slide index, owned by the hero so overlays can react to it. */
  index: number;
  /** True when rotation/Ken Burns should be disabled. */
  reducedMotion: boolean;
}

const HeroImageSlider = ({ index, reducedMotion }: HeroImageSliderProps) => {
  return (
    <div aria-hidden="false" className="absolute inset-0 z-0 overflow-hidden bg-[#0b1220]">
      {HERO_SLIDES.map((slide, i) => {
        const isActive = reducedMotion ? i === 0 : i === index;
        return (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            width={1920}
            height={1080}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={i === 0 ? "high" : "low"}
            className={`absolute inset-0 h-full w-full object-cover ${
              !reducedMotion && isActive ? (i % 2 === 0 ? "rv-kb-left" : "rv-kb-right") : ""
            }`}
            style={{
              opacity: isActive ? 1 : 0,
              transition: "opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        );
      })}
    </div>
  );
};

/** Hook that drives the slider index with the shared 7s cadence. */
export const useHeroSlides = () => {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(
      () => setIndex((prev) => (prev + 1) % HERO_SLIDES.length),
      HERO_SLIDE_MS,
    );
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  return { index, setIndex, reducedMotion };
};

export default HeroImageSlider;
