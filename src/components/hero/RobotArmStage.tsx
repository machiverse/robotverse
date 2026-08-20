import React, { Component, Suspense, lazy, useEffect, useState } from "react";
import heroPoster from "@/assets/industrial-robot-hero.jpg";

const RobotArm3D = lazy(() => import("@/components/hero/RobotArm3D"));

const Poster = () => (
  <img
    src={heroPoster}
    alt="Six-axis industrial robot arm"
    className="h-full w-full object-cover opacity-40"
    loading="lazy"
    decoding="async"
  />
);

class CanvasBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("RobotArm3D failed, falling back to poster:", error);
  }
  render() {
    return this.state.failed ? <Poster /> : this.props.children;
  }
}

const supports3D = () => {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    // Small screens get the static poster — no WebGL cost on phones.
    if (window.innerWidth < 768) return false;
    const cores = navigator.hardwareConcurrency;
    if (typeof cores === "number" && cores <= 4) return false;
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
};

/** Lazily mounts the 3D arm; degrades to a static poster whenever it shouldn't run. */
const RobotArmStage = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(supports3D());
  }, []);

  if (!enabled) return <Poster />;

  return (
    <CanvasBoundary>
      <Suspense fallback={<Poster />}>
        <RobotArm3D />
      </Suspense>
    </CanvasBoundary>
  );
};

export default RobotArmStage;
