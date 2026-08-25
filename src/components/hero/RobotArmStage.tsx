import { useEffect, useMemo, useState } from "react";
import heroPoster from "@/assets/industrial-robot-hero.jpg";

interface Slide {
  label: string;
  hd: string;
  sd: string;
}

const SLIDES: Slide[] = [
  {
    label: "Industrial robot welding cell in operation",
    hd: "https://videos.pexels.com/video-files/5532767/5532767-hd_1920_1080_25fps.mp4",
    sd: "https://videos.pexels.com/video-files/5532767/5532767-sd_640_360_25fps.mp4",
  },
  {
    label: "Robotic assembly station",
    hd: "https://videos.pexels.com/video-files/5532771/5532771-hd_1920_1080_25fps.mp4",
    sd: "https://videos.pexels.com/video-files/5532771/5532771-sd_640_360_25fps.mp4",
  },
  {
    label: "Automated factory production line",
    hd: "https://videos.pexels.com/video-files/8721926/8721926-hd_1920_1080_25fps.mp4",
    sd: "https://videos.pexels.com/video-files/8721926/8721926-sd_640_360_25fps.mp4",
  },
  {
    label: "Six-axis industrial robot arm at work",
    hd: "https://videos.pexels.com/video-files/6153054/6153054-hd_1920_1080_25fps.mp4",
    sd: "https://videos.pexels.com/video-files/6153054/6153054-sd_640_360_25fps.mp4",
  },
];

const INTERVAL = 8000;

/** Auto-cycling hero slider of industrial robot footage; falls back to the poster image. */
const RobotArmStage = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  /** Phones / reduced-motion users get a still-image slider instead of video. */
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
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl lg:rounded-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, index) => {
        const active = index === current;
        const useVideo = !stillsOnly && !failed[index];
        return (
          <div
            key={slide.hd}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              active ? "opacity-100" : "opacity-0"
            }`}
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
                <source src={slide.hd} type="video/mp4" />
                <source src={slide.sd} type="video/mp4" />
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

      {/* Overlays sit above every slide so the hero copy stays readable */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 to-transparent"
      />

      {/* Navigation dots */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.hd}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`Show slide ${index + 1}: ${slide.label}`}
            aria-current={index === current}
            className={`h-2 w-2 rounded-full transition-all ${
              index === current
                ? "w-5 bg-primary-foreground"
                : "bg-primary-foreground/40 hover:bg-primary-foreground/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default RobotArmStage;
