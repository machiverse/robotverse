import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { useTheme } from "@/hooks/useTheme";

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Pose {
  j1: number; // turret, Y
  j2: number; // shoulder
  j3: number; // elbow
  j4: number; // wrist roll
  j5: number; // wrist pitch
  grip: number; // 0 open .. 1 closed
}

/** One pick-and-place cycle. move = travel ms, hold = dwell ms at the pose. */
const TIMELINE: Array<{ pose: Pose; move: number; hold: number }> = [
  // home / ready
  { pose: { j1: 0, j2: -0.35, j3: 1.85, j4: 0, j5: 1.7, grip: 0 }, move: 900, hold: 400 },
  // reach out and down to the pick point
  { pose: { j1: -0.8, j2: -0.05, j3: 2.15, j4: -0.2, j5: 1.5, grip: 0 }, move: 1100, hold: 380 },
  // close the gripper
  { pose: { j1: -0.8, j2: 0.0, j3: 2.2, j4: -0.2, j5: 1.47, grip: 1 }, move: 320, hold: 400 },
  // lift clear
  { pose: { j1: -0.8, j2: -0.4, j3: 1.8, j4: -0.1, j5: 1.73, grip: 1 }, move: 800, hold: 260 },
  // swing across to the place point
  { pose: { j1: 0.9, j2: -0.4, j3: 1.82, j4: 0.35, j5: 1.73, grip: 1 }, move: 1300, hold: 380 },
  // lower into place
  { pose: { j1: 0.9, j2: -0.05, j3: 2.12, j4: 0.35, j5: 1.51, grip: 1 }, move: 900, hold: 300 },
  // release
  { pose: { j1: 0.9, j2: -0.05, j3: 2.12, j4: 0.35, j5: 1.51, grip: 0 }, move: 320, hold: 400 },
  // retract, then home
  { pose: { j1: 0.45, j2: -0.42, j3: 1.75, j4: 0.1, j5: 1.75, grip: 0 }, move: 800, hold: 240 },
  { pose: { j1: 0, j2: -0.35, j3: 1.85, j4: 0, j5: 1.7, grip: 0 }, move: 1000, hold: 400 },
];

const CYCLE = TIMELINE.reduce((sum, s) => sum + s.move + s.hold, 0);

