import { useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Group, Mesh, Points as ThreePoints } from "three";
import * as THREE from "three";
import heroPoster from "@/assets/industrial-robot-hero.jpg";

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Sine ease — smooth mechanical acceleration / deceleration. */
const ease = (t: number) => (1 - Math.cos(Math.min(Math.max(t, 0), 1) * Math.PI)) / 2;

interface Pose {
  base: number;
  shoulder: number;
  elbow: number;
  wrist: number;
  grip: number;
}

/** 8-second pick-and-place cycle (phase durations in seconds). */
const STEPS: Array<{ pose: Pose; dur: number }> = [
  // 0–2s reach right and down to the pick point
  { pose: { base: -0.62, shoulder: 0.6, elbow: 1.2, wrist: 0.38, grip: 0 }, dur: 2 },
  // 2–2.5s gripper closes
  { pose: { base: -0.62, shoulder: 0.63, elbow: 1.23, wrist: 0.39, grip: 1 }, dur: 0.5 },
  // 2.5–4.5s lift and swing left in an arc — carrying
  { pose: { base: 0.75, shoulder: 0.05, elbow: 0.68, wrist: 0.1, grip: 1 }, dur: 2 },
  // 4.5–5s release
  { pose: { base: 0.78, shoulder: 0.34, elbow: 0.95, wrist: 0.28, grip: 0 }, dur: 0.5 },
  // 5–7s return home
  { pose: { base: 0, shoulder: -0.14, elbow: 0.58, wrist: 0.04, grip: 0 }, dur: 2 },
  // 7–8s dwell at home
  { pose: { base: 0, shoulder: -0.14, elbow: 0.58, wrist: 0.04, grip: 0 }, dur: 1 },
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
/* Palette                                                            */
/* ------------------------------------------------------------------ */

const ORANGE = "#FF6B00";
const CHROME = "#333333";
const STEEL = "#1a1a1a";
const GROUND = "#0a0a0f";
const FOG = "#0a0a0f";

const Link = () => <meshStandardMaterial color={ORANGE} metalness={0.4} roughness={0.32} />;
const Joint = () => <meshStandardMaterial color={CHROME} metalness={0.95} roughness={0.2} />;
const Steel = () => <meshStandardMaterial color={STEEL} metalness={0.75} roughness={0.35} />;

/* ------------------------------------------------------------------ */
/* Robot rig — shared, scalable                                       */
/* ------------------------------------------------------------------ */

interface RobotProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  /** seconds offset into the cycle, so each robot is out of phase */
  offset?: number;
  /** short repetitive weld dither instead of the full pick-and-place */
  mode?: "pick" | "weld" | "idle";
  /** ref exposed so spark emitters can follow the tool tip */
  toolRef?: React.RefObject<Group>;
  castShadows?: boolean;
}

const RobotArm = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  offset = 0,
  mode = "pick",
  toolRef,
  castShadows = true,
}: RobotProps) => {
  const baseJoint = useRef<Group>(null);
  const shoulder = useRef<Group>(null);
  const elbow = useRef<Group>(null);
  const wrist = useRef<Group>(null);
  const fingerL = useRef<Mesh>(null);
  const fingerR = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime + offset;

    let p: Pose;
    if (mode === "weld") {
      p = {
        base: Math.sin(t * 0.35) * 0.45,
        shoulder: 0.34 + Math.sin(t * 1.6) * 0.075,
        elbow: 0.98 + Math.cos(t * 1.6) * 0.06,
        wrist: 0.3 + Math.sin(t * 3.1) * 0.05,
        grip: 1,
      };
    } else if (mode === "idle") {
      p = { base: Math.sin(t * 0.18) * 0.7, shoulder: 0.1, elbow: 0.8, wrist: 0.2, grip: 0.4 };
    } else {
      p = poseAt(t);
    }

    if (baseJoint.current) baseJoint.current.rotation.y = p.base;
    if (shoulder.current) shoulder.current.rotation.z = p.shoulder;
    if (elbow.current) elbow.current.rotation.z = p.elbow;
    if (wrist.current) wrist.current.rotation.z = p.wrist;

    const open = 0.085 - p.grip * 0.05;
    if (fingerL.current) fingerL.current.position.x = -open;
    if (fingerR.current) fingerR.current.position.x = open;
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Base pedestal */}
      <mesh position={[0, 0.11, 0]} castShadow={castShadows}>
        <cylinderGeometry args={[0.72, 0.85, 0.22, 40]} />
        <Steel />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow={castShadows}>
        <cylinderGeometry args={[0.55, 0.62, 0.24, 36]} />
        <Steel />
      </mesh>

      {/* J1 — base rotation */}
      <group ref={baseJoint} position={[0, 0.44, 0]}>
        <mesh position={[0, 0.18, 0]} castShadow={castShadows}>
          <cylinderGeometry args={[0.44, 0.5, 0.36, 32]} />
          <Link />
        </mesh>

        {/* J2 — shoulder */}
        <group ref={shoulder} position={[0, 0.42, 0]}>
          <mesh>
            <sphereGeometry args={[0.3, 28, 28]} />
            <Joint />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow={castShadows}>
            <boxGeometry args={[0.42, 1.5, 0.46]} />
            <Link />
          </mesh>

          {/* J3 — elbow */}
          <group ref={elbow} position={[0, 1.46, 0]}>
            <mesh>
              <sphereGeometry args={[0.24, 24, 24]} />
              <Joint />
            </mesh>
            <mesh position={[0, 0.6, 0]} castShadow={castShadows}>
              <boxGeometry args={[0.3, 1.2, 0.32]} />
              <Link />
            </mesh>

            {/* J4/J5 — wrist + tool */}
            <group ref={wrist} position={[0, 1.2, 0]}>
              <mesh>
                <sphereGeometry args={[0.17, 20, 20]} />
                <Joint />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <boxGeometry args={[0.24, 0.26, 0.24]} />
                <Steel />
              </mesh>
              <group ref={toolRef} position={[0, 0.5, 0]} />
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
/* Particle layer 1 — welding sparks                                  */
/* ------------------------------------------------------------------ */

