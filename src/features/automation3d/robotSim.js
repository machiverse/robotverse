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
  carton: "Packing carton",
  in: "Transfer conveyor",
  out: "Transfer conveyor",
};

/* Tool operations the robot performs on a part sitting on the work table.
   Each has its own tool head colour and animation in the simulation. */
export const TOOL_ACTIONS = {
  apply: { label: "Apply coating", color: 0x22d3ee },
  finish: { label: "Polish surface", color: 0xc084fc },
  assemble: { label: "Assemble components", color: 0x818cf8 },
  fill: { label: "Fill container", color: 0x38bdf8 },
  cap: { label: "Cap and seal", color: 0xe879f9 },
  label: { label: "Apply label", color: 0xa3e635 },
  operate: { label: "Process part", color: 0xf59e0b },
};

export const PRESETS = {
  "Machine tending":
    "Pick part from conveyor\nLoad CNC\nRun machining cycle\nUnload CNC\nInspect with camera\nStack on pallet",
  Palletizing: "Pick box from conveyor\nStack on pallet",
  "Pick and place": "Pick part from conveyor\nInspect with camera\nPlace on work table",
  Welding:
    "Pick part from conveyor\nPlace on welding table\nWeld seam\nPick from welding table\nStack on pallet",
  Painting: "Pick part from conveyor\nPlace on work table\nSpray paint the surface\nPick from work table\nStack on pallet",
  Dispensing: "Pick part from conveyor\nPlace on work table\nDispense adhesive bead\nPick from work table\nStack on pallet",
  Polishing: "Pick part from conveyor\nPlace on work table\nPolish and deburr surface\nPick from work table\nStack on pallet",
  Assembly: "Pick part from conveyor\nPlace on work table\nScrew and fasten components\nPick from work table\nStack on pallet",
  "Filling & capping": "Pick container from conveyor\nPlace on work table\nFill container\nCap and seal container\nPick from work table\nPack into carton",
  Labeling: "Pick product from conveyor\nPlace on work table\nApply label\nPick from work table\nPack into carton",
  Packing: "Pick product from conveyor\nInspect with camera\nPack into carton",
};

/* Text -> process steps */

function detectStation(c) {
  if (/weld|solder/.test(c)) return "weld";
  if (/conveyor|belt|infeed/.test(c)) return "conveyor";
  if (/carton|\bpack\w*|boxing|\bbox(es)?\b/.test(c) && !/pallet/.test(c)) return "carton";
  if (/\bcnc\b|machine|lathe|\bmill|\bvmc\b|press/.test(c)) return "cnc";
  if (/pallet|\bbox\b|\bbin\b|carton|stack/.test(c)) return "pallet";
  if (/table|fixture|\bjig\b|tray|bench/.test(c)) return "table";
  if (/camera|vision/.test(c)) return "vision";
  return null;
}

const DEFAULT_STATION = { pick: "conveyor", place: "pallet", inspect: "vision", weld: "weld", process: "cnc", wait: null };

// Keyword -> tool action. Checked in order, so more specific trades come first.
const TOOL_PATTERNS = [
  ["fill", /\b(fill\w*|dos(e|ing)|pour\w*|liquid)\b/],
  ["cap", /\b(cap|capp\w*|stopper\w*|lid|seal(?!ant)\w*|crimp\w*)\b/],
  ["label", /\b(label\w*|mark\w*|engrav\w*|coding|print\w*|serialis\w*|serializ\w*|tag\w*)\b/],
  ["apply", /\b(paint\w*|coat\w*|spray\w*|dispens\w*|glu\w*|adhesive|sealant|bead|primer|varnish\w*|lacquer\w*)\b/],
  ["finish", /\b(polish\w*|grind\w*|sand\w*|deburr\w*|buff\w*|finish\w*|clean\w*|blast\w*)\b/],
  ["assemble", /\b(assembl\w*|screw\w*|fasten\w*|bolt\w*|rivet\w*|mount\w*|insert component|press[- ]fit|join\w*|nut)\b/],
];

const capitalise = (t) => t.charAt(0).toUpperCase() + t.slice(1);

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
      if (TOOL_ACTIONS[step.action]) return step.text ? capitalise(step.text) : TOOL_ACTIONS[step.action].label;
      return "Wait";
  }
}

