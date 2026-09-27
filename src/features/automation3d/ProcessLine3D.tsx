import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Group, Vector3 } from "three";
import type { ProcessCard } from "@/data/automationStudioIndustries";
import { PROCESS_PROFILES, processKind, stationPosition, type ProcessKind } from "./processProfiles";

type Props = { processes: ProcessCard[]; playing: boolean; speed: string };
function Block({ at, size, color }: { at: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.45} metalness={0.25} /></mesh>;
}

function Cell({ process, index, selected, onSelect, playing, speed }: Omit<Props, "processes"> & { process: ProcessCard; index: number; selected: boolean; onSelect: () => void }) {
  const kind = processKind(process);
  const profile = PROCESS_PROFILES[kind];
  const arm = useRef<Group>(null);
  const tool = useRef<Group>(null);
  const time = useRef(0);
  useFrame((_, delta) => {
    if (playing) time.current += Math.min(delta, 0.05) * Number(speed);
    const phase = time.current + index;
    if (arm.current) {
      arm.current.rotation.y = Math.sin(phase) * (kind === "handling" || kind === "palletizing" ? 0.85 : 0.25);
      if (kind === "transport") arm.current.position.x = Math.sin(phase * 0.7) * 0.65;
    }
    if (tool.current) {
      tool.current.position.set(0, 0, 0);
      tool.current.rotation.set(0, 0, 0);
      if (kind === "finishing" || kind === "coating" || kind === "welding") {
        tool.current.position.z = Math.sin(phase * 2) * 0.2;
        tool.current.rotation.y = Math.sin(phase) * 0.15;
      } else if (kind === "filling" || kind === "sealing" || kind === "assembly") {
        tool.current.position.y = 0.1 + Math.sin(phase * 2) * 0.1;
      } else if (kind === "inspection" || kind === "labeling") {
        tool.current.position.x = Math.sin(phase) * 0.12;
      } else {
        tool.current.position.y = 0.12 * Math.sin(phase * 2);
      }
    }
  });
  return <group position={stationPosition(index)} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
    <Block at={[0, 0.04, 0]} size={[3.8, 0.08, 3.6]} color={selected ? "#234d70" : "#253449"} />
    <Block at={[0, 0.09, 1.7]} size={[3.8, 0.025, 0.05]} color={process.automation === "semi" ? "#fbbf24" : profile.color} />
    <Html position={[0, 2.8, 0]} center distanceFactor={16} style={{ pointerEvents: "none" }}>
      <div className={`w-36 rounded-md border px-2 py-1 text-center text-xs shadow-lg ${selected ? "border-sky-400 bg-slate-800 text-white" : "border-slate-600 bg-slate-900/90 text-slate-200"}`}>
        <b className="block">{String(index + 1).padStart(2, "0")} · {process.short}</b>
        <span className="text-[10px] text-slate-300">{profile.label}</span>
      </div>
    </Html>
    {kind === "transport" ? <group ref={arm}>
      <Block at={[0, 0.35, 0]} size={[1.4, 0.45, 1.1]} color={profile.color} />
      <Block at={[0, 0.75, 0]} size={[1, 0.4, 0.8]} color="#ba9261" />
      {[-0.5, 0.5].flatMap(x => [-0.45, 0.45].map(z => <mesh key={`${x}-${z}`} position={[x, 0.2, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.18, 0.18, 0.14, 12]} /><meshStandardMaterial color="#0f172a" /></mesh>))}
    </group> : <>
      <Block at={[-0.7, 0.3, 0]} size={[0.7, 0.5, 0.7]} color="#475569" />
      <group ref={arm} position={[-0.7, 0.55, 0]}>
        <Block at={[0, 0.5, 0]} size={[0.28, 1, 0.3]} color={profile.color} />
        <mesh position={[0, 1, 0]}><sphereGeometry args={[0.22, 12, 12]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
        <Block at={[0.5, 1, 0]} size={[1, 0.23, 0.25]} color={profile.color} />
        <group ref={tool}>
          <Block at={[1, 0.72, 0]} size={[0.16, 0.5, 0.18]} color="#e2e8f0" />
          <Tool kind={kind} color={profile.color} />
        </group>
      </group>
      <Block at={[0.85, 0.55, 0]} size={[1.1, 0.12, 1.2]} color="#64748b" />
      <Block at={[0.85, 0.28, 0]} size={[0.16, 0.5, 0.8]} color="#475569" />
      <Block at={[0.85, 0.72, 0]} size={[0.55, 0.2, 0.5]} color={kind === "packing" || kind === "palletizing" ? "#ba9261" : "#cbd5e1"} />
      {kind === "machining" && <><Block at={[1, 1.1, -0.7]} size={[1.5, 1.9, 0.16]} color="#94a3b8" /><Block at={[1.65, 1, 0]} size={[0.15, 1.7, 1.4]} color="#64748b" /></>}
      {kind === "inspection" && <><Block at={[1.3, 1.4, -0.45]} size={[0.12, 1.5, 0.12]} color="#94a3b8" /><Block at={[1.1, 2.1, -0.45]} size={[0.5, 0.25, 0.35]} color="#34d399" /></>}
      {kind === "palletizing" && [0, 1, 2].map(layer => <Block key={layer} at={[0.85, 0.95 + layer * 0.22, 0]} size={[0.7, 0.2, 0.65]} color="#ba9261" />)}
      {kind === "filling" && <mesh position={[0.85, 0.95, 0]}><cylinderGeometry args={[0.15, 0.18, 0.6, 16]} /><meshStandardMaterial color="#7dd3fc" transparent opacity={0.7} /></mesh>}
    </>}
  </group>;
}

function Tool({ kind, color }: { kind: ProcessKind; color: string }) {
  if (kind === "finishing") return <mesh position={[1, 0.43, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.06, 16]} /><meshStandardMaterial color={color} /></mesh>;
  if (["welding", "coating", "filling", "assembly", "sealing", "labeling"].includes(kind)) return <mesh position={[1, 0.4, 0]}><coneGeometry args={[0.09, 0.22, 12]} /><meshStandardMaterial color={color} emissive={kind === "welding" ? color : "#000000"} emissiveIntensity={0.5} /></mesh>;
  return <><Block at={[0.9, 0.39, 0]} size={[0.05, 0.22, 0.15]} color="#cbd5e1" /><Block at={[1.1, 0.39, 0]} size={[0.05, 0.22, 0.15]} color="#cbd5e1" /></>;
}

function Flow({ count, playing, speed }: { count: number; playing: boolean; speed: string }) {
  const markers = useRef<Group>(null);
  const time = useRef(0);
  useFrame((_, delta) => {
    if (playing) time.current += Math.min(delta, 0.05) * Number(speed) * 0.3;
    markers.current?.children.forEach((marker, index) => {
      const start = new Vector3(...stationPosition(index));
      const end = new Vector3(...stationPosition(index + 1));
      marker.position.lerpVectors(start, end, time.current % 1);
      marker.position.y = 0.25;
      marker.position.z += 1.95;
    });
  });
  return <>
    {Array.from({ length: Math.max(0, count - 1) }, (_, i) => {
      const a = new Vector3(...stationPosition(i));
      const b = new Vector3(...stationPosition(i + 1));
      return <group key={i} position={[(a.x + b.x) / 2, 0.14, (a.z + b.z) / 2 + 1.95]} rotation={[0, a.x === b.x ? Math.PI / 2 : 0, 0]}>
        <Block at={[0, 0, 0]} size={[4.5, 0.08, 0.22]} color="#426782" />
      </group>;
    })}
    <group ref={markers}>{Array.from({ length: Math.max(0, count - 1) }, (_, i) => <mesh key={i}><boxGeometry args={[0.22, 0.18, 0.22]} /><meshStandardMaterial color="#67e8f9" emissive="#0891b2" /></mesh>)}</group>
  </>;
}

function Camera({ count, view }: { count: number; view: string }) {
  const { camera } = useThree();
  const rows = Math.max(1, Math.ceil(count / 4));
  const centerX = Math.min(count - 1, 3) * 2.25;
  const centerZ = (rows - 1) * 2.25;
  const center: [number, number, number] = [centerX, 0, centerZ];
  useEffect(() => {
    const distance = Math.max(12, rows * 5);
    camera.position.set(centerX + (view === "top" ? 0 : distance * 0.65), view === "front" ? 5 : distance, centerZ + (view === "top" ? 0.01 : distance));
    camera.lookAt(centerX, 0, centerZ);
    camera.updateProjectionMatrix();
  }, [camera, centerX, centerZ, rows, view]);
  return <OrbitControls key={`${count}-${view}`} target={center} makeDefault minDistance={3} maxDistance={100} maxPolarAngle={Math.PI / 2.05} />;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="flex h-full items-center justify-center p-8 text-center text-slate-200">3D rendering is unavailable on this device. Use Factory Layout or Material Flow; every process remains listed below.</div> : this.props.children; }
}

