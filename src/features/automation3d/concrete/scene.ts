/**
 * Three.js view of the construction printing cell. Reads the engine state
 * every frame; it never drives the process itself.
 *
 * World units are metres, Y up. Platform X → world x, platform Y → world z.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ConcretePrinterSystem } from "./engine";
import { BED, PURGE } from "./path";

export type ViewName = "iso" | "front" | "top" | "nozzle";

const W = (x: number) => x / 1000 - BED.x / 2000;
const D = (y: number) => y / 1000 - BED.y / 2000;
const H = (z: number) => z / 1000;

const GANTRY_TOP = 2.0;
const POST_X = BED.x / 2000 + 0.28;
const POST_Z = BED.y / 2000 + 0.28;

function label(text: string, color = "#e2e8f0") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(11,18,32,0.78)";
  g.fillRect(0, 8, 256, 48);
  g.font = "500 26px 'IBM Plex Mono', ui-monospace, monospace";
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text.toUpperCase(), 128, 33);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(0.8, 0.2, 1);
  s.renderOrder = 10;
  return s;
}

export function createPrinterScene(container: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b1220");
  scene.fog = new THREE.Fog("#0b1220", 14, 30);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(0, 0.5, 0);

  scene.add(new THREE.HemisphereLight("#cbd5e1", "#1e293b", 0.9));
  const sun = new THREE.DirectionalLight("#ffffff", 1.6);
  sun.position.set(4, 7, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
  scene.add(sun);

  const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15, ...extra });
  const box = (w: number, h: number, d: number, m: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  /* floor and platform */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat("#111827", { roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  scene.add(floor);
  const slab = box(BED.x / 1000 + 0.3, 0.06, BED.y / 1000 + 0.3, mat("#1e293b", { roughness: 0.95 }));
  slab.position.y = -0.03;
  scene.add(slab);
  const grid = new THREE.GridHelper(3.2, 16, "#64748b", "#374151");
  grid.scale.z = BED.y / BED.x;
  grid.position.y = 0.002;
  scene.add(grid);

  /* gantry */
  const yellow = mat("#f59e0b", { metalness: 0.3, roughness: 0.5 });
  const steel = mat("#94a3b8", { metalness: 0.6, roughness: 0.35 });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const post = box(0.12, GANTRY_TOP, 0.12, yellow);
      post.position.set(sx * POST_X, GANTRY_TOP / 2, sz * POST_Z);
      scene.add(post);
    }
  for (const sx of [-1, 1]) {
    const rail = box(0.14, 0.14, POST_Z * 2 + 0.14, yellow);
    rail.position.set(sx * POST_X, GANTRY_TOP, 0);
    scene.add(rail);
  }
  const bridge = box(POST_X * 2 + 0.2, 0.16, 0.18, yellow);
  bridge.position.y = GANTRY_TOP + 0.13;
  scene.add(bridge);
  const carriage = box(0.34, 0.3, 0.34, steel);
  scene.add(carriage);
  const ram = box(0.1, 1.6, 0.1, steel);
  scene.add(ram);
  const head = new THREE.Group();
  const nozzleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 20), mat("#334155", { metalness: 0.5 }));
  nozzleBody.position.y = 0.18;
  const nozzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.028, 0.1, 20), mat("#cbd5e1", { metalness: 0.7, roughness: 0.3 }));
  nozzleTip.position.y = 0.05;
  const valveBody = box(0.16, 0.06, 0.1, mat("#1f2937"));
  valveBody.position.y = 0.29;
  const sensor = box(0.05, 0.05, 0.05, mat("#22d3ee", { emissive: "#0891b2", emissiveIntensity: 0.6 }));
  sensor.position.set(0.11, 0.1, 0);
  head.add(nozzleBody, nozzleTip, valveBody, sensor);
  scene.add(head);
  const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), new THREE.MeshBasicMaterial({ color: "#ef4444" }));
  scene.add(laser);
  const extrudate = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 12), mat("#6b6f76", { roughness: 1 }));
  scene.add(extrudate);

  /* material system (outside the platform, left side) */
  const matX = -POST_X - 1.2;
  const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.4, 24), mat("#cbd5e1", { transparent: true, opacity: 0.35 }));
  silo.position.set(matX - 0.9, 1.6, 0.9);
  const siloCone = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.1, 0.5, 24), mat("#94a3b8"));
  siloCone.position.set(matX - 0.9, 0.15, 0.9);
  const siloFill = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 24), mat("#d6d3d1", { roughness: 1 }));
  scene.add(silo, siloCone, siloFill);

  const mixerDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 24), mat("#2563eb", { metalness: 0.3 }));
  mixerDrum.rotation.z = Math.PI / 2;
  mixerDrum.position.set(matX, 1.55, 0.9);
  mixerDrum.castShadow = true;
  const mixerStripe = box(0.92, 0.06, 0.86, mat("#e2e8f0"));
  mixerDrum.add(mixerStripe);
  mixerStripe.rotation.z = -Math.PI / 2;
  for (const sx of [-0.45, 0.45])
    for (const sz of [-0.35, 0.35]) {
      const leg = box(0.06, 1.15, 0.06, steel);
      leg.position.set(matX + sx, 0.57, 0.9 + sz);
      scene.add(leg);
    }
  scene.add(mixerDrum);

  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.14, 0.75, 4, 1, true), mat("#64748b", { side: THREE.DoubleSide, metalness: 0.4 }));
  hopper.rotation.y = Math.PI / 4;
  hopper.position.set(matX, 1.0, -0.4);
  const hopperFill = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.16, 1, 4), mat("#6b6f76", { roughness: 1 }));
  hopperFill.rotation.y = Math.PI / 4;
  for (const sx of [-0.3, 0.3])
    for (const sz of [-0.3, 0.3]) {
      const leg = box(0.05, 0.65, 0.05, steel);
      leg.position.set(matX + sx, 0.32, -0.4 + sz);
      scene.add(leg);
    }
  scene.add(hopper, hopperFill);

  const pump = box(0.9, 0.45, 0.5, mat("#dc2626", { metalness: 0.3 }));
  pump.position.set(matX, 0.23, -1.35);
  const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16), mat("#111827"));
  flywheel.rotation.x = Math.PI / 2;
  flywheel.position.set(matX - 0.3, 0.3, -1.08);
  const spoke = box(0.3, 0.03, 0.02, mat("#f8fafc"));
  spoke.position.set(0, 0.04, 0);
  flywheel.add(spoke);
  scene.add(pump, flywheel);

  /* purge bin */
  const purge = box(0.3, 0.2, 0.3, mat("#78716c"));
  purge.position.set(W(PURGE.x), 0.1, D(PURGE.y));
  scene.add(purge);

  /* control cabinet with HMI, stack light and E-stop */
  const cab = box(0.8, 1.8, 0.4, mat("#cbd5e1", { metalness: 0.2 }));
  cab.position.set(POST_X + 1.3, 0.9, -POST_Z - 0.6);
  const hmi = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), new THREE.MeshStandardMaterial({ color: "#0f172a", emissive: "#1d4ed8", emissiveIntensity: 0.5 }));
  hmi.position.set(cab.position.x, 1.25, cab.position.z + 0.205);
  const estop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 20), mat("#dc2626", { emissive: "#7f1d1d" }));
  estop.rotation.x = Math.PI / 2;
  estop.position.set(cab.position.x + 0.25, 0.95, cab.position.z + 0.225);
  const lamps = ["#ef4444", "#f59e0b", "#22c55e"].map((c, k) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.05, transparent: true, opacity: 0.9 }));
    m.position.set(cab.position.x + 0.25, 1.86 + (2 - k) * 0.105, cab.position.z);
    scene.add(m);
    return m;
  });
  scene.add(cab, hmi, estop);

  /* safety fence with interlocked gate */
  const fenceMat = new THREE.MeshStandardMaterial({ color: "#facc15", transparent: true, opacity: 0.12, side: THREE.DoubleSide });
  const postMat = mat("#facc15");
  const fx = POST_X + 0.6, fz = POST_Z + 0.55;
  const panels: [number, number, number, number][] = [
    [0, -fz, fx * 2, 0], [0, fz, fx * 2, 0], [-fx, 0, fz * 2, Math.PI / 2], [fx, 0.45, fz * 2 - 0.9, Math.PI / 2],
  ];
  for (const [x, z, len, rot] of panels) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.4), fenceMat);
    p.position.set(x, 0.7, z);
    p.rotation.y = rot;
    scene.add(p);
  }
  for (const [x, z] of [[-fx, -fz], [fx, -fz], [-fx, fz], [fx, fz], [fx, -fz + 0.9]]) {
    const p = box(0.05, 1.45, 0.05, postMat);
    p.position.set(x, 0.72, z);
    scene.add(p);
  }
  const gatePivot = new THREE.Group();
  gatePivot.position.set(fx, 0, -fz);
  const gate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), new THREE.MeshStandardMaterial({ color: "#facc15", transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  gate.position.set(0, 0.7, 0.45);
  gate.rotation.y = Math.PI / 2;
  gatePivot.add(gate);
  scene.add(gatePivot);

  /* labels */
  const tags: [string, THREE.Vector3][] = [
    ["Silo", new THREE.Vector3(matX - 0.9, 3.05, 0.9)],
    ["Mixer", new THREE.Vector3(matX, 2.15, 0.9)],
    ["Hopper", new THREE.Vector3(matX, 1.62, -0.4)],
    ["Pump", new THREE.Vector3(matX, 0.72, -1.35)],
    ["PLC / HMI", new THREE.Vector3(cab.position.x, 2.35, cab.position.z)],
    ["Purge", new THREE.Vector3(W(PURGE.x), 0.45, D(PURGE.y))],
  ];
  for (const [t, v] of tags) {
    const s = label(t);
    s.position.copy(v);
    scene.add(s);
  }

  /* hose */
  const hoseMat = new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.8 });
  let hose: THREE.Mesh | null = null;
  const pumpOut = new THREE.Vector3(matX + 0.45, 0.35, -1.35);

  /* printed beads */
  const beadGeo = new THREE.BoxGeometry(1, 1, 1);
  const beadMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  let beads: THREE.InstancedMesh | null = null;
  let drawn = 0;
  let colouredLayer = -1;
  const tmp = new THREE.Object3D();
  const col = new THREE.Color();
  const wet = new THREE.Color("#8d9096");
  const cured = new THREE.Color("#dcd8ce");
  const thin = new THREE.Color("#b45309");

  function ensureBeads(sys: ConcretePrinterSystem) {
    const need = sys.beads.length;
    if (beads && need < drawn) {
      // Job restarted: redraw from the start.
      drawn = 0;
      colouredLayer = -1;
    }
    if (beads && need <= (beads.userData.cap as number)) return;
    const cap = Math.max(need + 500, Math.ceil((sys.layerLen / 40 + 8) * sys.job.layers) + 200);
    if (beads) {
      scene.remove(beads);
      beads.dispose();
    }
    beads = new THREE.InstancedMesh(beadGeo, beadMat, cap);
    beads.userData.cap = cap;
    beads.count = 0;
    beads.castShadow = true;
    beads.receiveShadow = true;
    beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(beads);
    drawn = 0;
    colouredLayer = -1;
  }

  function beadColour(sys: ConcretePrinterSystem, layer: number, w: number) {
    const age = Math.min(1, (sys.layer - layer) / 6);
    col.copy(wet).lerp(cured, age);
    if (w < 0.8) col.lerp(thin, 0.55);
    return col;
  }

  function updateBeads(sys: ConcretePrinterSystem) {
    ensureBeads(sys);
    if (!beads) return;
    const h = sys.job.layerHeight / 1000;
    const bw = sys.job.beadWidth / 1000;
    for (let k = drawn; k < sys.beads.length; k++) {
      const b = sys.beads[k];
      const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1) / 1000;
      tmp.position.set(W((b.x1 + b.x2) / 2), H(b.z), D((b.y1 + b.y2) / 2));
      tmp.rotation.set(0, -Math.atan2(b.y2 - b.y1, b.x2 - b.x1), 0);
      tmp.scale.set(len + 0.006, h * 0.96, bw * b.w);
      tmp.updateMatrix();
      beads.setMatrixAt(k, tmp.matrix);
      beads.setColorAt(k, beadColour(sys, b.layer, b.w));
    }
    if (sys.beads.length !== drawn) {
      beads.count = sys.beads.length;
      beads.instanceMatrix.needsUpdate = true;
      if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
      drawn = sys.beads.length;
    }
    // Recolour older layers as they cure.
    if (sys.layer !== colouredLayer) {
      colouredLayer = sys.layer;
      for (let k = 0; k < sys.beads.length; k++) beads.setColorAt(k, beadColour(sys, sys.beads[k].layer, sys.beads[k].w));
      if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    }
  }

  /* views */
  let follow = false;
  function setView(v: ViewName) {
    follow = v === "nozzle";
    const views: Record<ViewName, [number, number, number]> = {
      iso: [3.9, 3.0, 4.3],
      front: [0, 1.8, 6.8],
      top: [0.01, 8.5, 0.01],
      nozzle: [2.2, 1.6, 2.2],
    };
    const [x, y, z] = views[v];
    camera.position.set(x, y, z);
    controls.target.set(0, 0.25, 0);
    controls.update();
  }
  setView("iso");

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let lastHoseKey = "";

  function update(sys: ConcretePrinterSystem, dt: number) {
    const x = W(sys.act.x), z = D(sys.act.y), tip = H(sys.act.z);
    bridge.position.z = z;
    carriage.position.set(x, GANTRY_TOP + 0.13, z);
    ram.position.set(x, tip + 0.34 + 0.8, z);
    head.position.set(x, tip, z);

    const q = sys.q;
    // Laser height sensor beam to the surface below.
    const hm = sys.i.nozzleHeight;
    laser.visible = !Number.isNaN(hm) && hm < 300;
    if (laser.visible) {
      const len = Math.max(0.005, hm / 1000);
      laser.scale.y = len;
      laser.position.set(x + 0.11, tip - len / 2 + 0.075, z);
    }
    extrudate.visible = q.nozzleValve && sys.i.flow > 0.3;
    if (extrudate.visible) {
      const len = Math.max(0.01, sys.job.layerHeight / 1000);
      extrudate.scale.set(Math.min(1.4, sys.i.flow / 6), len, Math.min(1.4, sys.i.flow / 6));
      extrudate.position.set(x, tip - len / 2, z);
    }

    // Material system.
    const siloFrac = Math.max(0.001, sys.silo / 100);
    siloFill.scale.y = 2.3 * siloFrac;
    siloFill.position.set(matX - 0.9, 0.42 + (2.3 * siloFrac) / 2, 0.9);
    if (sys.mixer.running) mixerDrum.rotation.x += dt * 2.5;
    const hopFrac = Math.max(0.001, sys.hopper / 200);
    hopperFill.scale.set(0.35 + 0.65 * hopFrac, 0.7 * hopFrac, 0.35 + 0.65 * hopFrac);
    hopperFill.position.set(matX, 0.63 + (0.7 * hopFrac) / 2, -0.4);
    flywheel.rotation.y += dt * (sys.pumpRpm / 100) * 18;

    // Hose from the pump outlet over the gantry to the print head; red tint with pressure.
    const key = `${x.toFixed(2)}|${z.toFixed(2)}|${tip.toFixed(2)}`;
    if (key !== lastHoseKey) {
      lastHoseKey = key;
      const curve = new THREE.CatmullRomCurve3([
        pumpOut,
        new THREE.Vector3(-POST_X - 0.3, 1.2, -POST_Z + 0.2),
        new THREE.Vector3(-POST_X, GANTRY_TOP + 0.35, z - 0.25),
        new THREE.Vector3((x - POST_X) / 2, GANTRY_TOP + 0.5, z - 0.2),
        new THREE.Vector3(x, Math.max(tip + 1.95, GANTRY_TOP + 0.45), z - 0.05),
        new THREE.Vector3(x, tip + 0.32, z),
      ]);
      const geo = new THREE.TubeGeometry(curve, 80, 0.025, 8, false);
      if (hose) {
        hose.geometry.dispose();
        hose.geometry = geo;
      } else {
        hose = new THREE.Mesh(geo, hoseMat);
        hose.castShadow = true;
        scene.add(hose);
      }
    }
    hoseMat.color.set("#111827").lerp(new THREE.Color("#dc2626"), Math.min(1, Math.max(0, (sys.i.pressure - 12) / 16)));

    // Stack light, HMI glow, E-stop, gate.
    const [red, amber, green] = lamps;
    (red.material as THREE.MeshStandardMaterial).emissiveIntensity = q.beaconRed ? 2.2 : 0.05;
    (amber.material as THREE.MeshStandardMaterial).emissiveIntensity = q.beaconAmber ? 2 : 0.05;
    (green.material as THREE.MeshStandardMaterial).emissiveIntensity = q.beaconGreen ? 2 : 0.05;
    (hmi.material as THREE.MeshStandardMaterial).emissive.set(q.beaconRed ? "#b91c1c" : q.beaconGreen ? "#15803d" : "#1d4ed8");
    estop.position.z = cab.position.z + (sys.estopPressed ? 0.212 : 0.225);
    const open = sys.injected.has("guardOpen");
    gatePivot.rotation.y += ((open ? -1.2 : 0) - gatePivot.rotation.y) * Math.min(1, dt * 4);

    updateBeads(sys);

    if (follow) {
      controls.target.lerp(new THREE.Vector3(x, tip, z), 0.1);
    }
    controls.update();
    renderer.render(scene, camera);
  }

  function dispose() {
    ro.disconnect();
    controls.dispose();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const material = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((x) => x.dispose());
      else material?.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { update, setView, dispose };
}
