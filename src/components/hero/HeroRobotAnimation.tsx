import { useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh, PointLight, Points as ThreePoints } from "three";
import * as THREE from "three";
import heroPoster from "@/assets/industrial-robot-hero.jpg";

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);
/** Sine ease — smooth mechanical acceleration / deceleration. */
const ease = (t: number) => (1 - Math.cos(clamp01(t) * Math.PI)) / 2;

interface Pose {
  base: number;
  shoulder: number;
  elbow: number;
  wrist: number;
  grip: number;
}

type PhaseName =
  | "home"
  | "approach"
  | "grip"
  | "transfer"
  | "place"
  | "release"
  | "seam"
  | "weld"
  | "inspect"
  | "regrip"
  | "palletize"
  | "return";

interface Step {
  name: PhaseName;
  pose: Pose;
  dur: number;
}

const HOME: Pose = { base: 0, shoulder: -0.14, elbow: 0.58, wrist: 0.04, grip: 0 };
const PICK: Pose = { base: -0.72, shoulder: 0.62, elbow: 1.22, wrist: 0.38, grip: 0 };
const FIXTURE: Pose = { base: 0.72, shoulder: 0.4, elbow: 1.02, wrist: 0.3, grip: 1 };
const SEAM: Pose = { base: 0.78, shoulder: 0.46, elbow: 1.1, wrist: 0.34, grip: 1 };
const PALLET: Pose = { base: 1.34, shoulder: 0.5, elbow: 1.12, wrist: 0.3, grip: 1 };

/** ~20-second multi-station production cycle. */
const STEPS: Step[] = [
  { name: "home", pose: HOME, dur: 1.2 },
  { name: "approach", pose: PICK, dur: 2.2 },
  { name: "grip", pose: { ...PICK, grip: 1 }, dur: 0.6 },
  {
    name: "transfer",
    pose: { base: 0.2, shoulder: 0.0, elbow: 0.66, wrist: 0.12, grip: 1 },
    dur: 2.4,
  },
  { name: "place", pose: FIXTURE, dur: 1.4 },
  { name: "release", pose: { ...FIXTURE, grip: 0 }, dur: 0.5 },
  { name: "seam", pose: { ...SEAM, grip: 0 }, dur: 1.0 },
  { name: "weld", pose: { ...SEAM, grip: 0 }, dur: 4.0 },
  {
    name: "inspect",
    pose: { base: 0.34, shoulder: 0.02, elbow: 0.62, wrist: 0.16, grip: 0 },
    dur: 2.0,
  },
  { name: "regrip", pose: { ...FIXTURE, grip: 1 }, dur: 1.5 },
  { name: "palletize", pose: { ...PALLET, grip: 0 }, dur: 1.9 },
  { name: "return", pose: HOME, dur: 1.6 },
];

const CYCLE = STEPS.reduce((s, k) => s + k.dur, 0);

interface CycleState {
  pose: Pose;
  phase: PhaseName;
  /** 0..1 progress inside the current phase */
  k: number;
  cycleIndex: number;
}

function cycleAt(time: number): CycleState {
  const wrapped = ((time % CYCLE) + CYCLE) % CYCLE;
  const cycleIndex = Math.floor(time / CYCLE);
  let acc = 0;
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    if (wrapped < acc + step.dur) {
      const from = i === 0 ? STEPS[STEPS.length - 1].pose : STEPS[i - 1].pose;
      const raw = (wrapped - acc) / step.dur;
      const k = ease(raw);
      const pose: Pose = {
        base: lerp(from.base, step.pose.base, k),
        shoulder: lerp(from.shoulder, step.pose.shoulder, k),
        elbow: lerp(from.elbow, step.pose.elbow, k),
        wrist: lerp(from.wrist, step.pose.wrist, k),
        grip: lerp(from.grip, step.pose.grip, k),
      };

      if (step.name === "weld") {
        // slow linear travel along the seam + classic oscillating weave
        const travel = raw;
        const weave = Math.sin(raw * Math.PI * 2 * 7) * 0.045;
        pose.base = SEAM.base - 0.24 * travel + weave;
        pose.shoulder = SEAM.shoulder + 0.05 * travel + Math.sin(raw * Math.PI * 2 * 7) * 0.012;
        pose.elbow = SEAM.elbow + 0.04 * travel;
        pose.wrist = SEAM.wrist + weave * 0.6;
      }

      if (step.name === "inspect") {
        pose.base += Math.sin(raw * Math.PI) * 0.22;
      }

      return { pose, phase: step.name, k: raw, cycleIndex };
    }
    acc += step.dur;
  }
  return { pose: HOME, phase: "return", k: 1, cycleIndex };
}