export function parseProcess(text) {
  const clauses = String(text || "")
    .split(/\n|→|->|,|;|\band then\b|\bthen\b|\.(?=\s|$)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const steps = [];
  const notes = [];
  let holding = false;
  let onTable = false; // a part is sitting on the work table

  const push = (step, auto) => {
    step.label = step.label || stepLabel(step);
    if (auto) {
      step.auto = true;
      notes.push(`Added "${step.label}" so the cycle flows.`);
    }
    if (step.action === "pick") holding = true;
    if (step.action === "place") holding = false;
    if (step.action === "place" && step.station === "table") onTable = true;
    if (step.action === "pick" && step.station === "table") onTable = false;
    steps.push(step);
  };

  for (const clause of clauses) {
    // Optional display name in brackets: "Polish surface [Surface Polishing]"
    const named = clause.match(/^(.*?)\s*\[(.+)\]\s*$/);
    const raw = named ? named[2].trim() : clause;
    const c = (named ? named[1] : clause).toLowerCase();
    let action = null;
    if (/\bunload/.test(c)) action = "pick";
    else if (/\bload\b|\binsert\b(?! component)/.test(c) && !/\b(pick|take|grab|collect)\b/.test(c)) action = "place";
    else if (
      /\b(weld|solder)/.test(c) &&
      !/(on|onto|to|from) (the )?(weld|solder)/.test(c) &&
      !/\b(inspect|check|scan|measure|camera|vision|quality|test|verif\w*)\b/.test(c)
    )
      action = "weld";
    else if (/\b(pick|take|grab|lift|collect|get|receive)\b/.test(c)) action = "pick";
    else if (/\b(pack|box|carton|bag)\w*\b/.test(c) && !/pallet/.test(c) && !/\b(form|erect|fold)\w*/.test(c)) action = "place";
    else if (/\b(place|put|drop|stack|palleti[sz]e|deliver|transfer|set down|move|carry|transport|sort|store)\b/.test(c)) action = "place";
    else if (/\b(inspect|check|scan|measure|camera|vision|quality|test|verif\w*|weigh\w*)\b/.test(c)) action = "inspect";
    else if (/\b(cnc|machin\w*|mill\w*|lathe|turn\w*|drill\w*|cut\w*|bend\w*|press\w*|cycle)\b/.test(c)) action = "process";
    else if (/\b(wait|pause|hold)\b/.test(c)) action = "wait";
    if (!action) {
      const tool = TOOL_PATTERNS.find(([, re]) => re.test(c));
      // Anything else still runs as a generic tool operation on the work table.
      action = tool ? tool[0] : "operate";
    }
    // Tool keywords win over generic verbs like "apply" / "move" and over nouns
    // like "the weld" in "grind the weld".
    if (
      (action === "weld" || action === "process" || ((action === "place" || action === "inspect") && !/\b(pack|carton|box|pallet|table|conveyor|stack)\b/.test(c)))
    ) {
      const tool = TOOL_PATTERNS.find(([, re]) => re.test(c));
      if (tool) action = tool[0];
    }

    if (TOOL_ACTIONS[action]) {
      // Tool work happens on a part resting on the work table, with the gripper free.
      if (holding) push({ action: "place", station: "table" }, true);
      else if (!onTable) {
        push({ action: "pick", station: "conveyor" }, true);
        push({ action: "place", station: "table" }, true);
      }
      push({ action, station: "table", text: raw });
      continue;
    }

    let station = detectStation(c);
    if (action === "inspect") station = "vision";
    if (action === "process") station = "cnc";
    if (action === "weld") station = "weld";
    if (action === "place" && station === "vision") station = null;
    if (action === "pick" && !station && onTable) station = "table";
    if (!station) station = DEFAULT_STATION[action];

    if (action === "pick" && holding) {
      notes.push(`"${raw}": the robot is already holding a part here.`);
    }
    if (action === "inspect" && !holding) {
      push({ action: "pick", station: onTable ? "table" : "conveyor" }, true);
    }
    if (action === "place" && !holding) {
      if (onTable && station !== "table") push({ action: "pick", station: "table" }, true);
      else push({ action: "pick", station: "conveyor" }, true);
    }
    const step = { action, station };
    if (action === "place" && station === "carton") step.label = "Pack into carton";
    if (named) step.label = raw;
    push(step);
  }

  // Finish the cycle: send the finished part to the pallet (or carton if packing).
  if (steps.length) {
    const packs = steps.some((s) => s.station === "carton");
    if (onTable && !holding) push({ action: "pick", station: "table" }, true);
    if (holding) push({ action: "place", station: packs ? "carton" : "pallet", label: packs ? "Pack into carton" : undefined }, true);
  }

  if (!steps.length) notes.push("No steps found. Try lines like: Pick part from conveyor, Paint the surface, Stack on pallet.");
  return { steps, notes };
}

/**
 * Build a robot-cell process description for a detected process
 * (used by Automation Studio to simulate a user's own analysed line).
 */
export function processToText(kind, name) {
  const n = name ? ` [${name.replace(/[[\]\n]/g, " ")}]` : "";
  switch (kind) {
    case "welding":
      return `Pick part from conveyor\nPlace on welding table\nWeld seam${n}\nPick from welding table\nStack on pallet`;
    case "machining":
      return `Pick part from conveyor\nLoad CNC\nRun machining cycle${n}\nUnload CNC\nInspect with camera\nStack on pallet`;
    case "inspection":
      return `Pick part from conveyor\nInspect with camera${n}\nStack on pallet`;
    case "palletizing":
      return `Pick case from conveyor\nStack on pallet${n}`;
    case "packing":
      return `Pick product from conveyor\nPack into carton${n}`;
    case "transport":
      return `Pick crate from conveyor\nDeliver to pallet${n}`;
    case "finishing":
      return `Pick part from conveyor\nPlace on work table\nPolish surface${n}\nPick from work table\nStack on pallet`;
    case "coating":
      return `Pick part from conveyor\nPlace on work table\nApply coating${n}\nPick from work table\nStack on pallet`;
    case "assembly":
      return `Pick part from conveyor\nPlace on work table\nAssemble and fasten components${n}\nPick from work table\nStack on pallet`;
    case "filling":
      return `Pick container from conveyor\nPlace on work table\nFill container${n}\nCap container\nPick from work table\nPack into carton`;
    case "sealing":
      return `Pick container from conveyor\nPlace on work table\nCap and seal container${n}\nPick from work table\nPack into carton`;
    case "labeling":
      return `Pick product from conveyor\nPlace on work table\nApply label${n}\nPick from work table\nPack into carton`;
    default:
      return `Pick part from conveyor${n}\nPlace on work table\nPick from work table\nStack on pallet`;
  }
}

/* Simulation */

const PART = { w: 0.1, h: 0.09, d: 0.1 };
const TOOL_LEN = 0.16;
const APPROACH = 0.22;
const CELL_SPACING = 3.6;
const BELT_SPEED = 0.45;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Station layout relative to a robot base.
 * "single" is the original one-robot cell; "line" moves the infeed and the
 * welding table so neighbouring robot cells joined by transfer conveyors fit.
 */
const LAYOUT = {
  single: { infeed: [2.45, 0.75], weld: [-0.8, -0.95] },
  line: { infeed: [-2.3, -0.75], weld: [0.1, -1.18] },
};
const BELT_Z = -0.75;
const BELT_TOP = 0.78;

/**
 * createSimulation — one or more robot cells in a line.
 *   setSteps(steps)            one robot (original behaviour)
 *   setPlan({ cells: [{ title, steps }] })  several robots; cell i hands parts
 *                               to cell i+1 over a transfer conveyor ("out" -> "in")
 * Only the stations a cell's steps use are built, so the scene shows just
 * the machines the process needs.
 */
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
  scene.fog = new THREE.Fog(0x1a2433, 9, 30);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 90);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 1.2;
  controls.maxDistance = 45;

  scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x2a3240, 0.75 * LIGHT_K));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95 * LIGHT_K);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
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
    card: new THREE.MeshStandardMaterial({ color: 0xc49a6c, metalness: 0, roughness: 0.9 }),
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
    new THREE.PlaneGeometry(60, 30),
    new THREE.MeshStandardMaterial({ color: 0x243041, metalness: 0.1, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(60, 120, 0x33445a, 0x2a384a);
  grid.position.y = 0.001;
  scene.add(grid);

  function makeLabel(text, color = "#e6ecf3") {
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
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 24, 42);
    const tex = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set((w / 80) * 0.16, 0.16, 1);
    s.renderOrder = 10;
    return s;
  }

  /* Reference photo of the user's manual process, on a board behind the robots */
  let refUrl = null;
  let refLabel = "Your reference: manual process";
  let refGroup = null;
  let refToken = 0;
  function clearReference() {
    if (!refGroup) return;
    scene.remove(refGroup);
    refGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material !== M.dark && o.material !== M.frame) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    refGroup = null;
  }
  function placeReference() {
    clearReference();
    const token = ++refToken;
    if (!refUrl) return;
    new THREE.TextureLoader().load(refUrl, (tex) => {
      if (token !== refToken) return tex.dispose();
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      const img = tex.image;
      const aspect = img && img.width ? img.width / img.height : 4 / 3;
      const h = 1.25;
      const w = Math.min(h * aspect, 3.2);
      const g = new THREE.Group();
      const bottom = 0.85;
      const board = box(w + 0.1, h + 0.1, 0.05, M.dark);
      board.position.set(0, bottom + h / 2, -0.03);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      pic.position.set(0, bottom + h / 2, 0.001);
      g.add(board, pic);
      for (const sx of [-1, 1]) {
        const leg = box(0.05, bottom + 0.05, 0.05, M.frame);
        leg.position.set(sx * (w / 2 - 0.1), (bottom + 0.05) / 2, -0.06);
        g.add(leg);
      }
      const lbl = makeLabel(refLabel, "#fbbf24");
      lbl.position.set(0, bottom + h + 0.2, 0);
      g.add(lbl);
      const span = (cells.length - 1) * CELL_SPACING;
      g.position.set(span / 2, 0, -2.75);
      scene.add(g);
      refGroup = g;
    });
  }

  /* Safety fence around industrial robot cells (cobot lines run without one) */
  /** Per robot cell: true when that cell needs a fence (industrial robot). */
  let fenceCells = [];
  let fenceGroup = null;
  const fenceMesh = new THREE.MeshStandardMaterial({ color: 0xf2b705, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false });
  function clearFence() {
    if (!fenceGroup) return;
    scene.remove(fenceGroup);
    fenceGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.isSprite) {
        o.material.map.dispose();
        o.material.dispose();
      }
    });
    fenceGroup = null;
  }
  function placeFence() {
    clearFence();
    if (!fenceCells.some(Boolean)) return;
    // Enclose everything the cells and conveyors occupy on the floor.
    const bounds = new THREE.Box3();
    const tmp = new THREE.Box3();
    for (const o of scene.children) {
      if (o === floor || o === grid || o === refGroup || o === overlayGroup || o.isLight || o === sun.target || !o.visible) continue;
      if (o.isSprite) continue;
      tmp.setFromObject(o);
      if (!tmp.isEmpty()) bounds.union(tmp);
    }
    if (bounds.isEmpty()) return;
    const z0 = Math.max(bounds.min.z - 0.35, -2.45), z1 = bounds.max.z + 0.35;
    const n = cells.length;
    const H = 1.4;
    const g = new THREE.Group();
    const post = (x, z) => {
      const p = box(0.05, H, 0.05, M.amber);
      p.position.set(x, H / 2, z);
      g.add(p);
    };
    const side = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.ceil(len / 1.4));
      for (let i = 0; i <= n; i++) post(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 0.15), fenceMesh);
      panel.position.set((ax + bx) / 2, 0.15 + (H - 0.15) / 2, (az + bz) / 2);
      panel.rotation.y = -Math.atan2(bz - az, bx - ax);
      g.add(panel);
      const rail = box(len, 0.04, 0.04, M.amber);
      rail.position.set((ax + bx) / 2, H, (az + bz) / 2);
      rail.rotation.y = panel.rotation.y;
      g.add(rail);
    };
    // One fenced area per run of neighbouring industrial cells; cobot cells stay open.
    for (let i = 0; i < n; i++) {
      if (!fenceCells[i] || (i > 0 && fenceCells[i - 1])) continue;
      let j = i;
      while (j + 1 < n && fenceCells[j + 1]) j++;
      const x0 = i === 0 ? bounds.min.x - 0.35 : i * CELL_SPACING - CELL_SPACING / 2 + 0.05;
      const x1 = j === n - 1 ? bounds.max.x + 0.35 : j * CELL_SPACING + CELL_SPACING / 2 - 0.05;
      side(x0, z0, x1, z0);
      side(x1, z0, x1, z1);
      side(x1, z1, x0, z1);
      side(x0, z1, x0, z0);
      const lbl = makeLabel("Safety fence with interlocked door", "#f2b705");
      lbl.position.set((x0 + x1) / 2, H + 0.18, z1);
      g.add(lbl);
    }
    scene.add(g);
    fenceGroup = g;
  }

  /* Parts */
  const partGeo = new THREE.BoxGeometry(PART.w, PART.h, PART.d);
  const partMats = {
    raw: new THREE.MeshStandardMaterial({ color: 0x9aa7b5, metalness: 0.6, roughness: 0.4 }),
    machined: new THREE.MeshStandardMaterial({ color: 0xcfe0f2, metalness: 0.8, roughness: 0.22 }),
    coated: new THREE.MeshStandardMaterial({ color: 0x2f80ed, metalness: 0.3, roughness: 0.35 }),
    polished: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.08 }),
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
  const addOn = (part, geo, color, pos, extra = {}) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5, ...extra }));
    m.position.copy(pos);
    m.castShadow = true;
    part.add(m);
    return m;
  };
  function addWeldMark(m) {
    addOn(m, new THREE.BoxGeometry(PART.w * 0.9, 0.006, 0.012), 0x3a2a1a, new THREE.Vector3(0, PART.h / 2 + 0.003, 0), {
      metalness: 0.4,
      roughness: 0.6,
    });
  }

  /* Conveyors: an infeed that spawns raw parts, or a transfer between two cells */
  function makeConveyor(fromX, toX, label, autoSpawn) {
    const g = new THREE.Group();
    const dir = Math.sign(toX - fromX) || -1;
    const x0 = Math.min(fromX, toX) - 0.13;
    const x1 = Math.max(fromX, toX) + 0.13;
    const len = x1 - x0, wid = 0.4, cx = (x0 + x1) / 2, cz = BELT_Z, topY = BELT_TOP;
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
    beltTex.repeat.set(Math.max(2, Math.round(len * 3)), 1);
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
    stop.position.set(toX + dir * 0.13, topY + 0.03, cz);
    g.add(stop);
    const lbl = makeLabel(label);
    lbl.position.set(cx, topY + 0.45, cz);
    g.add(lbl);
    scene.add(g);
    const y = topY + PART.h / 2;
    return {
      group: g,
      fromX,
      toX,
      dir,
      beltTex,
      autoSpawn,
      owner: null,
      items: [],
      point: new THREE.Vector3(toX, y, cz),
      startPoint: new THREE.Vector3(fromX, y, cz),
      ready() {
        const it = this.items[0];
        return !!it && Math.abs(it.mesh.position.x - toX) < 1e-3;
      },
      take() {
        return this.items.shift();
      },
      canAccept() {
        return !this.items.some((it) => Math.abs(it.mesh.position.x - fromX) < 0.2);
      },
      push(mesh) {
        this.items.push({ mesh });
      },
      update(dt) {
        beltTex.offset.x += dt * BELT_SPEED * 0.5;
        if (this.autoSpawn && !this.items.length && this.owner && this.owner.started()) {
          this.push(spawnPart(this.startPoint.clone()));
        }
        this.items.forEach((it, i) => {
          const target = toX - dir * i * (PART.w + 0.06);
          const x = it.mesh.position.x;
          const next = x + dir * BELT_SPEED * dt;
          it.mesh.position.x = dir > 0 ? Math.min(next, target) : Math.max(next, target);
        });
      },
      clear() {
        this.items.forEach((it) => removePart(it.mesh));
        this.items = [];
      },
      dispose() {
        scene.remove(g);
      },
    };
  }

  let cells = [];
  let conveyors = [];
  let mode = "single";
  let sizeKey = "medium";
  let playing = true;
  let speed = 1;
  let simTime = 0;
  let events = [];
  let focus = 0;

  const log = (msg) => {
    events.unshift({ t: simTime, msg });
    if (events.length > 6) events.length = 6;
  };

  /* One robot with the stations its steps use, at world x = X */
  function createCell(index, X, steps, title, links) {
    const layout = LAYOUT[mode];
    const V = (x, y, z) => new THREE.Vector3(X + x, y, z);
    const groups = [];
    const add = (g) => {
      scene.add(g);
      groups.push(g);
      return g;
    };
    const needed = new Set(steps.map((s) => s.station));
    if (steps.some((s) => TOOL_ACTIONS[s.action])) needed.add("table");
    const stations = {};

    // Safety zone ring
    {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(V(Math.cos(a) * 2.05, 0.004, Math.sin(a) * 2.05));
      }
      const zone = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineDashedMaterial({ color: 0xf2b705, dashSize: 0.12, gapSize: 0.08 })
      );
      zone.computeLineDistances();
      const g = new THREE.Group();
      g.add(zone);
      if (title) {
        const lbl = makeLabel(title, "#fbbf24");
        lbl.position.set(X, 2.45, 0.2);
        lbl.scale.multiplyScalar(1.15);
        g.add(lbl);
      }
      add(g);
    }

    if (needed.has("conveyor")) stations.conveyor = links.infeed;
    if (needed.has("in")) stations.in = links.in;
    if (needed.has("out")) stations.out = links.out;

    if (needed.has("cnc")) {
      const g = new THREE.Group();
      const cx = X - 1.45, cz = 0.1;
      const shell = box(0.95, 1.6, 1.0, M.machine);
      shell.position.set(cx, 0.8, cz);
      g.add(shell);
      const cavity = box(0.5, 0.55, 0.62, M.dark);
      cavity.position.set(cx + 0.24, 0.98, cz);
      g.add(cavity);
      const chuck = cyl(0.08, 0.06, M.steel);
      chuck.position.set(X - 1.0, 0.95 - PART.h / 2 - 0.03, cz);
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
      add(g);
      stations.cnc = { point: V(-1.0, 0.95, cz), door, doorY: 0.98, beacon, part: null };
    }

    const makeTable = (x, z, label, top = M.steel) => {
      const g = new THREE.Group();
      const topY = 0.72;
      const t = box(0.7, 0.05, 0.55, top);
      t.position.set(X + x, topY - 0.025, z);
      g.add(t);
      for (const dx of [-0.3, 0.3]) for (const dz of [-0.22, 0.22]) {
        const leg = box(0.05, topY - 0.05, 0.05, M.frame);
        leg.position.set(X + x + dx, (topY - 0.05) / 2, z + dz);
        g.add(leg);
      }
      const lbl = makeLabel(label);
      lbl.position.set(X + x, topY + 0.5, z);
      g.add(lbl);
      add(g);
      return { group: g, point: V(x, topY + PART.h / 2, z), part: null, topY };
    };

    if (needed.has("table")) stations.table = makeTable(0.1, 1.08, STATION_NAMES.table);
    if (needed.has("weld")) {
      const [wx, wz] = layout.weld;
      stations.weld = makeTable(wx, wz, STATION_NAMES.weld, M.dark);
      const clampBar = box(0.5, 0.03, 0.03, M.amber);
      clampBar.position.set(X + wx, 0.735, wz - 0.18);
      stations.weld.group.add(clampBar);
    }

    if (needed.has("pallet")) {
      const g = new THREE.Group();
      const cx = X + 1.0, cz = 0.85, topY = 0.14;
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
      add(g);
      const slots = [];
      for (let layer = 0; layer < 2; layer++)
        for (const dx of [-0.2, 0, 0.2]) for (const dz of [-0.14, 0.14])
          slots.push(new THREE.Vector3(cx + dx, topY + PART.h / 2 + layer * PART.h, cz + dz));
      stations.pallet = { slots, parts: [], point: slots[0] };
    }

    if (needed.has("vision")) {
      const g = new THREE.Group();
      const px = X + 1.45, pz = 0.12;
      const post = box(0.06, 1.95, 0.06, M.frame);
      post.position.set(px, 0.975, pz);
      g.add(post);
      const arm = box(0.55, 0.05, 0.05, M.frame);
      arm.position.set(px - 0.27, 1.92, pz);
      g.add(arm);
      const cam = box(0.12, 0.1, 0.1, M.dark);
      cam.position.set(X + 0.95, 1.86, pz);
      g.add(cam);
      const lens = cyl(0.03, 0.04, M.accent);
      lens.position.set(X + 0.95, 1.79, pz);
      g.add(lens);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.7, 32, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x4a90e2, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })
      );
      cone.position.set(X + 0.95, 1.43, pz);
      g.add(cone);
      const lbl = makeLabel(STATION_NAMES.vision);
      lbl.position.set(px, 2.15, pz);
      g.add(lbl);
      add(g);
      stations.vision = { point: V(0.95, 1.08, pz), cone };
    }

    if (needed.has("carton")) {
      const g = new THREE.Group();
      const cx = X - 1.05, cz = 0.95, standY = 0.3;
      const stand = box(0.5, standY, 0.4, M.frame);
      stand.position.set(cx, standY / 2, cz);
      g.add(stand);
      const W = 0.4, D = 0.3, H = 0.18, t = 0.012;
      const bottom = box(W, t, D, M.card);
      bottom.position.set(cx, standY + t / 2, cz);
      g.add(bottom);
      for (const [dx, dz, w, d] of [
        [0, -D / 2, W, t],
        [0, D / 2, W, t],
        [-W / 2, 0, t, D],
        [W / 2, 0, t, D],
      ]) {
        const wall = box(w, H, d, M.card);
        wall.position.set(cx + dx, standY + H / 2, cz + dz);
        g.add(wall);
      }
      const lid = box(W + 0.01, t, D + 0.01, M.card);
      lid.position.set(cx, standY + H + t / 2, cz);
      lid.visible = false;
      g.add(lid);
      const tape = box(W + 0.012, t * 1.2, 0.05, M.amber);
      tape.position.set(cx, standY + H + t, cz);
      tape.visible = false;
      g.add(tape);
      const lbl = makeLabel(STATION_NAMES.carton);
      lbl.position.set(cx - 0.3, standY + H + 0.12, cz + 0.2);
      g.add(lbl);
      add(g);
      const slots = [];
      for (const dx of [-0.09, 0.09]) for (const dz of [-0.065, 0.065])
        slots.push(new THREE.Vector3(cx + dx, standY + t + PART.h / 2, cz + dz));
      stations.carton = { slots, parts: [], point: slots[0], lid, tape, closeT: 0 };
    }

    // Effects: sparks (welding, grinding, spraying) and a liquid stream (filling)
    const sparkCount = 60;
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(sparkCount * 3), 3));
    const sparks = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({ color: 0xffd27a, size: 0.025, transparent: true, opacity: 0.95, depthWrite: false })
    );
    sparks.visible = false;
    add(sparks);
    const sparkVel = Array.from({ length: sparkCount }, () => new THREE.Vector3());
    const sparkLife = new Float32Array(sparkCount);
    const stream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 1, 12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, roughness: 0.1 })
    );
    stream.visible = false;
    add(stream);

    /* Robot */
    let robot = null;
    function buildRobot(s) {
      const dims = { h1: 0.45 * s, a1: 0.15 * s, L2: 0.7 * s, L3: 0.75 * s, d6: 0.09 * s };
      dims.dTool = dims.d6 + TOOL_LEN;
      const root = new THREE.Group();
      root.position.x = X;

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

      // Process tool (nozzle / spindle / driver) shown only during tool operations.
      const toolMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.35 });
      const toolHead = new THREE.Group();
      const toolBody = cyl(0.028, 0.1, toolMat);
      toolBody.rotation.z = Math.PI / 2;
      toolBody.position.x = 0.09;
      const toolTip = cyl(0.012, 0.06, M.steel);
      toolTip.rotation.z = Math.PI / 2;
      toolTip.position.x = 0.15;
      toolHead.add(toolBody, toolTip);
      toolHead.visible = false;
      j6.add(toolHead);

      scene.add(root);
      return { root, joints: [j1, j2, j3, j4, j5, j6], tip, fingers, dims, q: [0, 0, 0, 0, 0, 0], toolHead, toolMat };
    }

    function disposeRobot() {
      if (!robot) return;
      scene.remove(robot.root);
      robot.root.traverse((o) => o.geometry && o.geometry.dispose());
      robot = null;
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
      const Wx = P.x - X, Wy = P.y + d.dTool, Wz = P.z;
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

    const HOME = V(0.85, 1.25, 0.05);

    let stepIdx = -1;
    let queue = [];
    let seg = null;
    let cycleStart = 0;
    let cycles = 0;
    let lastCycle = null;
    let held = null;
    const unreachable = new Set();

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
      let from;
      return {
        init() {
          from = robot.fingers[1].position.z;
        },
        update(dt) {
          t += dt;
          const to = open ? 0.075 : PART.d / 2 + 0.009;
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

    const waitUntil = (cond) => ({ init() {}, update: () => cond() });

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
      const s = stations[st];
      if (st === "pallet" || st === "carton") return s.slots[s.parts.length % s.slots.length];
      return s.point;
    }

    const isBelt = (s) => s === "conveyor" || s === "in";

    function buildSegments(step) {
      const s = step.station;
      const out = [];
      if (s && s !== "table" && !stations[s] && !TOOL_ACTIONS[step.action]) {
        out.push(dwell(0.5));
        return out;
      }
      switch (step.action) {
        case "pick": {
          if (held) {
            log(`Skipped "${step.label}": already holding a part`);
            break;
          }
          if (isBelt(s)) {
            const belt = stations[s];
            out.push(jointMove(() => above(belt.point), s));
            out.push(waitUntil(() => belt.ready()));
            out.push(linearMove(() => belt.point, s, 0.3));
            out.push(
              gripper(false, () => {
                const it = belt.take();
                if (it) attach(it.mesh);
              })
            );
            out.push(linearMove(() => above(belt.point), s, 0.35));
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
                if (s === "pallet" || s === "carton") part = st.parts.pop();
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
          if (s === "out") {
            const belt = stations.out;
            out.push(jointMove(() => above(belt.startPoint), s));
            out.push(waitUntil(() => belt.canAccept()));
            out.push(linearMove(() => belt.startPoint, s, 0.3));
            out.push(
              gripper(true, () => {
                const part = release(belt.startPoint);
                if (part) belt.push(part);
              })
            );
            out.push(linearMove(() => above(belt.startPoint), s, 0.35));
            break;
          }
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
              } else if (s === "carton") {
                const ct = stations.carton;
                ct.parts.push(part);
                if (ct.parts.length >= ct.slots.length) {
                  log("Carton full, sealed and replaced");
                  ct.lid.visible = true;
                  ct.tape.visible = true;
                  ct.closeT = 0.9;
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
          const A = w.point.clone().setY(seamY).add(new THREE.Vector3(-0.05, 0, 0));
          const B = w.point.clone().setY(seamY).add(new THREE.Vector3(0.05, 0, 0));
          out.push(
            dwell(0.01, () => {
              if (!w.part) w.part = spawnPart(w.point);
            })
          );
          out.push(jointMove(() => above(A), "weld"));
          out.push(linearMove(() => A, "weld", 0.3));
          out.push(
            dwell(0.01, () => {
              sparks.material.color.setHex(0xffd27a);
              sparks.visible = true;
            })
          );
          out.push(linearMove(() => B, "weld", 0.05, (P) => emitSparks(P)));
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
          if (TOOL_ACTIONS[step.action]) out.push(...toolSegments(step));
          else out.push(dwell(1));
      }
      return out;
    }

    /* Tool operations on the part resting on the work table. */
    function toolSegments(step) {
      const w = stations.table;
      const a = step.action;
      const top = () => new THREE.Vector3(w.point.x, w.topY + PART.h + 0.006, w.point.z);
      const at = (dx, dz, dy = 0) => () => top().add(new THREE.Vector3(dx, dy, dz));
      const out = [];
      const spin = (k, turns) => (robot.joints[5].rotation.x = k * Math.PI * 2 * turns);

      out.push(
        dwell(0.25, () => {
          if (!w.part) w.part = spawnPart(w.point);
          robot.toolHead.visible = true;
          robot.toolMat.color.setHex(TOOL_ACTIONS[a].color);
          robot.fingers.forEach((f) => (f.visible = false));
        })
      );
      out.push(jointMove(() => above(top()), "table"));

      if (a === "apply") {
        let n = 0;
        const beadGeo = new THREE.BoxGeometry(0.012, 0.004, 0.012);
        for (const dz of [-0.03, 0, 0.03]) {
          out.push(linearMove(at(-0.045, dz, 0.02), "table", 0.3));
          out.push(dwell(0.01, () => sparks.material.color.setHex(0x9be7ff)));
          out.push(
            linearMove(at(0.045, dz, 0.02), "table", 0.06, (P) => {
              sparks.visible = true;
              emitSparks(P, 0.35);
              if (n++ % 3 === 0 && w.part) {
                const local = w.part.worldToLocal(new THREE.Vector3(P.x, top().y - 0.004, P.z));
                addOn(w.part, beadGeo, 0x1f6fd1, local);
              }
            })
          );
        }
        out.push(
          dwell(0.01, () => {
            sparks.visible = false;
            if (w.part) w.part.material = partMats.coated;
          })
        );
      } else if (a === "finish") {
        for (const dz of [-0.03, 0.01, 0.03, -0.01]) {
          out.push(linearMove(at(-0.045, dz), "table", 0.3));
          out.push(dwell(0.01, () => sparks.material.color.setHex(0xffc56b)));
          out.push(
            linearMove(at(0.045, dz), "table", 0.09, (P, k) => {
              sparks.visible = true;
              emitSparks(P, 0.6);
              spin(k, 6);
            })
          );
        }
        out.push(
          dwell(0.01, () => {
            sparks.visible = false;
            if (w.part) w.part.material = partMats.polished;
          })
        );
      } else if (a === "assemble") {
        const screwGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.012, 12);
        for (const [dx, dz] of [
          [-0.03, -0.03],
          [0.03, -0.03],
          [0, 0.03],
        ]) {
          out.push(linearMove(at(dx, dz, 0.05), "table", 0.3));
          out.push(linearMove(at(dx, dz), "table", 0.15));
          out.push(
            dwell(
              0.55,
              null,
              () => {
                if (w.part) addOn(w.part, screwGeo, 0x475569, new THREE.Vector3(dx, PART.h / 2 + 0.006, dz), { metalness: 0.8 });
              },
              (k) => spin(k, 4)
            )
          );
          out.push(linearMove(at(dx, dz, 0.05), "table", 0.2));
        }
      } else if (a === "fill") {
        out.push(linearMove(at(0, 0, 0.1), "table", 0.2));
        out.push(
          dwell(
            1.6,
            () => (stream.visible = true),
            () => {
              stream.visible = false;
              if (w.part)
                addOn(w.part, new THREE.BoxGeometry(PART.w * 0.8, 0.006, PART.d * 0.8), 0x38bdf8, new THREE.Vector3(0, PART.h / 2 + 0.003, 0), {
                  transparent: true,
                  opacity: 0.85,
                  roughness: 0.1,
                });
            },
            () => {
              const from = tipWorld();
              const to = top();
              const len = Math.max(0.01, from.y - to.y);
              stream.scale.set(1, len, 1);
              stream.position.set(to.x, to.y + len / 2, to.z);
            }
          )
        );
      } else if (a === "cap") {
        out.push(linearMove(at(0, 0, 0.012), "table", 0.12));
        out.push(
          dwell(
            0.7,
            null,
            () => {
              if (w.part) addOn(w.part, new THREE.CylinderGeometry(0.032, 0.032, 0.02, 24), 0xc026d3, new THREE.Vector3(0, PART.h / 2 + 0.01, 0));
            },
            (k) => spin(k, 3)
          )
        );
      } else if (a === "label") {
        out.push(linearMove(at(-0.035, 0), "table", 0.2));
        out.push(linearMove(at(0.035, 0), "table", 0.08));
        out.push(
          dwell(0.2, null, () => {
            if (w.part) {
              addOn(w.part, new THREE.BoxGeometry(0.075, 0.003, 0.055), 0xffffff, new THREE.Vector3(0, PART.h / 2 + 0.002, 0));
              addOn(w.part, new THREE.BoxGeometry(0.075, 0.0035, 0.012), 0x84cc16, new THREE.Vector3(0, PART.h / 2 + 0.0025, -0.018));
            }
          })
        );
      } else {
        for (const [dx, dz] of [
          [-0.03, 0],
          [0, 0.03],
          [0.03, 0],
          [0, -0.03],
        ]) {
          out.push(linearMove(at(dx, dz, 0.01), "table", 0.12, (P, k) => spin(k, 2)));
        }
        out.push(
          dwell(0.6, null, () => {
            if (w.part) w.part.material = partMats.machined;
          })
        );
      }

      out.push(linearMove(() => above(top()), "table", 0.35));
      out.push(
        dwell(0.2, null, () => {
          robot.toolHead.visible = false;
          robot.fingers.forEach((f) => (f.visible = true));
          robot.joints[5].rotation.x = 0;
        })
      );
      return out;
    }

    function emitSparks(P, spread = 1) {
      const pos = sparkGeo.attributes.position.array;
      for (let i = 0; i < sparkCount; i++) {
        if (sparkLife[i] <= 0) {
          sparkLife[i] = 0.15 + Math.random() * 0.35;
          pos[i * 3] = P.x;
          pos[i * 3 + 1] = P.y - TOOL_LEN * 0.05;
          pos[i * 3 + 2] = P.z;
          sparkVel[i].set((Math.random() - 0.5) * 1.6 * spread, Math.random() * 1.4 * spread, (Math.random() - 0.5) * 1.6 * spread);
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
      queue = buildSegments(steps[stepIdx]);
    }

    function clearParts() {
      held = null;
      for (const k of ["table", "weld", "cnc"]) if (stations[k]) stations[k].part = null;
      if (stations.pallet) stations.pallet.parts = [];
      if (stations.carton) {
        stations.carton.parts = [];
        stations.carton.lid.visible = false;
        stations.carton.tape.visible = false;
        stations.carton.closeT = 0;
      }
      if (stations.cnc) {
        stations.cnc.door.position.y = stations.cnc.doorY;
        stations.cnc.beacon.material.emissive.setHex(0x000000);
      }
      if (stations.vision) stations.vision.cone.material.opacity = 0;
      stream.visible = false;
      sparks.visible = false;
      if (robot) {
        robot.toolHead.visible = false;
        robot.fingers.forEach((f) => (f.visible = true));
      }
    }

    const cell = {
      title,
      steps,
      stations,
      get robot() {
        return robot;
      },
      started: () => stepIdx >= 0,
      get stepIdx() {
        return stepIdx;
      },
      get cycles() {
        return cycles;
      },
      get lastCycle() {
        return lastCycle;
      },
      get cycleStart() {
        return cycleStart;
      },
      get holding() {
        return !!held;
      },
      unreachable,
      buildRobot(scale) {
        disposeRobot();
        robot = buildRobot(scale);
      },
      reset() {
        clearParts();
        queue = [];
        seg = null;
        stepIdx = -1;
        cycleStart = 0;
        cycles = 0;
        lastCycle = null;
        unreachable.clear();
        applyJoints(solveIK(HOME).q);
        setFingers(true);
      },
      update(dt) {
        updateSparks(dt);
        const ct = stations.carton;
        if (ct && ct.closeT > 0) {
          ct.closeT -= dt;
          if (ct.closeT <= 0) {
            ct.parts.forEach(removePart);
            ct.parts = [];
            ct.lid.visible = false;
            ct.tape.visible = false;
          }
        }
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
      },
      setJoint(i, rad) {
        const q = robot.q.slice();
        q[i] = rad;
        seg = null;
        queue = [];
        applyJoints(q);
      },
      checkReach(list) {
        const out = new Set();
        for (const s of list || steps) {
          const st = stations[s.station];
          if (!st) continue;
          // A robot picks at a belt's far end and drops onto the outgoing belt's near end.
          const pts = st.slots ? st.slots : [s.station === "out" ? st.startPoint : st.point].filter(Boolean);
          for (const p of pts) {
            if (!solveIK(p).reachable || !solveIK(above(p)).reachable) out.add(s.station);
          }
        }
        return [...out];
      },
      dispose() {
        disposeRobot();
        groups.forEach((g) => {
          scene.remove(g);
          g.traverse((o) => o.geometry && o.geometry.dispose());
        });
      },
    };
    return cell;
  }

  /* Plan / line construction */
  function disposeLine() {
    cells.forEach((c) => c.dispose());
    conveyors.forEach((c) => {
      c.clear();
      c.dispose();
    });
    [...parts].forEach(removePart);
    cells = [];
    conveyors = [];
  }

  function buildLine(plan) {
    disposeLine();
    const list = (plan && plan.cells && plan.cells.length ? plan.cells : [{ steps: [] }]).map((c) => ({
      title: c.title,
      steps: (c.steps || []).map((s) => ({ ...s, label: s.label || stepLabel(s) })),
    }));
    mode = list.length > 1 ? "line" : "single";
    const layout = LAYOUT[mode];
    const infeed = makeConveyor(layout.infeed[0], layout.infeed[1], STATION_NAMES.conveyor, true);
    conveyors.push(infeed);
    const transfers = [];
    for (let i = 0; i < list.length - 1; i++) {
      const X = i * CELL_SPACING;
      const t = makeConveyor(X + 0.9, X + CELL_SPACING - 0.75, `Transfer to Robot ${i + 2}`, false);
      conveyors.push(t);
      transfers.push(t);
    }
    cells = list.map((c, i) =>
      createCell(i, i * CELL_SPACING, c.steps, list.length > 1 ? c.title || `Robot ${i + 1}` : c.title, {
        infeed: i === 0 ? infeed : null,
        in: transfers[i - 1] || null,
        out: transfers[i] || null,
      })
    );
    // Hide the infeed when the first robot never picks from it.
    const usesInfeed = cells[0].steps.some((s) => s.station === "conveyor");
    infeed.group.visible = usesInfeed;
    infeed.autoSpawn = usesInfeed;
    infeed.owner = cells[0];
    cells.forEach((c) => c.buildRobot(ROBOT_SIZES[sizeKey].scale));
    focus = Math.min(focus, cells.length - 1);

    const span = (cells.length - 1) * CELL_SPACING;
    sun.position.set(span / 2 + 3.5, 6 + span * 0.3, 2.5);
    sun.target.position.set(span / 2, 0, 0);
    const ext = 4 + span / 2;
    Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: 4, bottom: -4, near: 0.5, far: 30 + span });
    sun.shadow.camera.updateProjectionMatrix();
    placeReference();
    placeFence();
    // Push the fog back so a long line stays clear.
    scene.fog.near = 9 + span * 1.2;
    scene.fog.far = 30 + span * 2;
    setOverlay(overlay);
    if (overlay === "none") setView(currentView);
  }

  /* ------------------------------------------------------------------
   * Presentation overlays on the same live line:
   *   "layout" – factory plan: station zones, aisle, in/out, dimensions
   *   "flow"   – material flow: animated path of the part through every station
   * Both are built from the real station and conveyor positions.
   * ------------------------------------------------------------------ */
  let overlay = "none";
  let overlayGroup = null;
  let flowTex = null;
  let flowCurve = null;
  let flowTokens = [];
  let flowT = 0;
  const ZONE_COLORS = [0x38bdf8, 0xa78bfa, 0x34d399, 0xfbbf24, 0xf472b6, 0x60a5fa, 0xfb923c, 0x2dd4bf, 0xc084fc, 0xa3e635];

  function clearOverlay() {
    if (!overlayGroup) return;
    scene.remove(overlayGroup);
    overlayGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    overlayGroup = null;
    flowTex = null;
    flowCurve = null;
    flowTokens = [];
  }

  function lineBounds() {
    const bounds = new THREE.Box3();
    const tmp = new THREE.Box3();
    for (const o of scene.children) {
      if (o === floor || o === grid || o === refGroup || o === overlayGroup || o.isLight || o === sun.target || !o.visible || o.isSprite) continue;
      tmp.setFromObject(o);
      if (!tmp.isEmpty()) bounds.union(tmp);
    }
    return bounds;
  }

  function floorRect(x0, z0, x1, z1, color, opacity) {
    const g = new THREE.Group();
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    );
    fill.rotation.x = -Math.PI / 2;
    fill.position.set((x0 + x1) / 2, 0.006, (z0 + z1) / 2);
    const edge = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x0, 0.01, z0), new THREE.Vector3(x1, 0.01, z0),
        new THREE.Vector3(x1, 0.01, z1), new THREE.Vector3(x0, 0.01, z1),
      ]),
      new THREE.LineBasicMaterial({ color })
    );
    g.add(fill, edge);
    return g;
  }

  const bigLabel = (text, color) => {
    const l = makeLabel(text, color);
    l.scale.multiplyScalar(2.2);
    return l;
  };

  function dimension(a, b, text, offset) {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0xe2e8f0 });
    const pts = [a, b].map((p) => p.clone().add(offset));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    const perp = new THREE.Vector3().subVectors(b, a).normalize().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(0.12);
    for (const p of pts) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p.clone().add(perp), p.clone().sub(perp)]), mat));
    const lbl = bigLabel(text, "#e2e8f0");
    lbl.position.copy(pts[0].clone().add(pts[1]).multiplyScalar(0.5)).add(new THREE.Vector3(0, 0.25, 0));
    g.add(lbl);
    return g;
  }

  function buildLayoutOverlay() {
    const b = lineBounds();
    if (b.isEmpty()) return;
    const g = new THREE.Group();
    const z0 = b.min.z - 0.25, z1 = b.max.z + 0.25;
    const half = cells.length > 1 ? CELL_SPACING / 2 : Math.max(2.2, (b.max.x - b.min.x) / 2 + 0.25);
    cells.forEach((c, i) => {
      const X = i * CELL_SPACING;
      const x0 = cells.length > 1 ? (i === 0 ? Math.min(b.min.x - 0.25, X - half) : X - half) : b.min.x - 0.25;
      const x1 = cells.length > 1 ? (i === cells.length - 1 ? Math.max(b.max.x + 0.25, X + half) : X + half) : b.max.x + 0.25;
      g.add(floorRect(x0 + 0.04, z0, x1 - 0.04, z1, ZONE_COLORS[i % ZONE_COLORS.length], 0.12));
      // Short label; the full task list is already on the robot's own title.
      const name = c.title ? String(c.title).split(":")[0] : `Robot ${i + 1}`;
      const lbl = bigLabel(`Zone ${String(i + 1).padStart(2, "0")} · ${name}`, "#f8fafc");
      lbl.position.set((x0 + x1) / 2, 0.25, z1 - 0.35);
      g.add(lbl);
    });
    const xa = Math.min(b.min.x - 0.25, -half), xb = Math.max(b.max.x + 0.25, (cells.length - 1) * CELL_SPACING + half);
    // Operator / forklift aisle along the front of the line.
    const aisle = floorRect(xa, z1 + 0.15, xb, z1 + 1.35, 0x22c55e, 0.1);
    g.add(aisle);
    const al = bigLabel("Operator & forklift aisle · 1.2 m", "#86efac");
    al.position.set((xa + xb) / 2, 0.2, z1 + 0.75);
    g.add(al);
    // Material in / out.
    const inf = conveyors[0];
    const start = inf && inf.group.visible ? inf.startPoint : cells[0].stations.in?.startPoint || new THREE.Vector3(xa, 0, 0);
    const inl = bigLabel("▶ Raw material in", "#67e8f9");
    inl.position.set(start.x - 0.3, 1.5, start.z);
    g.add(inl);
    const last = cells[cells.length - 1].stations;
    const outP = (last.pallet || last.carton || last.table || {}).point || new THREE.Vector3(xb, 0, 0);
    const outl = bigLabel("Finished goods out ▶", "#fcd34d");
    outl.position.set(outP.x, 1.6, outP.z);
    g.add(outl);
    // Dimensions.
    const L = xb - xa, D = z1 + 1.35 - z0;
    g.add(dimension(new THREE.Vector3(xa, 0.02, z1 + 1.35), new THREE.Vector3(xb, 0.02, z1 + 1.35), `Line length ${L.toFixed(1)} m`, new THREE.Vector3(0, 0, 0.55)));
    g.add(dimension(new THREE.Vector3(xb, 0.02, z0), new THREE.Vector3(xb, 0.02, z1 + 1.35), `Depth ${D.toFixed(1)} m`, new THREE.Vector3(0.55, 0, 0)));
    const area = bigLabel(`Floor area ≈ ${(L * D).toFixed(0)} m² · ${cells.length} robot zone${cells.length > 1 ? "s" : ""}`, "#fbbf24");
    area.position.set((xa + xb) / 2, 0.3, z0 - 0.45);
    g.add(area);
    overlayGroup = g;
    scene.add(g);
  }

  function flowPoints() {
    const pts = [];
    const push = (p, lift = 0.28) => {
      if (!p) return;
      const v = new THREE.Vector3(p.x, Math.max(p.y, 0.5) + lift, p.z);
      const last = pts[pts.length - 1];
      if (!last || last.distanceTo(v) > 0.08) pts.push(v);
    };
    const inf = conveyors[0];
    if (inf && inf.group.visible) {
      push(inf.startPoint);
      push(inf.point);
    }
    cells.forEach((c) => {
      for (const s of c.steps) {
        const st = c.stations[s.station];
        if (!st) continue;
        if (s.station === "out") {
          push(st.startPoint);
          push(st.point);
        } else push(st.point);
      }
    });
    return pts;
  }

  function buildFlowOverlay() {
    const pts = flowPoints();
    if (pts.length < 2) return;
    const g = new THREE.Group();
    const path = new THREE.CurvePath();
    for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
    const len = path.getLength();
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 32;
    const x = c.getContext("2d");
    x.fillStyle = "#0e7490";
    x.fillRect(0, 0, 128, 32);
    x.fillStyle = "#67e8f9";
    x.beginPath();
    x.moveTo(40, 4); x.lineTo(84, 16); x.lineTo(40, 28); x.lineTo(56, 16);
    x.closePath();
    x.fill();
    flowTex = new THREE.CanvasTexture(c);
    flowTex.wrapS = THREE.RepeatWrapping;
    flowTex.repeat.set(Math.max(2, Math.round(len / 0.35)), 1);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(path, Math.max(40, pts.length * 24), 0.045, 8, false),
      new THREE.MeshBasicMaterial({ map: flowTex, transparent: true, opacity: 0.95, depthTest: false })
    );
    tube.renderOrder = 5;
    g.add(tube);
    flowCurve = path;
    for (let k = 0; k < 6; k++) {
      const tok = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), new THREE.MeshBasicMaterial({ color: 0xfbbf24, depthTest: false }));
      tok.renderOrder = 6;
      g.add(tok);
      flowTokens.push(tok);
    }
    const inl = makeLabel("IN · raw parts", "#67e8f9");
    inl.position.copy(pts[0]).add(new THREE.Vector3(0, 0.35, 0));
    const outl = makeLabel("OUT · finished goods", "#fcd34d");
    outl.position.copy(pts[pts.length - 1]).add(new THREE.Vector3(0, 0.35, 0));
    g.add(inl, outl);
    const total = makeLabel(`Part travel ${len.toFixed(1)} m through ${cells.length} robot${cells.length > 1 ? "s" : ""}`, "#e2e8f0");
    const span = (cells.length - 1) * CELL_SPACING;
    total.position.set(span / 2, 3.0, -1.6);
    g.add(total);
    overlayGroup = g;
    scene.add(g);
  }

  function setOverlay(name) {
    overlay = name || "none";
    clearOverlay();
    if (overlay === "layout") buildLayoutOverlay();
    else if (overlay === "flow") buildFlowOverlay();
    if (cells.length) setView(currentView);
  }

  function updateOverlay(dt) {
    if (!flowCurve) return;
    flowTex.offset.x -= dt * 1.2;
    flowT = (flowT + dt * 0.035) % 1;
    flowTokens.forEach((t, k) => t.position.copy(flowCurve.getPointAt((flowT + k / flowTokens.length) % 1)));
  }

  let currentView = "iso";
  function setView(name) {
    currentView = name;
    const span = (cells.length - 1) * CELL_SPACING;
    const cx = span / 2;
    const k = 1 + span / 5;
    const VIEWS = {
      iso: [new THREE.Vector3(cx + 3.7 * k, 2.95 * k, 3.9 * k), new THREE.Vector3(cx - 0.1, 0.65, 0.1)],
      front: [new THREE.Vector3(cx + 4.6 * k, 1.5 * k, 0.05), new THREE.Vector3(cx, 0.8, 0.05)],
      top: [new THREE.Vector3(cx + 0.01, 6.2 * k, 0.01), new THREE.Vector3(cx, 0, 0)],
      side: [new THREE.Vector3(cx + 0.1, 1.6 * k, 4.6 * k), new THREE.Vector3(cx, 0.8, 0)],
    };
    if (cells.length > 1) {
      // Fit the whole line across the screen, whatever the stage's shape.
      const vfov = (camera.fov * Math.PI) / 180;
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(camera.aspect, 0.5));
      const dist = Math.max((span + 5.6) / 2 / Math.tan(hfov / 2), 3.4 / Math.tan(vfov / 2));
      const at = (dx, dy, dz) => {
        const d = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(dist);
        return new THREE.Vector3(cx + d.x, 0.5 + d.y, -0.2 + d.z);
      };
      VIEWS.iso = [at(0.28, 0.62, 1), new THREE.Vector3(cx, 0.5, -0.2)];
      VIEWS.front = [at(0, 0.3, 1), new THREE.Vector3(cx, 0.7, -0.2)];
      VIEWS.side = [new THREE.Vector3(cx + span / 2 + 5, 2.2, 0.2), new THREE.Vector3(cx, 0.8, 0)];
      VIEWS.top = [at(0.001, 1, 0.001), new THREE.Vector3(cx, 0, -0.2)];
    }
    const v = VIEWS[name] || VIEWS.iso;
    if (overlay !== "none") {
      // Plan and flow views: frame the whole line plus its overlay (aisle, dimensions, in/out).
      const box = lineBounds();
      if (overlayGroup) box.union(new THREE.Box3().setFromObject(overlayGroup));
      if (!box.isEmpty()) {
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        // Top view: square to the line, material flowing left to right.
        const dir = name === "top" ? new THREE.Vector3(0, 1, 0.0001) : v[0].clone().sub(v[1]).normalize();
        const vfov = (camera.fov * Math.PI) / 180;
        const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
        const dist = (sphere.radius / Math.sin(Math.min(vfov, hfov) / 2)) * (name === "top" ? 0.8 : 0.72);
        camera.position.copy(sphere.center).addScaledVector(dir, dist);
        controls.target.copy(sphere.center);
        controls.update();
        return;
      }
    }
    camera.position.copy(v[0]);
    controls.target.copy(v[1]);
    controls.update();
  }

  function reset() {
    conveyors.forEach((c) => c.clear());
    [...parts].forEach(removePart);
    cells.forEach((c) => c.reset());
    simTime = 0;
    events = [];
    emit(true);
  }

  function setRobotSize(key) {
    if (!ROBOT_SIZES[key]) return;
    sizeKey = key;
    cells.forEach((c) => c.buildRobot(ROBOT_SIZES[key].scale));
    placeFence();
    reset();
  }

  let lastEmit = 0;
  function emit(force) {
    if (!onUpdate || !cells.length) return;
    const now = performance.now();
    if (!force && now - lastEmit < 100) return;
    lastEmit = now;
    const f = cells[focus];
    const last = cells[cells.length - 1];
    const unreachable = new Set();
    cells.forEach((c) => c.unreachable.forEach((u) => unreachable.add(u)));
    onUpdate({
      playing,
      speed,
      size: ROBOT_SIZES[sizeKey],
      joints: f.robot ? f.robot.q.map((v) => +((v * 180) / Math.PI).toFixed(1)) : [0, 0, 0, 0, 0, 0],
      stepIndex: f.stepIdx,
      step: f.steps[f.stepIdx] || null,
      focus,
      cycles: last.cycles,
      lastCycle: last.lastCycle,
      currentCycle: simTime - last.cycleStart,
      simTime,
      holding: f.holding,
      unreachable: [...unreachable],
      events: events.slice(),
      cells: cells.map((c) => ({
        title: c.title,
        stepIndex: c.stepIdx,
        step: c.steps[c.stepIdx] || null,
        cycles: c.cycles,
      })),
    });
  }

  let raf = 0;
  let lastT = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    // Clamp: a frame timestamp can precede the start time, which would run time backwards.
    let dt = clamp((now - lastT) / 1000, 0, 0.05);
    lastT = now;
    if (playing && cells.some((c) => c.steps.length)) {
      dt *= speed;
      simTime += dt;
      conveyors.forEach((c) => c.update(dt));
      cells.forEach((c) => c.update(dt));
      updateOverlay(dt);
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
    if (cells.length > 1) setView(currentView);
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro ? ro.observe(container) : window.addEventListener("resize", resize);

  buildLine({ cells: [{ steps: [] }] });
  resize();
  reset();
  raf = requestAnimationFrame(frame);

  return {
    setSteps(newSteps) {
      buildLine({ cells: [{ steps: newSteps || [] }] });
      reset();
      playing = true;
      emit(true);
    },
    setPlan(plan) {
      buildLine(plan);
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
    /** "layout" (factory plan), "flow" (material flow) or "none" on the same live line. */
    setOverlay,
    /** Fence the industrial robot cells: true / false for all, or one flag per cell. */
    setFencing(on) {
      fenceCells = Array.isArray(on) ? on.map(Boolean) : cells.map(() => !!on);
      placeFence();
      if (overlay === "layout") setOverlay(overlay);
    },
    /** Show a photo of the user's manual process behind the line (null hides it). */
    setReference(url, label) {
      refUrl = url || null;
      if (label) refLabel = label;
      placeReference();
    },
    setFocus(i) {
      focus = clamp(Number(i) || 0, 0, cells.length - 1);
      emit(true);
    },
    setJoint(i, deg) {
      if (playing) return;
      cells[focus].setJoint(i, (Number(deg) * Math.PI) / 180);
      emit(true);
    },
    checkReach(stepsToCheck) {
      if (cells.length === 1) return cells[0].checkReach(stepsToCheck);
      const out = new Set();
      cells.forEach((c) => c.checkReach().forEach((u) => out.add(u)));
      return [...out];
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro ? ro.disconnect() : window.removeEventListener("resize", resize);
      refToken++;
      clearReference();
      clearFence();
      disposeLine();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
