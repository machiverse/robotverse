import { useEffect, useMemo, useState } from "react";
import heroPoster from "@/assets/industrial-robot-hero.jpg";

interface Slide {
  label: string;
  src: string;
}

const SLIDES: Slide[] = [
  {
    label: "Industrial robot welding cell in operation",
    src: "https://videos.pexels.com/video-files/5532767/5532767-hd_1920_1080_25fps.mp4",
  },
  {
    label: "Robotic assembly station",
    src: "https://videos.pexels.com/video-files/5532771/5532771-hd_1920_1080_25fps.mp4",
  },
  {
    label: "Automated factory production line",
    src: "https://videos.pexels.com/video-files/8721926/8721926-hd_1920_1080_25fps.mp4",
  },
  {
    label: "Six-axis industrial robot arm at work",
    src: "https://videos.pexels.com/video-files/6153054/6153054-hd_1920_1080_25fps.mp4",
  },
];

const INTERVAL = 8000;

/**
 * Full-bleed cinematic video slider used as the hero background.
 * Crossfades between slides; degrades to poster stills on mobile / reduced motion.
 */
const HeroVideoSlider = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const stillsOnly = useMemo(() => {
    if (typeof window === "undefined") return true;
    return (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.innerWidth < 768
    );
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(
      () => setCurrent((i) => (i + 1) % SLIDES.length),
      INTERVAL
    );
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <>
      <div className="absolute inset-0 z-0 overflow-hidden">
        {SLIDES.map((slide, index) => {
          const active = index === current;
          const useVideo = !stillsOnly && !failed[index];
          return (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-1500 ${
                active ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDuration: "1500ms" }}
              aria-hidden={!active}
            >
              {useVideo ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload={index === 0 ? "auto" : "metadata"}
                  poster={heroPoster}
                  onError={() => setFailed((f) => ({ ...f, [index]: true }))}
                  className="h-full w-full object-cover"
                >
                  <source src={slide.src} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={heroPoster}
                  alt={slide.label}
                  className="h-full w-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation dots */}
      <div
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`Show slide ${index + 1}: ${slide.label}`}
            aria-current={index === current}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === current ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </>
  );
};

export default HeroVideoSlider;