/* ------------------------------------------------------------------ */
/* Palette                                                            */
/* ------------------------------------------------------------------ */

const ORANGE = "#FF6B00";
const CHROME = "#5a6470";
const STEEL = "#2e343d";
const GROUND = "#161c26";
const FOG = "#161c26";
const ARC = "#cfe4ff";

const Link = () => (
  <meshStandardMaterial
    color={ORANGE}
    metalness={0.45}
    roughness={0.28}
    emissive={ORANGE}
    emissiveIntensity={0.06}
  />
);
const Joint = () => <meshStandardMaterial color={CHROME} metalness={0.92} roughness={0.22} />;
const Steel = () => <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.38} />;

/* ------------------------------------------------------------------ */
/* Robot rig — shared, scalable                                       */
/* ------------------------------------------------------------------ */

type Mode = "cell" | "spot" | "handling";

interface RobotProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  offset?: number;
  mode?: Mode;
  /** ref exposed so spark emitters can follow the tool tip */
  toolRef?: React.RefObject<Group>;
  castShadows?: boolean;
  /** called each frame with the live cycle state (hero robot only) */
  onCycle?: (state: CycleState) => void;
  /** spot-weld robot: reports whether it is currently dabbing */
  onSpot?: (welding: boolean) => void;
}

const SPOT_CYCLE = 2.6;

