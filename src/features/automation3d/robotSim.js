/**
 * RobotVerse Automation Studio 3D — simulation engine
 * Framework-free. THREE and OrbitControls are passed in, so the same file
 * works in the React app (npm "three") and in a plain HTML page (CDN).
 *
 * Coordinates: metres, Y up, robot base at world origin.
 */

export const ROBOT_SIZES = {
  compact: { key: "compact", label: "Compact", reach: 0.95, payload: 7, scale: 0.66 },
  medium: { key: "medium", label: "Medium", reach: 1.45, payload: 20, scale: 1 },
  large: { key: "large", label: "Large", reach: 2.05, payload: 165, scale: 1.41 },
};

export const STATION_NAMES = {
  conveyor: "Infeed conveyor",
  cnc: "CNC machine",
  table: "Work table",
  pallet: "Pallet",
  vision: "Vision camera",
  weld: "Welding table",
};

export const PRESETS = {
  "Machine tending":
    "Pick part from conveyor\nLoad CNC\nRun machining cycle\nUnload CNC\nInspect with camera\nStack on pallet",
  Palletizing: "Pick box from conveyor\nStack on pallet",
  "Pick and place": "Pick part from conveyor\nInspect with camera\nPlace on work table",
  Welding:
    "Pick part from conveyor\nPlace on welding table\nWeld seam\nPick from welding table\nStack on pallet",
};

/* Text -> process steps */

function detectStation(c) {
  if (/weld/.test(c)) return "weld";
  if (/conveyor|belt|infeed/.test(c)) return "conveyor";
  if (/\bcnc\b|machine|lathe|\bmill|\bvmc\b|press/.test(c)) return "cnc";
  if (/pallet|\bbox\b|\bbin\b|carton|stack/.test(c)) return "pallet";
  if (/table|fixture|\bjig\b|tray|bench/.test(c)) return "table";
  if (/camera|vision/.test(c)) return "vision";
  return null;
}

const DEFAULT_STATION = { pick: "conveyor", place: "pallet", inspect: "vision", weld: "weld", process: "cnc", wait: null };

export function stepLabel(step) {
  const n = STATION_NAMES[step.station] || "";
  switch (step.action) {
    case "pick":
      return step.station === "cnc" ? "Unload from CNC" : `Pick from ${n.toLowerCase()}`;
    case "place":
      if (step.station === "cnc") return "Load into CNC";
      if (step.station === "pallet") return "Stack on pallet";
      return `Place on ${n.toLowerCase()}`;
    case "process":
      return "Run CNC cycle";
    case "inspect":
      return "Inspect with camera";
    case "weld":
      return "Weld seam";
    default:
      return "Wait";
  }
}