export default function ProcessLine3D({ processes, playing, speed }: Props) {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState("iso");
  const [flow, setFlow] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  if (!processes.length) return <p>No processes available. Run the analysis first.</p>;
  const selectedIndex = Math.min(selected, processes.length - 1);
  const current = processes[selectedIndex];
  const profile = PROCESS_PROFILES[processKind(current)];
  const moving = playing && !reducedMotion;
  return <div className="overflow-hidden rounded-xl border border-border">
    <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3">
      <div><h3 className="font-semibold">Complete production line</h3><p className="text-xs text-muted-foreground">{processes.length} of {processes.length} processes shown · {new Set(processes.map(processKind)).size} motion families</p></div>
      <div className="flex flex-wrap gap-2">{["iso", "top", "front"].map(v => <button type="button" key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-md border px-3 py-1 text-xs ${view === v ? "bg-primary text-primary-foreground" : "bg-background"}`}>{v === "iso" ? "3D overview" : `${v === "top" ? "Top" : "Front"} view`}</button>)}<button type="button" aria-pressed={flow} onClick={() => setFlow(!flow)} className="rounded-md border bg-background px-3 py-1 text-xs">Material flow: {flow ? "On" : "Off"}</button></div>
    </div>
    <div className="relative h-[480px] bg-[#111c2d] sm:h-[560px]">
      <SceneBoundary><Canvas shadows dpr={[1, 1.5]} camera={{ fov: 45, near: 0.1, far: 200 }} fallback={<p className="p-8 text-white">WebGL unavailable. Use the process list below or the 2D previews.</p>}>
        <color attach="background" args={["#111c2d"]} /><ambientLight intensity={0.8} /><hemisphereLight args={["#dbeafe", "#334155", 1.5]} /><directionalLight position={[8, 16, 10]} intensity={2} />
        <Suspense fallback={null}>
          {processes.map((process, i) => <Cell key={`${i}-${process.name}`} process={process} index={i} selected={selectedIndex === i} onSelect={() => setSelected(i)} playing={moving} speed={speed} />)}
          {flow && <Flow count={processes.length} playing={moving} speed={speed} />}
          <gridHelper args={[80, 80, "#334155", "#1e293b"]} />
          <Camera count={processes.length} view={view} />
        </Suspense>
      </Canvas></SceneBoundary>
      <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-950/80 px-3 py-2 text-xs text-slate-300">Drag to orbit · Scroll to zoom · Select a station{reducedMotion ? " · Reduced motion enabled" : ""}</p>
    </div>
    <div className="grid gap-4 bg-card p-4 md:grid-cols-[240px_1fr]">
      <nav aria-label="Process stations" className="max-h-64 space-y-1 overflow-y-auto">{processes.map((p, i) => <button type="button" key={`${i}-${p.name}`} aria-pressed={i === selectedIndex} onClick={() => setSelected(i)} className={`block w-full rounded-md px-3 py-2 text-left text-sm ${i === selectedIndex ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{i + 1}. {p.name}</button>)}</nav>
      <section aria-live="polite"><h3 className="font-semibold">{current.name}</h3><p className="mt-1 text-sm text-muted-foreground">{current.robot.model} · {current.automation === "semi" ? "Operator-assisted" : "Fully automated"}</p>
        <div className="my-3 flex flex-wrap gap-2">{profile.skills.map((skill, i) => <span key={skill} className="rounded-full bg-muted px-3 py-1 text-xs">{i + 1}. {skill}</span>)}</div>
        <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Required tooling</dt><dd>{current.eoat.join(", ")}</dd></div><div><dt className="text-xs text-muted-foreground">Analysis cycle estimate</dt><dd>{current.cycleTimeAutomated}</dd></div><div><dt className="text-xs text-muted-foreground">Robot specification from analysis</dt><dd>{current.robot.payload} · {current.robot.reach}</dd></div><div><dt className="text-xs text-muted-foreground">Material sequence</dt><dd>{selectedIndex === 0 ? "Infeed" : processes[selectedIndex - 1].short} → {current.short} → {processes[selectedIndex + 1]?.short ?? "Dispatch"}</dd></div></dl>
      </section>
    </div>
    <p className="border-t px-4 py-3 text-xs text-muted-foreground">Conceptual process visualization. Geometry and motion are illustrative; cycle values come from the analysis, not measured simulation. Robot kinematics, collision clearance, tooling and safety require engineering validation.</p>
  </div>;
}
