import { useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh, Points as ThreePoints } from "three";
import * as THREE from "three";
import heroPoster from "@/assets/industrial-robot-hero.jpg";

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Mechanical ease: fast mid-stroke, damped at both ends. */
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(Math.max(t, 0), 1));

interface Pose {
  base: number; // Y sweep
  shoulder: number; // pitch
  elbow: number; // pitch
  wrist: number; // pitch
  grip: number; // 0 open .. 1 closed
}

/** Continuous pick-and-place cycle, durations in seconds. */
const STEPS: Array<{ pose: Pose; dur: number }> = [
  // reach forward + down to the pick point
  { pose: { base: -0.55, shoulder: 0.55, elbow: 1.15, wrist: 0.35, grip: 0 }, dur: 2 },
  // gripper closes
  { pose: { base: -0.55, shoulder: 0.58, elbow: 1.18, wrist: 0.36, grip: 1 }, dur: 0.5 },
  // lift and rotate
  { pose: { base: -0.1, shoulder: 0.05, elbow: 0.7, wrist: 0.1, grip: 1 }, dur: 2 },
  // arc across to the place position
  { pose: { base: 0.85, shoulder: 0.4, elbow: 1.0, wrist: 0.3, grip: 1 }, dur: 1.5 },
  // release
  { pose: { base: 0.85, shoulder: 0.42, elbow: 1.02, wrist: 0.31, grip: 0 }, dur: 0.5 },
  // return home
  { pose: { base: 0, shoulder: -0.12, elbow: 0.6, wrist: 0.05, grip: 0 }, dur: 2 },
];

const CYCLE = STEPS.reduce((s, k) => s + k.dur, 0);

function poseAt(time: number): Pose {
  const t = ((time % CYCLE) + CYCLE) % CYCLE;
  let acc = 0;
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    if (t < acc + step.dur) {
      const from = i === 0 ? STEPS[STEPS.length - 1].pose : STEPS[i - 1].pose;
      const k = ease((t - acc) / step.dur);
      return {
        base: lerp(from.base, step.pose.base, k),
        shoulder: lerp(from.shoulder, step.pose.shoulder, k),
        elbow: lerp(from.elbow, step.pose.elbow, k),
        wrist: lerp(from.wrist, step.pose.wrist, k),
        grip: lerp(from.grip, step.pose.grip, k),
      };
    }
    acc += step.dur;
  }
  return STEPS[STEPS.length - 1].pose;
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

const BODY = "#FFD100"; // FANUC yellow
const DARK_STEEL = "#2a2a2a";
const CHROME = "#444444";

const Link = () => <meshStandardMaterial color={BODY} metalness={0.35} roughness={0.35} />;
const Joint = () => <meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.25} />;
const Steel = () => <meshStandardMaterial color={DARK_STEEL} metalness={0.7} roughness={0.4} />;

/* ------------------------------------------------------------------ */
/* Robot rig                                                           */
/* ------------------------------------------------------------------ */