export function parseProcess(text) {
  const clauses = String(text || "")
    .toLowerCase()
    .split(/\n|→|->|,|;|\band then\b|\bthen\b|\.(?=\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const steps = [];
  const notes = [];
  let holding = false;

  for (const c of clauses) {
    let action = null;
    if (/\bunload/.test(c)) action = "pick";
    else if (/\bload\b|\binsert/.test(c)) action = "place";
    else if (/\bweld/.test(c) && !/(on|onto|to) (the )?weld/.test(c) && !/from (the )?weld/.test(c)) action = "weld";
    else if (/\b(pick|take|grab|lift|collect|get)\b/.test(c)) action = "pick";
    else if (/\b(place|put|drop|stack|palleti[sz]e|deliver|transfer|set down)\b/.test(c)) action = "place";
    else if (/\b(inspect|check|scan|measure|camera|vision|quality)\b/.test(c)) action = "inspect";
    else if (/\b(machin\w*|process|cut|drill|turn|cycle)\b/.test(c)) action = "process";
    else if (/\b(wait|pause|hold)\b/.test(c)) action = "wait";

    if (!action) {
      notes.push(`Not understood, skipped: "${c}"`);
      continue;
    }

    let station = detectStation(c);
    if (action === "inspect") station = "vision";
    if (action === "process") station = "cnc";
    if (action === "weld") station = "weld";
    if (action === "place" && station === "vision") station = null;
    if (!station) station = DEFAULT_STATION[action];

    if (action === "pick" && holding) notes.push(`"${c}": the robot is already holding a part here.`);
    if (action === "place" && !holding) notes.push(`"${c}": nothing is being held at this point, so this step will be skipped.`);
    if (action === "pick") holding = true;
    if (action === "place") holding = false;

    const step = { action, station };
    step.label = stepLabel(step);
    steps.push(step);
  }

  if (!steps.length) notes.push("No steps found. Try lines like: Pick part from conveyor, Load CNC, Stack on pallet.");
  return { steps, notes };
}

/* Simulation */

const PART = { w: 0.1, h: 0.09, d: 0.1 };
const TOOL_LEN = 0.16;
const APPROACH = 0.22;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createSimulation({ THREE, OrbitControls, container, onUpdate }) {
  const LIGHT_K = Number(THREE.REVISION) >= 155 ? Math.PI : 1;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2433);
  scene.fog = new THREE.Fog(0x1a2433, 7, 16);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 1.2;
  controls.maxDistance = 12;

  scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x2a3240, 0.75 * LIGHT_K));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95 * LIGHT_K);
  sun.position.set(3.5, 6, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8fb6ff, 0.35 * LIGHT_K);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  const M = {
    body: new THREE.MeshStandardMaterial({ color: 0xe9edf2, metalness: 0.25, roughness: 0.38 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b3442, metalness: 0.5, roughness: 0.45 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x4a90e2, metalness: 0.3, roughness: 0.35 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8e99a6, metalness: 0.7, roughness: 0.35 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x3a4555, metalness: 0.4, roughness: 0.55 }),
    machine: new THREE.MeshStandardMaterial({ color: 0xd4d9e0, metalness: 0.2, roughness: 0.5 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xb9905e, metalness: 0, roughness: 0.85 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc4ea, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.35 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xf2b705, metalness: 0.2, roughness: 0.5 }),
  };

  const box = (w, h, d, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const cyl = (r, h, mat, seg = 32) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({ color: 0x243041, metalness: 0.1, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(14, 28, 0x33445a, 0x2a384a);
  grid.position.y = 0.001;
  scene.add(grid);
  const zonePts = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    zonePts.push(new THREE.Vector3(Math.cos(a) * 2.05, 0.004, Math.sin(a) * 2.05));
  }
  const zone = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(zonePts),
    new THREE.LineDashedMaterial({ color: 0xf2b705, dashSize: 0.12, gapSize: 0.08 })
  );
  zone.computeLineDistances();
  scene.add(zone);

  function makeLabel(text) {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const fs = 44;
    ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width) + 48;
    c.width = w;
    c.height = 80;
    ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(14,22,33,0.82)";
    const r = 18;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, 80, r);
    ctx.arcTo(w, 80, 0, 80, r);
    ctx.arcTo(0, 80, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.fill();
    ctx.fillStyle = "#e6ecf3";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 24, 42);
    const tex = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set((w / 80) * 0.16, 0.16, 1);
    s.renderOrder = 10;
    return s;
  }

  const stations = {};

  {
    const g = new THREE.Group();
    const len = 1.9, wid = 0.4, topY = 0.78, cx = 1.55, cz = -0.75;
    const bed = box(len, 0.08, wid + 0.06, M.frame);
    bed.position.set(cx, topY - 0.05, cz);
    g.add(bed);
    const bc = document.createElement("canvas");
    bc.width = 256;
    bc.height = 32;
    const bctx = bc.getContext("2d");
    bctx.fillStyle = "#1f252d";
    bctx.fillRect(0, 0, 256, 32);
    bctx.fillStyle = "#2c343f";
    for (let i = 0; i < 256; i += 32) bctx.fillRect(i, 0, 14, 32);
    const beltTex = new THREE.CanvasTexture(bc);
    beltTex.wrapS = THREE.RepeatWrapping;
    beltTex.repeat.set(6, 1);
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.02, wid),
      new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.9 })
    );
    belt.position.set(cx, topY - 0.01, cz);
    belt.receiveShadow = true;
    g.add(belt);
    for (const dx of [-len / 2 + 0.1, len / 2 - 0.1]) {
      for (const dz of [-wid / 2, wid / 2]) {
        const leg = box(0.05, topY - 0.09, 0.05, M.frame);
        leg.position.set(cx + dx, (topY - 0.09) / 2, cz + dz);
        g.add(leg);
      }
    }
    const rail1 = box(len, 0.05, 0.02, M.amber);
    rail1.position.set(cx, topY + 0.02, cz - wid / 2 - 0.01);
    const rail2 = rail1.clone();
    rail2.position.z = cz + wid / 2 + 0.01;
    g.add(rail1, rail2);
    const stop = box(0.03, 0.08, wid, M.dark);
    stop.position.set(cx - len / 2 + 0.02, topY + 0.03, cz);
    g.add(stop);
    const lbl = makeLabel(STATION_NAMES.conveyor);
    lbl.position.set(cx + 0.3, topY + 0.45, cz);
    g.add(lbl);
    scene.add(g);
    stations.conveyor = {
      group: g,
      point: new THREE.Vector3(0.75, topY + PART.h / 2, cz),
      spawnX: cx + len / 2 - 0.1,
      beltTex,
    };
  }

  {
    const g = new THREE.Group();
    const cx = -1.45, cz = 0.1;
    const shell = box(0.95, 1.6, 1.0, M.machine);
    shell.position.set(cx, 0.8, cz);
    g.add(shell);
    const cavity = box(0.5, 0.55, 0.62, M.dark);
    cavity.position.set(cx + 0.24, 0.98, cz);
    g.add(cavity);
    const chuck = cyl(0.08, 0.06, M.steel);
    chuck.position.set(-1.0, 0.95 - PART.h / 2 - 0.03, cz);
    g.add(chuck);
    const door = new THREE.Group();
    const doorPanel = box(0.02, 0.62, 0.68, M.machine);
    const win = box(0.022, 0.4, 0.46, M.glass);
    win.castShadow = false;
    door.add(doorPanel, win);
    door.position.set(cx + 0.49, 0.98, cz);
    g.add(door);
    const beacon = cyl(0.04, 0.12, new THREE.MeshStandardMaterial({ color: 0x3fb950, emissive: 0x000000 }));
    beacon.position.set(cx + 0.3, 1.66, cz - 0.38);
    g.add(beacon);
    const panel = box(0.04, 0.3, 0.22, M.dark);
    panel.position.set(cx + 0.5, 1.25, cz + 0.42);
    g.add(panel);
    const lbl = makeLabel(STATION_NAMES.cnc);
    lbl.position.set(cx, 1.85, cz);
    g.add(lbl);
    scene.add(g);
    stations.cnc = { group: g, point: new THREE.Vector3(-1.0, 0.95, cz), door, doorY: 0.98, beacon, part: null };
  }

  const makeTable = (x, z, label, top = M.steel) => {
    const g = new THREE.Group();
    const topY = 0.72;
    const t = box(0.7, 0.05, 0.55, top);
    t.position.set(x, topY - 0.025, z);
    g.add(t);
    for (const dx of [-0.3, 0.3]) for (const dz of [-0.22, 0.22]) {
      const leg = box(0.05, topY - 0.05, 0.05, M.frame);
      leg.position.set(x + dx, (topY - 0.05) / 2, z + dz);
      g.add(leg);
    }
    const lbl = makeLabel(label);
    lbl.position.set(x, topY + 0.5, z);
    g.add(lbl);
    scene.add(g);
    return { group: g, point: new THREE.Vector3(x, topY + PART.h / 2, z), part: null, topY };
  };

  stations.table = makeTable(0.1, 1.08, STATION_NAMES.table);
  stations.weld = makeTable(-0.8, -0.95, STATION_NAMES.weld, M.dark);
  {
    const clampBar = box(0.5, 0.03, 0.03, M.amber);
    clampBar.position.set(-0.8, 0.735, -1.13);
    stations.weld.group.add(clampBar);
  }

  {
    const g = new THREE.Group();
    const cx = 1.0, cz = 0.85, topY = 0.14;
    for (let i = -2; i <= 2; i++) {
      const s = box(0.12, 0.025, 0.8, M.wood);
      s.position.set(cx + i * 0.2, topY - 0.0125, cz);
      g.add(s);
    }
    for (const dz of [-0.35, 0, 0.35]) {
      const b = box(1.0, 0.1, 0.1, M.wood);
      b.position.set(cx, 0.05, cz + dz);
      g.add(b);
    }
    const lbl = makeLabel(STATION_NAMES.pallet);
    lbl.position.set(cx, 0.75, cz + 0.2);
    g.add(lbl);
    scene.add(g);
    const slots = [];
    for (let layer = 0; layer < 2; layer++)
      for (const dx of [-0.2, 0, 0.2]) for (const dz of [-0.14, 0.14])
        slots.push(new THREE.Vector3(cx + dx, topY + PART.h / 2 + layer * PART.h, cz + dz));
    stations.pallet = { group: g, slots, parts: [], point: slots[0] };
  }

  {
    const g = new THREE.Group();
    const px = 1.45, pz = 0.12;
    const post = box(0.06, 1.95, 0.06, M.frame);
    post.position.set(px, 0.975, pz);
    g.add(post);
    const arm = box(0.55, 0.05, 0.05, M.frame);
    arm.position.set(px - 0.27, 1.92, pz);
    g.add(arm);
    const cam = box(0.12, 0.1, 0.1, M.dark);
    cam.position.set(0.95, 1.86, pz);
    g.add(cam);
    const lens = cyl(0.03, 0.04, M.accent);
    lens.position.set(0.95, 1.79, pz);
    g.add(lens);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.7, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4a90e2, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })
    );
    cone.position.set(0.95, 1.43, pz);
    g.add(cone);
    const lbl = makeLabel(STATION_NAMES.vision);
    lbl.position.set(px, 2.15, pz);
    g.add(lbl);
    scene.add(g);
    stations.vision = { group: g, point: new THREE.Vector3(0.95, 1.08, pz), cone };
  }

  const sparkCount = 60;
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(sparkCount * 3), 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({ color: 0xffd27a, size: 0.025, transparent: true, opacity: 0.95, depthWrite: false })
  );
  sparks.visible = false;
  scene.add(sparks);
  const sparkVel = Array.from({ length: sparkCount }, () => new THREE.Vector3());
  const sparkLife = new Float32Array(sparkCount);

  let robot = null;
  let sizeKey = "medium";

  function buildRobot(s) {
    const dims = { h1: 0.45 * s, a1: 0.15 * s, L2: 0.7 * s, L3: 0.75 * s, d6: 0.09 * s };
    dims.dTool = dims.d6 + TOOL_LEN;
    const root = new THREE.Group();

    const base = cyl(0.22 * s, 0.12 * s, M.dark);
    base.position.y = 0.06 * s;
    root.add(base);

    const j1 = new THREE.Group();
    j1.position.y = 0.12 * s;
    root.add(j1);
    const turret = cyl(0.19 * s, 0.18 * s, M.body);
    turret.position.y = 0.09 * s;
    j1.add(turret);
    const shoulderBlock = box(0.3 * s, dims.h1 - 0.12 * s - 0.18 * s + 0.12 * s, 0.3 * s, M.body);
    shoulderBlock.position.set(dims.a1 * 0.6, 0.18 * s + (dims.h1 - 0.12 * s - 0.18 * s) / 2, 0);
    j1.add(shoulderBlock);

    const j2 = new THREE.Group();
    j2.position.set(dims.a1, dims.h1 - 0.12 * s, 0);
    j1.add(j2);
    const m2 = cyl(0.12 * s, 0.34 * s, M.dark);
    m2.rotation.x = Math.PI / 2;
    j2.add(m2);
    const cap2 = cyl(0.07 * s, 0.36 * s, M.accent);
    cap2.rotation.x = Math.PI / 2;
    j2.add(cap2);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.085 * s, dims.L2 - 0.17 * s, 8, 20), M.body);
    upper.castShadow = true;
    upper.position.y = dims.L2 / 2;
    j2.add(upper);

    const j3 = new THREE.Group();
    j3.position.set(0, dims.L2, 0);
    j2.add(j3);
    const m3 = cyl(0.1 * s, 0.28 * s, M.dark);
    m3.rotation.x = Math.PI / 2;
    j3.add(m3);
    const rear = box(0.2 * s, 0.16 * s, 0.2 * s, M.body);
    rear.position.x = -0.12 * s;
    j3.add(rear);
    const fore1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.075 * s, dims.L3 * 0.5 - 0.1 * s, 8, 20), M.body);
    fore1.castShadow = true;
    fore1.rotation.z = -Math.PI / 2;
    fore1.position.x = dims.L3 * 0.25;
    j3.add(fore1);

    const j4 = new THREE.Group();
    j4.position.set(dims.L3 * 0.5, 0, 0);
    j3.add(j4);
    const ring = cyl(0.078 * s, 0.03 * s, M.accent);
    ring.rotation.z = Math.PI / 2;
    j4.add(ring);
    const fore2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.06 * s, dims.L3 * 0.5 - 0.1 * s, 8, 20), M.body);
    fore2.castShadow = true;
    fore2.rotation.z = -Math.PI / 2;
    fore2.position.x = dims.L3 * 0.25;
    j4.add(fore2);

    const j5 = new THREE.Group();
    j5.position.set(dims.L3 * 0.5, 0, 0);
    j4.add(j5);
    const m5 = cyl(0.065 * s, 0.14 * s, M.dark);
    m5.rotation.x = Math.PI / 2;
    j5.add(m5);

    const j6 = new THREE.Group();
    j6.position.set(dims.d6, 0, 0);
    j5.add(j6);
    const flange = cyl(0.05, 0.02, M.accent);
    flange.rotation.z = Math.PI / 2;
    j6.add(flange);
    const gBody = box(0.07, 0.09, 0.16, M.dark);
    gBody.position.x = 0.045;
    j6.add(gBody);
    const fingers = [];
    for (const sgn of [-1, 1]) {
      const f = box(0.09, 0.035, 0.018, M.steel);
      f.position.set(0.12, 0, sgn * 0.075);
      j6.add(f);
      fingers.push(f);
    }
    const tip = new THREE.Object3D();
    tip.position.x = TOOL_LEN;
    j6.add(tip);

    scene.add(root);
    return { root, joints: [j1, j2, j3, j4, j5, j6], tip, fingers, dims, q: [0, 0, 0, 0, 0, 0] };
  }

  function disposeRobot() {
    if (!robot) return;
    scene.remove(robot.root);
    robot.root.traverse((o) => o.geometry && o.geometry.dispose());
  }

  function applyJoints(q) {
    const [j1, j2, j3, j4, j5, j6] = robot.joints;
    j1.rotation.y = q[0];
    j2.rotation.z = q[1];
    j3.rotation.z = q[2];
    j4.rotation.x = q[3];
    j5.rotation.z = q[4];
    j6.rotation.x = q[5];
    robot.q = q.slice();
  }

  function solveIK(P) {
    const d = robot.dims;
    const Wx = P.x, Wy = P.y + d.dTool, Wz = P.z;
    const q1 = Math.atan2(-Wz, Wx);
    let r = Math.hypot(Wx, Wz) - d.a1;
    let y = Wy - d.h1;
    let D = Math.hypot(r, y);
    let reachable = true;
    const maxD = (d.L2 + d.L3) * 0.998;
    const minD = Math.abs(d.L2 - d.L3) + 0.05;
    if (D > maxD) {
      r *= maxD / D;
      y *= maxD / D;
      D = maxD;
      reachable = false;
    } else if (D < minD) {
      const k = minD / Math.max(D, 1e-6);
      r *= k;
      y *= k;
      D = minD;
      reachable = false;
    }
    const phi = Math.atan2(y, r);
    const cosA = clamp((d.L2 * d.L2 + D * D - d.L3 * d.L3) / (2 * d.L2 * D), -1, 1);
    const alpha = phi + Math.acos(cosA);
    const ex = d.L2 * Math.cos(alpha), ey = d.L2 * Math.sin(alpha);
    const beta = Math.atan2(y - ey, r - ex);
    const q2 = alpha - Math.PI / 2;
    const q3 = beta - q2;
    const q5 = -Math.PI / 2 - beta;
    return { q: [q1, q2, q3, 0, q5, 0], reachable };
  }

  const tipWorld = () => robot.tip.getWorldPosition(new THREE.Vector3());

  function setFingers(open) {
    const z = open ? 0.075 : PART.d / 2 + 0.009;
    robot.fingers[0].position.z = -z;
    robot.fingers[1].position.z = z;
  }

  const HOME = new THREE.Vector3(0.85, 1.25, 0.05);

  const partGeo = new THREE.BoxGeometry(PART.w, PART.h, PART.d);
  const partMats = {
    raw: new THREE.MeshStandardMaterial({ color: 0x9aa7b5, metalness: 0.6, roughness: 0.4 }),
    machined: new THREE.MeshStandardMaterial({ color: 0xcfe0f2, metalness: 0.8, roughness: 0.22 }),
  };
  const parts = new Set();
  function spawnPart(pos) {
    const m = new THREE.Mesh(partGeo, partMats.raw);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData = { state: "raw" };
    m.position.copy(pos);
    scene.add(m);
    parts.add(m);
    return m;
  }
  function removePart(m) {
    if (!m) return;
    m.parent && m.parent.remove(m);
    parts.delete(m);
  }
  function addWeldMark(m) {
    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(PART.w * 0.9, 0.006, 0.012),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a, metalness: 0.4, roughness: 0.6 })
    );
    seam.position.y = PART.h / 2 + 0.003;
    m.add(seam);
  }

  let steps = [];
  let stepIdx = -1;
  let queue = [];
  let seg = null;
  let playing = true;
  let speed = 1;
  let simTime = 0;
  let cycleStart = 0;
  let cycles = 0;
  let lastCycle = null;
  let held = null;
  let conveyorPart = null;
  let unreachable = new Set();
  let events = [];
  let currentStation = null;

  const log = (msg) => {
    events.unshift({ t: simTime, msg });
    if (events.length > 6) events.length = 6;
  };

  function jointMove(getPoint, station) {
    let q0, q1, dur, t = 0;
    return {
      init() {
        const P = getPoint();
        const sol = solveIK(P);
        if (!sol.reachable && station) unreachable.add(station);
        q0 = robot.q.slice();
        q1 = sol.q;
        q1[0] = q0[0] + wrapPi(q1[0] - q0[0]);
        const maxDelta = Math.max(...q1.map((v, i) => Math.abs(v - q0[i])));
        dur = Math.max(0.55, maxDelta / 1.5);
      },
      update(dt) {
        t += dt;
        const k = smooth(clamp(t / dur, 0, 1));
        applyJoints(q0.map((v, i) => v + (q1[i] - v) * k));
        return t >= dur;
      },
    };
  }

  function linearMove(getPoint, station, vel = 0.35, onFrame) {
    let p0, p1, dur, t = 0;
    return {
      init() {
        p0 = tipWorld();
        p1 = getPoint().clone();
        dur = Math.max(0.25, p0.distanceTo(p1) / vel);
      },
      update(dt) {
        t += dt;
        const k = smooth(clamp(t / dur, 0, 1));
        const P = p0.clone().lerp(p1, k);
        const sol = solveIK(P);
        if (!sol.reachable && station) unreachable.add(station);
        applyJoints(sol.q);
        onFrame && onFrame(P, k);
        return t >= dur;
      },
    };
  }

  function gripper(open, onDone) {
    let t = 0;
    const dur = 0.3;
    const from = robot.fingers[1].position.z;
    const to = open ? 0.075 : PART.d / 2 + 0.009;
    return {
      init() {},
      update(dt) {
        t += dt;
        const z = from + (to - from) * smooth(clamp(t / dur, 0, 1));
        robot.fingers[0].position.z = -z;
        robot.fingers[1].position.z = z;
        if (t >= dur) {
          onDone && onDone();
          return true;
        }
        return false;
      },
    };
  }

  function dwell(dur, onStart, onEnd, onFrame) {
    let t = 0;
    return {
      init() {
        onStart && onStart();
      },
      update(dt) {
        t += dt;
        onFrame && onFrame(t / dur);
        if (t >= dur) {
          onEnd && onEnd();
          return true;
        }
        return false;
      },
    };
  }

  function waitUntil(cond) {
    return { init() {}, update: () => cond() };
  }

  function doorMove(open) {
    const c = stations.cnc;
    let t = 0;
    const dur = 0.45;
    let from;
    return {
      init() {
        from = c.door.position.y;
      },
      update(dt) {
        t += dt;
        const to = open ? c.doorY + 0.6 : c.doorY;
        c.door.position.y = from + (to - from) * smooth(clamp(t / dur, 0, 1));
        return t >= dur;
      },
    };
  }

  const above = (p) => p.clone().add(new THREE.Vector3(0, APPROACH, 0));

  function attach(part) {
    if (!part) return;
    robot.tip.attach(part);
    held = part;
  }

  function release(targetPos) {
    if (!held) return null;
    const p = held;
    scene.attach(p);
    p.position.copy(targetPos);
    p.rotation.set(0, 0, 0);
    held = null;
    return p;
  }

  function stationPoint(st) {
    if (st === "pallet") {
      const pal = stations.pallet;
      return pal.slots[pal.parts.length % pal.slots.length];
    }
    return stations[st].point;
  }

  function ensureConveyorPart() {
    if (!conveyorPart) {
      const c = stations.conveyor;
      conveyorPart = { mesh: spawnPart(new THREE.Vector3(c.spawnX, c.point.y, c.point.z)), ready: false };
    }
  }

  function buildSegments(step) {
    const s = step.station;
    const out = [];
    switch (step.action) {
      case "pick": {
        if (held) {
          log(`Skipped "${step.label}": already holding a part`);
          break;
        }
        if (s === "conveyor") {
          ensureConveyorPart();
          const P = stations.conveyor.point;
          out.push(jointMove(() => above(P), s));
          out.push(waitUntil(() => conveyorPart && conveyorPart.ready));
          out.push(linearMove(() => P, s, 0.3));
          out.push(
            gripper(false, () => {
              attach(conveyorPart.mesh);
              conveyorPart = null;
            })
          );
          out.push(linearMove(() => above(P), s, 0.35));
        } else {
          const P = stationPoint(s);
          const isCnc = s === "cnc";
          if (isCnc) out.push(doorMove(true));
          out.push(jointMove(() => above(P), s));
          out.push(linearMove(() => P, s, 0.3));
          out.push(
            gripper(false, () => {
              const st = stations[s];
              let part = st.part;
              if (s === "pallet") part = stations.pallet.parts.pop();
              if (!part) part = spawnPart(P);
              st.part = null;
              attach(part);
            })
          );
          out.push(linearMove(() => above(P), s, 0.35));
          if (isCnc) out.push(doorMove(false));
        }
        break;
      }
      case "place": {
        let P;
        const getP = () => (P = P || stationPoint(s === "vision" ? "table" : s).clone());
        const isCnc = s === "cnc";
        if (isCnc) out.push(doorMove(true));
        out.push(jointMove(() => above(getP()), s));
        out.push(linearMove(() => getP(), s, 0.3));
        out.push(
          gripper(true, () => {
            const part = release(getP());
            if (!part) {
              log(`Nothing to place for "${step.label}"`);
              return;
            }
            if (s === "pallet") {
              const pal = stations.pallet;
              pal.parts.push(part);
              if (pal.parts.length >= pal.slots.length) {
                log("Pallet full, swapped for an empty one");
                pal.parts.forEach(removePart);
                pal.parts = [];
              }
            } else if (s === "conveyor") {
              removePart(part);
            } else {
              if (stations[s].part) removePart(stations[s].part);
              stations[s].part = part;
            }
          })
        );
        out.push(linearMove(() => above(getP()), s, 0.35));
        if (isCnc) out.push(doorMove(false));
        break;
      }
      case "process": {
        const c = stations.cnc;
        out.push(
          dwell(
            2.4,
            () => c.beacon.material.emissive.setHex(0x2a8a3a),
            () => {
              c.beacon.material.emissive.setHex(0x000000);
              if (c.part) {
                c.part.material = partMats.machined;
                c.part.userData.state = "machined";
              }
            },
            (k) => c.beacon.material.emissive.setHex(Math.floor(k * 10) % 2 ? 0x2a8a3a : 0x0a3014)
          )
        );
        break;
      }
      case "inspect": {
        const v = stations.vision;
        out.push(jointMove(() => v.point, "vision"));
        out.push(
          dwell(
            1.1,
            () => (v.cone.material.opacity = 0.18),
            () => {
              v.cone.material.opacity = 0;
              if (held) held.userData.inspected = true;
            },
            (k) => (v.cone.material.opacity = 0.12 + 0.08 * Math.sin(k * Math.PI * 4))
          )
        );
        break;
      }
      case "weld": {
        const w = stations.weld;
        const seamY = w.topY + PART.h + 0.005;
        const A = new THREE.Vector3(w.point.x - 0.05, seamY, w.point.z);
        const B = new THREE.Vector3(w.point.x + 0.05, seamY, w.point.z);
        out.push(
          dwell(0.01, () => {
            if (!w.part) w.part = spawnPart(w.point);
          })
        );
        out.push(jointMove(() => above(A), "weld"));
        out.push(linearMove(() => A, "weld", 0.3));
        out.push(dwell(0.01, () => (sparks.visible = true)));
        out.push(
          linearMove(() => B, "weld", 0.05, (P) => {
            emitSparks(P);
          })
        );
        out.push(
          dwell(0.01, () => {
            sparks.visible = false;
            if (w.part) addWeldMark(w.part);
          })
        );
        out.push(linearMove(() => above(B), "weld", 0.35));
        break;
      }
      default:
        out.push(dwell(1));
    }
    return out;
  }

  function emitSparks(P) {
    const pos = sparkGeo.attributes.position.array;
    for (let i = 0; i < sparkCount; i++) {
      if (sparkLife[i] <= 0) {
        sparkLife[i] = 0.15 + Math.random() * 0.35;
        pos[i * 3] = P.x;
        pos[i * 3 + 1] = P.y - TOOL_LEN * 0.05;
        pos[i * 3 + 2] = P.z;
        sparkVel[i].set((Math.random() - 0.5) * 1.6, Math.random() * 1.4, (Math.random() - 0.5) * 1.6);
      }
    }
  }

  function updateSparks(dt) {
    if (!sparks.visible) return;
    const pos = sparkGeo.attributes.position.array;
    for (let i = 0; i < sparkCount; i++) {
      if (sparkLife[i] > 0) {
        sparkLife[i] -= dt;
        sparkVel[i].y -= 4 * dt;
        pos[i * 3] += sparkVel[i].x * dt;
        pos[i * 3 + 1] += sparkVel[i].y * dt;
        pos[i * 3 + 2] += sparkVel[i].z * dt;
      }
    }
    sparkGeo.attributes.position.needsUpdate = true;
  }

  function nextStep() {
    if (!steps.length) return;
    stepIdx++;
    if (stepIdx >= steps.length) {
      stepIdx = 0;
      cycles++;
      lastCycle = simTime - cycleStart;
      cycleStart = simTime;
    }
    const step = steps[stepIdx];
    currentStation = step.station;
    queue = buildSegments(step);
  }

  function updateConveyor(dt) {
    const c = stations.conveyor;
    c.beltTex.offset.x += dt * 0.45 * 0.5;
    if (conveyorPart && !conveyorPart.ready) {
      const m = conveyorPart.mesh;
      m.position.x -= dt * 0.45;
      if (m.position.x <= c.point.x) {
        m.position.x = c.point.x;
        conveyorPart.ready = true;
      }
    }
    if (!conveyorPart && stepIdx >= 0 && steps.some((s) => s.action === "pick" && s.station === "conveyor")) {
      ensureConveyorPart();
    }
  }

  const VIEWS = {
    iso: [new THREE.Vector3(3.4, 2.7, 3.4), new THREE.Vector3(0, 0.7, 0)],
    front: [new THREE.Vector3(4.6, 1.5, 0.05), new THREE.Vector3(0, 0.8, 0.05)],
    top: [new THREE.Vector3(0.01, 6.2, 0.01), new THREE.Vector3(0, 0, 0)],
    side: [new THREE.Vector3(0.1, 1.6, 4.6), new THREE.Vector3(0, 0.8, 0)],
  };
  function setView(name) {
    const v = VIEWS[name] || VIEWS.iso;
    camera.position.copy(v[0]);
    controls.target.copy(v[1]);
    controls.update();
  }

  function clearParts() {
    [...parts].forEach(removePart);
    held = null;
    conveyorPart = null;
    stations.table.part = null;
    stations.weld.part = null;
    stations.cnc.part = null;
    stations.pallet.parts = [];
    stations.cnc.door.position.y = stations.cnc.doorY;
    stations.vision.cone.material.opacity = 0;
    stations.cnc.beacon.material.emissive.setHex(0x000000);
    sparks.visible = false;
  }

  function reset() {
    clearParts();
    queue = [];
    seg = null;
    stepIdx = -1;
    simTime = 0;
    cycleStart = 0;
    cycles = 0;
    lastCycle = null;
    events = [];
    currentStation = null;
    unreachable = new Set();
    const home = solveIK(HOME);
    applyJoints(home.q);
    setFingers(true);
    emit(true);
  }

  function setRobotSize(key) {
    if (!ROBOT_SIZES[key]) return;
    sizeKey = key;
    clearParts();
    disposeRobot();
    robot = buildRobot(ROBOT_SIZES[key].scale);
    reset();
  }

  let lastEmit = 0;
  function emit(force) {
    if (!onUpdate) return;
    const now = performance.now();
    if (!force && now - lastEmit < 100) return;
    lastEmit = now;
    onUpdate({
      playing,
      speed,
      size: ROBOT_SIZES[sizeKey],
      joints: robot.q.map((v) => +(v * 180 / Math.PI).toFixed(1)),
      stepIndex: stepIdx,
      step: steps[stepIdx] || null,
      cycles,
      lastCycle,
      currentCycle: simTime - cycleStart,
      simTime,
      holding: !!held,
      unreachable: [...unreachable],
      events: events.slice(),
    });
  }

  let raf = 0;
  let lastT = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (playing && steps.length) {
      dt *= speed;
      simTime += dt;
      updateConveyor(dt);
      updateSparks(dt);
      let guard = 0;
      let remaining = dt;
      while (guard++ < 8) {
        if (!seg) {
          if (!queue.length) nextStep();
          seg = queue.shift();
          if (!seg) break;
          seg.init();
        }
        if (seg.update(remaining)) {
          seg = null;
          remaining = 0;
        } else break;
      }
    }
    controls.update();
    renderer.render(scene, camera);
    emit(false);
  }

  function resize() {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro ? ro.observe(container) : window.addEventListener("resize", resize);

  robot = buildRobot(ROBOT_SIZES[sizeKey].scale);
  setView("iso");
  resize();
  reset();
  raf = requestAnimationFrame(frame);

  return {
    setSteps(newSteps) {
      steps = (newSteps || []).map((s) => ({ ...s, label: s.label || stepLabel(s) }));
      reset();
      playing = true;
      emit(true);
    },
    play() {
      playing = true;
      emit(true);
    },
    pause() {
      playing = false;
      emit(true);
    },
    reset() {
      reset();
    },
    setSpeed(v) {
      speed = clamp(Number(v) || 1, 0.25, 4);
      emit(true);
    },
    setRobotSize,
    setView,
    setJoint(i, deg) {
      if (playing) return;
      const q = robot.q.slice();
      q[i] = (Number(deg) * Math.PI) / 180;
      seg = null;
      queue = [];
      applyJoints(q);
      emit(true);
    },
    checkReach(stepsToCheck) {
      const out = new Set();
      for (const s of stepsToCheck || steps) {
        const pts = s.station === "pallet" ? stations.pallet.slots : [stations[s.station] && stations[s.station].point];
        for (const p of pts) {
          if (p && (!solveIK(p).reachable || !solveIK(above(p)).reachable)) out.add(s.station);
        }
      }
      return [...out];
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro ? ro.disconnect() : window.removeEventListener("resize", resize);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
