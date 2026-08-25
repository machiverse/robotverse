import { useRef, useState } from "react";
import heroPoster from "@/assets/industrial-robot-hero.jpg";

/** Looping industrial robot footage with poster fallback. */
const RobotArmStage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl lg:rounded-none">
      {!videoFailed ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={heroPoster}
          onError={() => setVideoFailed(true)}
          className="h-full w-full object-cover"
        >
          <source
            src="https://videos.pexels.com/video-files/5532767/5532767-hd_1920_1080_25fps.mp4"
            type="video/mp4"
          />
          <source
            src="https://videos.pexels.com/video-files/5532767/5532767-sd_640_360_25fps.mp4"
            type="video/mp4"
          />
        </video>
      ) : (
        <img
          src={heroPoster}
          alt="Industrial robot arm working on a manufacturing line"
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Gradient overlays keep the hero copy readable */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent"
      />
    </div>
  );
};

export default RobotArmStage;