const RobotArm = () => {
  const baseJoint = useRef<Group>(null);
  const shoulder = useRef<Group>(null);
  const elbow = useRef<Group>(null);
  const wrist = useRef<Group>(null);
  const fingerL = useRef<Mesh>(null);
  const fingerR = useRef<Mesh>(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.1);
    const p = poseAt(clock.current);

    if (baseJoint.current) baseJoint.current.rotation.y = p.base;
    if (shoulder.current) shoulder.current.rotation.z = p.shoulder;
    if (elbow.current) elbow.current.rotation.z = p.elbow;
    if (wrist.current) wrist.current.rotation.z = p.wrist;

    const open = 0.085 - p.grip * 0.05;
    if (fingerL.current) fingerL.current.position.x = -open;
    if (fingerR.current) fingerR.current.position.x = open;
  });

  return (
    <group position={[2.1, -1.4, 0]} scale={0.95}>
      {/* Base pedestal */}
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.85, 0.22, 40]} />
        <Steel />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.55, 0.62, 0.24, 36]} />
        <Steel />
      </mesh>

      {/* J1 — base rotation */}
      <group ref={baseJoint} position={[0, 0.44, 0]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.44, 0.5, 0.36, 32]} />
          <Link />
        </mesh>

        {/* J2 — shoulder */}
        <group ref={shoulder} position={[0, 0.42, 0]}>
          <mesh>
            <sphereGeometry args={[0.3, 28, 28]} />
            <Joint />
          </mesh>
          {/* upper arm */}
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[0.42, 1.5, 0.46]} />
            <Link />
          </mesh>

          {/* J3 — elbow */}
          <group ref={elbow} position={[0, 1.46, 0]}>
            <mesh>
              <sphereGeometry args={[0.24, 24, 24]} />
              <Joint />
            </mesh>
            {/* forearm */}
            <mesh position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[0.3, 1.2, 0.32]} />
              <Link />
            </mesh>

            {/* J4/J5 — wrist */}
            <group ref={wrist} position={[0, 1.2, 0]}>
              <mesh>
                <sphereGeometry args={[0.17, 20, 20]} />
                <Joint />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <boxGeometry args={[0.24, 0.26, 0.24]} />
                <Steel />
              </mesh>
              {/* gripper fingers */}
              <mesh ref={fingerL} position={[-0.085, 0.44, 0]}>
                <boxGeometry args={[0.07, 0.3, 0.16]} />
                <Steel />
              </mesh>
              <mesh ref={fingerR} position={[0.085, 0.44, 0]}>
                <boxGeometry args={[0.07, 0.3, 0.16]} />
                <Steel />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Atmosphere                                                          */
/* ------------------------------------------------------------------ */

const COUNT = 28;

const Sparks = () => {
  const points = useRef<ThreePoints>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 9;
      arr[i * 3 + 1] = Math.random() * 4.5 - 0.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      attr.array[i * 3 + 1] = positions[i * 3 + 1] + Math.sin(t * 0.25 + i) * 0.28;
      attr.array[i * 3] = positions[i * 3] + Math.cos(t * 0.18 + i * 1.7) * 0.2;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#9fd0ff"
        size={0.055}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  );
};

const Floor = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.11, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
    </mesh>
    <gridHelper args={[40, 40, "#3a4a5c", "#26303c"]} position={[0, -1.1, 0]} />
  </>
);

/* ------------------------------------------------------------------ */
/* Canvas wrapper                                                      */
/* ------------------------------------------------------------------ */

const supportsWebGL = () => {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
};

const Poster = () => (
  <img
    src={heroPoster}
    alt="Industrial six-axis robot arm working on a factory floor"
    className="h-full w-full object-cover"
    decoding="async"
  />
);

/**
 * Full-bleed hero background: real-time WebGL 3D industrial robot arm
 * running a continuous pick-and-place cycle. Falls back to a poster still
 * when WebGL is unavailable or the user prefers reduced motion.
 */
const HeroRobotAnimation = () => {
  const [failed, setFailed] = useState(false);

  const fallback = useMemo(() => {
    if (typeof window === "undefined") return true;
    return (
      !supportsWebGL() ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  if (fallback || failed) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-neutral-900">
        <Poster />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#101418]">
      <Suspense fallback={<Poster />}>
        <Canvas
          dpr={[1, 1.5]}
          shadows
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [5.6, 3.4, 9.4], fov: 34 }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", () => setFailed(true));
          }}
        >
          <ambientLight intensity={0.3} color="#8fa6bf" />
          <directionalLight
            position={[6, 9, 4]}
            intensity={1.5}
            color="#ffffff"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-2, 0.2, 2.5]} intensity={12} distance={9} color="#4a9eff" />
          <directionalLight position={[-5, 3, -6]} intensity={0.6} color="#7fb6ff" />

          <RobotArm />
          <Floor />
          <Sparks />
          <fog attach="fog" args={["#101418", 9, 22]} />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default HeroRobotAnimation;