function poseAt(ms: number): Pose {
  const t = ((ms % CYCLE) + CYCLE) % CYCLE;
  let acc = 0;
  for (let i = 0; i < TIMELINE.length; i++) {
    const seg = TIMELINE[i];
    const from = i === 0 ? TIMELINE[TIMELINE.length - 1].pose : TIMELINE[i - 1].pose;
    if (t < acc + seg.move) {
      const k = smoothstep((t - acc) / seg.move);
      return {
        j1: lerp(from.j1, seg.pose.j1, k),
        j2: lerp(from.j2, seg.pose.j2, k),
        j3: lerp(from.j3, seg.pose.j3, k),
        j4: lerp(from.j4, seg.pose.j4, k),
        j5: lerp(from.j5, seg.pose.j5, k),
        grip: lerp(from.grip, seg.pose.grip, k),
      };
    }
    acc += seg.move;
    if (t < acc + seg.hold) return seg.pose;
    acc += seg.hold;
  }
  return TIMELINE[TIMELINE.length - 1].pose;
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

const BODY = "#2d5f92";
const HOUSING = "#4a7cb0";
const ACCENT = "#4a9eff";

const Body = () => <meshStandardMaterial color={BODY} metalness={0.55} roughness={0.38} />;
const Housing = () => <meshStandardMaterial color={HOUSING} metalness={0.55} roughness={0.38} />;

/* ------------------------------------------------------------------ */
/* Rig                                                                 */
/* ------------------------------------------------------------------ */

const Arm = ({ parallax }: { parallax: boolean }) => {
  const rig = useRef<Group>(null);
  const turret = useRef<Group>(null);
  const shoulder = useRef<Group>(null);
  const elbow = useRef<Group>(null);
  const wristRoll = useRef<Group>(null);
  const wristPitch = useRef<Group>(null);
  const fingerL = useRef<Mesh>(null);
  const fingerR = useRef<Mesh>(null);

  const pointer = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const clock = useRef(0);

  useEffect(() => {
    if (!parallax) return;
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallax]);

  const MAX = (4 * Math.PI) / 180;
  /** Yaw the whole rig so the shoulder/elbow bend plane faces the camera. */
  const BASE_YAW = -1.05;

  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.1) * 1000;
    const p = poseAt(clock.current);

    if (turret.current) turret.current.rotation.y = p.j1;
    if (shoulder.current) shoulder.current.rotation.x = p.j2;
    if (elbow.current) elbow.current.rotation.x = p.j3;
    if (wristRoll.current) wristRoll.current.rotation.y = p.j4;
    if (wristPitch.current) wristPitch.current.rotation.x = p.j5;

    const open = 0.075 - p.grip * 0.045;
    if (fingerL.current) fingerL.current.position.x = -open;
    if (fingerR.current) fingerR.current.position.x = open;

    if (rig.current) {
      pointer.current.x = lerp(pointer.current.x, target.current.x, 0.04);
      pointer.current.y = lerp(pointer.current.y, target.current.y, 0.04);
      rig.current.rotation.y = BASE_YAW + pointer.current.x * MAX;
      rig.current.rotation.x = -pointer.current.y * MAX * 0.5;
    }
  });

  return (
    <group ref={rig} position={[0, -1.1, 0]} rotation={[0, -1.05, 0]} scale={1.02}>
      {/* Base plinth */}
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.72, 0.18, 32]} />
        <Housing />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.5, 0.56, 0.18, 32]} />
        <Body />
      </mesh>

      {/* J1 turret */}
      <group ref={turret} position={[0, 0.35, 0]}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.42, 0.46, 0.32, 28]} />
          <Housing />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[0.62, 0.24, 0.56]} />
          <Body />
        </mesh>

        {/* J2 shoulder */}
        <group ref={shoulder} position={[0, 0.52, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.19, 0.19, 0.6, 24]} />
            <Housing />
          </mesh>
          {/* upper arm */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.34, 1.0, 0.36]} />
            <Body />
          </mesh>

          {/* J3 elbow */}
          <group ref={elbow} position={[0, 1.0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.17, 0.17, 0.5, 24]} />
              <Housing />
            </mesh>
            {/* the single accent: thin emissive ring at the elbow */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.185, 0.018, 12, 40]} />
              <meshStandardMaterial
                color={ACCENT}
                emissive={ACCENT}
                emissiveIntensity={0.6}
                metalness={0.3}
                roughness={0.4}
              />
            </mesh>
            {/* forearm */}
            <mesh position={[0, 0.42, 0]}>
              <boxGeometry args={[0.26, 0.85, 0.28]} />
              <Body />
            </mesh>

            {/* J4 wrist roll */}
            <group ref={wristRoll} position={[0, 0.85, 0]}>
              <mesh>
                <cylinderGeometry args={[0.14, 0.14, 0.2, 20]} />
                <Housing />
              </mesh>

              {/* J5 wrist pitch + gripper */}
              <group ref={wristPitch} position={[0, 0.16, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.11, 0.11, 0.28, 20]} />
                  <Housing />
                </mesh>
                <mesh position={[0, 0.16, 0]}>
                  <boxGeometry args={[0.2, 0.18, 0.2]} />
                  <Body />
                </mesh>
                <mesh ref={fingerL} position={[-0.075, 0.34, 0]}>
                  <boxGeometry args={[0.05, 0.24, 0.12]} />
                  <Housing />
                </mesh>
                <mesh ref={fingerR} position={[0.075, 0.34, 0]}>
                  <boxGeometry args={[0.05, 0.24, 0.12]} />
                  <Housing />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Canvas wrapper                                                      */
/* ------------------------------------------------------------------ */

const RobotArm3D = () => {
  const { isDark } = useTheme();
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  const parallax = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setVisible(entries[0]?.isIntersecting ?? true), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [2.3, 1.0, 3.95], fov: 34 }}
      >
        <ambientLight intensity={isDark ? 0.75 : 0.85} />
        <directionalLight position={[-4, 6, 4]} intensity={1.7} />
        <directionalLight position={[0, 3, 6]} intensity={isDark ? 0.6 : 0.35} />
        <directionalLight position={[3, 2.5, -4]} intensity={isDark ? 0.8 : 0.45} color={ACCENT} />
        <Arm parallax={parallax} />
        <ContactShadows
          position={[0, -1.11, 0]}
          opacity={isDark ? 0.55 : 0.28}
          scale={7}
          blur={2.6}
          far={3}
          resolution={512}
          color="#0a1a2c"
        />
      </Canvas>
    </div>
  );
};

export default RobotArm3D;
