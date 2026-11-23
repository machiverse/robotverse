import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { processesFromSkills } from "@/utils/processAnalyzer";
import { createSimulation } from "./robotSim.js";
import { planLine } from "./robotKnowledge";
import { CINEMATIC_POST } from "./cinematicPost";

/**
 * A running robot line with no controls around it: the still on a landing page, brought to life.
 * The camera circles slowly (it holds still for people who prefer less motion) until the visitor drags it.
 */
export default function LiveCell({
  jobs,
  camera,
  className,
}: {
  /** Builder job names, in line order, e.g. ["MIG/MAG Welding", "Palletizing"]. */
  jobs: string[];
  /** Opening shot: camera position and the point it looks at, in metres. */
  camera?: { position: [number, number, number]; target: [number, number, number] };
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const key = jobs.join("|");

  useEffect(() => {
    if (!stageRef.current) return;
    const sim = createSimulation({ THREE, OrbitControls, RoomEnvironment, post: CINEMATIC_POST, container: stageRef.current });
    const procs = processesFromSkills(jobs);
    const plan = planLine(procs.length ? procs : jobs.map((name) => ({ name })), "balanced");
    sim.setPlan(plan.sim);
    sim.setFencing(false);
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    sim.setView(calm ? "iso" : "cinematic");
    if (camera) sim.setCamera(camera.position, camera.target, !calm);
    sim.play();
    return () => sim.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={stageRef} className={className} />;
}