const SPARKS = 50;

const Sparks = ({ origin }: { origin: [number, number, number] }) => {
  const points = useRef<ThreePoints>(null);

  const state = useMemo(() => {
    const pos = new Float32Array(SPARKS * 3);
    const vel = new Float32Array(SPARKS * 3);
    const life = new Float32Array(SPARKS);
    for (let i = 0; i < SPARKS; i++) {
      life[i] = Math.random();
      pos[i * 3] = origin[0];
      pos[i * 3 + 1] = origin[1];
      pos[i * 3 + 2] = origin[2];
      vel[i * 3] = (Math.random() - 0.5) * 1.4;
      vel[i * 3 + 1] = Math.random() * 0.9;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    }
    return { pos, vel, life };
  }, [origin]);

  useFrame((_, delta) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const d = Math.min(delta, 0.05);
    for (let i = 0; i < SPARKS; i++) {
      state.life[i] -= d * 0.75;
      if (state.life[i] <= 0) {
        state.life[i] = 1;
        state.pos[i * 3] = origin[0];
        state.pos[i * 3 + 1] = origin[1];
        state.pos[i * 3 + 2] = origin[2];
        state.vel[i * 3] = (Math.random() - 0.5) * 1.4;
        state.vel[i * 3 + 1] = Math.random() * 0.9;
        state.vel[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
      }
      state.vel[i * 3 + 1] -= d * 2.6; // gravity
      state.pos[i * 3] += state.vel[i * 3] * d;
      state.pos[i * 3 + 1] += state.vel[i * 3 + 1] * d;
      state.pos[i * 3 + 2] += state.vel[i * 3 + 2] * d;
      attr.array[i * 3] = state.pos[i * 3];
      attr.array[i * 3 + 1] = state.pos[i * 3 + 1];
      attr.array[i * 3 + 2] = state.pos[i * 3 + 2];
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[state.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#FFAA22"
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/* ------------------------------------------------------------------ */
/* Particle layer 2 — atmospheric dust                                */
/* ------------------------------------------------------------------ */

const DUST = 200;

const Dust = () => {
  const points = useRef<ThreePoints>(null);

  const base = useMemo(() => {
    const arr = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 26;
      arr[i * 3 + 1] = Math.random() * 8 - 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);

  useFrame((s) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < DUST; i++) {
      attr.array[i * 3] = base[i * 3] + Math.sin(t * 0.11 + i * 1.3) * 0.4;
      attr.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.16 + i) * 0.35;
      attr.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.09 + i * 0.7) * 0.4;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[base, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#aabbff"
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.42}
        depthWrite={false}
      />
    </points>
  );
};

/* ------------------------------------------------------------------ */
/* Particle layer 3 — volumetric light shafts                         */
/* ------------------------------------------------------------------ */

const RAYS: Array<{ x: number; z: number; w: number; tilt: number }> = [
  { x: -4.5, z: -2, w: 1.6, tilt: 0.18 },
  { x: 0.5, z: -4, w: 2.2, tilt: -0.12 },
  { x: 3.6, z: 0.5, w: 1.9, tilt: 0.1 },
  { x: 7.5, z: -3, w: 1.4, tilt: -0.2 },
];

const LightShafts = () => {
  const group = useRef<Group>(null);

  useFrame((s) => {
    if (!group.current) return;
    const t = s.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      child.rotation.z = RAYS[i].tilt + Math.sin(t * 0.13 + i) * 0.02;
    });
  });

  return (
    <group ref={group}>
      {RAYS.map((ray, i) => (
        <mesh key={i} position={[ray.x, 3.2, ray.z]} rotation={[0, 0, ray.tilt]}>
          <planeGeometry args={[ray.w, 10]} />
          <meshBasicMaterial
            color="#dce8ff"
            transparent
            opacity={i % 2 === 0 ? 0.07 : 0.05}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Environment                                                        */
/* ------------------------------------------------------------------ */

const FLOOR_Y = -1.45;

const Floor = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color={GROUND} metalness={0.9} roughness={0.15} />
    </mesh>
    <gridHelper
      args={[70, 70, "#243040", "#1d2733"]}
      position={[0, FLOOR_Y + 0.01, 0]}
    />
  </>
);

/* ------------------------------------------------------------------ */
/* Scene                                                              */
/* ------------------------------------------------------------------ */

const Scene = () => (
  <>
    <fog attach="fog" args={[FOG, 8, 25]} />

    <ambientLight intensity={0.2} color="#0a0a1a" />
    {/* main key light, top-right, warm */}
    <directionalLight
      position={[7, 9, 4]}
      intensity={2}
      color="#fff5e6"
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
    />
    {/* cool fill from the left */}
    <directionalLight position={[-8, 3, 3]} intensity={0.5} color="#4488ff" />
    {/* rim / back light for the silhouette edge */}
    <directionalLight position={[1.5, 3.5, -8]} intensity={1} color="#cfe4ff" />
    {/* pool of light on the floor under the hero robot */}
    <spotLight
      position={[2.4, 7, 1.2]}
      target-position={[2.4, FLOOR_Y, 0]}
      angle={0.5}
      penumbra={0.85}
      intensity={40}
      distance={16}
      color="#ffd9a8"
    />
    <pointLight position={[-2, 0.4, 3]} intensity={9} distance={10} color="#4a9eff" />

    {/* Foreground hero robot */}
    <RobotArm position={[2.3, FLOOR_Y, 0.4]} scale={1} />

    {/* Mid-ground welding robot */}
    <RobotArm
      position={[-3.4, FLOOR_Y, -5.2]}
      rotation={[0, 0.7, 0]}
      scale={0.72}
      mode="weld"
      offset={3.1}
      castShadows={false}
    />
    <Sparks origin={[-3.0, FLOOR_Y + 2.3, -4.9]} />

    {/* Far background silhouette */}
    <RobotArm
      position={[6.8, FLOOR_Y, -11]}
      rotation={[0, -0.9, 0]}
      scale={0.5}
      mode="idle"
      offset={6.4}
      castShadows={false}
    />

    <Floor />
    <Dust />
    <LightShafts />

    {/* slow cinematic auto-orbit, user interaction disabled */}
    <OrbitControls
      target={[1.4, 0.6, 0]}
      autoRotate
      autoRotateSpeed={0.3}
      enableZoom={false}
      enablePan={false}
      enableRotate={false}
      enableDamping={false}
    />
  </>
);

/* ------------------------------------------------------------------ */
/* Fallback + wrapper                                                 */
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

/** Cinematic still fallback: slow Ken Burns zoom on the poster. */
const PosterFallback = () => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a0a0f]">
    <img
      src={heroPoster}
      alt="Industrial six-axis robot arms working on a factory floor"
      className="rv-ken-burns h-full w-full object-cover"
      decoding="async"
    />
  </div>
);

/**
 * Full-bleed cinematic hero background: real-time WebGL industrial scene with
 * three robot arms at different depths, volumetric fog, light shafts, welding
 * sparks, drifting dust and a slow camera orbit. Falls back to a Ken Burns
 * poster still on mobile, without WebGL, or under reduced-motion.
 */
const HeroRobotAnimation = () => {
  const [failed, setFailed] = useState(false);

  const fallback = useMemo(() => {
    if (typeof window === "undefined") return true;
    return (
      window.innerWidth < 768 ||
      !supportsWebGL() ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  if (fallback || failed) return <PosterFallback />;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a0a0f]">
      <Suspense fallback={<PosterFallback />}>
        <Canvas
          dpr={[1, 1.5]}
          shadows
          frameloop="always"
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [6.2, 1.1, 9.6], fov: 36 }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", () => setFailed(true));
          }}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default HeroRobotAnimation;