const RobotArm = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  offset = 0,
  mode = "cell",
  toolRef,
  castShadows = true,
  onCycle,
  onSpot,
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
    if (mode === "spot") {
      // quick down-dab, 0.4s hold, retract, index sideways
      const local = ((t % SPOT_CYCLE) + SPOT_CYCLE) % SPOT_CYCLE;
      const index = Math.floor(t / SPOT_CYCLE) % 4;
      const baseAngle = -0.3 + index * 0.2;
      let reach = 0;
      let welding = false;
      if (local < 0.6) reach = ease(local / 0.6);
      else if (local < 1.0) {
        reach = 1;
        welding = true;
      } else if (local < 1.6) reach = 1 - ease((local - 1.0) / 0.6);
      p = {
        base: baseAngle,
        shoulder: 0.18 + reach * 0.3,
        elbow: 0.82 + reach * 0.24,
        wrist: 0.24 + reach * 0.1,
        grip: 1,
      };
      onSpot?.(welding);
    } else if (mode === "handling") {
      // slow left-pick / right-release material handling sweep
      const HC = 14;
      const local = ((t % HC) + HC) % HC;
      const seq = local / HC;
      const swing = Math.sin(seq * Math.PI * 2);
      const dip = Math.abs(Math.cos(seq * Math.PI * 2));
      p = {
        base: swing * 0.9,
        shoulder: 0.1 + dip * 0.3,
        elbow: 0.72 + dip * 0.26,
        wrist: 0.2,
        grip: swing > 0 ? 1 : 0,
      };
    } else {
      const c = cycleAt(t);
      p = c.pose;
      onCycle?.(c);
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
              <group ref={toolRef} position={[0, 0.58, 0]} />
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
/* Welding sparks — spawn from the live tool-tip world position        */
/* ------------------------------------------------------------------ */

const SPARKS = 240;
const BURST_COUNT = 60;
const BURST_EVERY = 0.8;

interface EmitterProps {
  toolRef: React.RefObject<Group>;
  active: React.MutableRefObject<boolean>;
}

const Sparks = ({ toolRef, active }: EmitterProps) => {
  const points = useRef<ThreePoints>(null);
  const world = useMemo(() => new THREE.Vector3(), []);

  const state = useMemo(() => {
    const pos = new Float32Array(SPARKS * 3);
    const prev1 = new Float32Array(SPARKS * 3);
    const prev2 = new Float32Array(SPARKS * 3);
    const vel = new Float32Array(SPARKS * 3);
    const life = new Float32Array(SPARKS);
    for (let i = 0; i < SPARKS; i++) {
      pos[i * 3 + 1] = -999;
      prev1[i * 3 + 1] = -999;
      prev2[i * 3 + 1] = -999;
      life[i] = Math.random() * 0.4;
    }
    return { pos, prev1, prev2, vel, life, wasOn: false, burstTimer: 0 };
  }, []);

  const geoRef = useRef<THREE.BufferGeometry>(null);
  const trail1 = useRef<ThreePoints>(null);
  const trail2 = useRef<ThreePoints>(null);

  /** Respawn one spark at the tool tip. `boost` multiplies velocity. */
  const spawn = (i: number, boost: number) => {
    const { pos, prev1, prev2, vel, life } = state;
    life[i] = 0.9 + Math.random() * 1.1;
    pos[i * 3] = world.x;
    pos[i * 3 + 1] = world.y;
    pos[i * 3 + 2] = world.z;
    prev1[i * 3] = world.x;
    prev1[i * 3 + 1] = world.y;
    prev1[i * 3 + 2] = world.z;
    prev2[i * 3] = world.x;
    prev2[i * 3 + 1] = world.y;
    prev2[i * 3 + 2] = world.z;
    vel[i * 3] = (Math.random() - 0.5) * 14 * boost;
    vel[i * 3 + 1] = (0.5 + Math.random() * 4.5) * boost;
    // ~40% of sparks fly hard toward the camera (+Z) so they exit the screen
    vel[i * 3 + 2] =
      Math.random() < 0.4
        ? (3 + Math.random() * 6) * boost
        : (Math.random() - 0.5) * 14 * boost;
  };

  useFrame((_, delta) => {
    const geo = geoRef.current;
    const tool = toolRef.current;
    if (!geo || !tool) return;
    tool.getWorldPosition(world);

    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const d = Math.min(delta, 0.05);
    const on = active.current;
    const { pos, prev1, prev2, vel, life } = state;

    // Burst rhythm: one on weld start, then roughly every 0.8s while welding.
    let burst = 0;
    if (on) {
      if (!state.wasOn) {
        burst = BURST_COUNT;
        state.burstTimer = 0;
      } else {
        state.burstTimer += d;
        if (state.burstTimer >= BURST_EVERY) {
          state.burstTimer -= BURST_EVERY;
          burst = BURST_COUNT;
        }
      }
    }
    state.wasOn = on;

    for (let i = 0; i < SPARKS; i++) {
      life[i] -= d * 1.0;

      if (burst > 0 && on && life[i] > 0) {
        // force-respawn part of the field for the burst pulse
        spawn(i, 1.8);
        burst--;
      } else if (life[i] <= 0) {
        if (!on) {
          pos[i * 3 + 1] = -999;
          prev1[i * 3 + 1] = -999;
          prev2[i * 3 + 1] = -999;
          continue;
        }
        spawn(i, burst > 0 ? 1.8 : 1);
        if (burst > 0) burst--;
      }

      // shift the short position history (comet tail samples)
      prev2[i * 3] = prev1[i * 3];
      prev2[i * 3 + 1] = prev1[i * 3 + 1];
      prev2[i * 3 + 2] = prev1[i * 3 + 2];
      prev1[i * 3] = pos[i * 3];
      prev1[i * 3 + 1] = pos[i * 3 + 1];
      prev1[i * 3 + 2] = pos[i * 3 + 2];

      vel[i * 3 + 1] -= d * 4.0; // gravity
      // air drag
      vel[i * 3] *= 0.985;
      vel[i * 3 + 1] *= 0.985;
      vel[i * 3 + 2] *= 0.985;

      pos[i * 3] += vel[i * 3] * d;
      pos[i * 3 + 1] += vel[i * 3 + 1] * d;
      pos[i * 3 + 2] += vel[i * 3 + 2] * d;
    }

    attr.needsUpdate = true;
    const t1 = trail1.current?.geometry.getAttribute("position") as
      | THREE.BufferAttribute
      | undefined;
    const t2 = trail2.current?.geometry.getAttribute("position") as
      | THREE.BufferAttribute
      | undefined;
    if (t1) t1.needsUpdate = true;
    if (t2) t2.needsUpdate = true;
  });

  return (
    <>
      {/* hot core + soft halo share one position buffer (fake bloom) */}
      <points ref={points} frustumCulled={false}>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute attach="attributes-position" args={[state.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#FFF0C0"
          size={0.085}
          sizeAttenuation
          transparent
          opacity={1}
          fog={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[state.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#FF8A1E"
          size={0.26}
          sizeAttenuation
          transparent
          opacity={0.22}
          fog={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* comet tails — dimmer layers at the previous two sampled positions */}
      <points ref={trail1} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[state.prev1, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#FFB25A"
          size={0.07}
          sizeAttenuation
          transparent
          opacity={0.45}
          fog={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={trail2} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[state.prev2, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#FF8A1E"
          size={0.055}
          sizeAttenuation
          transparent
          opacity={0.22}
          fog={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Weld arc flash — sprite plane + flickering point light              */
/* ------------------------------------------------------------------ */

const ArcFlash = ({ toolRef, active }: EmitterProps) => {
  const flash = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);
  const world = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const tool = toolRef.current;
    if (!tool) return;
    tool.getWorldPosition(world);
    const on = active.current;
    const jitter = 6 + Math.random() * 14;

    if (light.current) {
      light.current.position.copy(world);
      light.current.intensity = on ? jitter : 0;
    }
    if (flash.current) {
      flash.current.visible = on;
      flash.current.position.copy(world);
      flash.current.quaternion.copy(camera.quaternion);
      const s = on ? 0.28 + Math.random() * 0.22 : 0.001;
      flash.current.scale.setScalar(s);
    }
  });

  return (
    <>
      <pointLight ref={light} color={ARC} intensity={0} distance={7} decay={2} />
      <mesh ref={flash} visible={false} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={ARC}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Weld smoke — slow rising wisps from the tool tip                    */
/* ------------------------------------------------------------------ */

const SMOKE = 26;

const WeldSmoke = ({ toolRef, active }: EmitterProps) => {
  const points = useRef<ThreePoints>(null);
  const world = useMemo(() => new THREE.Vector3(), []);

  const state = useMemo(() => {
    const pos = new Float32Array(SMOKE * 3);
    const life = new Float32Array(SMOKE);
    for (let i = 0; i < SMOKE; i++) {
      pos[i * 3 + 1] = -999;
      life[i] = Math.random();
    }
    return { pos, life };
  }, []);

  useFrame((_, delta) => {
    const geo = points.current?.geometry;
    const tool = toolRef.current;
    if (!geo || !tool) return;
    tool.getWorldPosition(world);
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const d = Math.min(delta, 0.05);
    const on = active.current;

    for (let i = 0; i < SMOKE; i++) {
      state.life[i] -= d * 0.5;
      if (state.life[i] <= 0) {
        if (!on) {
          attr.array[i * 3 + 1] = -999;
          continue;
        }
        state.life[i] = 1;
        state.pos[i * 3] = world.x + (Math.random() - 0.5) * 0.12;
        state.pos[i * 3 + 1] = world.y;
        state.pos[i * 3 + 2] = world.z + (Math.random() - 0.5) * 0.12;
      }
      state.pos[i * 3 + 1] += d * 0.7;
      state.pos[i * 3] += Math.sin(state.life[i] * 6 + i) * d * 0.1;
      attr.array[i * 3] = state.pos[i * 3];
      attr.array[i * 3 + 1] = state.pos[i * 3 + 1];
      attr.array[i * 3 + 2] = state.pos[i * 3 + 2];
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[state.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#8fa3bd"
        size={0.16}
        sizeAttenuation
        transparent
        opacity={0.16}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/* ------------------------------------------------------------------ */
/* Atmospheric dust                                                    */
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
        color="#c8d8f5"
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </points>
  );
};

/* ------------------------------------------------------------------ */
/* Volumetric light shafts                                            */
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
            opacity={i % 2 === 0 ? 0.08 : 0.06}
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
/* Cell furniture — conveyor, fixture, pallet, fencing                */
/* ------------------------------------------------------------------ */

const FLOOR_Y = -1.45;

const Floor = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color={GROUND} metalness={0.85} roughness={0.22} />
    </mesh>
    <gridHelper args={[70, 70, "#3a4a5e", "#2a3646"]} position={[0, FLOOR_Y + 0.01, 0]} />
  </>
);

const CONVEYOR_X = 5.5;
const CONVEYOR_TOP = FLOOR_Y + 0.72;
const SLATS = 16;

/** Conveyor with animated slats and a queue of parts moving to the pick point. */
const Conveyor = () => {
  const slats = useRef<Group>(null);
  const parts = useRef<Group>(null);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (slats.current) {
      slats.current.children.forEach((c, i) => {
        const span = 6.4;
        c.position.z = ((((i / SLATS) * span + t * 0.8) % span) + span) % span - span / 2;
      });
    }
    if (parts.current) {
      parts.current.children.forEach((c, i) => {
        const span = 6.4;
        c.position.z = ((((i / 4) * span + t * 0.8) % span) + span) % span - span / 2;
      });
    }
  });

  return (
    <group position={[CONVEYOR_X, 0, -0.6]}>
      {/* frame */}
      <mesh position={[0, FLOOR_Y + 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.68, 6.6]} />
        <Steel />
      </mesh>
      {/* belt bed */}
      <mesh position={[0, CONVEYOR_TOP - 0.02, 0]} receiveShadow>
        <boxGeometry args={[1.16, 0.06, 6.5]} />
        <meshStandardMaterial color="#1d2530" metalness={0.5} roughness={0.7} />
      </mesh>
      {/* scrolling slats */}
      <group ref={slats}>
        {Array.from({ length: SLATS }).map((_, i) => (
          <mesh key={i} position={[0, CONVEYOR_TOP + 0.02, 0]}>
            <boxGeometry args={[1.1, 0.03, 0.14]} />
            <meshStandardMaterial color="#39424f" metalness={0.6} roughness={0.45} />
          </mesh>
        ))}
      </group>
      {/* queue of parts */}
      <group ref={parts}>
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={i} position={[0, CONVEYOR_TOP + 0.14, 0]} castShadow>
            <boxGeometry args={[0.5, 0.2, 0.5]} />
            <meshStandardMaterial color="#8a9bb0" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const FIXTURE_POS: [number, number, number] = [1.0, FLOOR_Y + 0.8, 1.5];

const WeldFixture = () => (
  <group position={[FIXTURE_POS[0], 0, FIXTURE_POS[2]]}>
    <mesh position={[0, FLOOR_Y + 0.38, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.5, 0.76, 1.5]} />
      <Steel />
    </mesh>
    <mesh position={[0, FLOOR_Y + 0.78, 0]} receiveShadow>
      <boxGeometry args={[1.62, 0.06, 1.62]} />
      <meshStandardMaterial color="#404b59" metalness={0.85} roughness={0.3} />
    </mesh>
    {[
      [-0.6, -0.6],
      [0.6, -0.6],
      [-0.6, 0.6],
      [0.6, 0.6],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, FLOOR_Y + 0.94, z]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.26, 12]} />
        <meshStandardMaterial color="#6a7484" metalness={0.9} roughness={0.28} />
      </mesh>
    ))}
  </group>
);

const PALLET_POS: [number, number, number] = [-2.6, FLOOR_Y + 0.2, 1.2];

const Pallet = ({ stack }: { stack: number }) => (
  <group position={[PALLET_POS[0], 0, PALLET_POS[2]]}>
    <mesh position={[0, FLOOR_Y + 0.09, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.6, 0.18, 1.4]} />
      <meshStandardMaterial color="#3a3227" metalness={0.2} roughness={0.85} />
    </mesh>
    {Array.from({ length: stack }).map((_, i) => (
      <mesh key={i} position={[0, FLOOR_Y + 0.29 + i * 0.22, 0]} castShadow>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#8a9bb0" metalness={0.8} roughness={0.35} />
      </mesh>
    ))}
  </group>
);

/** Simple safety fencing: thin posts + low-opacity mesh panels. */
const Fencing = () => {
  const panels: Array<{ pos: [number, number, number]; w: number; ry: number }> = [
    { pos: [1, FLOOR_Y + 1.1, -4.2], w: 13, ry: 0 },
    { pos: [-5.2, FLOOR_Y + 1.1, -0.6], w: 7.5, ry: Math.PI / 2 },
    { pos: [8.4, FLOOR_Y + 1.1, -0.6], w: 7.5, ry: Math.PI / 2 },
  ];
  return (
    <group>
      {panels.map((p, i) => (
        <group key={i} position={p.pos} rotation={[0, p.ry, 0]}>
          <mesh>
            <planeGeometry args={[p.w, 2.2]} />
            <meshStandardMaterial
              color="#5b6675"
              transparent
              opacity={0.16}
              side={THREE.DoubleSide}
              metalness={0.6}
              roughness={0.5}
            />
          </mesh>
          {Array.from({ length: Math.round(p.w / 2.5) + 1 }).map((_, j, arr) => (
            <mesh
              key={j}
              position={[-p.w / 2 + (j * p.w) / (arr.length - 1), 0, 0]}
            >
              <boxGeometry args={[0.07, 2.2, 0.07]} />
              <meshStandardMaterial color="#454f5c" metalness={0.75} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Hero cell — robot + travelling part + weld effects                 */
/* ------------------------------------------------------------------ */

const CARRIED: PhaseName[] = ["transfer", "place", "palletize"];
const ON_FIXTURE: PhaseName[] = ["release", "seam", "weld", "inspect", "regrip"];

const HeroCell = () => {
  const tool = useRef<Group>(null);
  const part = useRef<Mesh>(null);
  const welding = useRef(false);
  const [stack, setStack] = useState(0);
  const stackRef = useRef(0);
  const world = useMemo(() => new THREE.Vector3(), []);

  const onCycle = (c: CycleState) => {
    welding.current = c.phase === "weld";

    const next = c.cycleIndex % 4;
    if (stackRef.current !== next) {
      stackRef.current = next;
      setStack(next);
    }

    const mesh = part.current;
    if (!mesh) return;

    if (CARRIED.includes(c.phase)) {
      mesh.visible = true;
      if (tool.current) {
        tool.current.getWorldPosition(world);
        mesh.position.set(world.x, world.y - 0.08, world.z);
      }
    } else if (ON_FIXTURE.includes(c.phase)) {
      mesh.visible = true;
      mesh.position.set(FIXTURE_POS[0], FIXTURE_POS[1] + 0.12, FIXTURE_POS[2]);
    } else if (c.phase === "return") {
      // just set down on the pallet
      mesh.visible = true;
      mesh.position.set(
        PALLET_POS[0],
        FLOOR_Y + 0.29 + stackRef.current * 0.22,
        PALLET_POS[2]
      );
    } else {
      mesh.visible = false;
    }
  };

  return (
    <>
      <RobotArm
        position={[2.3, FLOOR_Y, 0.4]}
        scale={1}
        toolRef={tool}
        onCycle={onCycle}
      />
      <mesh ref={part} castShadow visible={false}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#9bacc2" metalness={0.8} roughness={0.32} />
      </mesh>
      <Sparks toolRef={tool} active={welding} />
      <ArcFlash toolRef={tool} active={welding} />
      <WeldSmoke toolRef={tool} active={welding} />
      <Pallet stack={stack} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Mid-ground spot-welding cell                                       */
/* ------------------------------------------------------------------ */

const SpotCell = () => {
  const tool = useRef<Group>(null);
  const welding = useRef(false);

  return (
    <>
      <RobotArm
        position={[-3.4, FLOOR_Y, -5.2]}
        rotation={[0, 0.7, 0]}
        scale={0.72}
        mode="spot"
        offset={3.1}
        castShadows={false}
        toolRef={tool}
        onSpot={(w) => {
          welding.current = w;
        }}
      />
      <Sparks toolRef={tool} active={welding} />
      <ArcFlash toolRef={tool} active={welding} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Camera — slow procedural cinematic drift                            */
/* ------------------------------------------------------------------ */

const LOOK_AT = new THREE.Vector3(1.6, 0.5, 0.4);

const CameraDrift = () => {
  const home = useMemo(() => new THREE.Vector3(6.2, 1.1, 9.6), []);

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    camera.position.set(
      home.x + Math.sin((t * Math.PI * 2) / 34) * 0.5,
      home.y + Math.sin((t * Math.PI * 2) / 46) * 0.25,
      home.z
    );
    camera.lookAt(LOOK_AT);
  });

  return null;
};

/* ------------------------------------------------------------------ */
/* Scene                                                              */
/* ------------------------------------------------------------------ */

const Scene = () => (
  <>
    <fog attach="fog" args={[FOG, 12, 34]} />

    <ambientLight intensity={0.6} color="#b8c8dc" />
    <hemisphereLight args={["#cfe0ff", "#2a2f3a", 0.5]} />
    {/* main key light, top-right, warm */}
    <directionalLight
      position={[7, 9, 4]}
      intensity={3}
      color="#fff5e6"
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-12}
      shadow-camera-right={12}
      shadow-camera-top={12}
      shadow-camera-bottom={-12}
    />
    {/* cool fill from the left */}
    <directionalLight position={[-8, 3, 3]} intensity={1.1} color="#7fb2ff" />
    {/* rim / back light for the silhouette edge */}
    <directionalLight position={[1.5, 3.5, -8]} intensity={1.6} color="#cfe4ff" />
    {/* pool of light on the floor under the hero robot */}
    <spotLight
      position={[2.4, 7, 1.2]}
      target-position={[2.4, FLOOR_Y, 0]}
      angle={0.62}
      penumbra={0.8}
      intensity={90}
      distance={20}
      color="#ffe6c2"
    />
    <pointLight position={[-2, 0.6, 3]} intensity={14} distance={12} color="#6cb0ff" />

    <HeroCell />
    <SpotCell />

    {/* Far background material-handling robot */}
    <RobotArm
      position={[6.8, FLOOR_Y, -11]}
      rotation={[0, -0.9, 0]}
      scale={0.5}
      mode="handling"
      offset={6.4}
      castShadows={false}
    />

    <Conveyor />
    <WeldFixture />
    <Fencing />
    <Floor />
    <Dust />
    <LightShafts />
    <CameraDrift />
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
  <div className="absolute inset-0 z-0 overflow-hidden bg-[#161c26]">
    <img
      src={heroPoster}
      alt="Industrial six-axis robot arms working on a factory floor"
      className="rv-ken-burns h-full w-full object-cover"
      decoding="async"
    />
  </div>
);

/**
 * Full-bleed cinematic hero background: real-time WebGL industrial robot cell —
 * a hero six-axis arm running a full pick / weld / palletize production cycle,
 * a spot-welding cell mid-ground, a material-handling arm behind, conveyor,
 * fixture, pallet, safety fencing, sparks, arc flash and drifting dust.
 * Falls back to a Ken Burns poster still on mobile, without WebGL, or under
 * reduced-motion.
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
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#161c26]">
      <Suspense fallback={<PosterFallback />}>
        <Canvas
          dpr={[1, 1.5]}
          shadows
          frameloop="always"
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [6.2, 1.1, 9.6], fov: 36 }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.25;
            gl.outputColorSpace = THREE.SRGBColorSpace;
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
