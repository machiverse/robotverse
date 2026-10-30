/**
 * RobotVerse Automation Studio 3D — simulation engine
 * Framework-free. THREE and OrbitControls are passed in, so the same file
 * works in the React app (npm "three") and in a plain HTML page (CDN).
 *
 * Coordinates: metres, Y up, robot base at world origin.
 */

import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { createWorkpieces, productFor } from "./workpieces.js";
import { createToolKit, eoatLook, headFor, HEAD_FX, TOOL_LOOK_NAMES } from "./toolHeads.js";
import { cellEquipment, chosenProduct, createEquipmentModels, jobsOfTitle, lineEquipment } from "./cellEquipment.js";

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
  rack: "Tool stand",
  press: "Press",
  mould: "Moulding machine",
  test: "Test station",
  marker: "Laser marker",
  bin: "Parts bin",
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
  // "cnc_2" is the CNC machine at the far end of the robot's track.
  const key = String(step.station || "").replace(/_\d+$/, "");
  const two = key !== step.station ? " 2" : "";
  const n = (STATION_NAMES[key] || "") + two;
  switch (step.action) {
    case "pick":
      return key === "cnc" ? `Unload from CNC${two}` : `Pick from ${n.toLowerCase()}`;
    case "place":
      if (key === "cnc") return `Load into CNC${two}`;
      if (key === "pallet") return `Stack on pallet${two}`;
      return `Place on ${n.toLowerCase()}`;
    case "process":
      return ({ press: "Press stroke", mould: "Moulding cycle", test: "Run the test", marker: "Laser mark the part" }[key] || "Run CNC cycle") + two;
    case "scan":
      return "Find a part with the 3D camera";
    case "inspect":
      return "Inspect with camera";
    case "weld":
      return "Weld seam";
    case "toolchange":
      return "Change tool";
    case "manual":
      return "Operator changes the part";
    case "check":
      return "Camera check";
    case "idle":
      return "Waiting";
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

/** Size of a generic part; each line resizes it to its real product (see workpieces.js). */
const PART0 = { w: 0.1, h: 0.09, d: 0.1 };
const TOOL_LEN = 0.16;

/** Factory paint of each robot brand: [body, trim]. */
const BRAND_PAINT = [
  [/fanuc/i, 0xf2c500, 0x1f2937],
  [/kuka/i, 0xf07c00, 0x2b2b2b],
  [/abb/i, 0xeceff2, 0xe8631a],
  [/yaskawa|motoman/i, 0x2d6fd6, 0xeceff2],
  [/universal robots|\bur\d/i, 0xd9dde2, 0x3d8fd6],
  [/doosan/i, 0xf1f3f5, 0x1b1f24],
  [/kawasaki/i, 0xe9e2c8, 0xd65a1f],
  [/nachi/i, 0x8fa3b8, 0x1f2937],
  [/st[aä]ubli/i, 0xf4b400, 0x1f2937],
  [/comau/i, 0x1f5fb0, 0xeceff2],
  [/epson/i, 0xeef1f5, 0x1d4ed8],
  [/denso/i, 0xeef1f5, 0x2b6cb0],
  [/mitsubishi/i, 0xeef1f5, 0xc81e1e],
  [/hyundai/i, 0x1f5fb0, 0xeceff2],
];
export function brandPaint(brand, collaborative) {
  const hit = BRAND_PAINT.find(([re]) => re.test(brand || ""));
  if (hit) return [hit[1], hit[2]];
  return collaborative ? [0xeef1f5, 0x2f7de1] : [0xf2b705, 0x1f2937];
}

/** End-of-arm tool family from a product name or category. */
export function eoatKind(text) {
  const t = String(text || "").toLowerCase();
  if (/dual/.test(t) && /grip/.test(t)) return "dual";
  if (/vacuum|suction|epick|\bvg[cp]?\d|cup/.test(t)) return "vacuum";
  if (/magnet/.test(t)) return "magnet";
  if (/fork|sack|bag|claw|clamp|palletiz|slip sheet/.test(t)) return "fork";
  if (/torch|weld|mig|tig|\barc\b|spot|solder|sonotrode|plasma cut|plasma torch|laser cutting head/.test(t)) return "torch";
  // A screwdriving spindle is a screwdriver.
  if (/screw|nutrunner/.test(t)) return "driver";
  if (/grind|sand|polish|deburr|spindle|milling|router|cutter|laser clean|ablat|blade|knife|hemm|brush/.test(t)) return "spindle";
  if (/driver|fasten|rivet|capping|nail gun|nailer|stapler/.test(t)) return "driver";
  if (/dispens|glue|paint|spray|nozzle|applicator|extru|dosing|atomi[sz]er|powder gun|pipet/.test(t)) return "nozzle";
  return "parallel";
}
const APPROACH = 0.22;
const CELL_SPACING = 3.6;
/** Default travel per motion system in the 3D cell (m; a lift column's is vertical). See robotMotion.ts. */
const MOTION_LEN = { fixed: 0, track: 4, overhead: 4, gantry: 3.5, amr: 4, lift: 1.2, rgv: 5 };
/** An inverted robot hangs this high from the overhead track, and is at least this big to reach the floor stations. */
const OVERHEAD_SCALE = 1.3;
const OVERHEAD_Y = 0.65 + 1.45 * OVERHEAD_SCALE;
/** Gantry frame: rail height, and how far its legs stand beyond the end stations. */
const GANTRY_H = 2.75;
const GANTRY_X = 1.95;
/** How far a robot's motion system carries it along the line (m): 0 for a fixed robot or a lift column. */
const travelOf = (motion) =>
  motion && MOTION_LEN[motion.type] && motion.type !== "lift" ? clamp(Number(motion.length) || MOTION_LEN[motion.type], 1.5, 8) : 0;
const BELT_SPEED = 0.45;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** Typical reach for a payload class when a listing gives none. */
const estimateReach = (kg) => (!kg ? 1.45 : kg <= 8 ? 0.9 : kg <= 25 ? 1.6 : kg <= 70 ? 2.05 : kg <= 200 ? 2.7 : 3.1);
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
/** A plan's identity for layout edits: the same robots, jobs, stations and motion. */
export function planSignature(plan) {
  const cs = (plan && plan.cells) || [];
  return JSON.stringify(cs.map((c) => [c.title || "", (c.steps || []).map((s) => `${s.action}@${s.station}`), c.stations || [], c.motion ? c.motion.type : ""]));
}

export function createSimulation({ THREE, OrbitControls, RoomEnvironment, post, quality: wantQuality, container, onUpdate, onStatus, onPerformance, onLayout }) {
  const LIGHT_K = Number(THREE.REVISION) >= 155 ? Math.PI : 1;
  // The product this line handles: its size drives grips, slots and stations.
  const PART = { ...PART0 };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  /*
   * Picture quality. "high": a cinematic pipeline — ambient occlusion where parts meet, a soft glow on lamps,
   * beacons, lasers and hot metal, multisampled edges and sharper shadows. "standard": the direct render, for
   * phones and slow graphics. High is the default on desktops when the post-processing modules are passed in,
   * and drops to standard by itself if the frame rate cannot keep up.
   */
  const canPost = !!(post && post.EffectComposer && post.RenderPass && post.OutputPass);
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  let quality = canPost && wantQuality !== "standard" && (wantQuality === "high" || (!coarse && (navigator.hardwareConcurrency || 4) >= 4)) ? "high" : "standard";
  let qualityAuto = wantQuality !== "high" && wantQuality !== "standard";
  // Auto mode starts light so the first picture appears fast, then steps up to cinematic once frames prove smooth.
  let canUpgrade = qualityAuto && quality === "high";
  if (canUpgrade) quality = "standard";
  let resolution = 1;
  const pixelRatio = () => Math.max(0.75, Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.5 : 1.75) * resolution);
  renderer.setPixelRatio(pixelRatio());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  // Physically based look: sRGB output, filmic tone mapping, soft image-based lighting.
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping !== undefined ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = THREE.AgXToneMapping !== undefined ? 1.02 : 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2f35);
  // A little haze in the hall air, so distant racks and walls fall back.
  scene.fog = new THREE.Fog(0x2a2f35, 20, 60);
  let envTexture = null;
  if (RoomEnvironment) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    if ("environmentIntensity" in scene) scene.environmentIntensity = 0.75;
    pmrem.dispose();
  }

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 90);
  // Signs live on their own layer: drawn last, straight to the screen, untouched by shading and tone mapping.
  const LABELS = 1;
  camera.layers.enable(LABELS);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 1.2;
  controls.maxDistance = 45;
  // Cinematic view: a slow orbit round the line, until the user takes the camera.
  controls.autoRotateSpeed = 0.55;
  controls.addEventListener("start", () => { controls.autoRotate = false; glide = null; invalidated = true; });

  let composer = null;
  let gtao = null;
  function disposeComposer() {
    if (!composer) return;
    composer.passes.forEach((p) => p.dispose && p.dispose());
    composer.renderTarget1.dispose();
    composer.renderTarget2.dispose();
    composer = null;
    gtao = null;
  }
  function buildComposer() {
    disposeComposer();
    if (quality !== "high") return;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;
    // Multisampled HDR target: smooth edges, and highlights above 1.0 for the glow.
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    composer = new post.EffectComposer(renderer, rt);
    composer.addPass(new post.RenderPass(scene, camera));
    if (post.GTAOPass) {
      gtao = new post.GTAOPass(scene, camera, w, h);
      gtao.updateGtaoMaterial({ radius: 0.32, distanceExponent: 1.5, thickness: 1.4, scale: 1.15, samples: 12, distanceFallOff: 1 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      gtao.blendIntensity = 0.75;
      // Signs, glass, mist and fence mesh cast no contact shadow.
      const hide = gtao.overrideVisibility.bind(gtao);
      gtao.overrideVisibility = function () {
        hide();
        scene.traverse((o) => {
          const m = o.material;
          if (o.isSprite || (m && !Array.isArray(m) && m.transparent && (m.opacity < 0.9 || !m.depthWrite))) o.visible = false;
        });
      };
      composer.addPass(gtao);
    }
    // Only true light sources glow (lamps, skylights, arcs), never sunlit paint.
    if (post.UnrealBloomPass) composer.addPass(new post.UnrealBloomPass(new THREE.Vector2(w, h), 0.18, 0.35, 2.8));
    composer.addPass(new post.OutputPass());
    // A lens's soft fall-off at the corners draws the eye to the robot.
    if (post.ShaderPass && post.VignetteShader) {
      const lens = new post.ShaderPass(post.VignetteShader);
      lens.uniforms.offset.value = 1.0;
      lens.uniforms.darkness.value = 0.55;
      composer.addPass(lens);
    }
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
  }
  function setQuality(q, auto = false) {
    const next = q === "high" && canPost ? "high" : "standard";
    if (!auto) qualityAuto = false;
    if (next === quality && (composer || next === "standard")) return;
    quality = next;
    renderer.setPixelRatio(pixelRatio());
    const size = quality === "high" ? 4096 : 2048;
    sun.shadow.mapSize.set(size, size);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    buildComposer();
    resize();
    emit(true);
  }

  // Sky light from the roof lights above, bounce from the concrete below.
  scene.add(new THREE.HemisphereLight(0xf2f4f6, 0x5a544c, (RoomEnvironment ? 0.42 : 0.75) * LIGHT_K));
  // Key light: warm daylight through the skylights, casting the shadows.
  const sun = new THREE.DirectionalLight(0xfff6ec, 1.15 * LIGHT_K);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === "high" ? 4096 : 2048, quality === "high" ? 4096 : 2048);
  sun.shadow.bias = -0.00008;
  sun.shadow.normalBias = 0.003;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0xdfe8f2, 0.22 * LIGHT_K);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  /** A small tiled canvas texture: brushed steel, wood grain, painted sheet metal. */
  const sceneTextures = [];
  function canvasTex(w, h, draw, repeat = [1, 1]) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 4;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    sceneTextures.push(t);
    return t;
  }
  const streaks = (base, light, dark, n, vertical) => (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? light : dark;
      const p = Math.random() * (vertical ? w : h);
      if (vertical) g.fillRect(p, 0, 1, h);
      else g.fillRect(0, p, w, 1);
    }
  };
  const M = {
    body: new THREE.MeshPhysicalMaterial({ color: 0xe6e9ed, metalness: 0, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.35, roughness: 0.55 }),
    accent: new THREE.MeshPhysicalMaterial({ color: 0x3f6f9e, metalness: 0, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
    // Brushed stainless: fine streaks catch the light like a real table top.
    steel: new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, streaks("#9aa4ae", "rgba(255,255,255,0.18)", "rgba(40,48,60,0.16)", 220)), metalness: 0.72, roughness: 0.32 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x3a4555, metalness: 0.4, roughness: 0.55 }),
    machine: new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, streaks("#c4cad1", "rgba(255,255,255,0.06)", "rgba(0,0,0,0.025)", 36, true)), metalness: 0.25, roughness: 0.42 }),
    wood: new THREE.MeshStandardMaterial({
      map: canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = "#c19563";
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 46; i++) {
          g.strokeStyle = `rgba(110,70,35,${0.06 + Math.random() * 0.14})`;
          g.lineWidth = 1 + Math.random() * 2;
          g.beginPath();
          const x = Math.random() * w;
          g.moveTo(x, 0);
          g.bezierCurveTo(x + Math.random() * 8 - 4, h * 0.3, x + Math.random() * 8 - 4, h * 0.7, x + Math.random() * 6 - 3, h);
          g.stroke();
        }
      }),
      metalness: 0,
      roughness: 0.82,
    }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc4ea, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.35 }),
    // Tinted polycarbonate in a machine guard: dark, with the hall reflected in it.
    smoked: new THREE.MeshStandardMaterial({ color: 0x18222d, metalness: 0.55, roughness: 0.06 }),
    // Welding table: thick steel plate drilled on a 100 mm grid for clamps and stops.
    weldTop: new THREE.MeshStandardMaterial({
      map: canvasTex(
        256,
        256,
        (g, w, h) => {
          g.fillStyle = "#4b525a";
          g.fillRect(0, 0, w, h);
          for (let i = 0; i < 900; i++) {
            g.fillStyle = `rgba(${Math.random() < 0.5 ? "20,24,28" : "150,156,162"},${0.05 + Math.random() * 0.08})`;
            g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
          }
          g.strokeStyle = "rgba(200,206,212,0.18)";
          g.lineWidth = 1;
          for (let i = 0; i <= 4; i++) {
            g.beginPath();
            g.moveTo((i * w) / 4, 0);
            g.lineTo((i * w) / 4, h);
            g.moveTo(0, (i * h) / 4);
            g.lineTo(w, (i * h) / 4);
            g.stroke();
          }
          for (let i = 0; i < 4; i++)
            for (let j = 0; j < 4; j++) {
              const cx = ((i + 0.5) * w) / 4, cy = ((j + 0.5) * h) / 4;
              g.fillStyle = "#0e1114";
              g.beginPath();
              g.arc(cx, cy, w / 22, 0, Math.PI * 2);
              g.fill();
              g.strokeStyle = "rgba(210,216,222,0.45)";
              g.lineWidth = 1.5;
              g.stroke();
            }
        },
        [1.75, 1.4],
      ),
      metalness: 0.55,
      roughness: 0.5,
    }),
    amber: new THREE.MeshStandardMaterial({ color: 0xf2b705, metalness: 0.2, roughness: 0.5 }),
    card: new THREE.MeshStandardMaterial({ color: 0xc49a6c, metalness: 0, roughness: 0.9 }),
  };

  // Asset factories own their pooled materials/geometry; transient groups own everything else.
  const pooledMaterials = new WeakSet(Object.values(M));
  const pooledGeometry = new WeakSet();
  const labels = new Set();
  function protect(root, geometry = false) {
    root.traverse((o) => {
      for (const m of [].concat(o.material || [])) pooledMaterials.add(m);
      if (geometry && o.geometry) pooledGeometry.add(o.geometry);
    });
    return root;
  }
  function disposeGroup(root) {
    if (!root) return;
    const geos = new Set(), mats = new Set(), texs = new Set();
    root.traverse((o) => {
      labels.delete(o);
      if (o.geometry && !pooledGeometry.has(o.geometry)) geos.add(o.geometry);
      for (const m of [].concat(o.material || [])) if (!pooledMaterials.has(m)) {
        mats.add(m);
        for (const v of Object.values(m)) if (v && v.isTexture) texs.add(v);
      }
    });
    geos.forEach((g) => g.dispose());
    texs.forEach((t) => t.dispose());
    mats.forEach((m) => m.dispose());
    root.removeFromParent();
  }
  /** Merge only rigid visible meshes; retain the hierarchy and all animated objects. */
  function bakeStatic(group) {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert(), batches = new Map(), removed = [];
    const visit = (o) => {
      if (o !== group && (o.userData.dynamic || !o.visible || o.isSprite)) return;
      if (o.isMesh && o.geometry && !o.userData.dynamic && !Array.isArray(o.material)) {
        const key = `${o.material.uuid}:${o.castShadow}:${o.receiveShadow}`;
        const list = batches.get(key) || [];
        list.push(o); batches.set(key, list);
      }
      o.children.forEach(visit);
    };
    group.children.forEach(visit);
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const copies = meshes.map((m) => {
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        g.clearGroups(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld));
        return g;
      });
      const geometry = mergeGeometries(copies, false);
      copies.forEach((g) => g.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, meshes[0].material);
      merged.castShadow = meshes[0].castShadow; merged.receiveShadow = meshes[0].receiveShadow;
      group.add(merged);
      meshes.forEach((m) => { removed.push(m.geometry); m.removeFromParent(); });
    }
    new Set(removed).forEach((g) => { if (!pooledGeometry.has(g)) g.dispose(); });
    return group;
  }
  const contactTexture = canvasTex(64, 64, (g, w, h) => {
    const fade = g.createRadialGradient(w/2, h/2, 3, w/2, h/2, w/2);
    fade.addColorStop(0, 'rgba(0,0,0,0.28)'); fade.addColorStop(0.6, 'rgba(0,0,0,0.12)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(0,0,w,h);
  });
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  pooledMaterials.add(contactMaterial);
  function ground(group) {
    const b = meshBox(group);
    if (b.isEmpty()) return;
    group.updateWorldMatrix(true, false);
    const p = new THREE.Vector3((b.min.x+b.max.x)/2, 0.008, (b.min.z+b.max.z)/2);
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.25,b.max.x-b.min.x)*1.18, Math.max(0.25,b.max.z-b.min.z)*1.18), contactMaterial);
    decal.rotation.x = -Math.PI/2;
    // Decals are world-aligned even when their owning machine is rotated.
    decal.position.copy(p); decal.updateMatrix();
    decal.applyMatrix4(group.matrixWorld.clone().invert());
    decal.userData.zone = true; group.add(decal);
  }

  const box = (w, h, d, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = Math.max(w, h, d) > 0.18 && Math.min(w,h,d) > 0.055;
    m.receiveShadow = true;
    return m;
  };
  /** A box with softened edges: real sheet metal and castings catch the light along their edges. */
  const rbox = (w, h, d, mat, r = 0.02) => {
    const b = Math.min(r, w / 4, h / 4, d / 4);
    const x = w / 2 - b, y = h / 2 - b, c = b * 0.6;
    const s = new THREE.Shape();
    s.moveTo(-x + c, -y);
    s.lineTo(x - c, -y);
    s.quadraticCurveTo(x, -y, x, -y + c);
    s.lineTo(x, y - c);
    s.quadraticCurveTo(x, y, x - c, y);
    s.lineTo(-x + c, y);
    s.quadraticCurveTo(-x, y, -x, y - c);
    s.lineTo(-x, -y + c);
    s.quadraticCurveTo(-x, -y, -x + c, -y);
    const geo = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.4, bevelSegments: 2, curveSegments: 3 });
    geo.translate(0, 0, -(d - 2 * b) / 2);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const cyl = (r, h, mat, seg = 32) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.castShadow = r > 0.065 && h > 0.15;
    m.receiveShadow = true;
    return m;
  };

  /** Many boxes or cylinders of one material as a single mesh. parts: [geometry, [x, y, z], [rx, ry, rz]?] */
  function mergeParts(parts) {
    const pos = [], nor = [], uv = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    for (const [geo, p, r] of parts) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      m4.compose(new THREE.Vector3(...p), q.setFromEuler(e.set(...(r || [0, 0, 0]))), one);
      g.applyMatrix4(m4);
      pos.push(g.attributes.position.array);
      nor.push(g.attributes.normal.array);
      uv.push(g.attributes.uv ? g.attributes.uv.array : new Float32Array(g.attributes.position.count * 2));
      g.dispose();
      geo.dispose();
    }
    const cat = (arrs) => {
      const out = new Float32Array(arrs.reduce((n, a) => n + a.length, 0));
      let o = 0;
      for (const a of arrs) {
        out.set(a, o);
        o += a.length;
      }
      return out;
    };
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(cat(pos), 3));
    out.setAttribute("normal", new THREE.BufferAttribute(cat(nor), 3));
    out.setAttribute("uv", new THREE.BufferAttribute(cat(uv), 2));
    return out;
  }
  const hallTextures = [];
  function hallTex(w, h, draw, repeat, srgb = true) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (srgb && THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    hallTextures.push(t);
    return t;
  }

  /* Floor: polished concrete in 6 m slabs with saw-cut joints, trowel marks and patchy sheen. */
  const SLAB = 512;
  const slabHeight = (() => {
    // Height field shared by the colour, sheen and relief maps: joints are grooves, aggregate is grain.
    const c = document.createElement("canvas");
    c.width = c.height = SLAB;
    const g = c.getContext("2d");
    g.fillStyle = "#808080";
    g.fillRect(0, 0, SLAB, SLAB);
    for (let i = 0; i < 9000; i++) {
      const v = 110 + Math.floor(Math.random() * 40);
      g.fillStyle = `rgba(${v},${v},${v},0.35)`;
      g.fillRect(Math.random() * SLAB, Math.random() * SLAB, 1.5, 1.5);
    }
    g.fillStyle = "#3a3a3a";
    g.fillRect(0, 0, SLAB, 3);
    g.fillRect(0, 0, 3, SLAB);
    return c;
  })();
  const floorTex = hallTex(SLAB, SLAB, (g, w, h) => {
    g.fillStyle = "#8d9297";
    g.fillRect(0, 0, w, h);
    // Large soft clouds of lighter and darker cement.
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 110;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      const v = Math.random() < 0.5 ? "255,255,255" : "40,44,50";
      grd.addColorStop(0, `rgba(${v},0.07)`);
      grd.addColorStop(1, `rgba(${v},0)`);
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Power-trowel swirls.
    g.strokeStyle = "rgba(255,255,255,0.035)";
    for (let i = 0; i < 40; i++) {
      g.lineWidth = 6 + Math.random() * 10;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 40 + Math.random() * 80, Math.random() * 6, Math.random() * 6 + 2);
      g.stroke();
    }
    // Aggregate.
    for (let i = 0; i < 5000; i++) {
      const v = 70 + Math.floor(Math.random() * 90);
      g.fillStyle = `rgba(${v},${v + 2},${v + 4},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5);
    }
    // A few stains and tyre marks.
    g.strokeStyle = "rgba(30,32,36,0.06)";
    g.lineWidth = 18;
    g.beginPath();
    g.moveTo(0, h * 0.62);
    g.bezierCurveTo(w * 0.3, h * 0.55, w * 0.7, h * 0.7, w, h * 0.64);
    g.stroke();
    // Joints and grain from the shared height field, blended over the colour.
    g.globalCompositeOperation = "overlay";
    g.drawImage(slabHeight, 0, 0);
    g.globalCompositeOperation = "source-over";
  }, [10, 5]);
  // The joints and grain catch the light.
  const floorRelief = hallTex(SLAB, SLAB, (g, w, h) => {
    const src = slabHeight.getContext("2d").getImageData(0, 0, w, h).data;
    const img = g.createImageData(w, h);
    const at = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const dx = (at(x - 1, y) - at(x + 1, y)) * 2.2, dy = (at(x, y - 1) - at(x, y + 1)) * 2.2;
        const l = Math.hypot(dx, dy, 1);
        const i = (y * w + x) * 4;
        img.data[i] = ((dx / l) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
        img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, [10, 5], false);
  // Polished patches shine, worn paths are matt.
  const floorSheen = hallTex(256, 256, (g, w, h) => {
    g.fillStyle = "#8a8a8a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 60;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      const v = Math.random() < 0.6 ? 70 : 175;
      grd.addColorStop(0, `rgba(${v},${v},${v},0.5)`);
      grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, [10, 5], false);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 30),
    new THREE.MeshStandardMaterial({ map: floorTex, color: 0x9da2a8, normalMap: floorRelief, normalScale: new THREE.Vector2(0.55, 0.55), roughnessMap: floorSheen, roughness: 0.7, metalness: 0.02, envMapIntensity: 0.5 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(60, 120, 0x33445a, 0x2a384a);
  grid.position.y = 0.001;
  grid.visible = false; // slab joints are in the floor texture
  scene.add(grid);

  /* The hall: sandwich-panel wall with a clerestory window band, steel columns with hazard sleeves, roof trusses
     and skylights, high-bay LED lamps, a cable tray, pallet racking along the back wall, a green walkway. */
  const building = new THREE.Group();
  /** The roof (trusses, deck, light strips, lamps): out of the way when the camera looks down from above it. */
  const roofParts = [];
  function buildHall() {
    const add = (geo, mat, { shadow = false } = {}) => {
      const m = new THREE.Mesh(geo, mat);
      m.receiveShadow = true;
      m.castShadow = shadow;
      building.add(m);
      return m;
    };
    const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const panelMat = new THREE.MeshStandardMaterial({
      map: hallTex(256, 64, (g, w, h) => {
        g.fillStyle = "#b9c1c9";
        g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 32) {
          g.fillStyle = "rgba(255,255,255,0.35)";
          g.fillRect(x + 2, 0, 3, h);
          g.fillStyle = "rgba(40,50,60,0.25)";
          g.fillRect(x + 5, 0, 2, h);
          g.fillRect(x + 18, 0, 1, h);
        }
      }, [15, 1]),
      metalness: 0.35,
      roughness: 0.5,
    });
    add(B(60, 8.6, 0.12), panelMat).position.set(0, 4.3, -7.45);
    add(B(60, 1.2, 0.22), new THREE.MeshStandardMaterial({ color: 0x8b9096, roughness: 0.85 })).position.set(0, 0.6, -7.38);
    // Daylight through the clerestory glazing: bright enough to glow.
    add(B(60, 1.15, 0.05), new THREE.MeshStandardMaterial({ color: 0xdfeaf4, emissive: 0xdfeaf4, emissiveIntensity: 2.2, roughness: 0.2 })).position.set(0, 5.35, -7.36);
    const mullions = [];
    for (let x = -29; x <= 29; x += 2) mullions.push([B(0.07, 1.25, 0.08), [x, 5.35, -7.32]]);
    mullions.push([B(60, 0.07, 0.08), [0, 4.75, -7.32]], [B(60, 0.07, 0.08), [0, 5.95, -7.32]]);
    const steelDark = new THREE.MeshStandardMaterial({ color: 0x39424e, metalness: 0.6, roughness: 0.45 });
    add(mergeParts(mullions), steelDark);

    // Steel I-section columns, painted blue, with yellow-black sleeves where forklifts pass.
    const ish = new THREE.Shape();
    ish.moveTo(-0.17, -0.2); ish.lineTo(0.17, -0.2); ish.lineTo(0.17, -0.17); ish.lineTo(0.02, -0.17); ish.lineTo(0.02, 0.17); ish.lineTo(0.17, 0.17);
    ish.lineTo(0.17, 0.2); ish.lineTo(-0.17, 0.2); ish.lineTo(-0.17, 0.17); ish.lineTo(-0.02, 0.17); ish.lineTo(-0.02, -0.17); ish.lineTo(-0.17, -0.17); ish.lineTo(-0.17, -0.2);
    const colGeo = () => {
      const g = new THREE.ExtrudeGeometry(ish, { depth: 8.6, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const cols = [], sleeves = [], extinguishers = [];
    for (let x = -27; x <= 27; x += 6) {
      cols.push([colGeo(), [x, 0, -7.05]]);
      sleeves.push([B(0.46, 1.1, 0.5), [x, 0.55, -7.05]]);
      extinguishers.push([new THREE.CylinderGeometry(0.075, 0.075, 0.5, 12), [x + 0.32, 1.05, -6.95]]);
    }
    add(mergeParts(cols), new THREE.MeshStandardMaterial({ color: 0x235d9f, metalness: 0.45, roughness: 0.42 }), { shadow: true });
    add(
      mergeParts(sleeves),
      new THREE.MeshStandardMaterial({
        map: hallTex(64, 64, (g, w, h) => {
          g.fillStyle = "#f2b705";
          g.fillRect(0, 0, w, h);
          g.fillStyle = "#15171a";
          for (let i = -h; i < w; i += 16) {
            g.beginPath();
            g.moveTo(i, h);
            g.lineTo(i + 8, h);
            g.lineTo(i + 8 + h, 0);
            g.lineTo(i + h, 0);
            g.fill();
          }
        }, [2, 2]),
        roughness: 0.55,
      })
    );
    add(mergeParts(extinguishers), new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.35, metalness: 0.2 }));

    // Roof: trusses every 6 m, purlins, a dark deck and skylight strips.
    const truss = [];
    const z0 = -7.4, z1 = 9, yb = 7.4, yt = 8.5;
    for (let x = -27; x <= 27; x += 6) {
      truss.push([B(0.12, 0.12, z1 - z0), [x, yb, (z0 + z1) / 2]], [B(0.12, 0.12, z1 - z0), [x, yt, (z0 + z1) / 2]]);
      const n = 10, seg = (z1 - z0) / n;
      for (let i = 0; i < n; i++) {
        const za = z0 + i * seg;
        const len = Math.hypot(seg, yt - yb);
        truss.push([B(0.06, len, 0.06), [x, (yb + yt) / 2, za + seg / 2], [(i % 2 ? 1 : -1) * Math.atan2(seg, yt - yb), 0, 0]]);
        truss.push([B(0.06, yt - yb, 0.06), [x, (yb + yt) / 2, za]]);
      }
    }
    for (let z = -7; z <= 9; z += 2) truss.push([B(60, 0.1, 0.08), [0, yt + 0.11, z]]);
    roofParts.push(add(mergeParts(truss), steelDark));
    const deck = add(new THREE.PlaneGeometry(60, 17), new THREE.MeshStandardMaterial({ color: 0x2b323b, roughness: 0.8, side: THREE.DoubleSide }));
    deck.rotation.x = Math.PI / 2;
    deck.position.set(0, yt + 0.2, 0.8);
    roofParts.push(deck);
    const lights = [];
    for (let z = -5; z <= 7; z += 4) lights.push([B(60, 0.03, 0.9), [0, yt + 0.17, z]]);
    roofParts.push(add(mergeParts(lights), new THREE.MeshStandardMaterial({ color: 0xeaf2fb, emissive: 0xeaf2fb, emissiveIntensity: 1.6 })));

    // High-bay LED lamps on drop rods.
    const housings = [], lenses = [], rods = [];
    for (let x = -24; x <= 24; x += 6)
      for (const z of [-3.4, 2.6]) {
        housings.push([new THREE.CylinderGeometry(0.22, 0.34, 0.24, 24), [x + 3, 6.25, z]]);
        lenses.push([new THREE.CylinderGeometry(0.31, 0.31, 0.02, 24), [x + 3, 6.12, z]]);
        rods.push([new THREE.CylinderGeometry(0.012, 0.012, yb - 6.37, 6), [x + 3, (yb + 6.37) / 2, z]]);
      }
    roofParts.push(
      add(mergeParts(housings), new THREE.MeshStandardMaterial({ color: 0x4a5462, metalness: 0.7, roughness: 0.35 })),
      add(mergeParts(lenses), new THREE.MeshStandardMaterial({ color: 0xfff6e6, emissive: 0xfff2dc, emissiveIntensity: 5 })),
      add(mergeParts(rods), steelDark),
    );

    // Galvanised cable tray along the hall.
    const galv = new THREE.MeshStandardMaterial({ color: 0xaab2bb, metalness: 0.8, roughness: 0.35 });
    add(mergeParts([[B(58, 0.02, 0.45), [0, 5.6, -5.6]], [B(58, 0.1, 0.02), [0, 5.65, -5.38]], [B(58, 0.1, 0.02), [0, 5.65, -5.82]]]), galv);

    // Pallet racking with cartons along the back wall.
    const uprights = [], beams = [], loads = [], decks = [];
    const bay = 2.7, rz0 = -6.85, rz1 = -5.85;
    for (let x = -27; x <= 27; x += bay) {
      for (const z of [rz0, rz1]) uprights.push([B(0.09, 4.6, 0.09), [x, 2.3, z]]);
      if (x + bay > 27.01) continue;
      for (const y of [0.18, 1.7, 3.2]) {
        for (const z of [rz0, rz1]) beams.push([B(bay - 0.09, 0.12, 0.05), [x + bay / 2, y, z]]);
        for (const dx of [0.68, 2.02]) {
          decks.push([B(1.1, 0.12, 0.95), [x + dx, y + 0.12, (rz0 + rz1) / 2]]);
          const hgt = 0.6 + ((x * 7 + y * 13 + dx * 5) % 0.5);
          loads.push([B(1.0, hgt, 0.85), [x + dx, y + 0.18 + hgt / 2, (rz0 + rz1) / 2]]);
        }
      }
    }
    add(mergeParts(uprights), new THREE.MeshStandardMaterial({ color: 0x1f5fb8, metalness: 0.4, roughness: 0.45 }));
    add(mergeParts(beams), new THREE.MeshStandardMaterial({ color: 0xea6a12, metalness: 0.3, roughness: 0.45 }));
    add(mergeParts(decks), new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.85 }));
    add(
      mergeParts(loads),
      new THREE.MeshStandardMaterial({
        map: hallTex(128, 128, (g, w, h) => {
          g.fillStyle = "#c49a63";
          g.fillRect(0, 0, w, h);
          g.fillStyle = "rgba(255,255,255,0.18)";
          g.fillRect(0, h * 0.46, w, h * 0.08);
          g.fillStyle = "rgba(255,255,255,0.75)";
          g.fillRect(w * 0.12, h * 0.15, w * 0.3, h * 0.2);
          g.strokeStyle = "rgba(90,60,30,0.35)";
          g.strokeRect(1, 1, w / 2 - 2, h - 2);
          g.strokeRect(w / 2 + 1, 1, w / 2 - 2, h - 2);
        }),
        roughness: 0.9,
      })
    );

    // Safety signs on the wall.
    const sign = (text, sub, color, x) => {
      const t = hallTex(256, 128, (g, w, h) => {
        g.fillStyle = "#f8fafc";
        g.fillRect(0, 0, w, h);
        g.fillStyle = color;
        g.fillRect(0, 0, w, h * 0.38);
        g.fillStyle = "#ffffff";
        g.font = "800 30px Inter, Arial, sans-serif";
        g.textAlign = "center";
        g.fillText(text, w / 2, h * 0.27);
        g.fillStyle = "#111827";
        g.font = "600 20px Inter, Arial, sans-serif";
        g.fillText(sub, w / 2, h * 0.7);
      });
      const m = add(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
      m.position.set(x, 3.6, -7.38);
    };
    sign("SAFETY FIRST", "Robots in operation", "#15803d", -9);
    sign("DANGER", "Keep out of the robot zone", "#b91c1c", 9);
    sign("PPE REQUIRED", "Shoes · glasses · ear defenders", "#1d4ed8", 21);

    // Green epoxy walkway with yellow edge lines along the front of the line.
    const paint = (w, d, color, x, z, rough = 0.35) => {
      const m = add(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.002, z);
      return m;
    };
    paint(60, 1.2, 0x2f6b52, 0, 3.8);
    paint(60, 0.08, 0xf2b705, 0, 3.16, 0.5);
    paint(60, 0.08, 0xf2b705, 0, 4.44, 0.5);
  roofParts.forEach((o) => { o.userData.dynamic = true; });
  bakeStatic(building);
  scene.add(building);
  }

  function makeLabel(text, color = "#e6ecf3") {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const fs = 44;
    ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width) + 48;
    c.width = w;
    c.height = 80;
    ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
    const r = 18;
    ctx.beginPath();
    ctx.moveTo(r + 1, 1);
    ctx.arcTo(w - 1, 1, w - 1, 79, r);
    ctx.arcTo(w - 1, 79, 1, 79, r);
    ctx.arcTo(1, 79, 1, 1, r);
    ctx.arcTo(1, 1, w - 1, 1, r);
    ctx.fillStyle = "rgba(12,18,27,0.86)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 24, 42);
    const tex = new THREE.CanvasTexture(c);
    // Exact sign colours: no tone mapping, and the canvas is sRGB (else edges bleed and the pill turns grey).
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, toneMapped: false }));
    s.scale.set((w / 80) * 0.16, 0.16, 1);
    s.renderOrder = 10;
    s.layers.set(LABELS);
    s.userData.label = w / 80;
    s.userData.text = text;
    s.userData.dynamic = true;
    s.userData.priority = Object.values(STATION_NAMES).some((n) => text.startsWith(n)) ? 3 : 2;
    labels.add(s);
    return s;
  }

  // Labels shrink with distance like real signs, but never below a readable size or into giant banners up close.
  const labelAt = new THREE.Vector3();
  const labelParent = new THREE.Vector3();
  let labelMode = "key", lastLabels = 0, hoveredLabel = null;
  const pointer = new THREE.Vector2(2,2), raycaster = new THREE.Raycaster();
  function updateLabels(now) {
    if (now-lastLabels < 200) return;
    lastLabels = now;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld();
    const boxes = [], w = container.clientWidth || 800, h = container.clientHeight || 500;
    const active = cells.flatMap((c) => { const st = c.steps[c.stepIdx]; return st ? [STATION_NAMES[st.station.replace(/_2$/, '')]] : []; });
    const sorted = [...labels].filter((o) => o.parent).sort((a,b) => b.userData.priority-a.userData.priority);
    raycaster.setFromCamera(pointer,camera);
    const hit = raycaster.intersectObjects(scene.children,true).find((x) => x.object.isMesh && !x.object.userData.zone);
    hoveredLabel = null;
    if (hit) { let g=hit.object; while(g && g!==scene) { const l=g.children.find((o)=>o.isSprite); if(l) { hoveredLabel=l; break; } g=g.parent; } }
    for (const o of sorted) {
      const key = o.userData.priority >= 4 || (o.userData.priority === 3 && active.some((n)=>n && o.userData.text.startsWith(n))) || o===hoveredLabel;
      o.visible = labelMode !== 'off' && (labelMode === 'all' || key);
      if (!o.visible) continue;
      const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).project(camera);
      if (p.z < -1 || p.z > 1) { o.visible=false; continue; }
      const x=(p.x+1)*w/2,y=(1-p.y)*h/2, height=22, width=height*o.userData.label;
      const b=[x-width/2,y-height/2,x+width/2,y+height/2];
      if (boxes.some((a)=>a[0]<b[2] && a[2]>b[0] && a[1]<b[3] && a[3]>b[1])) o.visible=false;
      else boxes.push(b);
    }
  }
  function sizeLabels() {
    const half = (container.clientHeight || 500) / 2;
    const f = camera.projectionMatrix.elements[5];
    scene.traverseVisible((o) => {
      const aspect = o.userData.label;
      if (!aspect) return;
      if (o.userData.labelH === undefined) o.userData.labelH = o.scale.y;
      const k = o.userData.labelH / 0.16;
      const depth = -labelAt.setFromMatrixPosition(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse).z;
      if (depth <= 0.01) return;
      // Pixels per local unit, so a label inside a scaled robot is sized like any other.
      const perUnit = ((half * f) / depth) * (o.parent ? labelParent.setFromMatrixScale(o.parent.matrixWorld).y : 1);
      const px = clamp(o.userData.labelH * perUnit, 13 * k, 22 * k);
      o.scale.set((px / perUnit) * aspect, px / perUnit, 1);
    });
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
      labels.delete(o);
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
      const span = cellEnd[cells.length - 1] || 0;
      g.position.set(span / 2, 0, -2.75);
      scene.add(g);
      refGroup = g;
    });
  }

  /*
   * Free space between robots. A robot's tool sweeps a circle round its base (a stadium along its track): its
   * envelope. "clear" keeps 0.5 m between neighbouring envelopes, so no robot can touch another robot's equipment
   * or arm; "roomy" adds a metre more; "compact" packs cells 3.6 m apart and shares space between neighbours.
   */
  const CLEARANCE = 0.5;
  let spacing = "clear";
  /** Floor between cell i and cell i + 1 (m). */
  let cellGaps = [];
  let lastPlan = null;
  /** How far a robot's tool reaches from its base axis: arm, wrist and tool (m). */
  const envelopeOf = (scale) => 1.69 * scale + TOOL_LEN;
  const gapAfter = (i) => cellGaps[i] || CELL_SPACING;
  function gapBetween(ra, rb) {
    if (spacing === "compact") return CELL_SPACING;
    const need = ra + rb + CLEARANCE + (spacing === "roomy" ? 1 : 0);
    return Math.max(CELL_SPACING, Math.ceil(need * 10) / 10);
  }
  /** Robot i's envelope: the segment its base travels along (z = 0) and the reach round it. */
  function envelopeOfCell(i) {
    const c = cells[i];
    // A builder cell with no robot chosen yet has no envelope.
    if (!c || !c.robot || !c.robot.root.visible) return null;
    const X = c.base ? c.base.x : cellStart[i], L = cellEnd[i] - cellStart[i], Z = c.base ? c.base.z : 0;
    if (c.robot.cartesian) return { x0: X - GANTRY_X, x1: X + L + GANTRY_X, r: 0.3, z: 0 };
    return { x0: X, x1: X + L, r: envelopeOf(c.robot.dims.L2 / 0.7), z: Z };
  }
  /**
   * Where robots get in each other's way: a robot that can reach another robot's stations, equipment or base,
   * and two robots that can reach the same floor. Belts between robots are shared on purpose and not counted.
   */
  function interference() {
    const out = [];
    const rectGap = (e, r) => {
      const gx = Math.max(0, r[0] - e.x1, e.x0 - r[2]);
      const ez = e.z || 0;
      const gz = r[1] > ez ? r[1] - ez : r[3] < ez ? ez - r[3] : 0;
      return Math.hypot(gx, gz);
    };
    const rect = (b) => [b.min.x, b.min.z, b.max.x, b.max.z];
    const envs = cells.map((c, i) => envelopeOfCell(i));
    cells.forEach((c, j) => {
      const things = c.layoutParts().map((p) => ({ what: p.what, r: rect(p.box) }));
      if (equipGroup)
        for (const g of equipGroup.children)
          if (g.userData.cell === j && g.userData.what) {
            const b = meshBox(g);
            if (!b.isEmpty()) things.push({ what: g.userData.what, r: rect(b) });
          }
      const ej = envs[j];
      if (ej && !c.robot.cartesian) things.push({ what: "robot base", r: [ej.x0 - 0.3, ej.z - 0.3, ej.x1 + 0.3, ej.z + 0.3] });
      envs.forEach((e, i) => {
        if (!e || i === j) return;
        let worst = null;
        for (const t of things) {
          const depth = e.r - rectGap(e, t.r);
          if (depth > 0.02 && (!worst || depth > worst.depth)) worst = { what: t.what, depth };
        }
        if (worst) out.push({ kind: "reach", robot: i, other: j, what: String(worst.what).split(" · ")[0], depth: +worst.depth.toFixed(2) });
      });
    });
    for (let i = 0; i < envs.length; i++)
      for (let j = i + 1; j < envs.length; j++) {
        const a = envs[i], b = envs[j];
        if (!a || !b) continue;
        const gap = Math.max(0, b.x0 - a.x1, a.x0 - b.x1);
        const shared = a.r + b.r - gap;
        if (shared > 0.02) out.push({ kind: "shared", robot: i, other: j, what: "working space", depth: +shared.toFixed(2) });
      }
    return out;
  }
  /** Reach rings turn red on robots that get in another robot's way. */
  function refreshZones() {
    const hits = interference();
    cells.forEach((c, i) => c.alertZone(hits.some((h) => h.robot === i || h.other === i)));
    return hits;
  }
  /** Lay the line out again (new spacing, bigger robots) and keep each robot the user chose. */
  /** True when the robots now on the line need other gaps than they stand at. */
  function gapsChanged() {
    if (spacing === "compact" || cells.length < 2) return false;
    const r = cells.map((c, i) => {
      const e = envelopeOfCell(i);
      return e ? (c.robot.cartesian ? GANTRY_X + 0.3 : e.r) : envelopeOf(ROBOT_SIZES[sizeKey].scale);
    });
    return cells.some((c, i) => i < cells.length - 1 && Math.abs(gapBetween(r[i], r[i + 1]) - gapAfter(i)) > 0.05);
  }

  /* Safety fence around industrial robot cells (cobot lines run without one) */
  /** Per robot cell: true when that cell needs a fence (industrial robot). */
  let fenceCells = [];
  /** One enclosure per robot instead of one round each run of fenced neighbours. */
  let fenceSeparate = false;
  /** Per robot cell: a collaborative robot (cobot paint, control box). Empty: follow the fence. */
  let cobotCells = [];
  const industrialOf = (i) => (cobotCells.length ? !cobotCells[i] : !!fenceCells[i]);
  let fenceGroup = null;
  const fenceMesh = new THREE.MeshStandardMaterial({ color: 0xf2b705, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false });
  const laserPanel = new THREE.MeshStandardMaterial({ color: 0x1f3b2c, metalness: 0.2, roughness: 0.2, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  pooledMaterials.add(fenceMesh); pooledMaterials.add(laserPanel);
  /** The fence panels as thin floor-standing boxes (clearance watch). */
  let fenceSides = [];
  function clearFence() {
    fenceSides = []; obstaclesDirty = true;
    if (!fenceGroup) return;
    scene.remove(fenceGroup);
    disposeGroup(fenceGroup);
    fenceGroup = null;
  }
  function placeFenceNow() {
    clearFence();
    if (!fenceCells.some(Boolean)) return;
    // Enclose everything the cells and conveyors occupy on the floor.
    const bounds = new THREE.Box3();
    const tmp = new THREE.Box3();
    for (const o of scene.children) {
      if (o === floor || o === grid || o === building || o === refGroup || o === overlayGroup || o === propsGroup || o === equipOutside || o.isLight || o === sun.target || !o.visible || o.userData.noBounds) continue;
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
    let panelMat = fenceMesh;
    const side = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az);
      fenceSides.push(new THREE.Box3(new THREE.Vector3(Math.min(ax, bx) - 0.03, 0, Math.min(az, bz) - 0.03), new THREE.Vector3(Math.max(ax, bx) + 0.03, H, Math.max(az, bz) + 0.03)));
      const n = Math.max(1, Math.ceil(len / 1.4));
      for (let i = 0; i <= n; i++) post(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 0.15), panelMat);
      panel.position.set((ax + bx) / 2, 0.15 + (H - 0.15) / 2, (az + bz) / 2);
      panel.rotation.y = -Math.atan2(bz - az, bx - ax);
      g.add(panel);
      const rail = box(len, 0.04, 0.04, M.amber);
      rail.position.set((ax + bx) / 2, H, (az + bz) / 2);
      rail.rotation.y = panel.rotation.y;
      g.add(rail);
    };
    // One fenced area per run of neighbouring fenced cells (or one per robot); open cells stay open.
    // Separate fences stand apart, with an aisle between them the transfer belt passes through.
    const inset = fenceSeparate ? 0.2 : 0.05;
    for (let i = 0; i < n; i++) {
      if (!fenceCells[i] || (!fenceSeparate && i > 0 && fenceCells[i - 1])) continue;
      let j = i;
      while (!fenceSeparate && j + 1 < n && fenceCells[j + 1]) j++;
      const x0 = i === 0 ? bounds.min.x - 0.35 : cellStart[i] - gapAfter(i - 1) / 2 + inset;
      const x1 = j === n - 1 ? bounds.max.x + 0.35 : cellEnd[j] + gapAfter(j) / 2 - inset;
      // A laser cell is closed with tinted laser-safe panels instead of mesh.
      const laser = laserCells.slice(i, j + 1).some(Boolean);
      panelMat = laser ? laserPanel : fenceMesh;
      side(x0, z0, x1, z0);
      side(x1, z0, x1, z1);
      side(x1, z1, x0, z1);
      side(x0, z1, x0, z0);
      const lbl = makeLabel(laser ? "Laser-safe enclosure (Class 1) with interlocked door" : "Safety fence with interlocked door", "#f2b705");
      lbl.position.set((x0 + x1) / 2, H + 0.18, z1);
      g.add(lbl);
    }
    g.traverse((o) => { o.castShadow = false; });
    bakeStatic(g);
    scene.add(g);
    fenceGroup = g;
  }

  /*
   * The rest of each cell's set-up (cellEquipment.js): the robot controller, the job's process equipment —
   * welding power source, wire drum, gas, torch cleaner, fume extraction, spot-weld timer, laser source,
   * chiller, paint supply and booth, dosing unit, dust collector, feeders… — and its safety and utilities.
   * Controllers, power sources and extraction units stand in a row behind the fence; what the robot uses
   * stands in free floor inside its reach; hoods, screens and booths go round the work table.
   */
  const equipModels = createEquipmentModels(THREE);
  /** Inside the cells (inside the fence) and outside them (behind the fence, at the front). */
  let equipGroup = null;
  let equipOutside = null;
  /** Wire feeders and other equipment mounted on the arms: [parent, object]. */
  let armEquipment = [];
  /** Cells that need a laser-safe enclosure. */
  let laserCells = [];
  /** Product names the user chose per cell (builder), shown on the equipment they match. */
  let cellProducts = [];
  /** The floor a group's meshes cover (labels and lines left out). */
  function meshBox(root) {
    const b = new THREE.Box3();
    const t = new THREE.Box3();
    root.updateWorldMatrix(true, true);
    if (root.userData.bakedBounds) b.copy(root.userData.bakedBounds).applyMatrix4(root.matrixWorld);
    root.traverse((o) => {
      if (!o.isMesh || o.isSprite || !o.geometry || o.visible === false || o.userData.zone) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      t.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      b.union(t);
    });
    return b;
  }
  /** The solid parts of a group as boxes in its own frame (thin cables, conduits and hoses left out), for the clearance watch. */
  function solidBoxes(root) {
    root.updateWorldMatrix(true, true);
    const inv = root.matrixWorld.clone().invert(), out = [], m = new THREE.Matrix4(), size = new THREE.Vector3();
    root.traverse((o) => {
      if (!o.isMesh || o.isSprite || !o.geometry || !o.visible || o.userData.zone || o.userData.dynamic) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
      if (b.isEmpty() || Math.min(...b.getSize(size).toArray()) < 0.035) return;
      out.push(b);
    });
    return out;
  }
  function clearEquipment() {
    obstaclesDirty = true;
    for (const g of [equipGroup, equipOutside]) {
      if (!g) continue;
      scene.remove(g);
      disposeGroup(g);
    }
    for (const [parent, o] of armEquipment) disposeGroup(o);
    armEquipment = [];
    equipGroup = equipOutside = null;
  }
  function placeEquipmentNow() {
    clearEquipment();
    laserCells = [];
    if (!cells.length) return;
    equipGroup = new THREE.Group();
    equipOutside = new THREE.Group();
    // Floor already taken: conveyors, every cell's stations and track, the robot bases.
    const rects = [];
    const rectOf = (b) => [b.min.x, b.min.z, b.max.x, b.max.z];
    for (const c of conveyors) if (c.group.visible) {
      const b = meshBox(c.group);
      if (!b.isEmpty()) rects.push(rectOf(b));
    }
    cells.forEach((c) => c.occupied().forEach((b) => rects.push(rectOf(b))));
    const hits = (r, m = 0.08) => rects.some((o) => r[0] < o[2] + m && r[2] > o[0] - m && r[1] < o[3] + m && r[3] > o[1] - m);
    /** The floor rectangle of a footprint w × d centred at (x, z), turned by rotY. */
    const footprint = (x, z, w, d, rotY) => {
      const c = Math.abs(Math.cos(rotY)), sn = Math.abs(Math.sin(rotY));
      const hw = (w * c + d * sn) / 2, hd = (w * sn + d * c) / 2;
      return [x - hw, z - hd, x + hw, z + hd];
    };
    let labelN = 0;
    /** The cell whose equipment is being placed (for the free-space check). */
    let cellNow = -1;
    const tag = (text, x, y, z, parent, owner) => {
      const l = makeLabel(text.length > 38 ? `${text.slice(0, 36)}…` : text, "#bae6fd");
      // Inside its item's group, so the sign travels with the item when the user moves it.
      if (owner) {
        l.position.set(0, y + 0.26 + (labelN++ % 3) * 0.2, 0);
        owner.add(l);
        return;
      }
      l.position.set(x, y + 0.26 + (labelN++ % 3) * 0.2, z);
      parent.add(l);
    };
    /** A stable name per item (cell, label, nth of that label) for the user's layout edits. */
    const seenKeys = new Map();
    const keyFor = (cell, label) => {
      const k = `${cell}:${label}`;
      const n = seenKeys.get(k) || 0;
      seenKeys.set(k, n + 1);
      return n ? `${k}#${n}` : k;
    };
    /** Where the plan put the item, then the user's move on top of it. */
    const editEquip = (g, key) => {
      g.userData.key = key;
      g.userData.home = { x: g.position.x, z: g.position.z, ry: g.rotation.y };
      const e = edits.get(`equipment:${g.userData.cell}:${key}`);
      if (!e) return;
      g.position.x += e.dx || 0;
      g.position.z += e.dz || 0;
      g.rotation.y += ((e.rot || 0) * Math.PI) / 2;
    };
    /** Build an item's model and stand it at (x, z) facing rotY; false when it is not drawn. */
    const stand = (item, x, z, rotY, parent, names, opts) => {
      const built = equipModels.buildModel(item.model, { ...item, ...opts });
      if (built) protect(built.group);
      if (!built) return false;
      built.group.userData.what = item.label;
      built.group.userData.cell = cellNow;
      built.group.userData.attached = item.at === "work" || item.at === "pallet";
      built.group.position.set(x, 0, z);
      built.group.rotation.y = rotY;
      if (!built.group.userData.attached) editEquip(built.group, keyFor(cellNow, item.label));
      parent.add(built.group);
      tag(chosenProduct(item, names) || item.label, x, built.size[1], z, parent, built.group);
      return built;
    };
    /** Facing a point: the model's front (+z) turned towards (tx, tz). */
    const facing = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
    /** Cabinets that power or feed the robot and its tools: cabled to it. */
    const FEEDS = new Set(["controller", "cobotBox", "weldPower", "airUnit", "laserSource", "chiller", "paintSupply", "dosingUnit", "cabinet", "ctrlBox", "waterUnit", "intensifier"]);
    /** A floor cable duct (black, yellow centre stripe) along x or along z. */
    const floorDuct = (x1, z1, x2, z2) => {
      const alongX = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
      const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
      if (len < 0.02) return;
      const [w, d] = alongX ? [len + 0.12, 0.12] : [0.12, len + 0.12];
      const base = box(w, 0.022, d, M.dark);
      base.position.set((x1 + x2) / 2, 0.011, (z1 + z2) / 2);
      base.castShadow = false;
      const stripe = box(alongX ? len + 0.1 : 0.03, 0.004, alongX ? 0.03 : len + 0.1, M.amber);
      stripe.position.set((x1 + x2) / 2, 0.024, (z1 + z2) / 2);
      stripe.castShadow = false;
      equipOutside.add(base, stripe);
    };
    /** Overhead ducting from an extractor up, across and down to its hood or booth. */
    const overheadDuct = ([x1, h1, z1], [x2, z2, h2]) => {
      const Y = 2.45;
      const pipe = (a, b) => {
        const v = new THREE.Vector3().subVectors(b, a);
        const len = v.length();
        if (len < 0.02) return;
        const m = cyl(0.065, len, M.steel, 14);
        m.position.copy(a).addScaledVector(v, 0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
        m.castShadow = false;
        equipOutside.add(m);
      };
      const P = [new THREE.Vector3(x1, h1, z1), new THREE.Vector3(x1, Y, z1), new THREE.Vector3(x1, Y, z2), new THREE.Vector3(x2, Y, z2), new THREE.Vector3(x2, h2, z2)];
      for (let i = 0; i < P.length - 1; i++) pipe(P[i], P[i + 1]);
      for (let i = 1; i < P.length - 1; i++) {
        const j = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), M.steel);
        j.position.copy(P[i]);
        equipOutside.add(j);
      }
    };

    cells.forEach((c, i) => {
      // A builder cell without a robot yet has no set-up to show.
      if (buildMode && c.robot && !c.robot.root.visible) return;
      const X = cellStart[i];
      const L = cellEnd[i] - cellStart[i];
      cellNow = i;
      const items = cellEquipment(jobsOfTitle(c.title), { fenced: !!fenceCells[i], cobot: !industrialOf(i), steps: c.steps });
      laserCells[i] = items.some((x) => x.enclosure === "laser");
      const names = cellProducts[i] || [];
      // A robot hanging from a track or in a gantry has no floor base to stand things beside.
      const fixedBase = !(c.motion && (c.motion.type === "overhead" || c.motion.type === "gantry"));

      // Where extraction connects: the hood's post, the booth's back wall.
      let hoodAt = null;
      let boothAt = null;
      // At the work table: fume hood, welding screens or the spray booth round it.
      const work = c.stations.weld || c.stations.table || c.stations.press || c.stations.cnc || null;
      if (work && work.point) {
        const px = work.point.x, pz = work.point.z;
        let dx = px - X, dz = pz;
        const len = Math.hypot(dx, dz);
        if (len < 0.2) [dx, dz] = [0, 1];
        else [dx, dz] = [dx / len, dz / len];
        const [qx, qz] = [-dz, dx];
        for (const item of items.filter((x) => x.at === "work" && x.model)) {
          if (item.model === "sprayBooth") {
            // Open towards the robot; a side wall that would stand in a neighbouring station is left off.
            const rot = facing(px, pz, X, 0);
            const ax = [Math.cos(rot), -Math.sin(rot)], az = [Math.sin(rot), Math.cos(rot)];
            const wallFree = (sx) =>
              ![-0.8, -0.22, 0.35].some((lz) => {
                const x = px + ax[0] * sx * 0.9 + az[0] * lz, z = pz + ax[1] * sx * 0.9 + az[1] * lz;
                return hits([x - 0.1, z - 0.1, x + 0.1, z + 0.1], 0.02);
              });
            const b = stand(item, px, pz, rot, equipGroup, names, { left: wallFree(-1), right: wallFree(1) });
            if (b) {
              rects.push(footprint(px + dx * 0.25, pz + dz * 0.25, 1.85, 1.2, Math.atan2(dx, dz)));
              boothAt = [px + dx * 0.8, pz + dz * 0.8, 1.95];
            }
          } else if (item.model === "weldScreen") {
            // One screen each side of the table, along the line from the robot, where the floor is free.
            let placed = 0;
            for (const sd of [1, -1]) {
              const x = px + qx * sd * 0.8 + dx * 0.2, z = pz + qz * sd * 0.8 + dz * 0.2;
              const rot = Math.atan2(qx, qz);
              // A long thin screen at an angle: test the floor along its length, not its bounding square.
              const along = [-0.62, -0.31, 0, 0.31, 0.62].map((t) => [x + dx * t - 0.14, z + dz * t - 0.14, x + dx * t + 0.14, z + dz * t + 0.14]);
              if (along.some((r) => hits(r, 0.02))) continue;
              const r = footprint(x, z, 0.3, 0.3, 0);
              const b = equipModels.buildModel(item.model, item);
              if (b) protect(b.group);
              b.group.position.set(x, 0, z);
              b.group.rotation.y = rot;
              equipGroup.add(b.group);
              rects.push(r, ...along);
              if (!placed++) tag(item.label, x, b.size[1], z, equipGroup);
            }
          } else {
            // Fume or extraction hood: its post just beyond the table, the hood reaching back over it.
            for (const [ox, oz] of [[dx * 0.66, dz * 0.66], [qx * 0.62 + dx * 0.25, qz * 0.62 + dz * 0.25], [-qx * 0.62 + dx * 0.25, -qz * 0.62 + dz * 0.25]]) {
              const x = px + ox, z = pz + oz;
              const r = footprint(x, z, 0.3, 0.3, 0);
              if (hits(r, 0.02)) continue;
              stand(item, x, z, facing(x, z, px, pz), equipGroup, names);
              rects.push(r);
              hoodAt = [x, z, 1.93];
              break;
            }
          }
        }
      }

      // At the pallet's aisle side: the light curtain people walk through to take the pallet.
      const pallet = c.stations.pallet;
      for (const item of items.filter((x) => x.at === "pallet" && x.model)) {
        const st = item.model === "lightCurtain" && /press/i.test(item.label) ? c.stations.press || c.stations.cnc : pallet;
        const at = st && (st.center || st.point);
        if (!at) continue;
        const x = at.x, z = at.z + 0.58;
        stand(item, x, z, 0, equipGroup, names, { width: 1.2 });
        rects.push([x - 0.7, z - 0.1, x + 0.7, z + 0.1]);
      }

      // Inside the cell: beside the base, then where the robot reaches, in free floor.
      const inCell = (r) => r[0] >= X - 1.7 && r[2] <= X + L + 1.7 && r[1] >= -1.95 && r[3] <= 1.6;
      const DEG = Math.PI / 180;
      const near = { base: [[0.62, 0.78, 0.94], [-135, -90, -160, 180, -45, 135, 160, 110]], reach: [[0.95, 1.1, 1.25, 1.4], [135, 160, 110, 180, -160, 45, 20, -20, -135, -45, 90, 70, -110]] };
      for (const item of items.filter((x) => (x.at === "base" || x.at === "reach") && x.model)) {
        const built = equipModels.buildModel(item.model, item);
        if (built) protect(built.group);
        if (!built) continue;
        const [w, , d] = built.size;
        // The area scanner sits low in front of the base; the rest search a ring round the robot.
        const [radii, angles] = item.model === "scanner" ? [[0.42, 0.5], [90, 60, 120]] : item.at === "base" && fixedBase ? near.base : near.reach;
        const eqKey = keyFor(i, item.label);
        let spot = frozenSpots.get(eqKey) || null;
        if (!spot) for (const r of radii) {
          for (const a of angles) {
            const x = X + Math.cos(a * DEG) * r, z = Math.sin(a * DEG) * r;
            const rot = facing(x, z, X, 0);
            const fr = footprint(x, z, w, d, rot);
            if (!inCell(fr) || (item.model !== "scanner" && hits(fr))) continue;
            spot = [x, z, rot, fr];
            break;
          }
          if (spot) break;
        }
        if (!spot) {
          disposeGroup(built.group);
          continue;
        }
        // The first placement of this line is kept, so moving a station never makes other items jump.
        frozenSpots.set(eqKey, spot);
        const [x, z, rot, fr] = spot;
        built.group.userData.what = item.label;
        built.group.userData.cell = i;
        built.group.position.set(x, 0, z);
        built.group.rotation.y = rot;
        editEquip(built.group, eqKey);
        equipGroup.add(built.group);
        if (item.model !== "scanner") rects.push(fr);
        tag(chosenProduct(item, names) || item.label, x, built.size[1], z, equipGroup, built.group);
      }

      // On the arm: the wire feeder on the upper arm's rear housing.
      const arm = c.robot && !c.robot.cartesian && c.robot.joints && c.robot.joints[2];
      if (arm)
        for (const item of items.filter((x) => x.at === "arm" && x.model)) {
          const built = equipModels.buildModel(item.model, item);
        if (built) protect(built.group);
          if (!built) continue;
          const sc = c.robot.dims ? c.robot.dims.L2 / 0.7 : 1;
          built.group.scale.setScalar(sc);
          built.group.position.set(-0.2 * sc, 0.13 * sc, 0);
          arm.add(built.group);
          armEquipment.push([arm, built.group]);
        }

      // Behind the fence: a row of cabinets facing the cell, front edges in line, wrapping to a second row.
      const row0 = -2.62;
      let cursor = X - 1.6;
      let rowFront = row0;
      let rowDepth = 0;
      const xMax = X + L + 1.65;
      const behind = [];
      for (const item of items.filter((x) => x.at === "outside" && x.model)) {
        const built = equipModels.buildModel(item.model, item);
        if (built) protect(built.group);
        if (!built) continue;
        const [w, h, d] = built.size;
        if (cursor + w > xMax && cursor > X - 1.6) {
          rowFront -= rowDepth + 0.35;
          cursor = X - 1.6;
          rowDepth = 0;
        }
        const x0 = cursor + w / 2, z0 = rowFront - d / 2;
        built.group.position.set(x0, 0, z0);
        built.group.userData.what = built.group.userData.what || item.label;
        built.group.userData.cell = i;
        editEquip(built.group, keyFor(i, item.label));
        const x = built.group.position.x, z = built.group.position.z;
        equipOutside.add(built.group);
        tag(chosenProduct(item, names) || item.label, x, h, z, equipOutside, built.group);
        behind.push({ model: item.model, x, z, w, h, d });
        cursor += w + 0.14;
        rowDepth = Math.max(rowDepth, d);
      }

      // Connections. Every cabinet behind the fence feeds the robot through one floor cable duct (to the base, or
      // to the cable chain of its track); the extractors reach their hood or booth through overhead ducting.
      const feeds = behind.filter((b) => FEEDS.has(b.model));
      const mt = c.motion ? c.motion.type : "fixed";
      const entry =
        mt === "amr" ? null
        : mt === "track" ? [X + L / 2, -0.6]
        : mt === "overhead" ? [X - 0.65, -0.95]
        : mt === "gantry" ? [X - GANTRY_X, -1.55]
        : [c.base ? c.base.x : X, (c.base ? c.base.z : 0) - 0.45];
      if (feeds.length && entry) {
        const zT = -2.52;
        const xs = feeds.map((f) => f.x);
        floorDuct(Math.min(...xs, entry[0]), zT, Math.max(...xs, entry[0]), zT);
        for (const f of feeds) floorDuct(f.x, f.z + f.d / 2, f.x, zT);
        floorDuct(entry[0], zT, entry[0], entry[1]);
      }
      for (const b of behind) {
        const to = b.model === "boothExhaust" ? boothAt : b.model === "fumeUnit" || b.model === "dustCollector" ? hoodAt : null;
        if (to) overheadDuct([b.x, b.h, b.z], to);
      }
    });

    // The line's operator panel, in the aisle in front of the first robot.
    for (const item of lineEquipment()) {
      const x = cellStart[0] - 1.35, z = 2.5;
      stand(item, x, z, 0, equipOutside, []);
    }
    for (const g of [equipGroup,equipOutside]) {
      for (const child of g.children) if (child.isGroup) {
        child.updateWorldMatrix(true,true);
        child.userData.bakedBounds=meshBox(child).applyMatrix4(child.matrixWorld.clone().invert());
        child.userData.solid=solidBoxes(child);
        ground(child);
      }
      g.traverse((o)=>{
        if (!o.isMesh || !o.geometry || o.userData.dynamic) return;
        o.geometry.computeBoundingBox();
        const size=o.geometry.boundingBox.getSize(new THREE.Vector3());
        o.castShadow = !o.userData.zone && Math.max(size.x,size.y,size.z)>0.5 && Math.min(size.x,size.y,size.z)>0.12;
      });
      // Move mode: each item batched on its own so it can be picked up; otherwise one batch for all of them.
      if (moveMode) for (const child of g.children) { if (child.isGroup) bakeStatic(child); }
      else bakeStatic(g);
    }
    scene.add(equipGroup);
    scene.add(equipOutside);
    refreshZones();
  }

  /**
   * The layout check: stations, conveyors, robot bases and the equipment placed round them must each have their
   * own floor. Hoods, screens, booths and light curtains are fitted to their station on purpose and not counted.
   */
  function layoutIssues() {
    const parts = [];
    const rect = (b) => [b.min.x, b.min.z, b.max.x, b.max.z];
    cells.forEach((c, i) => {
      for (const p of c.layoutParts()) parts.push({ what: cells.length > 1 ? `${p.what} (R${i + 1})` : p.what, r: rect(p.box), cell: i });
      const mt = c.motion ? c.motion.type : "fixed";
      if (mt === "fixed" || mt === "lift") parts.push({ what: cells.length > 1 ? `Robot ${i + 1} base` : "Robot base", r: [c.base.x - 0.3, c.base.z - 0.3, c.base.x + 0.3, c.base.z + 0.3], cell: i, base: true });
    });
    for (const cv of conveyors)
      if (cv.group.visible) {
        let what = "Conveyor";
        cv.group.traverse((o) => what === "Conveyor" && o.isSprite && o.userData.text && !/·/.test(o.userData.text) && (what = o.userData.text));
        const b = meshBox(cv.group);
        if (!b.isEmpty()) parts.push({ what, r: rect(b), belt: true });
      }
    if (equipGroup)
      for (const g of equipGroup.children)
        if (g.isGroup && g.userData.what && !g.userData.attached) {
          const b = meshBox(g);
          if (!b.isEmpty()) parts.push({ what: g.userData.what, r: rect(b) });
        }
    const out = [];
    const m = 0.03;
    for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i].r, b = parts[j].r;
        // A belt feeding a machine or a supply crate at its end touches it by design.
        if (parts[i].belt || parts[j].belt) continue;
        if (a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m) out.push(`${parts[i].what} overlaps ${parts[j].what}`);
      }
    return out;
  }

  /* Parts: the line's real product (fruit, bottles, sacks, castings…), built by workpieces.js */
  let kit = null;
  /** The job's surroundings behind the line (plant rows, a container, a car at the charger…). */
  let propsGroup = null;
  /** End-of-arm tools as they really look (soft fingers, vacuum frame, spray gun, blade…). */
  const toolKit = createToolKit(THREE, TOOL_LEN);
  /** Every tool the line uses, by name, for the plan. */
  let lineTools = [];
  const parts = new Set();
  function spawnPart(pos) {
    const m = protect(kit.spawn(), true);
    m.userData.dynamic = true;
    m.position.copy(pos);
    scene.add(m);
    parts.add(m);
    return m;
  }
  /** Half the width a gripper closes to on this product. */
  const gripHalf = () => (kit && kit.info.half) || PART.d / 2;
  function removePart(m) {
    if (!m) return;
    m.parent && m.parent.remove(m);
    m.traverse((o) => { if (o.userData.addOn) o.geometry.dispose(); });
    parts.delete(m);
  }
  // What a step adds to a product that has no look of its own for it (a bead, a screw, a label).
  const addOnMats = new Map();
  const addOn = (part, geo, color, pos, extra = {}) => {
    const key = `${color}:${JSON.stringify(extra)}`;
    if (!addOnMats.has(key)) addOnMats.set(key, new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5, ...extra }));
    pooledMaterials.add(addOnMats.get(key));
    const m = new THREE.Mesh(geo, addOnMats.get(key));
    m.position.copy(pos);
    m.castShadow = true;
    m.userData.addOn = true;
    part.add(m);
    return m;
  };
  function addWeldMark(m) {
    if (kit.reveal(m, "weld")) return;
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
    const len = x1 - x0, wid = Math.max(0.4, PART.d + 0.08), cx = (x0 + x1) / 2, cz = BELT_Z, topY = BELT_TOP;
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
    belt.userData.dynamic = true;
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
    // End rollers and the drive motor.
    for (const ex of [x0, x1]) {
      const roller = cyl(0.03, wid, M.steel, 16);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(ex, topY - 0.02, cz);
      g.add(roller);
    }
    const motor = cyl(0.045, 0.14, M.dark, 16);
    motor.rotation.x = Math.PI / 2;
    motor.position.set(x0 + 0.05, topY - 0.1, cz + wid / 2 + 0.09);
    g.add(motor);
    const lbl = makeLabel(label);
    lbl.position.set(cx, topY + 0.45, cz);
    g.add(lbl);
    bakeStatic(g);
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
        // An outfeed carries finished parts out of the cell.
        if (this.sink && this.items.length && Math.abs(this.items[0].mesh.position.x - toX) < 1e-3) {
          const it = this.items[0];
          it.t = (it.t || 0) + dt;
          if (it.t > 0.6) {
            this.items.shift();
            removePart(it.mesh);
          }
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
        disposeGroup(g);
      },
    };
  }

  let cells = [];
  let conveyors = [];
  /** Where each robot cell starts and ends along the line (a robot on a track spans its travel). */
  let cellStart = [0];
  let cellEnd = [0];
  /** The middle of cell i; i = number of cells is the free place after the line. */
  const cellMid = (i) => (i < cells.length ? (cellStart[i] + cellEnd[i]) / 2 : (cellEnd[cells.length - 1] || 0) + CELL_SPACING);
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

  /**
   * One end-of-arm tool in the robot's flange frame (x along the tool axis). The family (kind) drives the robot
   * program; the look is what the tool really is: soft fingers for food, a vacuum frame for glass, a spray gun…
   */
  function makeEoat(kind, look) {
    const t = toolKit.build(look || kind, { half: gripHalf(), span: [PART.w, PART.d], height: PART.h });
    protect(t.group);
    t.group.userData.dynamic = true;
    return { kind, look: t.look, group: t.group, fingers: t.fingers, fingerTool: t.fingerTool, open: t.open, beam: t.beam, spin: t.spin };
  }
  const PROCESS_TOOLS = ["torch", "spindle", "driver", "nozzle"];
  /** Tools that hold the product from its top face. */
  const TOP_GRIP = new Set(["vacuum", "magnet", "fork"]);

  /* One robot with the stations its steps use, at world x = X.
     extra.stations: equipment the user placed (shown even if unused); extra.startTool: tool at cycle start. */
  function createCell(index, X, steps, title, links, extra = {}) {
    const layout = LAYOUT[mode];
    const V = (x, y, z) => new THREE.Vector3(X + x, y, z);
    const groups = [];
    const add = (g) => {
      scene.add(g);
      groups.push(g);
      return g;
    };
    const needed = new Set([...steps.map((s) => s.station).filter(Boolean), ...(extra.stations || [])]);
    // Tool work happens on a part resting on a work table (at either end of a track).
    for (const s of steps) if (TOOL_ACTIONS[s.action]) needed.add(s.station && /^table/.test(s.station) ? s.station : "table");
    // A robot that handles the part with its gripper and also welds, sprays or grinds it changes tools on a tool
    // stand: the process tool waits in its nest while the gripper works, and the gripper while the tool works.
    const headLooks = [...new Set(steps.filter((s) => s.action === "weld" || TOOL_ACTIONS[s.action]).map((s) => headFor(s.text || s.label, s.action)).filter(Boolean))].slice(0, 2);
    if (!buildMode && headLooks.length && steps.some((s) => s.action === "pick" || s.action === "place")) needed.add("rack");
    const startTool = extra.startTool || 0;
    const stations = {};
    /** The user's move of the robot base (Move mode): X follows it, bz is the base's z. */
    let bz = 0;
    const baseX0 = X;
    let zoneGroup = null;
    let zoneLine = null;

    /* How the robot moves between places (see robotMotion.ts): a floor track, an overhead track, a gantry,
       an arm on an AMR, a lift column or a rail-guided cart. Stations at the far end have keys ending in "_2". */
    const motionType = MOTION_LEN[extra.motion && extra.motion.type] != null ? extra.motion.type : "fixed";
    const lifts = motionType === "lift";
    const L = motionType === "fixed" || lifts ? 0 : clamp(Number(extra.motion.length) || MOTION_LEN[motionType], 1.5, 8);
    const liftMax = lifts ? clamp(Number(extra.motion.length) || MOTION_LEN.lift, 0.4, 2) : 0;
    const moving = L > 0;
    const cartesian = motionType === "gantry";
    const inverted = motionType === "overhead";
    /** Height of the robot's base: on a carriage, an AMR, a cart, or hanging from the overhead track. */
    const BASE_Y = { fixed: 0, track: 0.2, rgv: 0.3, amr: 0.42, lift: 0.3, overhead: OVERHEAD_Y, gantry: 0 }[motionType];
    /** Where along the track a station is worked from: its zone's stop. */
    const stopOf = (key) => (moving && key && (/_2$/.test(key) || (key === "out" && links.out && links.out.fromX > X + L / 2)) ? L : 0);
    /** The lift a target needs: the robot rises with the work. */
    const liftFor = (y) => (lifts ? clamp(y - 0.62, 0, liftMax) : 0);
    /** A robot of the standard size can reach a part centred at p from a stop at x = bx, approach included. */
    const reachFrom = (p, bx) => {
      if (cartesian) return true;
      const s0 = inverted ? OVERHEAD_SCALE : 1;
      const h1 = 0.45 * s0, a1 = 0.15 * s0, reach = 1.45 * s0 * 0.985, dT = 0.09 * s0 + TOOL_LEN;
      const r = Math.hypot(p.x - bx, p.z) - a1;
      const ok = (py) => {
        const y = inverted ? OVERHEAD_Y - py - dT - h1 : py + dT - h1 - BASE_Y - liftFor(py);
        return Math.hypot(r, y) <= reach;
      };
      return ok(p.y) && ok(p.y + PART.h / 2 + APPROACH);
    };

    // Safety zone: a ring round a fixed robot, a stadium round a travelling one, a rectangle under a gantry.
    {
      const pts = [];
      if (cartesian) {
        for (const [x, z] of [[-GANTRY_X, -1.75], [L + GANTRY_X, -1.75], [L + GANTRY_X, 1.75], [-GANTRY_X, 1.75], [-GANTRY_X, -1.75]]) pts.push(V(x, 0.004, z));
      } else {
        for (let i = 0; i <= 48; i++) {
          const a = Math.PI / 2 + (i / 48) * Math.PI;
          pts.push(V(Math.cos(a) * 2.05, 0.004, Math.sin(a) * 2.05));
        }
        for (let i = 0; i <= 48; i++) {
          const a = -Math.PI / 2 + (i / 48) * Math.PI;
          pts.push(V(L + Math.cos(a) * 2.05, 0.004, Math.sin(a) * 2.05));
        }
        pts.push(pts[0].clone());
      }
      const zone = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineDashedMaterial({ color: 0xf2b705, dashSize: 0.12, gapSize: 0.08 })
      );
      zone.userData.dynamic = true;
      zone.computeLineDistances();
      const g = new THREE.Group();
      g.add(zone);
      zoneGroup = g;
      g.userData.skipLayout = true;
      zoneLine = zone;
      if (title) {
        const lbl = makeLabel(title, "#fbbf24");
        lbl.userData.priority = 4;
        lbl.position.set(X + L / 2, cartesian ? GANTRY_H + 0.55 : 2.45 + (inverted ? 0.6 : 0), 0.2);
        lbl.scale.multiplyScalar(1.15);
        g.add(lbl);
      }
      add(g);
    }

    /* The track, rail, gantry frame, route or column, and the part of it that moves with the robot. */
    let mover = null;
    /** The cable chain's upper run on a floor track: it stretches from its fixed end to the carriage. */
    let chainUpper = null;
    if (motionType !== "fixed") {
      const g = new THREE.Group();
      const x0 = X - 0.55, x1 = X + L + 0.55, len = x1 - x0, mx = (x0 + x1) / 2;
      const put = (mesh, x, y, z, parent) => {
        mesh.position.set(x, y, z);
        (parent || g).add(mesh);
        return mesh;
      };
      mover = new THREE.Group();
      mover.userData.dynamic = true;
      if (motionType === "track") {
        // The 7th axis: a steel base on levelling feet, two linear rails, a toothed rack the carriage's servo
        // motor drives through its gearbox and pinion, buffers at both ends, and the cable chain that carries
        // power, signals and air to the robot as it travels.
        put(box(len, 0.06, 0.66, M.frame), mx, 0.03, 0);
        for (let x = x0 + 0.15; x <= x1 - 0.1; x += 0.9) for (const z of [-0.3, 0.3]) put(cyl(0.035, 0.02, M.dark, 12), x, 0.01, z);
        for (const z of [-0.22, 0.22]) put(box(len, 0.045, 0.05, M.steel), mx, 0.083, z);
        put(box(len, 0.03, 0.035, M.dark), mx, 0.075, 0.3);
        const teeth = [];
        for (let x = x0 + 0.02; x < x1 - 0.01; x += 0.035) teeth.push([new THREE.BoxGeometry(0.014, 0.012, 0.03), [x, 0.096, 0.3]]);
        put(new THREE.Mesh(mergeParts(teeth), M.steel), 0, 0, 0);
        // Cable chain: its trough along the back, the upper run reaching to the carriage (stretched as it moves).
        put(box(len, 0.13, 0.17, M.frame), mx, 0.065, -0.5);
        put(box(len * 0.5, 0.06, 0.13, M.dark), x0 + len * 0.25, 0.1, -0.5);
        chainUpper = put(box(1, 0.06, 0.13, M.dark), X, 0.16, -0.5);
        chainUpper.userData.dynamic = true;
        chainUpper.userData.fixedX = x0 + len * 0.5;
        put(cyl(0.05, 0.13, M.dark, 16), X, 0.13, -0.5, mover).rotation.x = Math.PI / 2;
        put(box(0.08, 0.1, 0.22, M.dark), X, 0.18, -0.38, mover);
        // End buffers.
        for (const x of [x0, x1]) {
          put(box(0.08, 0.2, 0.6, M.amber), x, 0.1, 0);
          put(cyl(0.04, 0.07, M.dark, 14), x + (x === x0 ? 0.06 : -0.06), 0.13, 0, null).rotation.z = Math.PI / 2;
        }
        put(box(0.78, 0.1, 0.62, M.dark), X, 0.15, 0, mover);
        put(box(0.5, 0.04, 0.5, M.steel), X, 0.2, 0, mover);
        // The 7th-axis servo motor and its right-angle gearbox on the carriage, driving the pinion into the rack.
        put(box(0.17, 0.15, 0.16, M.frame), X + 0.26, 0.275, 0.32, mover);
        put(cyl(0.072, 0.26, M.dark, 24), X + 0.26, 0.48, 0.32, mover);
        put(cyl(0.075, 0.025, M.accent, 24), X + 0.26, 0.62, 0.32, mover);
        for (const dy of [0.4, 0.46, 0.52]) put(cyl(0.076, 0.008, M.frame, 24), X + 0.26, dy, 0.32, mover);
        put(cyl(0.04, 0.03, M.steel, 16), X + 0.26, 0.12, 0.32, mover);
        put(box(0.04, 0.04, 0.1, M.amber), X + 0.26, 0.56, 0.41, mover);
      } else if (motionType === "rgv") {
        for (const z of [-0.36, 0.36]) put(box(len + 0.4, 0.025, 0.07, M.steel), mx, 0.0125, z);
        for (const x of [x0 - 0.2, x1 + 0.2]) put(box(0.1, 0.18, 0.9, M.amber), x, 0.09, 0);
        put(box(1.05, 0.22, 0.86, M.amber), X, 0.15, 0, mover);
        put(box(1.07, 0.03, 0.88, M.dark), X, 0.27, 0, mover);
        for (const dx of [-0.38, 0.38]) for (const z of [-0.36, 0.36]) {
          const w = cyl(0.07, 0.06, M.dark, 16);
          w.rotation.x = Math.PI / 2;
          put(w, X + dx, 0.07, z, mover);
        }
      } else if (motionType === "amr") {
        // The route the mobile robot drives, with a docking pad at each stop.
        const route = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(X, 0.006, 0), new THREE.Vector3(X + L, 0.006, 0)]),
          new THREE.LineDashedMaterial({ color: 0x2dd4bf, dashSize: 0.25, gapSize: 0.12 })
        );
        route.computeLineDistances();
        g.add(route);
        const pad = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.25, depthWrite: false });
        for (const x of [X, X + L]) put(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.004, 0.85), pad), x, 0.004, 0);
        const shell = new THREE.MeshStandardMaterial({ color: 0xeef1f5, metalness: 0.2, roughness: 0.4 });
        put(box(0.98, 0.34, 0.72, shell), X, 0.22, 0, mover);
        put(box(1.0, 0.06, 0.74, M.dark), X, 0.08, 0, mover);
        put(box(1.0, 0.025, 0.745, new THREE.MeshStandardMaterial({ color: 0x0f766e, emissive: 0x2dd4bf, emissiveIntensity: 0.9 })), X, 0.3, 0, mover);
        for (const [dx, dz] of [[0.47, 0.34], [-0.47, -0.34]]) put(cyl(0.04, 0.05, M.dark, 14), X + dx, 0.415, dz, mover);
      } else if (motionType === "overhead") {
        const top = OVERHEAD_Y + 0.2;
        for (const x of [x0 - 0.1, x1 + 0.1]) {
          for (const z of [-0.95, 0.95]) put(box(0.18, top + 0.1, 0.18, M.frame), x, (top + 0.1) / 2, z);
          put(box(0.2, 0.2, 2.1, M.frame), x, top + 0.1, 0);
        }
        put(box(len + 0.3, 0.26, 0.24, M.amber), mx, top + 0.05, 0);
        put(box(len * 0.55, 0.1, 0.12, M.dark), x0 + len * 0.275, top + 0.24, -0.2);
        put(box(0.7, 0.16, 0.5, M.dark), X, OVERHEAD_Y + 0.06, 0, mover);
      } else if (motionType === "gantry") {
        const H = GANTRY_H;
        const gx0 = X - GANTRY_X, gx1 = X + L + GANTRY_X;
        for (const x of [gx0, gx1]) for (const z of [-1.62, 1.62]) put(box(0.16, H, 0.16, M.frame), x, H / 2, z);
        for (const z of [-1.62, 1.62]) put(box(gx1 - gx0 + 0.16, 0.2, 0.2, M.amber), (gx0 + gx1) / 2, H + 0.1, z);
        for (const x of [gx0, gx1]) put(box(0.16, 0.16, 3.4, M.frame), x, H + 0.1, 0);
      } else if (motionType === "lift") {
        put(box(0.62, 0.24, 0.62, M.dark), X, 0.12, 0);
        put(box(0.24, 0.6 + liftMax + 0.9, 0.2, M.frame), X, (0.6 + liftMax + 0.9) / 2, -0.42);
        put(box(0.06, 0.6 + liftMax + 0.8, 0.04, M.amber), X, (0.6 + liftMax + 0.8) / 2, -0.31);
        put(box(0.56, 0.06, 0.56, M.steel), X, BASE_Y - 0.03, 0, mover);
        put(box(0.3, 0.2, 0.12, M.dark), X, BASE_Y + 0.05, -0.3, mover);
      }
      g.userData.skipLayout = true;
      mover.userData.skipLayout = true;
      add(g);
      add(mover);
      const sys = { track: "Floor track (7th axis)", overhead: "Overhead track", gantry: "Gantry robot", amr: "Mobile robot (AMR)", lift: "Lift column", rgv: "Rail-guided cart (RGV)" }[motionType];
      if (motionType === "track") {
        const ml = makeLabel("7th-axis servo motor · rack & pinion", "#bae6fd");
        ml.position.set(X + 0.26, 0.95, 0.42);
        mover.add(ml);
      }
      const lbl = makeLabel(`${sys}${moving ? ` · ${L.toFixed(1)} m` : ` · ${liftMax.toFixed(1)} m lift`}`, "#5eead4");
      lbl.position.set(X + L / 2, cartesian ? GANTRY_H + 0.3 : inverted ? OVERHEAD_Y + 0.75 : 0.55, cartesian || inverted ? 0 : 0.75);
      g.add(lbl);
    }

    if (needed.has("conveyor")) stations.conveyor = links.infeed;
    if (needed.has("in")) stations.in = links.in;
    if (needed.has("out")) stations.out = links.out;

    /**
     * The stations of one zone. A robot that travels (track, overhead rail, gantry, AMR) has two: the usual one
     * around its home stop, and a mirrored one around the far stop whose keys end in "_2" (cnc_2, pallet_2).
     *   X: the zone's stop, sgn: 1 home / -1 mirrored, needed: station types in this zone.
     */
    function buildStations(X, sgn, needed, zone) {
      const stations = {};
      const V = (x, y, z) => new THREE.Vector3(X + x, y, z);
      const NAMES = zone ? Object.fromEntries(Object.entries(STATION_NAMES).map(([k, v]) => [k, `${v} 2`])) : STATION_NAMES;
      /** The robot reaches a part centred at p from this stop, including the approach above it. */
      const reachOK = (p) => reachFrom(p, X);
      /** Slots for the product in rows and layers over an area w × d centred at (cx, cz), floor at y0: only reachable ones. */
      const gridSlots = (cx, cz, y0, w, d, layers, max = 24) => {
        const gx = PART.w + 0.012, gz = PART.d + 0.012;
        const cols = clamp(Math.floor((w + 0.012) / gx), 1, 6), rows = clamp(Math.floor((d + 0.012) / gz), 1, 5);
        const out = [];
        for (let l = 0; l < layers; l++)
          for (let i = 0; i < cols; i++)
            for (let j = 0; j < rows; j++) {
              const p = new THREE.Vector3(cx + (i - (cols - 1) / 2) * gx, y0 + PART.h / 2 + l * PART.h, cz + (j - (rows - 1) / 2) * gz);
              if (reachOK(p)) out.push(p);
            }
        return out.length ? out.slice(0, lifts ? 36 : max) : [new THREE.Vector3(cx, y0 + PART.h / 2, cz)];
      };
      if (needed.has("cnc")) {
        // Vertical machining centre: a guarded enclosure on a dark base, the spindle column standing
        // proud at the back, a sliding door with a window facing the robot, a pendant and a stack light.
        const g = new THREE.Group();
        const cx = X - sgn * 1.45, cz = 0.1;
        const put = (m, x, y, z) => (m.position.set(x, y, z), g.add(m), m);
        put(rbox(0.98, 0.22, 1.03, M.dark, 0.025), cx, 0.11, cz);
        put(rbox(0.95, 1.38, 1.0, M.machine, 0.035), cx, 0.91, cz);
        put(rbox(0.5, 0.3, 0.66, M.machine, 0.04), cx - sgn * 0.2, 1.74, cz);
        put(box(0.962, 0.05, 1.012, M.accent), cx, 1.48, cz);
        // Side windows into the work zone, framed, on both sides.
        for (const side of [-1, 1]) {
          put(box(0.46, 0.38, 0.01, M.dark), cx + sgn * 0.08, 1.0, cz + side * 0.501);
          const pane = put(box(0.42, 0.34, 0.012, M.smoked), cx + sgn * 0.08, 1.0, cz + side * 0.503);
          pane.castShadow = false;
        }
        const cavity = box(0.5, 0.55, 0.62, M.dark);
        cavity.position.set(cx + sgn * 0.24, 0.98, cz);
        g.add(cavity);
        const chuck = cyl(0.08, 0.06, M.steel);
        chuck.position.set(X - sgn * 1.0, 0.95 - PART.h / 2 - 0.03, cz);
        g.add(chuck);
        const door = new THREE.Group();
        door.userData.dynamic = true;
        const doorPanel = rbox(0.025, 0.62, 0.68, M.machine, 0.008);
        const win = box(0.027, 0.4, 0.46, M.glass);
        win.castShadow = false;
        const handle = cyl(0.012, 0.3, M.steel, 12);
        handle.position.set(sgn * 0.03, 0, 0.27);
        door.add(doorPanel, win, handle);
        door.position.set(cx + sgn * 0.49, 0.98, cz);
        g.add(door);
        // Stack light: green (running), amber, red, on a short mast.
        put(cyl(0.012, 0.06, M.steel, 12), cx + sgn * 0.3, 1.63, cz - 0.38);
        const beacon = put(cyl(0.035, 0.07, new THREE.MeshStandardMaterial({ color: 0x3fb950, emissive: 0x000000, roughness: 0.3 }), 20), cx + sgn * 0.3, 1.695, cz - 0.38);
        beacon.userData.dynamic = true;
        put(cyl(0.035, 0.07, new THREE.MeshStandardMaterial({ color: 0x9a6a08, roughness: 0.3 }), 20), cx + sgn * 0.3, 1.767, cz - 0.38);
        put(cyl(0.035, 0.07, new THREE.MeshStandardMaterial({ color: 0x8c2222, roughness: 0.3 }), 20), cx + sgn * 0.3, 1.839, cz - 0.38);
        put(cyl(0.037, 0.015, M.dark, 20), cx + sgn * 0.3, 1.882, cz - 0.38);
        // Operator pendant on its arm: screen, keys and the red stop button.
        put(box(0.03, 0.03, 0.1, M.dark), cx + sgn * 0.49, 1.25, cz + 0.37);
        put(rbox(0.06, 0.38, 0.27, M.dark, 0.012), cx + sgn * 0.53, 1.22, cz + 0.44);
        const screen = box(0.006, 0.15, 0.2, new THREE.MeshStandardMaterial({ color: 0x0b2540, emissive: 0x1e6fd9, emissiveIntensity: 0.6, roughness: 0.2 }));
        put(screen, cx + sgn * 0.562, 1.31, cz + 0.44);
        const keys = [];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) keys.push([new THREE.BoxGeometry(0.008, 0.018, 0.028), [sgn * 0.562, 1.19 - i * 0.03, 0.37 + j * 0.035]]);
        put(new THREE.Mesh(mergeParts(keys), M.steel), cx, 0, cz);
        const stop = cyl(0.018, 0.012, new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.35 }), 16);
        stop.rotation.z = Math.PI / 2;
        put(stop, cx + sgn * 0.566, 1.1, cz + 0.52);
        // Chip tray under the door.
        put(rbox(0.3, 0.06, 0.8, M.dark, 0.012), cx + sgn * 0.62, 0.03, cz);
        const lbl = makeLabel(NAMES.cnc);
        lbl.position.set(cx, 2.08, cz);
        g.add(lbl);
        add(g);
        stations.cnc = { point: V(-sgn * 1.0, 0.95, cz), door, doorY: 0.98, beacon, part: null };
      }

      const makeTable = (x, z, label, top = M.steel) => {
        const g = new THREE.Group();
        const topY = 0.72;
        // A drilled weld plate shows its holes on top only; its edges are plain steel.
        const t = box(0.7, 0.05, 0.55, top === M.weldTop ? [M.dark, M.dark, top, M.dark, M.dark, M.dark] : top);
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

      if (needed.has("table")) stations.table = makeTable(sgn * 0.1, 1.08, NAMES.table);
      if (needed.has("weld")) {
        const [wx, wz] = layout.weld;
        stations.weld = makeTable(sgn * wx, wz, NAMES.weld, M.weldTop);
        const clampBar = box(0.5, 0.03, 0.03, M.amber);
        clampBar.position.set(X + sgn * wx, 0.735, wz - 0.18);
        stations.weld.group.add(clampBar);
      }

      if (needed.has("pallet")) {
        const g = new THREE.Group();
        const cx = X + sgn * 1.0, cz = 0.85, topY = 0.14;
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
        // Produce goes into crates, eggs and vials into trays, the rest straight onto the pallet.
        let floorY = topY, area = [0.96, 0.76], layers = clamp(Math.floor((lifts ? 0.42 + liftMax : 0.42) / PART.h), 1, lifts ? 6 : 3);
        const holder = kit.info.output;
        if (holder === "crate" || holder === "tray") {
          const c = kit.container(holder, false);
          protect(c.group, true);
          if (holder === "crate") c.group.traverse((o)=>{ if(o.material?.color) o.material.color.setHex(0x3a4555); });
          c.group.position.set(cx, topY, cz);
          g.add(c.group);
          floorY = topY + 0.008;
          area = [c.size[0] - 0.02, c.size[2] - 0.02];
          layers = 1;
        }
        const lbl = makeLabel(holder === "crate" ? "Crate on pallet" : holder === "tray" ? "Tray on pallet" : NAMES.pallet);
        lbl.position.set(cx, Math.max(0.75, floorY + layers * PART.h + 0.3), cz + 0.2);
        g.add(lbl);
        add(g);
        const slots = gridSlots(cx, cz, floorY, area[0], area[1], layers);
        stations.pallet = { slots, parts: [], point: slots[0], center: V(sgn * 1.0, 0, cz) };
      }

      if (needed.has("vision")) {
        const g = new THREE.Group();
        // A travelling robot runs along z = 0, so its camera stands behind the track.
        const vx = moving ? 0.6 : 0.95, pz = moving ? -0.95 : 0.12;
        const px = X + sgn * (vx + 0.5);
        const post = box(0.06, 1.95, 0.06, M.frame);
        post.position.set(px, 0.975, pz);
        g.add(post);
        const arm = box(0.55, 0.05, 0.05, M.frame);
        arm.position.set(px - sgn * 0.27, 1.92, pz);
        g.add(arm);
        const cam = box(0.12, 0.1, 0.1, M.dark);
        cam.position.set(X + sgn * vx, 1.86, pz);
        g.add(cam);
        const lens = cyl(0.03, 0.04, M.accent);
        lens.position.set(X + sgn * vx, 1.79, pz);
        g.add(lens);
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.28, 0.7, 32, 1, true),
          new THREE.MeshBasicMaterial({ color: 0x4a90e2, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })
        );
        cone.position.set(X + sgn * vx, 1.43, pz);
        g.add(cone);
        cone.userData.dynamic = true;
        const lbl = makeLabel(NAMES.vision);
        lbl.position.set(px, 2.15, pz);
        g.add(lbl);
        add(g);
        stations.vision = { point: V(sgn * vx, 1.08, pz), cone };
      }

      if (needed.has("carton")) {
        const g = new THREE.Group();
        const cx = X - sgn * 1.05, cz = 0.95, standY = 0.3;
        const stand = box(0.5, standY, 0.4, M.frame);
        stand.position.set(cx, standY / 2, cz);
        g.add(stand);
        const gx = PART.w + 0.012, gz = PART.d + 0.012;
        const cols = clamp(Math.floor(0.4 / gx), 1, 3), rows = clamp(Math.floor(0.3 / gz), 1, 3);
        const W = Math.max(0.16, cols * gx + 0.02), D = Math.max(0.12, rows * gz + 0.02), H = clamp(PART.h + 0.03, 0.08, 0.3), t = 0.012;
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
        lid.userData.dynamic = true;
        const tape = box(W + 0.012, t * 1.2, 0.05, M.amber);
        tape.position.set(cx, standY + H + t, cz);
        tape.visible = false;
        g.add(tape);
        tape.userData.dynamic = true;
        const lbl = makeLabel(NAMES.carton);
        lbl.position.set(cx - 0.3, standY + H + 0.12, cz + 0.2);
        g.add(lbl);
        add(g);
        const slots = gridSlots(cx, cz, standY + t, W - 0.02, D - 0.02, 1, 9);
        stations.carton = { slots, parts: [], point: slots[0], lid, tape, closeT: 0 };
      }

      /* Machines and small stations placed in the cell builder, each in a free place around the robot
         (the fixed stations above keep theirs). Big machines stand to the side, small ones in front. */
      const SPOTS = { left: [-1.38, 0.1], right: [1.38, 0.05], frontLeft: [-1.0, 0.98], front: [0.1, 1.08], frontRight: [1.0, 0.88] };
      // A travelling robot runs along the line through the "right" spot: nothing stands there.
      const taken = new Set(
        [needed.has("cnc") && "left", (needed.has("vision") || moving) && "right", needed.has("carton") && "frontLeft", needed.has("table") && "front", needed.has("pallet") && "frontRight"].filter(Boolean)
      );
      const spotFor = (prefs) => {
        const k = prefs.find((x) => !taken.has(x)) || Object.keys(SPOTS).find((x) => !taken.has(x)) || prefs[0];
        taken.add(k);
        return { x: sgn * SPOTS[k][0], z: SPOTS[k][1] };
      };
      const flash = (light, on) => light.material.emissive.setHex(on);

      if (needed.has("press")) {
        // Stamping press / press brake: the robot loads the die, the ram strokes, the robot unloads.
        const sp = spotFor(["left", "right"]);
        const side = Math.sign(sp.x) || -1;
        const g = new THREE.Group();
        g.position.set(X + sp.x, 0, sp.z);
        g.rotation.y = side > 0 ? Math.PI : 0;
        const base = box(0.8, 0.82, 0.85, M.machine);
        base.position.set(-0.05, 0.41, 0);
        g.add(base);
        const bolster = box(0.6, 0.05, 0.6, M.steel);
        bolster.position.set(0.05, 0.845, 0);
        g.add(bolster);
        for (const dz of [-0.36, 0.36]) {
          const col = box(0.14, 1.45, 0.12, M.machine);
          col.position.set(-0.28, 1.55, dz);
          g.add(col);
        }
        const crown = box(0.82, 0.32, 0.9, M.machine);
        crown.position.set(-0.05, 2.35, 0);
        g.add(crown);
        const ram = box(0.5, 0.3, 0.55, M.dark);
        const ramY = 1.75;
        ram.position.set(0.05, ramY, 0);
        g.add(ram);
        ram.userData.dynamic = true;
        const beacon = cyl(0.04, 0.12, new THREE.MeshStandardMaterial({ color: 0x3fb950, emissive: 0x000000 }));
        beacon.position.set(-0.3, 2.58, 0.36);
        g.add(beacon);
        beacon.userData.dynamic = true;
        const lbl = makeLabel(NAMES.press);
        lbl.position.set(0, 2.8, 0);
        g.add(lbl);
        add(g);
        const topY = 0.87;
        const st = {
          point: V(sp.x - side * 0.25, topY + PART.h / 2, sp.z),
          part: null,
          process: () =>
            dwell(
              1.5,
              () => flash(beacon, 0x2a8a3a),
              () => {
                ram.position.y = ramY;
                flash(beacon, 0x000000);
                if (st.part) {
                  if (!kit.reveal(st.part, "process")) st.part.scale.set(1.15, 0.7, 1.15);
                  kit.setState(st.part, "machined");
                }
              },
              // Down onto the part and back up.
              (k) => (ram.position.y = ramY - (ramY - (topY + PART.h + 0.15)) * Math.sin(Math.PI * k))
            ),
        };
        stations.press = st;
      }

      if (needed.has("mould")) {
        // Injection-moulding / die-casting machine: the mould closes, opens, and the robot takes the part out.
        const sp = spotFor(["left", "right"]);
        const side = Math.sign(sp.x) || -1;
        const g = new THREE.Group();
        g.position.set(X + sp.x, 0, sp.z + 0.12);
        g.rotation.y = side > 0 ? Math.PI : 0;
        const base = box(0.75, 0.75, 1.15, M.machine);
        base.position.set(-0.05, 0.375, 0);
        g.add(base);
        const fixed = box(0.62, 0.8, 0.1, M.steel);
        fixed.position.set(0, 1.15, -0.25);
        g.add(fixed);
        const moving = box(0.62, 0.8, 0.1, M.steel);
        moving.position.set(0, 1.15, 0.25);
        g.add(moving);
        moving.userData.dynamic = true;
        for (const dy of [-0.3, 0.3]) for (const dx of [-0.25, 0.25]) {
          const bar = cyl(0.025, 0.95, M.steel, 12);
          bar.rotation.x = Math.PI / 2;
          bar.position.set(dx, 1.15 + dy, 0.12);
          g.add(bar);
        }
        const barrel = cyl(0.09, 0.55, M.dark, 16);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(-0.05, 1.15, -0.55);
        g.add(barrel);
        const hopper = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 16), M.amber);
        hopper.rotation.x = Math.PI;
        hopper.position.set(-0.05, 1.42, -0.62);
        g.add(hopper);
        const beacon = cyl(0.04, 0.12, new THREE.MeshStandardMaterial({ color: 0x3fb950, emissive: 0x000000 }));
        beacon.position.set(-0.3, 1.62, -0.25);
        g.add(beacon);
        beacon.userData.dynamic = true;
        const lbl = makeLabel(NAMES.mould);
        lbl.position.set(0, 1.95, 0);
        g.add(lbl);
        add(g);
        const st = {
          point: V(sp.x - side * 0.22, 1.1, sp.z + 0.12),
          part: null,
          process: () =>
            dwell(
              2.0,
              () => flash(beacon, 0x2a8a3a),
              () => {
                moving.position.z = 0.25;
                flash(beacon, 0x000000);
                // A new moulded part is ready between the open platens.
                if (!st.part) st.part = spawnPart(st.point);
                else kit.reveal(st.part, "process");
              },
              // Close, hold (inject and cool), open.
              (k) => (moving.position.z = 0.25 - 0.13 * (k < 0.25 ? k / 0.25 : k > 0.75 ? (1 - k) / 0.25 : 1))
            ),
        };
        stations.mould = st;
      }

      const smallStation = (key, prefs, top) => {
        const sp = spotFor(prefs);
        return { ...makeTable(sp.x, sp.z, STATION_NAMES[key], top), sp };
      };

      if (needed.has("test")) {
        // Leak / function / gauging station: a hood closes over the part, the lamp shows the result.
        const t = smallStation("test", ["frontLeft", "right", "front", "left"]);
        const hood = box(0.32, 0.22, 0.32, M.glass);
        hood.position.set(X + t.sp.x, 1.15, t.sp.z);
        t.group.add(hood);
        hood.userData.dynamic = true;
        const lamp = cyl(0.035, 0.1, new THREE.MeshStandardMaterial({ color: 0x64748b, emissive: 0x000000 }));
        lamp.position.set(X + t.sp.x + 0.18, 1.18, t.sp.z - 0.12);
        t.group.add(lamp);
        lamp.userData.dynamic = true;
        const st = {
          ...t,
          process: () =>
            dwell(
              1.6,
              () => (hood.position.y = 0.86),
              () => {
                hood.position.y = 1.15;
                lamp.material.color.setHex(0x22c55e);
                flash(lamp, 0x15803d);
                if (st.part) st.part.userData.tested = true;
              },
              (k) => {
                lamp.material.color.setHex(0xf59e0b);
                flash(lamp, Math.floor(k * 8) % 2 ? 0x92400e : 0x000000);
              }
            ),
        };
        stations.test = st;
      }

      if (needed.has("marker")) {
        // Laser marker: a head above the part burns a code onto it.
        const t = smallStation("marker", ["front", "frontLeft", "right", "left"], M.dark);
        const post = box(0.05, 0.6, 0.05, M.frame);
        post.position.set(X + t.sp.x - 0.18, 1.02, t.sp.z);
        t.group.add(post);
        const head = box(0.2, 0.08, 0.1, M.dark);
        head.position.set(X + t.sp.x - 0.08, 1.28, t.sp.z);
        t.group.add(head);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
        beam.visible = false;
        t.group.add(beam);
        beam.userData.dynamic = true;
        const st = {
          ...t,
          process: () =>
            dwell(
              1.1,
              () => {
                const len = 1.24 - (t.topY + PART.h);
                beam.scale.set(1, len, 1);
                beam.position.set(X + t.sp.x, t.topY + PART.h + len / 2, t.sp.z);
                beam.visible = true;
              },
              () => {
                beam.visible = false;
                if (st.part && !kit.reveal(st.part, "mark")) addOn(st.part, new THREE.BoxGeometry(Math.min(0.05, PART.w * 0.6), 0.002, Math.min(0.03, PART.d * 0.5)), 0x111827, new THREE.Vector3(0, PART.h / 2 + 0.001, 0));
              },
              (k) => (beam.position.x = X + t.sp.x + Math.sin(k * Math.PI * 6) * 0.02)
            ),
        };
        stations.marker = st;
      }

      if (needed.has("bin")) {
        // Bin of loose, jumbled parts under a 3D camera (bin picking).
        const sp = spotFor(["frontLeft", "frontRight", "front", "right"]);
        const g = new THREE.Group();
        const bx = X + sp.x, bz = sp.z, h = 0.45, w = 0.5, d = 0.4, t = 0.02;
        const floorB = box(w, t, d, M.frame);
        floorB.position.set(bx, 0.2, bz);
        g.add(floorB);
        for (const [dx, dz, ww, dd] of [[0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d]]) {
          const wall = box(ww, h - 0.2, dd, M.accent);
          wall.position.set(bx + dx, 0.2 + (h - 0.2) / 2, bz + dz);
          g.add(wall);
        }
        for (let i = 0; i < 7; i++) {
          const loose = protect(kit.spawn(), true);
          loose.userData.dynamic = true;
          loose.position.set(bx + (Math.random() - 0.5) * 0.3, 0.27 + Math.random() * 0.06, bz + (Math.random() - 0.5) * 0.22);
          loose.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
          loose.scale.setScalar(Math.min(0.85, 0.28 / Math.max(PART.w, PART.d)));
          g.add(loose);
        }
        const post = box(0.05, 1.5, 0.05, M.frame);
        post.position.set(bx - w / 2 - 0.05, 0.75, bz);
        g.add(post);
        const cam = box(0.14, 0.07, 0.1, M.dark);
        cam.position.set(bx, 1.45, bz);
        g.add(cam);
        const arm = box(w / 2 + 0.05, 0.04, 0.04, M.frame);
        arm.position.set(bx - w / 4 - 0.02, 1.48, bz);
        g.add(arm);
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.3, 1.05, 32, 1, true),
          new THREE.MeshBasicMaterial({ color: 0x4a90e2, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
        );
        cone.position.set(bx, 0.92, bz);
        g.add(cone);
        cone.userData.dynamic = true;
        const lbl = makeLabel(NAMES.bin);
        lbl.position.set(bx, 1.7, bz);
        g.add(lbl);
        add(g);
        stations.bin = { point: V(sp.x, 0.3 + PART.h / 2, sp.z), part: null, cone };
      }

      // Tool stand: a nest for each tool the robot puts down — the gripper, and the torch, gun or spindle it changes to.
      // The robot lowers the tool into its nest, the changer unlocks, it moves to the other nest and locks that tool on.
      if (needed.has("rack")) {
        const g = new THREE.Group();
        // In the builder: a nest for every tool the program changes to; in the studio: the gripper and the job's heads.
        const changes = [...new Set([startTool, ...steps.filter((s) => s.action === "toolchange").map((s) => s.tool || 0)])].slice(0, 4);
        const keys = buildMode ? (changes.length > 1 ? changes : [0, 1]).map((t) => `tool:${t}`) : ["tool:0", ...headLooks.map((l) => `head:${l}`)];
        const pitch = 0.27, FLANGE_Y = 1.16;
        const rx = X - sgn * 0.55, rz = 0.66;
        const width = (keys.length - 1) * pitch + 0.3;
        const put = (m, x, y, z) => (m.position.set(x, y, z), g.add(m), m);
        put(box(width + 0.12, 0.03, 0.36, M.dark), rx, 0.015, rz - 0.06);
        for (const dx of [-width / 2, width / 2]) put(box(0.06, FLANGE_Y - 0.08, 0.06, M.frame), rx + dx, 0.03 + (FLANGE_Y - 0.08) / 2, rz - 0.14);
        put(box(width + 0.08, 0.06, 0.08, M.steel), rx, FLANGE_Y - 0.08, rz - 0.14);
        const nests = keys.map((key, i) => {
          const x = rx + (i - (keys.length - 1) / 2) * pitch;
          // A fork that takes the tool plate, and the sensor that says the nest holds a tool.
          for (const fx of [-0.07, 0.07]) put(box(0.026, 0.026, 0.17, M.amber), x + fx, FLANGE_Y - 0.055, rz - 0.06);
          put(box(0.03, 0.03, 0.03, M.dark), x, FLANGE_Y - 0.055, rz - 0.15);
          return { key, x, z: rz };
        });
        const lbl = makeLabel(`${NAMES.rack} · ${keys.length} nests`);
        lbl.position.set(rx, FLANGE_Y + 0.85, rz);
        g.add(lbl);
        add(g);
        const parked = new Map();
        const nest = (key) => nests.find((n) => n.key === key);
        const rack = {
          group: g,
          nests,
          point: V(-sgn * 0.55, FLANGE_Y - TOOL_LEN, rz),
          has: (key) => !!key && !!nest(key),
          holds: (key) => parked.has(key),
          /** Where the tool centre point goes to set the tool down in (or lift it from) its nest. */
          dock: (key) => {
            const n = nest(key) || nests[0];
            return new THREE.Vector3(n.x, FLANGE_Y - TOOL_LEN, n.z);
          },
          take(key) {
            const p = parked.get(key);
            if (!p) return;
            g.remove(p.group);
            p.group.traverse((o) => o.geometry && o.geometry.dispose());
            parked.delete(key);
          },
          park(key, tool) {
            rack.take(key);
            const n = nest(key);
            if (!n || !tool) return;
            // Hangs tool-down in the fork, its tool plate up where the changer meets it.
            tool.group.rotation.z = -Math.PI / 2;
            tool.group.position.set(n.x, FLANGE_Y, n.z);
            g.add(tool.group);
            parked.set(key, tool);
          },
          clear() {
            [...parked.keys()].forEach((k) => rack.take(k));
          },
        };
        stations.rack = rack;
      }
      return stations;
    }

    const homeTypes = new Set([...needed].filter((k) => !/_\d+$/.test(k) && !["conveyor", "in", "out"].includes(k)));
    const farTypes = new Set([...needed].filter((k) => /_2$/.test(k)).map((k) => k.replace(/_2$/, "")));
    Object.assign(stations, buildStations(X, 1, homeTypes, 0));
    if (L > 0 && farTypes.size) for (const [k, v] of Object.entries(buildStations(X + L, -1, farTypes, 1))) stations[`${k}_2`] = v;

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
    stream.userData.dynamic = true;
    add(stream);

    /* Robot */
    let robot = null;
    /**
     * A 6-axis arm on its base (upright, or hanging from the overhead track), shaped like a real industrial robot:
     * cast base and turret, sloped shoulder casting, gear housings with finned servo motors, a tapered upper-arm
     * casting, a rear housing with the wrist motors, a tapered forearm and a wrist yoke. Joint layout as in dims.
     */
    function buildArm(s, dims, paint, trim, cable) {
      const root = new THREE.Group();
      root.position.x = X;
      root.rotation.x = inverted ? Math.PI : 0;
      const put = (geo, mat, parent, p, r) => {
        const m = new THREE.Mesh(geo, mat);
        geo.computeBoundingBox();
        const extent=geo.boundingBox.getSize(new THREE.Vector3());
        m.castShadow = Math.max(extent.x,extent.y,extent.z)>0.12;
        m.receiveShadow = true;
        if (p) m.position.set(p[0], p[1], p[2]);
        if (r) m.rotation.set(r[0], r[1], r[2]);
        parent.add(m);
        return m;
      };
      /** A turned part along y: [[radius, height], …] in units of s. */
      const lathe = (pts, seg = 36) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * s, y * s)), seg);
      /** A cast link seen from the side: two rounded ends (r0 at y0, r1 at y1) joined, extruded `depth` thick. */
      const casting = (x0, y0, r0, x1, y1, r1, depth, bevel = 0.018) => {
        const sh = new THREE.Shape();
        const a = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
        sh.absarc(x0 * s, y0 * s, r0 * s, a, a + Math.PI, true);
        sh.absarc(x1 * s, y1 * s, r1 * s, a + Math.PI, a + 2 * Math.PI, true);
        sh.closePath();
        const b = bevel * s;
        const geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, depth * s - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 28 });
        geo.translate(0, 0, -(depth * s - 2 * b) / 2);
        return geo;
      };
      /** A servo motor along z: body, cooling fins, end cap and cable gland. */
      const motor = (parent, x, y, z, r, len, dir = 1) => {
        const g = new THREE.Group();
        g.position.set(x * s, y * s, z * s);
        put(new THREE.CylinderGeometry(r * s, r * s, len * s, 28), M.dark, g, [0, 0, (dir * len * s) / 2], [Math.PI / 2, 0, 0]);
        for (let i = 1; i < 5; i++) put(new THREE.CylinderGeometry(r * 1.08 * s, r * 1.08 * s, 0.008 * s, 28), M.frame, g, [0, 0, dir * (len * s * i) / 5], [Math.PI / 2, 0, 0]);
        put(new THREE.CylinderGeometry(r * 0.92 * s, r * 0.92 * s, 0.03 * s, 28), trim, g, [0, 0, dir * (len + 0.015) * s], [Math.PI / 2, 0, 0]);
        put(new THREE.CylinderGeometry(0.018 * s, 0.018 * s, 0.05 * s, 10), cable, g, [r * 0.55 * s, r * 0.55 * s, dir * len * 0.7 * s], [0, 0, 0]);
        parent.add(g);
        return g;
      };

      // Base: a flared casting on the grouted plate.
      put(lathe([[0, 0], [0.27, 0], [0.27, 0.035], [0.22, 0.07], [0.2, 0.12], [0, 0.12]]), M.dark, root);
      const plate = box(0.62 * s, 0.02, 0.62 * s, M.frame);
      plate.position.y = 0.01;
      root.add(plate);
      for (const bx of [-0.25, 0.25]) for (const bz of [-0.25, 0.25]) {
        const bolt = cyl(0.018 * s, 0.03, M.steel, 6);
        bolt.position.set(bx * s, 0.03, bz * s);
        root.add(bolt);
      }

      const j1 = new THREE.Group();
      j1.position.y = 0.12 * s;
      root.add(j1);
      // Turret with the J1 motor on its side.
      put(lathe([[0, 0], [0.205, 0], [0.205, 0.04], [0.19, 0.12], [0.17, 0.19], [0, 0.19]]), paint, j1);
      put(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 0.17 * s, 24), M.dark, j1, [-0.15 * s, 0.1 * s, 0.1 * s]);
      put(new THREE.CylinderGeometry(0.052 * s, 0.052 * s, 0.03 * s, 24), trim, j1, [-0.15 * s, 0.2 * s, 0.1 * s]);
      // Sloped shoulder casting up to the J2 axis.
      const j2y = (dims.h1 - 0.12 * s) / s;
      put(casting(0.02, 0.17, 0.16, dims.a1 / s, j2y, 0.13, 0.36), paint, j1);

      const j2 = new THREE.Group();
      j2.position.set(dims.a1, dims.h1 - 0.12 * s, 0);
      j1.add(j2);
      // J2 gear housing through the joint, its servo motor on the side.
      put(new THREE.CylinderGeometry(0.135 * s, 0.135 * s, 0.4 * s, 36), paint, j2, null, [Math.PI / 2, 0, 0]);
      put(new THREE.CylinderGeometry(0.1 * s, 0.1 * s, 0.42 * s, 36), trim, j2, null, [Math.PI / 2, 0, 0]);
      motor(j2, 0, 0, 0.21, 0.075, 0.17, 1);
      // Upper arm: a tapered casting with a recessed side panel.
      const L2s = dims.L2 / s;
      put(casting(0, 0, 0.115, 0, L2s, 0.095, 0.2), paint, j2);
      for (const zz of [-0.101, 0.101]) put(casting(0, 0.16, 0.05, 0, L2s - 0.16, 0.042, 0.004, 0.001), M.dark, j2, [0, 0, zz * s]);
      // Cable dress down the back of the upper arm, with clamps.
      const harness = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.1 * s, 0.05 * s, 0.13 * s), new THREE.Vector3(-0.13 * s, (L2s * 0.5) * s, 0.13 * s), new THREE.Vector3(-0.09 * s, (L2s - 0.05) * s, 0.13 * s)]);
      put(new THREE.TubeGeometry(harness, 20, 0.022 * s, 10, false), cable, j2);
      for (const t of [0.25, 0.6]) put(new THREE.BoxGeometry(0.07 * s, 0.025 * s, 0.07 * s), M.steel, j2, [-0.12 * s, L2s * t * s, 0.13 * s]);

      const j3 = new THREE.Group();
      j3.position.set(0, dims.L2, 0);
      j2.add(j3);
      // Elbow housing, J3 motor, and the rear housing with the wrist motors.
      put(new THREE.CylinderGeometry(0.11 * s, 0.11 * s, 0.32 * s, 36), paint, j3, null, [Math.PI / 2, 0, 0]);
      put(new THREE.CylinderGeometry(0.085 * s, 0.085 * s, 0.34 * s, 36), trim, j3, null, [Math.PI / 2, 0, 0]);
      motor(j3, 0, 0, -0.17, 0.062, 0.14, -1);
      put(casting(-0.25, 0, 0.085, 0.05, 0, 0.11, 0.24), paint, j3);
      for (const zz of [-0.06, 0.06]) put(new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 0.12 * s, 20), M.dark, j3, [-0.3 * s, 0.02 * s, zz * s], [0, 0, Math.PI / 2]);
      // Forearm: a tapered tube out to the J4 roll joint.
      const half = (dims.L3 * 0.5) / s;
      put(lathe([[0, 0.05], [0.095, 0.05], [0.095, 0.1], [0.078, half], [0, half]], 32), paint, j3, null, [0, 0, -Math.PI / 2]);
      const fh = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2 * s, 0.1 * s, 0.05 * s), new THREE.Vector3(0.1 * s, 0.11 * s, 0.05 * s), new THREE.Vector3(half * 0.85 * s, 0.085 * s, 0.03 * s)]);
      put(new THREE.TubeGeometry(fh, 16, 0.016 * s, 8, false), cable, j3);

      const j4 = new THREE.Group();
      j4.position.set(dims.L3 * 0.5, 0, 0);
      j3.add(j4);
      put(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.03 * s, 32), trim, j4, null, [0, 0, Math.PI / 2]);
      put(lathe([[0, 0.015], [0.07, 0.015], [0.066, half - 0.07], [0.058, half - 0.03], [0, half - 0.03]], 32), paint, j4, null, [0, 0, -Math.PI / 2]);

      const j5 = new THREE.Group();
      j5.position.set(dims.L3 * 0.5, 0, 0);
      j4.add(j5);
      // Wrist yoke: two side cheeks round the J5 axis, and the J6 nose.
      for (const zz of [-0.062, 0.062]) put(casting(-0.05, 0, 0.055, 0.0, 0, 0.06, 0.03, 0.006), paint, j5, [0, 0, zz * s]);
      put(new THREE.CylinderGeometry(0.052 * s, 0.052 * s, 0.1 * s, 28), M.dark, j5, null, [Math.PI / 2, 0, 0]);
      put(lathe([[0, 0], [0.05, 0], [0.048, 0.05], [0.042, dims.d6 / s], [0, dims.d6 / s]], 28), paint, j5, null, [0, 0, -Math.PI / 2]);

      const j6 = new THREE.Group();
      j6.position.set(dims.d6, 0, 0);
      j5.add(j6);
      const flange = cyl(0.05, 0.02, trim);
      flange.rotation.z = Math.PI / 2;
      j6.add(flange);
      [j1,j2,j3,j4,j5,j6].forEach((o)=> { o.userData.dynamic=true; });
      [root,j1,j2,j3,j4,j5].forEach(bakeStatic);
      return { root, j6, joints: [j1, j2, j3, j4, j5, j6] };
    }

    /**
     * A Cartesian gantry robot: a bridge rides the side rails (X), a carriage runs across it (Z) and a vertical
     * mast (Y) carries the tool. The flange frame matches the arm's, so every tool fits both.
     */
    function buildGantry(paint, trim) {
      const root = new THREE.Group();
      const bridge = new THREE.Group();
      bridge.position.x = X;
      root.add(bridge);
      const beam = box(0.22, 0.28, 3.42, paint);
      beam.position.y = GANTRY_H + 0.1;
      bridge.add(beam);
      for (const z of [-1.62, 1.62]) {
        const truck = box(0.5, 0.16, 0.26, trim);
        truck.position.set(0, GANTRY_H + 0.28, z);
        bridge.add(truck);
      }
      const chain = box(0.1, 0.08, 1.6, M.dark);
      chain.position.set(-0.17, GANTRY_H + 0.27, -0.8);
      bridge.add(chain);
      const carriage = new THREE.Group();
      carriage.position.y = GANTRY_H;
      bridge.add(carriage);
      const block = box(0.36, 0.36, 0.34, trim);
      block.position.y = 0.1;
      carriage.add(block);
      const motor = cyl(0.06, 0.18, M.dark, 14);
      motor.position.set(0.12, 0.38, 0.1);
      carriage.add(motor);
      const mast = new THREE.Group();
      carriage.add(mast);
      const column = box(0.13, 2.1, 0.13, paint);
      column.position.y = 1.05;
      mast.add(column);
      const rackStrip = box(0.02, 2.1, 0.04, M.steel);
      rackStrip.position.set(0.075, 1.05, 0);
      mast.add(rackStrip);
      const flangePlate = box(0.16, 0.04, 0.16, M.dark);
      flangePlate.position.y = 0.02;
      mast.add(flangePlate);
      // The tool frame points down (x), like the arm's flange.
      const j6 = new THREE.Group();
      j6.rotation.z = -Math.PI / 2;
      mast.add(j6);
      return { root, j6, joints: [bridge, mast, carriage, null, null, j6], gantry: { bridge, carriage, mast } };
    }

    function buildRobot(s) {
      if (model && model.scale) s = model.scale;
      // An inverted robot must reach down to the floor stations from the overhead track.
      if (inverted) s = Math.max(s, OVERHEAD_SCALE);
      const dims = { h1: 0.45 * s, a1: 0.15 * s, L2: 0.7 * s, L3: 0.75 * s, d6: 0.09 * s };
      dims.dTool = dims.d6 + TOOL_LEN;
      // Painted like a real robot: industrial yellow, or white with blue trim for a cobot (see setPaint).
      const paint = new (THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial)({ color: 0xf2b705, metalness: 0.15, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18 });
      const trim = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.55, roughness: 0.35 });
      const cable = new THREE.MeshStandardMaterial({ color: 0x111418, metalness: 0.1, roughness: 0.7 });
      const arm = cartesian ? buildGantry(paint, trim) : buildArm(s, dims, paint, trim, cable);
      const { root, j6, joints } = arm;
      // End-of-arm tools: the chosen products (arm tool first, then the tool-stand tool), else the gripper the
      // product needs (soft fingers for fruit, a vacuum frame for glass, a claw for sacks).
      const chosen = model && model.tools && model.tools.length;
      const kinds = chosen ? model.tools : [(model && model.eoat) || (buildMode ? "none" : kit.info.grip)];
      const looks = chosen ? model.looks || [] : [model && model.eoat ? model.look : buildMode ? null : kit.info.look];
      const toolSets = kinds.map((k, i) => {
        const t = makeEoat(k, looks[i]);
        t.group.visible = false;
        j6.add(t.group);
        return t;
      });
      // Process tools the cycle puts on for a step (spray gun, laser head, blade…), built when first needed.
      const heads = new Map();
      // Accessories the user attached in the configurator: tool changer / force-torque sensor at the
      // flange, a vision camera on the side of the wrist.
      const acc = (model && model.accessories) || [];
      // Tool changer: the master plate on the flange, its lamp green while a tool is locked on, red while released.
      let lockLed = null;
      if (acc.includes("changer") || stations.rack) {
        lockLed = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), new THREE.MeshStandardMaterial({ color: 0x14532d, emissive: 0x22c55e, emissiveIntensity: 1.4 }));
        lockLed.position.set(0.016, 0.0, 0.064);
        j6.add(lockLed);
        const plate = cyl(0.058, 0.025, M.steel, 20);
        plate.rotation.z = Math.PI / 2;
        plate.position.x = 0.012;
        j6.add(plate);
        const ring = cyl(0.06, 0.008, new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.4, roughness: 0.4 }), 20);
        ring.rotation.z = Math.PI / 2;
        ring.position.x = 0.026;
        j6.add(ring);
      }
      if (acc.includes("sensor")) {
        const ft = cyl(0.052, 0.03, new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7, roughness: 0.3 }), 20);
        ft.rotation.z = Math.PI / 2;
        ft.position.x = acc.includes("changer") ? 0.045 : 0.018;
        j6.add(ft);
        const band = cyl(0.054, 0.006, new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 }), 20);
        band.rotation.z = Math.PI / 2;
        band.position.x = ft.position.x;
        j6.add(band);
      }
      if (acc.includes("camera")) {
        const bracket = box(0.05, 0.02, 0.02, M.steel);
        bracket.position.set(0.02, 0.07, 0);
        j6.add(bracket);
        const cam = box(0.06, 0.045, 0.045, new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 }));
        cam.position.set(0.05, 0.095, 0);
        j6.add(cam);
        const lens = cyl(0.014, 0.02, new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.6, roughness: 0.2 }), 14);
        lens.rotation.z = Math.PI / 2;
        lens.position.set(0.09, 0.095, 0);
        j6.add(lens);
      }

      const tip = new THREE.Object3D();
      tip.position.x = TOOL_LEN;
      j6.add(tip);

      // Model label under the robot's title, e.g. "FANUC M-20iD/25 · 25 kg · 1811 mm".
      let modelLabel = null;
      if ((model && model.label) || !title) {
        modelLabel = makeLabel(model?.label || `Robot ${index+1}`, "#93c5fd");
        modelLabel.userData.priority = title ? 2 : 4;
        if (cartesian) modelLabel.position.set(X + L / 2, GANTRY_H + 0.9, 0);
        else modelLabel.position.set(0, inverted ? -0.75 : 2.05 + (s - 1) * 0.4, inverted ? -0.2 : 0.2);
        root.add(modelLabel);
      }

      root.userData.dynamic = true;
      if (!inverted && !cartesian && motionType === "fixed") ground(root);
      root.visible = !(buildMode && !(model && model.hasRobot));
      scene.add(root);
      const r = { root, joints, tip, fingers: [], fingerTool: false, fingerOpen: 0.075, dims, q: [0, 0, 0, 0, 0, 0], paint, trim, toolSets, heads, activeHead: null, activeLook: null, empty: false, lockLed, modelLabel, activeTool: 0, eoat: kinds[0], cartesian, gantry: arm.gantry || null, travel: 0, lift: 0 };
      /** The changer's lock lamp: green with a tool locked on, red while it lets go. */
      r.setLock = (on) => lockLed && lockLed.material.emissive.setHex(on ? 0x22c55e : 0xef4444);
      /** The flange with no tool on it, between parking one tool and locking on the next. */
      r.clearTool = () => {
        heads.forEach((h) => (h.group.visible = false));
        toolSets.forEach((t) => (t.group.visible = false));
        r.activeHead = null;
        r.activeLook = null;
        r.fingers = [];
        r.empty = true;
      };
      /** Put tool i on the flange (tool changer); the gripper animation follows the active tool. */
      r.setTool = (i) => {
        const k = clamp(Math.round(Number(i) || 0), 0, toolSets.length - 1);
        heads.forEach((h) => (h.group.visible = false));
        r.activeHead = null;
        r.activeLook = null;
        r.empty = false;
        toolSets.forEach((t, n) => (t.group.visible = n === k));
        const t = toolSets[k];
        r.fingers = t.fingers;
        r.fingerTool = t.fingerTool;
        r.fingerOpen = t.open || 0.075;
        r.activeTool = k;
        r.eoat = t.kind;
      };
      /** Put a process tool on for a step (the tool on the arm goes to the stand); null look keeps the gripper. */
      r.showHead = (look) => {
        if (!look) return null;
        if (!heads.has(look)) {
          const h = makeEoat("head", look);
          j6.add(h.group);
          heads.set(look, h);
        }
        const h = heads.get(look);
        toolSets.forEach((t) => (t.group.visible = false));
        heads.forEach((x) => (x.group.visible = x === h));
        r.activeHead = h;
        r.activeLook = look;
        r.empty = false;
        return h;
      };
      r.hideHead = () => {
        heads.forEach((h) => {
          h.group.visible = false;
          if (h.beam) h.beam.visible = false;
          if (h.spin) h.spin.rotation.x = 0;
        });
        r.activeHead = null;
        r.activeLook = null;
        r.empty = false;
        toolSets.forEach((t, n) => (t.group.visible = n === r.activeTool));
      };
      /** The tool that waits on the tool stand. */
      r.parked = () => (toolSets.length > 1 ? toolSets[r.activeTool === 0 ? 1 : 0] : null);
      r.setTool(startTool);
      return r;
    }

    function disposeRobot() {
      if (!robot) return;
      disposeGroup(robot.root);
      robot = null;
    }

    /** Put the robot's base where its track, cart, AMR or lift has carried it; the moving carriage follows. */
    function placeBase() {
      if (!robot || robot.cartesian) return;
      robot.root.position.set(X + robot.travel, BASE_Y + robot.lift, bz);
      if (mover) mover.position.set(robot.travel, robot.lift, 0);
      if (chainUpper) {
        const a = chainUpper.userData.fixedX, b = X + robot.travel;
        chainUpper.scale.x = Math.max(0.05, Math.abs(b - a));
        chainUpper.position.x = (a + b) / 2;
      }
    }

    function applyJoints(q) {
      if (robot.cartesian) {
        // Gantry: [bridge x along the rails, flange height, carriage z across the bridge].
        const g = robot.gantry;
        g.bridge.position.x = X + q[0];
        g.mast.position.y = q[1] - GANTRY_H;
        g.carriage.position.z = q[2];
        robot.q = q.slice();
        return;
      }
      const [j1, j2, j3, j4, j5, j6] = robot.joints;
      j1.rotation.y = q[0];
      j2.rotation.z = q[1];
      j3.rotation.z = q[2];
      j4.rotation.x = q[3];
      j5.rotation.z = q[4];
      j6.rotation.x = q[5];
      robot.q = q.slice();
    }

    /** Gantry: the flange sits TOOL_LEN above the target, anywhere under the frame. */
    function gantryIK(P) {
      const x = P.x - X, y = P.y + TOOL_LEN, z = P.z;
      const lo = -GANTRY_X + 0.15, hi = L + GANTRY_X - 0.15;
      const reachable = x >= lo && x <= hi && Math.abs(z) <= 1.45 && y <= GANTRY_H - 0.2 && y >= TOOL_LEN;
      return { q: [clamp(x, lo, hi), clamp(y, TOOL_LEN, GANTRY_H - 0.2), clamp(z, -1.45, 1.45), 0, 0, 0], reachable };
    }

    /**
     * Joint angles that put the tool centre point at P, tool pointing down, from a base at `at` (default: where
     * the robot is now). An inverted robot works in its own upside-down frame: its tool points "up" there.
     */
    function solveIK(P, at) {
      if (robot.cartesian) return gantryIK(P);
      const d = robot.dims;
      const bx = at ? at.x : X + robot.travel, by = at ? at.y : BASE_Y + robot.lift;
      const ly = inverted ? by - P.y : P.y - by;
      const Wx = P.x - bx, Wy = ly + (inverted ? -d.dTool : d.dTool), Wz = inverted ? -(P.z - bz) : P.z - bz;
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
      const q5 = (inverted ? Math.PI / 2 : -Math.PI / 2) - beta;
      // J6 turns with J1 so the tool stays square to the line (fingers close across the product's depth).
      return { q: [q1, q2, q3, 0, q5, inverted ? -q1 : q1], reachable };
    }

    const tipWorld = () => robot.tip.getWorldPosition(new THREE.Vector3());

    const fingerZ = (open) => (open ? robot.fingerOpen : gripHalf() + 0.009);
    function setFingers(open) {
      if (!robot.fingers.length) return;
      const z = fingerZ(open);
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

    /** Seconds to ride `m` metres on this cell's track, cart or AMR (accelerate, cruise, brake). */
    const rideTime = (m) => {
      const [v, a] = { track: [1.6, 1.5], overhead: [1.6, 1.5], amr: [1, 0.6], rgv: [2, 1] }[motionType] || [1.5, 1.5];
      return m <= 1e-3 ? 0 : m >= (v * v) / a ? m / v + v / a : 2 * Math.sqrt(m / a);
    };
    /** A gantry lifts clear of the machines, travels, then lowers: the share of a move spent on each. */
    function gantryLegs(q0, q1) {
      const far = Math.abs(q1[0] - q0[0]) + Math.abs(q1[2] - q0[2]) > 0.3;
      const up = Math.max(q0[1], q1[1], far ? GANTRY_H - 0.45 : 0);
      return { up, a: (up - q0[1]) / 1.2, b: Math.hypot(q1[0] - q0[0], q1[2] - q0[2]) / 2.2, c: (up - q1[1]) / 1.2 };
    }
    function gantryAt(q0, q1, legs, k) {
      const T = legs.a + legs.b + legs.c || 1;
      const t = k * T;
      const mix = (u) => [q0[0] + (q1[0] - q0[0]) * u, 0, q0[2] + (q1[2] - q0[2]) * u];
      if (t <= legs.a) return [q0[0], q0[1] + (legs.up - q0[1]) * (legs.a ? t / legs.a : 1), q0[2], 0, 0, 0];
      if (t <= legs.a + legs.b) {
        const [x, , z] = mix(legs.b ? (t - legs.a) / legs.b : 1);
        return [x, legs.up, z, 0, 0, 0];
      }
      return [q1[0], legs.up + (q1[1] - legs.up) * (legs.c ? (t - legs.a - legs.b) / legs.c : 1), q1[2], 0, 0, 0];
    }

    function jointMove(getPoint, station) {
      let q0, q1, dur, legs, tr0, tr1, lf0, lf1, t = 0;
      return {
        init() {
          const P = getPoint();
          // A travelling robot first rides to the stop of the station it is going to; a lift rises with the work.
          tr0 = robot.travel;
          lf0 = robot.lift;
          tr1 = moving && !cartesian ? (station ? stopOf(station) : tr0) : 0;
          lf1 = liftFor(P.y);
          const sol = solveIK(P, { x: X + tr1, y: BASE_Y + lf1 });
          if (!sol.reachable && station) unreachable.add(station);
          q0 = robot.q.slice();
          q1 = sol.q;
          if (robot.cartesian) {
            legs = gantryLegs(q0, q1);
            dur = Math.max(0.5, legs.a + legs.b + legs.c);
            return;
          }
          q1[0] = q0[0] + wrapPi(q1[0] - q0[0]);
          q1[5] = q0[5] + wrapPi((inverted ? -q1[0] : q1[0]) - q0[5]);
          const maxDelta = Math.max(...q1.map((v, i) => Math.abs(v - q0[i])));
          dur = Math.max(0.55, maxDelta / 1.5, rideTime(Math.abs(tr1 - tr0)), Math.abs(lf1 - lf0) / 0.3);
        },
        update(dt) {
          t += dt;
          const k = smooth(clamp(t / dur, 0, 1));
          if (robot.cartesian) applyJoints(gantryAt(q0, q1, legs, k));
          else {
            robot.travel = tr0 + (tr1 - tr0) * k;
            robot.lift = lf0 + (lf1 - lf0) * k;
            placeBase();
            applyJoints(q0.map((v, i) => v + (q1[i] - v) * k));
          }
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
          from = robot.fingers.length ? robot.fingers[1].position.z : 0;
        },
        update(dt) {
          t += dt;
          if (robot.fingers.length) {
            const to = fingerZ(open);
            const z = from + (to - from) * smooth(clamp(t / dur, 0, 1));
            robot.fingers[0].position.z = -z;
            robot.fingers[1].position.z = z;
          }
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

    function doorMove(open, key = "cnc") {
      const c = stations[key];
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

    /** The tool on the arm: "tool:<i>" (gripper or chosen tool), "head:<look>" (torch, gun, spindle…), null when empty. */
    const onArm = () => (!robot || robot.empty ? null : robot.activeLook ? `head:${robot.activeLook}` : `tool:${robot.activeTool}`);
    const toolLabel = (key) => {
      if (!key) return "nothing";
      if (key.startsWith("head:")) return TOOL_LOOK_NAMES[key.slice(5)] || key.slice(5);
      const t = robot.toolSets[+key.slice(5)];
      return (t && (TOOL_LOOK_NAMES[t.look] || t.look || t.kind)) || "gripper";
    };
    /** A copy of a tool to hang in the stand. */
    function makeTool(key) {
      if (key.startsWith("head:")) return makeEoat("head", key.slice(5));
      const t = robot.toolSets[+key.slice(5)];
      return t && t.kind !== "none" ? makeEoat(t.kind, t.look) : null;
    }
    const mountTool = (key) => {
      if (key.startsWith("head:")) robot.showHead(key.slice(5));
      else {
        robot.setTool(+key.slice(5));
        setFingers(true);
      }
    };
    /** The stand shows every tool that is not on the arm. */
    function syncRack() {
      const rk = stations.rack;
      if (!rk || !robot) return;
      const on = onArm();
      // A robot that carries its own torch, spindle or nozzle does not fetch a second one from the stand.
      const ownHead = robot.toolSets.some((t) => PROCESS_TOOLS.includes(t.kind));
      for (const n of rk.nests) {
        if (n.key === on || (ownHead && n.key.startsWith("head:"))) rk.take(n.key);
        else if (!rk.holds(n.key)) rk.park(n.key, makeTool(n.key));
      }
    }
    /**
     * Change tools at the stand: lower the tool on the arm into its nest, unlock, lift away empty, move over
     * the other nest, lower onto that tool, lock, and lift it out. False when there is nothing to change.
     */
    function changeTool(out, key) {
      const rk = stations.rack;
      const from = onArm();
      if (!rk || !from || from === key || !rk.has(key) || !rk.has(from)) return false;
      out.push(jointMove(() => above(rk.dock(from)), "rack"));
      out.push(linearMove(() => rk.dock(from), "rack", 0.2));
      out.push(
        dwell(
          0.45,
          () => robot.setLock(false),
          () => {
            rk.park(from, makeTool(from));
            robot.clearTool();
            log(`Tool change: ${toolLabel(from)} parked in the stand`);
          }
        )
      );
      out.push(linearMove(() => above(rk.dock(from)), "rack", 0.3));
      out.push(linearMove(() => above(rk.dock(key)), "rack", 0.45));
      out.push(linearMove(() => rk.dock(key), "rack", 0.2));
      out.push(
        dwell(
          0.45,
          () => {
            rk.take(key);
            mountTool(key);
          },
          () => {
            robot.setLock(true);
            log(`Tool change: ${toolLabel(key)} locked on`);
          }
        )
      );
      out.push(linearMove(() => above(rk.dock(key)), "rack", 0.3));
      return true;
    }
    /** Where the tool centre point goes to hold a part centred at p: its top face for vacuum, magnet and claw tools. */
    const grab = (p) => (TOP_GRIP.has(robot.eoat) ? p.clone().add(new THREE.Vector3(0, PART.h / 2, 0)) : p);

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
      if (s.slots) return s.slots[s.parts.length % s.slots.length];
      return s.point;
    }

    const isBelt = (s) => s === "conveyor" || s === "in";
    /** The kind of a station key: "cnc_2" (the far end of a track) is a CNC machine. */
    const kindOf = (k) => String(k || "").replace(/_\d+$/, "");

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
          // A torch or gun still on the arm goes back to the stand; the gripper comes on.
          if (stations.rack && robot.activeLook) changeTool(out, `tool:${robot.activeTool}`);
          if (isBelt(s)) {
            const belt = stations[s];
            out.push(jointMove(() => above(grab(belt.point)), s));
            out.push(waitUntil(() => belt.ready()));
            out.push(linearMove(() => grab(belt.point), s, 0.3));
            out.push(
              gripper(false, () => {
                const it = belt.take();
                if (it) attach(it.mesh);
              })
            );
            out.push(linearMove(() => above(grab(belt.point)), s, 0.35));
          } else {
            const P = stationPoint(s);
            const isCnc = kindOf(s) === "cnc";
            if (isCnc) out.push(doorMove(true, s));
            out.push(jointMove(() => above(grab(P)), s));
            out.push(linearMove(() => grab(P), s, 0.3));
            out.push(
              gripper(false, () => {
                const st = stations[s];
                let part = st.part;
                if (st.slots) part = st.parts.pop();
                if (!part) part = spawnPart(P);
                st.part = null;
                attach(part);
              })
            );
            out.push(linearMove(() => above(grab(P)), s, 0.35));
            if (isCnc) out.push(doorMove(false, s));
          }
          break;
        }
        case "place": {
          if (s === "out") {
            const belt = stations.out;
            out.push(jointMove(() => above(grab(belt.startPoint)), s));
            out.push(waitUntil(() => belt.canAccept()));
            out.push(linearMove(() => grab(belt.startPoint), s, 0.3));
            out.push(
              gripper(true, () => {
                const part = release(belt.startPoint);
                if (part) belt.push(part);
              })
            );
            out.push(linearMove(() => above(grab(belt.startPoint)), s, 0.35));
            break;
          }
          let P;
          const getP = () => (P = P || stationPoint(kindOf(s) === "vision" ? s.replace("vision", "table") : s).clone());
          const isCnc = kindOf(s) === "cnc";
          if (isCnc) out.push(doorMove(true, s));
          out.push(jointMove(() => above(grab(getP())), s));
          out.push(linearMove(() => grab(getP()), s, 0.3));
          out.push(
            gripper(true, () => {
              const part = release(getP());
              if (!part) {
                log(`Nothing to place for "${step.label}"`);
                return;
              }
              if (kindOf(s) === "pallet") {
                const pal = stations[s];
                pal.parts.push(part);
                if (pal.parts.length >= pal.slots.length) {
                  log("Pallet full, swapped for an empty one");
                  pal.parts.forEach(removePart);
                  pal.parts = [];
                }
              } else if (kindOf(s) === "carton") {
                const ct = stations[s];
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
          out.push(linearMove(() => above(grab(getP())), s, 0.35));
          if (isCnc) out.push(doorMove(false, s));
          break;
        }
        case "process": {
          // Press, moulding machine, test station and laser marker run their own cycle.
          if (stations[s] && stations[s].process) {
            out.push(stations[s].process());
            break;
          }
          const c = stations[s];
          out.push(
            dwell(
              2.4,
              () => c.beacon.material.emissive.setHex(0x2a8a3a),
              () => {
                c.beacon.material.emissive.setHex(0x000000);
                if (c.part) {
                  kit.reveal(c.part, "process");
                  kit.setState(c.part, "machined");
                }
              },
              (k) => c.beacon.material.emissive.setHex(Math.floor(k * 10) % 2 ? 0x2a8a3a : 0x0a3014)
            )
          );
          break;
        }
        case "inspect": {
          const v = stations[s] || stations.vision;
          out.push(jointMove(() => v.point, s));
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
          const w = stations[s];
          const seamY = w.topY + PART.h + 0.005;
          const half = clamp(PART.w * 0.35, 0.04, 0.18);
          const A = w.point.clone().setY(seamY).add(new THREE.Vector3(-half, 0, 0));
          const B = w.point.clone().setY(seamY).add(new THREE.Vector3(half, 0, 0));
          const look = processLook(step, s);
          const fx = HEAD_FX[look];
          let head = null;
          // With a tool stand the robot fetches the torch and keeps it on until the gripper is needed again.
          const viaStand = !PROCESS_TOOLS.includes(robot.eoat) && !!stations.rack && stations.rack.has(`head:${look}`);
          if (viaStand) changeTool(out, `head:${look}`);
          out.push(
            dwell(0.01, () => {
              if (!w.part) w.part = spawnPart(w.point);
              head = putOnTool(look);
            })
          );
          out.push(jointMove(() => above(A), s));
          if (look === "spotgun" || look === "studgun" || look === "iron" || look === "sonotrode") {
            // Spot welds, studs, solder joints and ultrasonic welds: one point at a time.
            const lift = new THREE.Vector3(0, 0.03, 0);
            for (let i = 0; i < 4; i++) {
              const P = A.clone().lerp(B, i / 3);
              out.push(linearMove(() => P.clone().add(lift), s, 0.3));
              out.push(linearMove(() => P, s, 0.15));
              out.push(dwell(0.35, () => fxOn(fx, head), () => fxOff(head), (k) => fx && k < 0.6 && emitSparks(P, fx.spread)));
              out.push(linearMove(() => P.clone().add(lift), s, 0.2));
            }
          } else {
            out.push(linearMove(() => A, s, 0.3));
            out.push(dwell(0.01, () => fxOn(fx, head)));
            out.push(linearMove(() => B, s, look === "fsw" ? 0.03 : 0.05, (P) => fx && emitSparks(P, fx.spread)));
          }
          out.push(
            dwell(0.01, () => {
              fxOff(head);
              if (w.part) addWeldMark(w.part);
            })
          );
          out.push(linearMove(() => above(B), s, 0.35));
          if (!viaStand) out.push(dwell(0.01, takeOffTool));
          break;
        }
        case "scan": {
          // The 3D camera over the bin finds the next part to pick.
          const bn = stations[s] || stations.bin;
          out.push(
            dwell(
              0.9,
              () => bn && (bn.cone.material.opacity = 0.2),
              () => bn && (bn.cone.material.opacity = 0),
              (k) => bn && (bn.cone.material.opacity = 0.12 + 0.08 * Math.sin(k * Math.PI * 4))
            )
          );
          break;
        }
        case "toolchange": {
          // Tool changer: park the current tool in its nest on the stand and lock the other one on.
          const tgt = step.tool || 0;
          if (changeTool(out, `tool:${tgt}`)) break;
          // No stand (or the tool is already on): the swap happens where the robot stands.
          out.push(
            dwell(0.9, null, () => {
              robot.setTool(tgt);
              setFingers(true);
              syncRack();
              log(`Tool change: ${toolLabel(`tool:${tgt}`)} on`);
            })
          );
          break;
        }
        case "manual": {
          // The operator takes the finished part off the fixture and loads a new one.
          const w = stations[s];
          out.push(
            dwell(
              1.6,
              () => {
                if (w && w.part) {
                  removePart(w.part);
                  w.part = null;
                }
              },
              () => {
                if (w) w.part = spawnPart(w.point);
              }
            )
          );
          break;
        }
        case "idle":
          out.push(dwell(1.5));
          break;
        default:
          if (TOOL_ACTIONS[step.action]) out.push(...toolSegments(step));
          else out.push(dwell(1));
      }
      return out;
    }

    /** The process tool a step uses: the tool on the arm when it is one, else the head the job really uses. */
    const processLook = (step, action) => (PROCESS_TOOLS.includes(robot.eoat) ? robot.toolSets[robot.activeTool].look : headFor(step.text || step.label, action));
    /** Put the step's tool on (the gripper goes to the stand) unless the arm already carries it. */
    const putOnTool = (look) => (PROCESS_TOOLS.includes(robot.eoat) ? robot.toolSets[robot.activeTool] : robot.showHead(look));
    const takeOffTool = () => robot.activeHead && robot.hideHead();
    function fxOn(fx, head) {
      if (!fx) return;
      sparks.material.color.setHex(fx.color != null ? fx.color : kit.coatColor.getHex());
      sparks.material.size = fx.mist ? 0.018 : 0.025;
      sparks.visible = true;
      if (fx.beam && head && head.beam) head.beam.visible = true;
    }
    function fxOff(head) {
      sparks.visible = false;
      if (head && head.beam) head.beam.visible = false;
    }

    /* Tool operations on the part resting on the work table, with the tool the job really uses. */
    function toolSegments(step) {
      const ws = stations[step.station] ? step.station : "table";
      const w = stations[ws];
      const a = step.action;
      const top = () => new THREE.Vector3(w.point.x, w.topY + PART.h + 0.006, w.point.z);
      // Passes cover the product's own top face.
      const sx = clamp(PART.w * 0.4, 0.025, 0.24), sz = clamp(PART.d * 0.35, 0.015, 0.15);
      const at = (fx, fz, dy = 0) => () => top().add(new THREE.Vector3(fx * sx, dy, fz * sz));
      const out = [];
      const look = processLook(step, a);
      const fx = HEAD_FX[look] || null;
      let head = null;
      const spin = (k, turns) => head && head.spin && (head.spin.rotation.x = k * Math.PI * 2 * turns);
      const pass = (z, vel, onFrame) => {
        out.push(linearMove(at(-1, z, 0.004), ws, 0.3));
        out.push(dwell(0.01, () => fxOn(fx, head)));
        out.push(linearMove(at(1, z, 0.004), ws, vel, onFrame));
        out.push(dwell(0.01, () => fxOff(head)));
      };
      const finishWith = (fn) => out.push(dwell(0.05, null, () => w.part && fn(w.part)));

      // With a tool stand the robot fetches the gun, spindle or nozzle and keeps it on until the gripper is needed.
      const viaStand = !!look && !PROCESS_TOOLS.includes(robot.eoat) && !!stations.rack && stations.rack.has(`head:${look}`);
      if (viaStand) changeTool(out, `head:${look}`);
      out.push(
        dwell(0.25, () => {
          if (!w.part) w.part = spawnPart(w.point);
          head = putOnTool(look);
        })
      );
      out.push(jointMove(() => above(top()), ws));

      if (a === "apply") {
        // A dispensing valve lays a bead; a spray gun coats the whole face.
        const bead = look === "nozzle" && !kit.hasStage("apply");
        let n = 0;
        const beadGeo = new THREE.BoxGeometry(0.012, 0.004, 0.012);
        for (const dz of [-1, 0, 1]) {
          pass(dz, look === "nozzle" ? 0.06 : 0.12, (P) => {
            if (fx) emitSparks(P, fx.spread);
            if (bead && n++ % 3 === 0 && w.part) addOn(w.part, beadGeo, 0x1f6fd1, w.part.worldToLocal(new THREE.Vector3(P.x, top().y - 0.004, P.z)));
          });
        }
        finishWith((p) => kit.reveal(p, "apply") || bead || kit.setState(p, "coated"));
      } else if (a === "finish") {
        if (look === "drill") {
          for (const [fx0, fz0] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
            out.push(linearMove(at(fx0, fz0, 0.03), ws, 0.3));
            out.push(dwell(0.01, () => fxOn(fx, head)));
            out.push(linearMove(at(fx0, fz0, -0.004), ws, 0.05, (P, k) => (spin(k, 6), emitSparks(P, fx.spread))));
            out.push(dwell(0.01, () => fxOff(head)));
            out.push(linearMove(at(fx0, fz0, 0.03), ws, 0.2));
          }
        } else if (look === "blade") {
          for (const dz of [-0.2, 0.2]) pass(dz, 0.07);
        } else {
          for (const dz of [-0.8, 0.25, 0.8, -0.25]) pass(dz, look === "polisher" || look === "brush" ? 0.12 : 0.09, (P, k) => (spin(k, 6), fx && emitSparks(P, fx.spread)));
        }
        finishWith((p) => kit.reveal(p, "finish") || kit.reveal(p, "process") || kit.setState(p, look === "polisher" ? "polished" : "machined"));
      } else if (a === "assemble") {
        const pts = [[-0.7, -0.7], [0.7, -0.7], [0, 0.7], [0.7, 0.7]];
        const screwGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.012, 12);
        if (look) {
          // Screws, rivets, nails or ties, one at a time.
          for (const [dx, dz] of pts) {
            out.push(linearMove(at(dx, dz, 0.05), ws, 0.3));
            out.push(linearMove(at(dx, dz), ws, 0.15));
            out.push(dwell(look === "driver" ? 0.55 : 0.3, null, null, (k) => spin(k, 4)));
            out.push(linearMove(at(dx, dz, 0.05), ws, 0.2));
          }
          finishWith((p) => kit.reveal(p, "assemble") || pts.forEach(([dx, dz]) => addOn(p, screwGeo, 0x475569, new THREE.Vector3(dx * sx, PART.h / 2 + 0.006, dz * sz), { metalness: 0.8 })));
        } else {
          // The gripper places the components.
          for (const [dx, dz] of pts.slice(0, 2)) {
            out.push(linearMove(at(dx, dz, 0.06), ws, 0.3));
            out.push(linearMove(at(dx, dz, 0.012), ws, 0.12));
            out.push(gripper(true));
            out.push(gripper(false));
            out.push(linearMove(at(dx, dz, 0.06), ws, 0.2));
          }
          out.push(gripper(true));
          finishWith((p) => kit.reveal(p, "assemble") || addOn(p, new THREE.BoxGeometry(PART.w * 0.5, 0.012, PART.d * 0.4), 0x334155, new THREE.Vector3(0, PART.h / 2 + 0.006, 0)));
        }
      } else if (a === "fill") {
        out.push(linearMove(at(0, 0, 0.06), ws, 0.2));
        stream.material.color.set(kit.liquid);
        out.push(
          dwell(
            1.6,
            () => (stream.visible = true),
            () => {
              stream.visible = false;
              if (w.part && !kit.reveal(w.part, "fill"))
                addOn(w.part, new THREE.BoxGeometry(PART.w * 0.8, 0.006, PART.d * 0.8), 0x38bdf8, new THREE.Vector3(0, PART.h / 2 + 0.003, 0), {
                  transparent: true,
                  opacity: 0.85,
                  roughness: 0.1,
                });
            },
            () => {
              const from = tipWorld();
              const to = top();
              const len = Math.max(0.01, from.y - to.y + 0.04);
              stream.scale.set(1, len, 1);
              stream.position.set(to.x, to.y - 0.04 + len / 2, to.z);
            }
          )
        );
      } else if (a === "cap") {
        out.push(linearMove(at(0, 0, 0.012), ws, 0.12));
        out.push(
          dwell(
            0.7,
            null,
            () => {
              if (w.part && !kit.reveal(w.part, "cap")) addOn(w.part, new THREE.CylinderGeometry(Math.min(0.032, PART.w * 0.3), Math.min(0.032, PART.w * 0.3), 0.02, 24), 0xc026d3, new THREE.Vector3(0, PART.h / 2 + 0.01, 0));
            },
            (k) => spin(k, 3)
          )
        );
      } else if (a === "label") {
        if (look === "laser") out.push(dwell(0.01, () => fxOn(fx, head)));
        out.push(linearMove(at(-0.8, 0), ws, 0.2));
        out.push(linearMove(at(0.8, 0), ws, 0.08, (P) => look === "laser" && emitSparks(P, fx.spread)));
        out.push(
          dwell(0.2, null, () => {
            fxOff(head);
            if (!w.part || kit.reveal(w.part, look === "laser" ? "mark" : "label") || kit.reveal(w.part, "label")) return;
            addOn(w.part, new THREE.BoxGeometry(Math.min(0.075, PART.w * 0.75), 0.003, Math.min(0.055, PART.d * 0.6)), 0xffffff, new THREE.Vector3(0, PART.h / 2 + 0.002, 0));
            addOn(w.part, new THREE.BoxGeometry(Math.min(0.075, PART.w * 0.75), 0.0035, 0.012), 0x84cc16, new THREE.Vector3(0, PART.h / 2 + 0.0025, -Math.min(0.018, PART.d * 0.2)));
          })
        );
      } else {
        for (const [dx, dz] of [
          [-0.7, 0],
          [0, 0.7],
          [0.7, 0],
          [0, -0.7],
        ]) {
          out.push(linearMove(at(dx, dz, 0.01), ws, 0.12, (P, k) => spin(k, 2)));
        }
        finishWith((p) => kit.reveal(p, "process") || kit.setState(p, "machined"));
      }

      out.push(linearMove(() => above(top()), ws, 0.35));
      out.push(
        dwell(0.2, null, () => {
          fxOff(head);
          if (!viaStand) takeOffTool();
          if (!look) setFingers(true);
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
      for (const [k, st] of Object.entries(stations)) {
        if (!st || isBelt(k) || k === "out") continue;
        if ("part" in st) st.part = null;
        if (st.parts) st.parts = [];
        if (st.lid) {
          st.lid.visible = false;
          st.tape.visible = false;
          st.closeT = 0;
        }
        if (st.door) {
          st.door.position.y = st.doorY;
          st.beacon.material.emissive.setHex(0x000000);
        }
        if (st.cone) st.cone.material.opacity = 0;
      }
      stream.visible = false;
      sparks.visible = false;
      if (robot) {
        // Back to the start: the first tool on the arm and locked, the rest in the stand.
        robot.setTool(startTool);
        robot.hideHead();
        robot.setLock(true);
        if (stations.rack) {
          stations.rack.clear();
          syncRack();
        }
      }
    }

    let paintIndustrial = true;
    /** Equipment the user chose for this cell: { scale, paint:[body,trim], label, eoat } or null. */
    let model = null;
    let lastScale = 1;
    const cell = {
      title,
      steps,
      stations,
      /** Each station of the cell with its name, for the layout check. */
      layoutParts() {
        return groups
          .filter((g) => !g.userData.skipLayout)
          .map((g) => {
            let what = "";
            g.traverse((o) => !what && o.isSprite && o.userData.text && (what = o.userData.text));
            return { what: what || "Station", box: meshBox(g) };
          })
          .filter((p) => !p.box.isEmpty());
      },
      /** Floor this cell's stations, track and robot base take, for placing its other equipment. */
      occupied() {
        const out = [];
        for (const g of groups) {
          if (g === zoneGroup) continue;
          const b = meshBox(g);
          if (!b.isEmpty()) out.push(b);
        }
        if (!cartesian && !inverted) out.push(new THREE.Box3(new THREE.Vector3(X - 0.45, 0, bz - 0.45), new THREE.Vector3(X + L + 0.45, 1, bz + 0.45)));
        return out;
      },
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
      setPaint(industrial) {
        paintIndustrial = industrial;
        if (!robot) return;
        const [body, trimC] = model && model.paint ? model.paint : industrial ? [0xf2b705, 0x1f2937] : [0xeef1f5, 0x2f7de1];
        robot.paint.color.set(body);
        robot.trim.color.set(trimC);
        // Light paint is satin, not lacquer: a glossy white coat flares in the hall lights.
        const light = robot.paint.color.getHSL({ h: 0, s: 0, l: 0 }).l > 0.7;
        if ("clearcoat" in robot.paint) robot.paint.clearcoat = light ? 0.25 : 0.7;
        robot.paint.roughness = light ? 0.42 : 0.32;
      },
      buildRobot(scale) {
        lastScale = scale;
        disposeRobot();
        robot = buildRobot(scale);
        cell.setPaint(paintIndustrial);
        if (stations.rack) {
          stations.rack.clear();
          syncRack();
        }
      },
      setModel(m) {
        model = m;
        cell.buildRobot(lastScale);
        cell.fitZone();
      },
      /** Red ring: this robot can reach another robot's equipment or space. */
      alertZone(on) {
        if (zoneLine) zoneLine.material.color.setHex(on ? 0xef4444 : 0xf2b705);
      },
      /** The dashed ring shows the chosen robot's reach; in build mode it appears with the robot. */
      fitZone() {
        if (!zoneGroup) return;
        const has = !!(model && model.hasRobot);
        zoneGroup.visible = !buildMode || has;
        const r = has && model.reachM ? model.reachM + 0.2 : 2.05;
        if (zoneLine) zoneLine.scale.set(r / 2.05, 1, r / 2.05);
      },
      get model() {
        return model;
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
        robot.travel = 0;
        robot.lift = 0;
        placeBase();
        applyJoints(solveIK(HOME).q);
        setFingers(true);
      },
      update(dt) {
        updateSparks(dt);
        // Build mode: a cell runs only once the user has put a robot on it.
        if (buildMode && !(model && model.hasRobot)) return;
        for (const ct of Object.values(stations)) {
          if (!ct || !ct.lid || !(ct.closeT > 0)) continue;
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
      /** How this robot travels, how far, and where it is now (m along the track, up the lift, or gantry X). */
      get motion() {
        const at = !robot ? 0 : lifts ? robot.lift : robot.cartesian ? robot.q[0] : robot.travel;
        return { type: motionType, length: lifts ? liftMax : L, travel: +at.toFixed(3), min: cartesian ? -GANTRY_X + 0.15 : 0, max: lifts ? liftMax : cartesian ? L + GANTRY_X - 0.15 : L };
      },
      /** Move the robot along its track (or up its lift, or the gantry bridge) by hand, the arm riding along. */
      setTravel(m) {
        if (!robot || motionType === "fixed") return;
        seg = null;
        queue = [];
        if (robot.cartesian) {
          const q = robot.q.slice();
          q[0] = clamp(Number(m) || 0, -GANTRY_X + 0.15, L + GANTRY_X - 0.15);
          applyJoints(q);
          return;
        }
        if (lifts) robot.lift = clamp(Number(m) || 0, 0, liftMax);
        else robot.travel = clamp(Number(m) || 0, 0, L);
        placeBase();
      },
      setJoint(i, rad) {
        if (robot.cartesian) return;
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
          // From the stop the robot works that station from (either end of a track), lifted as far as it needs.
          const at = (p) => ({ x: X + stopOf(s.station), y: BASE_Y + liftFor(p.y) });
          for (const p of pts) {
            if (!solveIK(p, at(p)).reachable || !solveIK(above(p), at(above(p))).reachable) out.add(s.station);
          }
        }
        return [...out];
      },
      /** Where the robot base stands now (x along the line, z across it). */
      get base() {
        return { x: X, z: bz };
      },
      /** Only a robot on a fixed base can be picked up and moved; a track, lift or gantry moves with its rails. */
      get movable() {
        return motionType === "fixed" && !cartesian;
      },
      setBase(dx, dz) {
        if (motionType !== "fixed") return;
        const ddx = baseX0 + (Number(dx) || 0) - X, ddz = (Number(dz) || 0) - bz;
        if (!ddx && !ddz) return;
        X += ddx;
        bz += ddz;
        HOME.x += ddx;
        HOME.z += ddz;
        if (zoneGroup) {
          zoneGroup.position.x += ddx;
          zoneGroup.position.z += ddz;
        }
        placeBase();
      },
      /** Shoulder, elbow, wrist and tool tip in world space (clearance watch); null without an arm. */
      armPoints(out) {
        if (!robot || robot.cartesian || !robot.root.visible) return null;
        const j = robot.joints;
        robot.root.updateWorldMatrix(true, true);
        [j[1], j[2], j[4], robot.tip].forEach((o, k) => (out[k] || (out[k] = new THREE.Vector3())).setFromMatrixPosition(o.matrixWorld));
        return out;
      },
      get armScale() {
        return robot && robot.dims ? robot.dims.L2 / 0.7 : 1;
      },
      stationInfos() {
        return [...new Set(stationInfo.values())];
      },
      /** Slide (and for tables and pallets turn) a station: its meshes, every target point and the parts on it. */
      setStation(key, e) {
        const info = stationInfo.get(key);
        if (!info) return null;
        const next = { dx: Number(e && e.dx) || 0, dz: Number(e && e.dz) || 0, rot: info.canRotate ? ((Math.round(Number(e && e.rot) || 0) % 4) + 4) % 4 : 0 };
        const cur = info.state;
        if (cur.dx === next.dx && cur.dz === next.dz && cur.rot === next.rot) return null;
        const D = stationMatrix(next, info.pivot).multiply(stationMatrix(cur, info.pivot).invert());
        info.group.applyMatrix4(D);
        const seen = new Set();
        const moveV = (v) => {
          if (v && v.isVector3 && !seen.has(v)) {
            seen.add(v);
            v.applyMatrix4(D);
          }
        };
        const moveO = (o) => o && o.isObject3D && o.parent === scene && parts.has(o) && o.position.applyMatrix4(D);
        for (const k of info.keys) {
          const st = stations[k];
          if (!st) continue;
          for (const [name, v] of Object.entries(st)) {
            if (name === "nests" || name === "group") continue;
            if (v && v.isVector3) moveV(v);
            else if (Array.isArray(v)) v.forEach((x) => (x && x.isVector3 ? moveV(x) : moveO(x)));
            else if (name === "part") moveO(v);
          }
        }
        info.state = next;
        return D;
      },
      dispose() {
        disposeRobot();
        groups.forEach((g) => {
          disposeGroup(g);
        });
      },
    };
    groups.forEach((g) => { if (g.isGroup && g !== zoneGroup && g !== mover) { g.userData.solid = solidBoxes(g); ground(g); bakeStatic(g); } });
    // Move mode: each station's group, the station keys it carries and the fixed point it turns round.
    const stationInfo = new Map();
    {
      const claimed = new Map();
      for (const [k, st] of Object.entries(stations)) {
        if (!st || isBelt(k) || k === "out" || k === "infeed") continue;
        let g = st.group && groups.includes(st.group) ? st.group : null;
        const p = st.center || st.point || (st.slots && st.slots[0]);
        if (!g && p) {
          let best = Infinity;
          for (const cand of groups) {
            if (cand === zoneGroup || cand === mover || cand.userData.skipLayout) continue;
            const b = meshBox(cand);
            if (b.isEmpty() || b.max.x - b.min.x > 3 || p.x < b.min.x - 0.12 || p.x > b.max.x + 0.12 || p.z < b.min.z - 0.12 || p.z > b.max.z + 0.12) continue;
            const area = (b.max.x - b.min.x) * (b.max.z - b.min.z);
            if (area < best) {
              best = area;
              g = cand;
            }
          }
        }
        if (!g) continue;
        const had = claimed.get(g);
        if (had) {
          had.keys.push(k);
          stationInfo.set(k, had);
          continue;
        }
        const b = meshBox(g);
        let name = "";
        g.traverse((o) => !name && o.isSprite && o.userData.text && (name = String(o.userData.text).split(" · ")[0]));
        const c0 = st.center ? st.center.clone() : b.getCenter(new THREE.Vector3());
        const info = { key: k, keys: [k], group: g, name: name || STATION_NAMES[k.replace(/_2$/, "")] || "Station", pivot: new THREE.Vector3(c0.x, 0, c0.z), state: { dx: 0, dz: 0, rot: 0 }, canRotate: /^(table|pallet)/.test(k) };
        claimed.set(g, info);
        stationInfo.set(k, info);
        // The tool stand's nests are worked out from its own frame: follow the stand when it moves.
        if (typeof st.dock === "function") {
          const dock0 = st.dock;
          st.dock = (key) => {
            g.updateMatrix();
            return dock0(key).applyMatrix4(g.matrix);
          };
        }
      }
    }
    return cell;
  }

  let pendingModels = [], pendingPlan = null, dirtyLine = false, dirtyEquipment = false, dirtyFence = false;
  let builder = null, buildingLine = false, disposed = false, invalidated = true, rebuilds = 0;
  let compileToken = 0, compiling = false;
  function relayout() { dirtyLine = true; invalidated = true; onStatus?.("building"); delete container.dataset.sceneReady; }
  function placeEquipment() { dirtyEquipment = true; invalidated = true; }
  function placeFence() { dirtyFence = true; invalidated = true; }
  function fitShadow() {
    scene.updateMatrixWorld(true);
    const b=lineBounds(); if(b.isEmpty()) return;
    const center=b.getCenter(new THREE.Vector3());
    sun.target.position.copy(center); sun.position.copy(center).add(new THREE.Vector3(4,8,5));
    sun.updateMatrixWorld(); sun.target.updateMatrixWorld(); sun.shadow.updateMatrices(sun);
    const lightBox=b.clone().applyMatrix4(sun.shadow.camera.matrixWorldInverse);
    Object.assign(sun.shadow.camera,{left:lightBox.min.x-0.5,right:lightBox.max.x+0.5,bottom:lightBox.min.y-0.5,top:lightBox.max.y+0.5,near:0.1,far:30});
    sun.shadow.camera.updateProjectionMatrix();
  }
  function flushPending(sync = false) {
    if (disposed || buildingLine) return;
    buildingLine = true;
    try {
      if (dirtyLine || dirtyEquipment || dirtyFence) invalidated = true;
      if (dirtyLine) {
        if (builder) { builder.return(); builder=null; }
        dirtyLine = dirtyEquipment = dirtyFence = false;
        builder = buildLine(pendingPlan || lastPlan || {cells:[{steps:[]}]}, pendingModels.map((m)=>m?.scale));
        rebuilds++; compileToken++; compiling=false;
      }
      if (builder) {
        let result;
        do { result = builder.next(); } while(sync && !result.done);
        if (!result.done) return;
        builder=null; reset();
        dirtyEquipment=dirtyFence=false;
        const token=++compileToken;
        compiling=true;
        Promise.resolve(renderer.compileAsync ? renderer.compileAsync(scene,camera) : renderer.compile(scene,camera)).catch(()=>{}).finally(()=>{
          if (!disposed && token===compileToken) { compiling=false; invalidated=true; }
        });
      } else {
        if(dirtyEquipment) { dirtyEquipment=false; placeEquipmentNow(); dirtyFence=true; }
        if(dirtyFence) { dirtyFence=false; placeFenceNow(); fitShadow(); }
      }
    } finally { buildingLine=false; }
  }

  /* Plan / line construction */
  function disposeLine() {
    clearEquipment();
    clearFence();
    clearOverlay();
    cells.forEach((c) => c.dispose());
    conveyors.forEach((c) => {
      c.clear();
      c.dispose();
    });
    [...parts].forEach(removePart);
    if (propsGroup) disposeGroup(propsGroup);
    propsGroup = null;
    cells = [];
    conveyors = [];
  }

  /** What each step leaves on the product, so a new piece starts without it (a bottle is filled, then capped). */
  function lineStages(list) {
    const out = new Set();
    for (const c of list)
      for (const s of c.steps) {
        if (s.action === "process") out.add(s.station === "marker" ? "mark" : s.station === "test" ? "test" : "process");
        else if (s.action === "weld") out.add("weld");
        else if (s.action === "finish") out.add("finish").add("process");
        else if (s.action === "operate") out.add("process");
        else if (TOOL_ACTIONS[s.action]) out.add(s.action);
      }
    return out;
  }

  function* buildLine(plan, scales) {
    frozenSpots = new Map();
    onStatus?.("building");
    delete container.dataset.sceneReady;
    if (!building.parent) { buildHall(); yield; }
    disposeLine();
    lastPlan = plan;
    const list = (plan && plan.cells && plan.cells.length ? plan.cells : [{ steps: [] }]).map((c) => ({
      title: c.title,
      steps: (c.steps || []).map((s) => ({ ...s, label: s.label || stepLabel(s) })),
      stations: c.stations || [],
      startTool: c.startTool || 0,
      motion: c.motion || null,
    }));
    // Each robot's place on the line: a robot that travels takes its track's length of floor more.
    cellStart = [];
    cellEnd = [];
    // Free space between robots: each one's reach (and its track) clear of the next one's, by the spacing chosen.
    const reachOfCell = (k) => {
      const mt = list[k].motion ? list[k].motion.type : "fixed";
      return mt === "gantry" ? GANTRY_X + 0.3 : envelopeOf((scales && scales[k]) || ROBOT_SIZES[sizeKey].scale);
    };
    cellGaps = list.map((c, i) => (i < list.length - 1 ? gapBetween(reachOfCell(i), reachOfCell(i + 1)) : CELL_SPACING));
    let at = 0;
    list.forEach((c, i) => {
      cellStart[i] = at;
      cellEnd[i] = at + travelOf(c.motion);
      at = cellEnd[i] + cellGaps[i];
    });
    // The real product: named in the brief, else by the line's jobs ("Robot 1: Fruit & Vegetable Picking + Palletizing").
    const jobs = list.flatMap((c) => String(c.title || "").replace(/^Robot \d+:?\s*/, "").split(" + ")).filter(Boolean);
    const words = list.flatMap((c) => c.steps.map((s) => s.text || s.label));
    const pick = plan && plan.product && plan.product.key ? plan.product : productFor((plan && plan.brief) || (jobs.length ? "" : words.join(". ")), jobs.length ? jobs : words);
    const stages = lineStages(list);
    const old = kit;
    kit = createWorkpieces(THREE, pick, { stages: [...stages] });
    if (old) old.dispose();
    [PART.w, PART.h, PART.d] = kit.info.size;
    // Every tool the line uses: the gripper for the product, and the process tools its steps need.
    const tools = new Set([TOOL_LOOK_NAMES[kit.info.look] || kit.info.look]);
    for (const c of list)
      for (const s of c.steps) {
        const look = s.action === "weld" || TOOL_ACTIONS[s.action] ? headFor(s.text || s.label, s.action) : null;
        if (look) tools.add(TOOL_LOOK_NAMES[look] || look);
      }
    lineTools = [...tools];
    // The cell builder always uses the line layout, so one cell looks the same as the first of several.
    mode = buildMode || list.length > 1 || cellEnd[0] > 0 ? "line" : "single";
    const layout = LAYOUT[mode];
    const infeed = makeConveyor(layout.infeed[0], layout.infeed[1], STATION_NAMES.conveyor, true);
    conveyors.push(infeed);
    {
      // Where the raw product comes from, with its name and weight on a sign.
      const sup = kit.container(kit.info.supply, true);
      protect(sup.group, true);
      if (kit.info.supply === "crate") sup.group.traverse((o)=>{ if(o.material?.color) o.material.color.setHex(0x3a4555); });
      const z = BELT_Z - (Math.max(0.4, PART.d + 0.08) / 2 + 0.14 + sup.size[2] / 2);
      sup.group.position.set(infeed.fromX, 0, z);
      infeed.group.add(sup.group);
      const kg = kit.info.kg >= 1 ? `${+kit.info.kg.toFixed(1)} kg` : `${Math.round(kit.info.kg * 1000)} g`;
      const tag = makeLabel(`${kit.info.label} · ${kg}`, "#a7f3d0");
      tag.position.set(infeed.fromX, sup.size[1] + 0.3, z);
      infeed.group.add(tag);
    }
    const picks = (c, k) => c.steps.some((s) => s.station === k);
    const has = (c, k) => picks(c, k) || c.stations.includes(k);
    const transfers = [];
    const ownInfeed = [];
    for (let i = 0; i < list.length - 1; i++) {
      // Cell builder: the belt between two robots is a transfer only when the first robot has an
      // outfeed; otherwise it is the next robot's own infeed, if the user placed one.
      const passes = !buildMode || has(list[i], "out");
      const own = buildMode && !passes && has(list[i + 1], "conveyor");
      const t = makeConveyor(cellEnd[i] + 0.9, cellStart[i + 1] - 0.75, own ? STATION_NAMES.conveyor : `Transfer to Robot ${i + 2}`, false);
      if (buildMode) {
        t.group.visible = passes || own;
        // Parts the next robot does not take leave the line at the end of the belt.
        t.sink = passes && !picks(list[i + 1], "in");
        if (own) {
          t.autoSpawn = picks(list[i + 1], "conveyor");
          ownInfeed[i + 1] = t;
        }
      }
      conveyors.push(t);
      transfers.push(passes ? t : null);
    }
    // Cell builder: an outfeed conveyor after the last robot, when the user placed one.
    const last = list.length - 1;
    let outfeed = null;
    if (buildMode && has(list[last], "out")) {
      outfeed = makeConveyor(cellEnd[last] + 0.9, cellEnd[last] + 2.4, "Outfeed conveyor", false);
      outfeed.sink = true;
      conveyors.push(outfeed);
    }
    cells = [];
    for (let i=0; i<list.length; i++) {
      const c=list[i];
      const cell=createCell(
        i,
        cellStart[i],
        c.steps,
        list.length > 1 ? c.title || `Robot ${i + 1}` : c.title,
        {
          infeed: i === 0 ? infeed : ownInfeed[i] || null,
          in: transfers[i - 1] || null,
          out: transfers[i] || (i === last ? outfeed : null),
        },
        { stations: buildMode ? c.stations : [], startTool: c.startTool, motion: c.motion }
      );
      if (pendingModels[i]) cell.setModel(pendingModels[i]);
      else cell.buildRobot(ROBOT_SIZES[sizeKey].scale);
      cell.setPaint(industrialOf(i)); cell.fitZone();
      cells.push(cell);
      yield;
    }
    ownInfeed.forEach((t, i) => t && (t.owner = cells[i]));
    // Hide the infeed when the first robot never picks from it (the builder shows it once placed).
    const usesInfeed = cells[0].steps.some((s) => s.station === "conveyor");
    infeed.group.visible = usesInfeed || (buildMode && list[0].stations.includes("conveyor"));
    infeed.autoSpawn = usesInfeed;
    infeed.owner = cells[0];

    focus = Math.min(focus, cells.length - 1);

    const span = cellEnd[cells.length - 1];
    // Where the job happens, behind the line and outside the fence.
    const sc = kit.scenery(jobs.length ? jobs : words);
    if (sc) {
      propsGroup = sc.group;
      // Behind the cabinets and power sources that stand behind the fence.
      propsGroup.position.set(span / 2, 0, -4.6);
      protect(propsGroup, true);
      scene.add(propsGroup);
    }
    sun.position.set(span / 2 + 3.5, 6 + span * 0.3, 2.5);
    sun.target.position.set(span / 2, 0, 0);
    const ext = 4 + span / 2;
    Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: 4, bottom: -4, near: 0.5, far: 30 + span });
    sun.shadow.camera.updateProjectionMatrix();
    placeReference();
    placeEquipmentNow();
    // The user's moves of robots and stations, then the equipment again round where they now stand.
    if (applyCellEdits()) placeEquipmentNow();
    yield;
    placeFenceNow();
    fitShadow();
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
      labels.delete(o);
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
      if (o === floor || o === grid || o === building || o === refGroup || o === overlayGroup || o === propsGroup || o === equipOutside || o.isLight || o === sun.target || !o.visible || o.isSprite || o.userData.noBounds) continue;
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
      const before = i > 0 ? gapAfter(i - 1) / 2 : half;
      const after = i < cells.length - 1 ? gapAfter(i) / 2 : half;
      const x0 = cells.length > 1 ? (i === 0 ? Math.min(b.min.x - 0.25, cellStart[i] - before) : cellStart[i] - before) : b.min.x - 0.25;
      const x1 = cells.length > 1 ? (i === cells.length - 1 ? Math.max(b.max.x + 0.25, cellEnd[i] + after) : cellEnd[i] + after) : b.max.x + 0.25;
      g.add(floorRect(x0 + 0.04, z0, x1 - 0.04, z1, ZONE_COLORS[i % ZONE_COLORS.length], 0.12));
      // Short label; the full task list is already on the robot's own title.
      const name = c.title ? String(c.title).split(":")[0] : `Robot ${i + 1}`;
      const lbl = bigLabel(`Zone ${String(i + 1).padStart(2, "0")} · ${name}`, "#f8fafc");
      lbl.position.set((x0 + x1) / 2, 0.25, z1 - 0.35);
      g.add(lbl);
    });
    const xa = Math.min(b.min.x - 0.25, -half), xb = Math.max(b.max.x + 0.25, cellEnd[cells.length - 1] + half);
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
    const span = cellEnd[cells.length - 1];
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
    invalidated=true;
  }

  function updateOverlay(dt) {
    if (!flowCurve) return;
    flowTex.offset.x -= dt * 1.2;
    flowT = (flowT + dt * 0.035) % 1;
    flowTokens.forEach((t, k) => t.position.copy(flowCurve.getPointAt((flowT + k / flowTokens.length) % 1)));
  }

  let currentView = "iso";
  // Build mode (cell builder): show only what the user chose — no robot, tool or fence until picked.
  let buildMode = false;

  /* ------------------------------------------------------------------
   * Digital-twin interaction: which robot cell is under the pointer, a
   * floor ring that marks the drop target, and side insets so the line is
   * framed in the part of the stage not covered by floating panels.
   * ------------------------------------------------------------------ */
  const hoverMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  const hoverRing = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.22, 56), hoverMat);
  hoverRing.rotation.x = -Math.PI / 2;
  hoverRing.position.y = 0.015;
  hoverRing.visible = false;
  scene.add(hoverRing);
  const insets = { left: 0, right: 0 };
  const visibleAspect = () => {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;
    return Math.max(w - insets.left - insets.right, 120) / h;
  };
  /** Index of the cell under a screen point; cells.length means the empty slot after the line; -1 if none. */
  function cellAt(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width) return -1;
    const toScreen = (x) => {
      const p = new THREE.Vector3(x, 0.9, 0).project(camera);
      return [rect.left + ((p.x + 1) / 2) * rect.width, rect.top + ((1 - p.y) / 2) * rect.height];
    };
    const pts = [];
    for (let i = 0; i <= cells.length; i++) pts.push(toScreen(cellMid(i)));
    const gap = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) || 200;
    let best = -1;
    let bestD = Infinity;
    pts.forEach(([x, y], i) => {
      const d = Math.hypot(clientX - x, clientY - y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    // Close to a robot (within about half the spacing between cells) counts as that robot; empty floor is -1.
    return bestD <= Math.min(gap * 0.4, 170, rect.width * 0.22) ? best : -1;
  }
  const lastScaleAll = () => ROBOT_SIZES[sizeKey].scale;
  function setHover(i) {
    if (i == null || i < 0) {
      hoverRing.visible = false;
      return;
    }
    hoverRing.visible = true;
    hoverRing.position.x = cellMid(i);
    hoverMat.color.setHex(i >= cells.length ? 0x34d399 : 0x38bdf8);
  }
  /** Close-up of the product where the focused robot works on it: the work table, fixture or machine, else the pick. */
  function productView() {
    const st = (cells[focus] || cells[0]).stations;
    const s = st.table || st.weld || st.cnc || st.press || st.mould || st.test || st.marker || st.conveyor || st.in || st.bin || st.pallet || st.carton;
    const c = cells[focus] || cells[0];
    const baseX = cellStart[focus] + (c.robot ? c.robot.travel : 0);
    const p = s ? (s.point || s.slots[0]).clone() : new THREE.Vector3(baseX, 0.8, 0);
    const d = 0.5 + Math.max(PART.w, PART.d, PART.h * 1.5, 0.1) * 2.4;
    // Look from the side away from the robot, so the arm works towards the camera instead of blocking it.
    const away = new THREE.Vector3(p.x - baseX, 0, p.z);
    if (away.lengthSq() < 1e-4) away.set(0, 0, 1);
    away.normalize();
    const side = new THREE.Vector3(-away.z, 0, away.x);
    return [p.clone().addScaledVector(away, d * 0.82).addScaledVector(side, d * 0.38).add(new THREE.Vector3(0, d * 0.62, 0)), p];
  }

  let framedByHand = false, glide = null;
  function moveCamera(position,target) {
    position.y=Math.max(position.y,0.25); position.z=Math.max(position.z,-5);
    if (!container.dataset.sceneReady) { camera.position.copy(position); controls.target.copy(target); controls.update(); return; }
    glide={start:performance.now(),from:camera.position.clone(),to:position.clone(),at:controls.target.clone(),target:target.clone()};
    invalidated=true;
  }
  function setView(name) {
    // Signs would cover the product in a close-up, and break the picture in the cinematic shot.
    lastLabels = 0; invalidated = true;
    // A shot framed with setCamera stays put when the stage resizes or the line rebuilds.
    if (framedByHand && name === currentView) return;
    framedByHand = false;
    currentView = name;
    controls.autoRotate = name === "cinematic";
    const lineEnd = cellEnd[cells.length - 1] || 0;
    if (name === "product" && cells.length) {
      const [pos, at] = productView();
      moveCamera(pos,at);
      return;
    }
    const span = lineEnd;
    const cx = span / 2;
    const k = 1 + span / 5;
    const VIEWS = {
      iso: [new THREE.Vector3(cx + 3.2 * k, 2.7 * k, 3.5 * k), new THREE.Vector3(cx - 0.1, 0.65, 0.1)],
      front: [new THREE.Vector3(cx + 4.6 * k, 1.5 * k, 0.05), new THREE.Vector3(cx, 0.8, 0.05)],
      top: [new THREE.Vector3(cx + 0.01, 6.2 * k, 0.01), new THREE.Vector3(cx, 0, 0)],
      side: [new THREE.Vector3(cx + 0.1, 1.6 * k, 4.6 * k), new THREE.Vector3(cx, 0.8, 0)],
    };
    if (cells.length > 1 || span > 0 || visibleAspect() < 1) {
      // Fit the whole line across the screen, whatever the stage's shape.
      const vfov = (camera.fov * Math.PI) / 180;
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(visibleAspect(), 0.5));
      const dist = Math.max((span + 5.6) / 2 / Math.tan(hfov / 2), 3.4 / Math.tan(vfov / 2));
      const at = (dx, dy, dz) => {
        const d = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(dist);
        return new THREE.Vector3(cx + d.x, 0.5 + d.y, -0.2 + d.z);
      };
      VIEWS.iso = [at(0.28, 0.72, 1), new THREE.Vector3(cx, 0.5, -0.2)];
      VIEWS.front = [at(0, 0.3, 1), new THREE.Vector3(cx, 0.7, -0.2)];
      VIEWS.side = [new THREE.Vector3(cx + span / 2 + 5, 2.2, 0.2), new THREE.Vector3(cx, 0.8, 0)];
      VIEWS.top = [at(0.001, 1, 0.001), new THREE.Vector3(cx, 0, -0.2)];
    }
    // Cinematic: lower and a little closer than the 3D view, the way a camera crew would shoot it.
    const low = VIEWS.iso[0].clone().sub(VIEWS.iso[1]);
    const reach = low.length() * 0.92;
    low.y *= 0.62;
    VIEWS.cinematic = [VIEWS.iso[1].clone().addScaledVector(low.normalize(), reach), VIEWS.iso[1].clone()];
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
        moveCamera(sphere.center.clone().addScaledVector(dir,dist),sphere.center);
        return;
      }
    }
    moveCamera(v[0],v[1]);
  }

  function reset() {
    conveyors.forEach((c) => c.clear());
    [...parts].forEach(removePart);
    cells.forEach((c) => c.reset());
    simTime = 0;
    events = [];
    resetClearance();
    clearPaths();
    obstaclesDirty = true;
    emit(true);
  }

  function setRobotSize(key) {
    if (!ROBOT_SIZES[key]) return;
    sizeKey = key;
    relayout();
  }

  let lastEmit = 0;
  function emit(force) {
    invalidated = true;
    if (!onUpdate || !cells.length || builder || !cells[focus]?.robot) return;
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
      joints: f.robot && !f.robot.cartesian ? f.robot.q.map((v) => +((v * 180) / Math.PI).toFixed(1)) : [0, 0, 0, 0, 0, 0],
      motion: f.motion,
      quality,
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
      product: kit ? { key: kit.info.key, label: kit.info.label, kg: kit.info.kg, size: kit.info.size, gripper: TOOL_LOOK_NAMES[kit.info.look] || kit.info.look } : null,
      tools: lineTools,
      clearance: motionClearance(),
      moveMode,
      showPaths,
      layoutEdits: edits.size,
      cells: cells.map((c) => ({
        title: c.title,
        stepIndex: c.stepIdx,
        step: c.steps[c.stepIdx] || null,
        cycles: c.cycles,
        lastCycle: c.lastCycle,
      })),
    });
  }

  /* ------------------------------------------------------------------
   * Move mode (the user's layout edits), the motion clearance watch and robot paths.
   * Edits: { cell, kind: "robot" | "station" | "equipment", key, dx, dz, rot } on top of the planned layout.
   * ------------------------------------------------------------------ */
  let edits = new Map(), editsSig = "", undoStack = [], moveMode = false, showPaths = false;
  /** Equipment spots found on this line's first placement (kept while the user moves things). */
  let frozenSpots = new Map();
  const ZERO = { dx: 0, dz: 0, rot: 0 };
  const editId = (e) => `${e.kind}:${e.cell}:${e.key}`;
  const editList = () => [...edits.values()].map((e) => ({ ...e }));
  function stationMatrix(e, c) {
    return new THREE.Matrix4()
      .makeTranslation(c.x + (e.dx || 0), 0, c.z + (e.dz || 0))
      .multiply(new THREE.Matrix4().makeRotationY(((e.rot || 0) * Math.PI) / 2))
      .multiply(new THREE.Matrix4().makeTranslation(-c.x, 0, -c.z));
  }
  function notifyLayout() {
    obstaclesDirty = true;
    resetClearance();
    invalidated = true;
    onLayout?.({ edits: editList(), moveMode, showPaths });
    emit(true);
  }
  /** Put every robot base and station where the edits say (back home when they have none). True when any moved. */
  function applyCellEdits() {
    let any = false;
    cells.forEach((c, i) => {
      const r = edits.get(`robot:${i}:robot`);
      if (r) any = true;
      c.setBase(r ? r.dx : 0, r ? r.dz : 0);
      for (const info of c.stationInfos()) {
        const e = edits.get(`station:${i}:${info.key}`);
        if (e) any = true;
        c.setStation(info.key, e || ZERO);
      }
    });
    obstaclesDirty = true;
    return any;
  }
  function pushUndo() {
    undoStack.push(editList());
    if (undoStack.length > 20) undoStack.shift();
  }
  function setEdits(list, record) {
    if (record) pushUndo();
    edits = new Map();
    for (const e of list || []) {
      if (!e || !["robot", "station", "equipment"].includes(e.kind) || !Number.isFinite(Number(e.cell)) || !e.key) continue;
      const x = { cell: Number(e.cell), kind: e.kind, key: String(e.key), dx: +(Number(e.dx) || 0).toFixed(3), dz: +(Number(e.dz) || 0).toFixed(3), rot: ((Math.round(Number(e.rot) || 0) % 4) + 4) % 4 };
      if (x.dx || x.dz || x.rot) edits.set(editId(x), x);
    }
    if (!builder && !dirtyLine && cells.length) {
      applyCellEdits();
      placeEquipment();
      placeFence();
    }
    select(null);
    notifyLayout();
  }
  function undoMove() {
    if (!undoStack.length) return false;
    setEdits(undoStack.pop(), false);
    return true;
  }
  /** A new plan (other robots, jobs or stations) starts from its planned layout. */
  function planChanged() {
    const sig = planSignature(pendingPlan);
    if (sig === editsSig) return;
    editsSig = sig;
    edits = new Map();
    undoStack = [];
    select(null);
  }

  /* What can be picked up: fixed robot bases, stations, and the equipment the plan placed. */
  function movables() {
    const out = [];
    cells.forEach((c, i) => {
      if (c.movable && c.robot && c.robot.root.visible) out.push({ kind: "robot", cell: i, key: "robot", obj: c.robot.root, name: cells.length > 1 ? `Robot ${i + 1}` : "Robot", rotate: false });
      for (const info of c.stationInfos()) if (info.group.visible !== false) out.push({ kind: "station", cell: i, key: info.key, obj: info.group, name: info.name, rotate: info.canRotate });
    });
    for (const g of [equipGroup, equipOutside])
      if (g) for (const ch of g.children) if (ch.isGroup && ch.userData.key) out.push({ kind: "equipment", cell: ch.userData.cell, key: ch.userData.key, obj: ch, name: ch.userData.what, rotate: true });
    return out;
  }
  const ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pickRay = new THREE.Raycaster();
  function rayAt(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    pickRay.setFromCamera(ndc, camera);
  }
  function pickMovable(clientX, clientY) {
    rayAt(clientX, clientY);
    const list = movables(), byObj = new Map(list.map((t) => [t.obj, t]));
    for (const h of pickRay.intersectObjects(list.map((t) => t.obj), true)) {
      if (!h.object.isMesh || h.object.isSprite || h.object.userData.zone || !h.object.visible) continue;
      let o = h.object;
      while (o && !byObj.has(o)) o = o.parent;
      if (o) return byObj.get(o);
    }
    return null;
  }
  function floorAt(clientX, clientY) {
    rayAt(clientX, clientY);
    return pickRay.ray.intersectPlane(floorPlane, new THREE.Vector3());
  }
  /** The same target after a rebuild (equipment is rebuilt after every drop). */
  function resolve(t) {
    if (!t) return null;
    if (t.obj && t.obj.parent) return t;
    return movables().find((x) => x.kind === t.kind && x.cell === t.cell && x.key === t.key) || null;
  }

  // The outline round the object under the pointer or being dragged: white, green when clear, red when it clashes.
  const outline = new THREE.Box3Helper(new THREE.Box3(), 0xffffff);
  outline.visible = false;
  outline.userData.dynamic = outline.userData.noBounds = true;
  scene.add(outline);
  function outlineFor(t, color) {
    if (!t || !t.obj) {
      outline.visible = false;
      invalidated = true;
      return;
    }
    const b = meshBox(t.obj);
    if (b.isEmpty()) return;
    outline.box.copy(b).expandByScalar(0.03);
    if (color != null) outline.material.color.setHex(color);
    outline.visible = true;
    invalidated = true;
  }

  // The floating card: the object's name, "Rotate 90°" and "Reset".
  if (getComputedStyle(container).position === "static") container.style.position = "relative";
  const card = document.createElement("div");
  Object.assign(card.style, { position: "absolute", zIndex: "30", display: "none", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", border: "1px solid hsl(var(--border))", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", lineHeight: "1.3", boxShadow: "0 2px 8px rgba(0,0,0,.18)", whiteSpace: "nowrap", transform: "translate(-50%, calc(-100% - 8px))", pointerEvents: "auto" });
  card.dataset.moveCard = "1";
  const cardName = document.createElement("div");
  cardName.style.fontWeight = "600";
  cardName.style.marginBottom = "4px";
  const cardBtns = document.createElement("div");
  cardBtns.style.display = "flex";
  cardBtns.style.gap = "4px";
  const cardButton = (text, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    Object.assign(b.style, { border: "1px solid hsl(var(--border))", borderRadius: "4px", padding: "2px 6px", background: "hsl(var(--secondary))", color: "hsl(var(--secondary-foreground))", fontSize: "11px", cursor: "pointer" });
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      fn();
    });
    cardBtns.appendChild(b);
    return b;
  };
  const rotateBtn = cardButton("Rotate 90°", () => {
    const t = resolve(selected);
    if (!t) return;
    const e0 = edits.get(editId(t)) || ZERO;
    const next = { dx: e0.dx, dz: e0.dz, rot: ((e0.rot || 0) + 1) % 4 };
    applyTarget(t, next);
    commit(t, next);
  });
  cardButton("Reset", () => {
    const t = resolve(selected);
    if (!t) return;
    applyTarget(t, ZERO);
    commit(t, ZERO);
  });
  card.append(cardName, cardBtns);
  card.addEventListener("pointerdown", (e) => e.stopPropagation());
  container.appendChild(card);
  let selected = null;
  function select(t) {
    selected = t;
    if (!t) {
      card.style.display = "none";
      if (!drag) outlineFor(null);
      return;
    }
    cardName.textContent = t.name;
    rotateBtn.style.display = t.rotate ? "" : "none";
    card.style.display = "block";
    outlineFor(t, 0x38bdf8);
  }
  function updateCard() {
    if (!selected || !moveMode) return;
    const t = resolve(selected);
    if (!t) return select(null);
    selected = t;
    const b = meshBox(t.obj);
    if (b.isEmpty()) return;
    if (!drag) outline.box.copy(b).expandByScalar(0.03);
    const p = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2).project(camera);
    const w = container.clientWidth || 800, h = container.clientHeight || 500;
    card.style.left = `${clamp(((p.x + 1) / 2) * w, 70, w - 70)}px`;
    card.style.top = `${clamp(((1 - p.y) / 2) * h, 60, h - 10)}px`;
  }

  /** Live move of one target (no rebuild): robot base, station (with what is fitted to it) or equipment item. */
  function applyTarget(t, e) {
    if (t.kind === "robot") cells[t.cell]?.setBase(e.dx, e.dz);
    else if (t.kind === "station") {
      const D = cells[t.cell]?.setStation(t.key, e);
      if (D && t.attached) t.attached.forEach((g) => g.parent && g.applyMatrix4(D));
    } else if (t.obj.userData.home) {
      const h = t.obj.userData.home;
      t.obj.position.x = h.x + (e.dx || 0);
      t.obj.position.z = h.z + (e.dz || 0);
      t.obj.rotation.y = h.ry + ((e.rot || 0) * Math.PI) / 2;
    }
    obstaclesDirty = true;
    invalidated = true;
  }
  /** Hoods, screens and curtains fitted round a station travel with it while it is dragged. */
  function attachedTo(t) {
    if (!equipGroup) return [];
    const sb = meshBox(t.obj).expandByScalar(0.4);
    return equipGroup.children.filter((ch) => ch.isGroup && !ch.userData.key && meshBox(ch).intersectsBox(sb));
  }
  /** Store a finished move, then rebuild what depends on it once (equipment, ducts, fence) and re-check. */
  function commit(t, e) {
    pushUndo();
    const x = { cell: t.cell, kind: t.kind, key: t.key, dx: +(e.dx || 0).toFixed(3), dz: +(e.dz || 0).toFixed(3), rot: e.rot || 0 };
    if (x.dx || x.dz || x.rot) edits.set(editId(x), x);
    else edits.delete(editId(x));
    placeEquipment();
    placeFence();
    notifyLayout();
  }
  const reachCount = () => cells.reduce((n, c) => n + c.checkReach().length, 0);
  let drag = null, hoverT = null, lastHover = 0, lastDragCheck = 0;
  const orbitButtons = { ...controls.mouseButtons }, orbitTouches = { ...controls.touches };
  function setMoveMode(on) {
    on = !!on;
    if (on === moveMode) return;
    if (drag) cancelDrag();
    moveMode = on;
    controls.mouseButtons.LEFT = on ? -1 : orbitButtons.LEFT;
    controls.touches.ONE = on ? -1 : orbitTouches.ONE;
    renderer.domElement.style.cursor = "";
    renderer.domElement.style.touchAction = on ? "none" : "";
    select(null);
    hoverT = null;
    // Each item batched on its own while things can be picked up; one batch again for normal viewing.
    placeEquipment();
    invalidated = true;
    onLayout?.({ edits: editList(), moveMode, showPaths });
    emit(true);
  }
  function cancelDrag() {
    if (!drag) return;
    applyTarget(drag.t, drag.start);
    drag = null;
    controls.enabled = true;
    outlineFor(selected, 0x38bdf8);
  }
  const onMoveDown = (e) => {
    if (!moveMode || (e.pointerType === "mouse" && e.button !== 0) || builder) return;
    const t = pickMovable(e.clientX, e.clientY);
    if (!t) return select(null);
    const p = floorAt(e.clientX, e.clientY);
    if (!p) return;
    e.preventDefault();
    const e0 = edits.get(editId(t)) || ZERO;
    if (t.kind === "station") t.attached = attachedTo(t);
    drag = { t, grab: p, start: { dx: e0.dx, dz: e0.dz, rot: e0.rot || 0 }, cur: { dx: e0.dx, dz: e0.dz, rot: e0.rot || 0 }, moved: false, base: { issues: layoutIssues().length, reach: reachCount() } };
    controls.enabled = false;
    try { renderer.domElement.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    select(t);
  };
  const onMoveMove = (e) => {
    if (!moveMode) return;
    if (!drag) {
      const now = performance.now();
      if (now - lastHover < 60) return;
      lastHover = now;
      const t = pickMovable(e.clientX, e.clientY);
      renderer.domElement.style.cursor = t ? "grab" : "";
      if ((t && t.obj) !== (hoverT && hoverT.obj)) {
        hoverT = t;
        if (!selected) outlineFor(t, 0xffffff);
      }
      return;
    }
    const p = floorAt(e.clientX, e.clientY);
    if (!p) return;
    const snap = (v) => +(Math.round(clamp(v, -8, 8) / 0.05) * 0.05).toFixed(2);
    const next = { dx: snap(drag.start.dx + p.x - drag.grab.x), dz: snap(drag.start.dz + p.z - drag.grab.z), rot: drag.cur.rot };
    renderer.domElement.style.cursor = "grabbing";
    if (next.dx === drag.cur.dx && next.dz === drag.cur.dz) return;
    drag.cur = next;
    drag.moved = true;
    applyTarget(drag.t, next);
    const now = performance.now();
    if (now - lastDragCheck > 150 || drag.bad == null) {
      lastDragCheck = now;
      drag.bad = layoutIssues().length > drag.base.issues || reachCount() > drag.base.reach;
    }
    outlineFor(drag.t, drag.bad ? 0xef4444 : 0x22c55e);
  };
  const onMoveUp = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    controls.enabled = true;
    try { renderer.domElement.releasePointerCapture(e.pointerId); } catch { /* released */ }
    if (!d.moved) return outlineFor(d.t, 0x38bdf8);
    commit(d.t, d.cur);
    outlineFor(resolve(d.t), 0x38bdf8);
  };
  const onKey = (e) => {
    if (!container.isConnected || !onScreen || disposed) return;
    const el = e.target;
    if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || "") || el.isContentEditable)) return;
    if (e.key === "Escape") {
      if (drag) cancelDrag();
      else if (selected) select(null);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && String(e.key).toLowerCase() === "z") {
      if (undoStack.length) {
        e.preventDefault();
        undoMove();
      }
      return;
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && String(e.key).toLowerCase() === "m") setMoveMode(!moveMode);
  };
  renderer.domElement.addEventListener("pointerdown", onMoveDown);
  renderer.domElement.addEventListener("pointermove", onMoveMove);
  renderer.domElement.addEventListener("pointerup", onMoveUp);
  renderer.domElement.addEventListener("pointercancel", onMoveUp);
  window.addEventListener("keydown", onKey);
  function unbindMove() {
    renderer.domElement.removeEventListener("pointerdown", onMoveDown);
    renderer.domElement.removeEventListener("pointermove", onMoveMove);
    renderer.domElement.removeEventListener("pointerup", onMoveUp);
    renderer.domElement.removeEventListener("pointercancel", onMoveUp);
    window.removeEventListener("keydown", onKey);
    card.remove();
  }

  /* Motion clearance: each arm as capsules (shoulder → elbow → wrist → tool tip), measured about 12 times a second
     against equipment, fence panels, other arms and stations, except the stations the robot is meant to reach into. */
  let obstaclesDirty = true, obstacles = [], lastWatch = 0, clearance = [];
  const LINK_NAMES = ["upper arm", "forearm", "tool"];
  const robotName = (i) => (cells.length > 1 ? `Robot ${i + 1}` : "The robot");
  function resetClearance() {
    clearance = cells.map(() => ({ cur: null, last: null, cycle: -1, collisions: 0, contacts: new Set() }));
  }
  function buildObstacles() {
    obstaclesDirty = false;
    obstacles = [];
    for (const g of [equipGroup, equipOutside])
      if (g)
        for (const ch of g.children)
          if (ch.isGroup && ch.userData.what && !ch.userData.attached) {
            const b = meshBox(ch);
            if (!b.isEmpty()) obstacles.push({ what: ch.userData.what, cell: ch.userData.cell, box: b, parts: worldBoxes(ch) });
          }
    fenceSides.forEach((b) => obstacles.push({ what: "the safety fence", cell: -1, box: b }));
    cells.forEach((c, i) =>
      c.stationInfos().forEach((info) => {
        const b = meshBox(info.group);
        if (!b.isEmpty()) obstacles.push({ what: info.name, cell: i, keys: info.keys, box: b, parts: worldBoxes(info.group) });
      })
    );
  }
  const worldBoxes = (g) => {
    g.updateWorldMatrix(true, false);
    return (g.userData.solid || []).map((b) => b.clone().applyMatrix4(g.matrixWorld));
  };
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function segBox(a, b, box) {
    let best = Infinity, k0 = 0;
    for (let k = 0; k <= 8; k++) {
      const d = box.distanceToPoint(tmpA.lerpVectors(a, b, k / 8));
      if (d < best) { best = d; k0 = k; }
    }
    return [best, k0 / 8];
  }
  function segSeg(a, b, c, d) {
    let best = Infinity, k0 = 0;
    for (let k = 0; k <= 8; k++) {
      tmpA.lerpVectors(a, b, k / 8);
      for (let m = 0; m <= 8; m++) {
        const dd = tmpA.distanceTo(tmpB.lerpVectors(c, d, m / 8));
        if (dd < best) { best = dd; k0 = k; }
      }
    }
    return [best, k0 / 8];
  }
  const armBuf = [];
  function watchClearance(now) {
    if (now - lastWatch < 83 || !cells.length) return;
    lastWatch = now;
    if (obstaclesDirty) buildObstacles();
    if (clearance.length !== cells.length) resetClearance();
    const arms = cells.map((c, i) => {
      const pts = c.armPoints(armBuf[i] || (armBuf[i] = []));
      return pts ? pts.map((p) => p.clone()) : null;
    });
    cells.forEach((c, i) => {
      const pts = arms[i];
      if (!pts || !c.started()) return;
      const rec = clearance[i];
      if (rec.cycle !== c.cycles) {
        if (rec.cycle >= 0 && rec.cur) rec.last = rec.cur;
        rec.cur = null;
        rec.cycle = c.cycles;
      }
      const n = c.steps.length, st = c.steps[c.stepIdx], prev = n ? c.steps[(c.stepIdx - 1 + n) % n] : null;
      const skip = new Set([st && st.station, prev && prev.station].filter(Boolean));
      // A step that works with a process tool starts and ends with a tool change at the stand.
      const toolStep = (x) => x && (x.action === "weld" || x.action === "toolchange" || TOOL_ACTIONS[x.action]);
      if (toolStep(st) || toolStep(prev)) skip.add("rack");
      const sc = c.armScale, near = new Set();
      let best = null;
      const consider = (d, what, l, a, b, t, box) => {
        const key = `${l}|${what}`;
        if (d < 0.06) near.add(key);
        if (!best || d < best.min) best = { min: d, against: what, link: LINK_NAMES[l], at: new THREE.Vector3().lerpVectors(a, b, t), step: st ? st.label : null };
        if (d < 0.03 && !rec.contacts.has(key)) {
          rec.contacts.add(key);
          rec.collisions++;
          log(`${robotName(i)}'s ${LINK_NAMES[l]} hits ${what}`);
          flash(a, b, l === 2 ? 0.06 : 0.09 * sc, box);
        }
      };
      for (let l = 0; l < 3; l++) {
        const a = pts[l], b = pts[l + 1], rad = l === 2 ? 0.06 : 0.09 * sc;
        for (const o of obstacles) {
          if (o.keys && o.cell === i && o.keys.some((k) => skip.has(k))) continue;
          let [d, t] = segBox(a, b, o.box);
          if (d - rad > 0.4) continue;
          if (o.parts && o.parts.length) {
            d = Infinity;
            for (const pb of o.parts) {
              const [dd, tt] = segBox(a, b, pb);
              if (dd < d) [d, t] = [dd, tt];
            }
          }
          consider(d - rad, o.what, l, a, b, t, o.box);
        }
        arms.forEach((q, j) => {
          if (j === i || !q) return;
          for (let m = 0; m < 3; m++) {
            const [d, t] = segSeg(a, b, q[m], q[m + 1]);
            consider(d - rad - (m === 2 ? 0.06 : 0.09 * cells[j].armScale), `Robot ${j + 1}`, l, a, b, t, null);
          }
        });
      }
      for (const k of [...rec.contacts]) if (!near.has(k)) rec.contacts.delete(k);
      if (best && (!rec.cur || best.min < rec.cur.min)) rec.cur = best;
    });
  }
  function motionClearance() {
    return cells.map((c, i) => {
      const r = clearance[i];
      const b = r ? [r.cur, r.last].filter(Boolean).sort((x, y) => x.min - y.min)[0] : null;
      return {
        robot: i,
        min: b ? +Math.max(0, b.min).toFixed(3) : null,
        against: b ? b.against : null,
        link: b ? b.link : null,
        step: b ? b.step : null,
        at: b ? [+b.at.x.toFixed(3), +b.at.y.toFixed(3), +b.at.z.toFixed(3)] : null,
        collisions: r ? r.collisions : 0,
      };
    });
  }
  // The red flash on the arm link and the object it hit (about a second).
  const flashGroup = new THREE.Group();
  flashGroup.userData.dynamic = flashGroup.userData.noBounds = true;
  scene.add(flashGroup);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6, depthWrite: false });
  pooledMaterials.add(flashMat);
  let flashes = [];
  function flash(a, b, rad, box) {
    const v = new THREE.Vector3().subVectors(b, a), len = Math.max(v.length(), 0.01);
    const link = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.15, rad * 1.15, len, 10), flashMat);
    link.position.copy(a).addScaledVector(v, 0.5);
    link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    flashGroup.add(link);
    const items = [link];
    if (box) {
      const h = new THREE.Box3Helper(box.clone().expandByScalar(0.02), 0xef4444);
      flashGroup.add(h);
      items.push(h);
    }
    flashes.push({ start: performance.now(), items });
  }
  function updateFlashes(now) {
    if (!flashes.length) return false;
    flashMat.opacity = 0.35 + 0.35 * Math.sin(now / 80);
    flashes = flashes.filter((f) => {
      if (now - f.start < 1000) return true;
      f.items.forEach((o) => { o.geometry.dispose(); if (o.material !== flashMat) o.material.dispose(); o.removeFromParent(); });
      return false;
    });
    return true;
  }

  /* Robot paths: each tool tip's path over its last cycle as a thin line (focused robot brighter). */
  const PATH_MAX = 4000;
  const pathGroup = new THREE.Group();
  pathGroup.visible = false;
  pathGroup.userData.dynamic = pathGroup.userData.noBounds = true;
  scene.add(pathGroup);
  let paths = [], lastPathDraw = 0;
  function clearPaths() {
    paths.forEach((p) => { p.line.geometry.dispose(); p.line.material.dispose(); p.line.removeFromParent(); });
    paths = [];
  }
  function recordPaths(now) {
    if (paths.length !== cells.length) {
      clearPaths();
      paths = cells.map(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PATH_MAX * 3), 3));
        geo.setDrawRange(0, 0);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9, depthWrite: false }));
        line.frustumCulled = false;
        line.userData.dynamic = true;
        pathGroup.add(line);
        return { line, cur: [], last: null, cycle: -1 };
      });
    }
    cells.forEach((c, i) => {
      const p = paths[i], r = c.robot;
      if (!r || !r.tip || !c.started() || !r.root.visible) return;
      if (p.cycle !== c.cycles) {
        if (p.cycle >= 0) p.last = p.cur;
        p.cur = [];
        p.cycle = c.cycles;
      }
      r.tip.updateWorldMatrix(true, false);
      const v = new THREE.Vector3().setFromMatrixPosition(r.tip.matrixWorld);
      const lv = p.cur[p.cur.length - 1];
      if ((!lv || lv.distanceToSquared(v) > 0.0004) && p.cur.length < PATH_MAX) p.cur.push(v);
    });
    if (showPaths && now - lastPathDraw > 250) {
      lastPathDraw = now;
      drawPaths();
    }
  }
  function drawPaths() {
    paths.forEach((p, i) => {
      const pts = p.last && p.last.length > 1 ? p.last : p.cur;
      const attr = p.line.geometry.attributes.position;
      pts.forEach((v, k) => attr.setXYZ(k, v.x, v.y, v.z));
      attr.needsUpdate = true;
      p.line.geometry.setDrawRange(0, pts.length);
      p.line.material.color.setHex(i === focus ? 0x0ea5e9 : 0x64748b);
      p.line.material.opacity = i === focus ? 0.95 : 0.5;
    });
    invalidated = true;
  }

  let raf = 0;
  let lastT = performance.now();
  function frame(now) {
    if(disposed) return;
    raf = requestAnimationFrame(frame);
    if(document.hidden || !onScreen || contextLost) { lastT=now; lastFrameAt=0; return; }
    flushPending();
    if(builder || compiling) { lastT=now; lastFrameAt=0; return; }
    if(glide) {
      const t=clamp((now-glide.start)/600,0,1), k=t*t*(3-2*t);
      camera.position.lerpVectors(glide.from,glide.to,k); controls.target.lerpVectors(glide.at,glide.target,k);
      if(t===1) glide=null;
      invalidated=true;
    }
    const changed=controls.update();
    if(!playing && !controls.autoRotate && !glide && !changed && !invalidated) { lastT=now; lastFrameAt=0; return; }
    // Clamp: a frame timestamp can precede the start time, which would run time backwards.
    let dt = clamp((now - lastT) / 1000, 0, 0.05);
    const realDt = dt;
    lastT = now;
    // A long line framed from high up: look in through the open roof, not at its deck.
    const roofOn = camera.position.y < 6;
    if (roofParts[0] && roofParts[0].visible !== roofOn) roofParts.forEach((m) => (m.visible = roofOn));
    if (playing && cells.some((c) => c.steps.length)) {
      dt *= speed;
      simTime += dt;
      conveyors.forEach((c) => c.update(dt));
      cells.forEach((c) => c.update(dt));
      updateOverlay(dt);
      watchClearance(now);
      recordPaths(now);
    }
    if (updateFlashes(now)) invalidated = true;
    controls.update(realDt);
    updateLabels(now);
    draw(dt);
    if(!container.dataset.sceneReady) { container.dataset.sceneReady="1"; onStatus?.("ready"); }
    watchFrameRate(now);
    if(playing) emit(false);
    invalidated=false;
  }

  function draw(dt) {
    renderer.info.reset();
    sizeLabels();
    if (composer) {
      camera.layers.disable(LABELS);
      composer.render(dt);
      // Then the signs on top of the finished picture, crisp and in their true colours.
      const bg = scene.background;
      scene.background = null;
      camera.layers.set(LABELS);
      renderer.autoClear = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.render(scene, camera);
      renderer.shadowMap.autoUpdate = true;
      renderer.autoClear = true;
      camera.layers.enable(0);
      scene.background = bg;
    } else renderer.render(scene, camera);
    updateCard();
  }

  let fps=0, lowAt=0, expensiveAt=0, cheapAt=0, performanceNotified=false;
  let onScreen=true, contextLost=false;
  const io=typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry])=>{onScreen=entry.isIntersecting; invalidated=true; lastFrameAt=0;}) : null;
  io?.observe(container);
  const pointerMove=(e)=>{ const r=renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); invalidated=true; lastLabels=0; };
  const pointerLeave=()=>{pointer.set(2,2); invalidated=true; lastLabels=0;};
  const lost=(e)=>{e.preventDefault();contextLost=true;onStatus?.('lost');};
  const restored=()=>{contextLost=false;relayout();};
  renderer.domElement.addEventListener('pointermove',pointerMove);
  renderer.domElement.addEventListener('pointerleave',pointerLeave);
  renderer.domElement.addEventListener('webglcontextlost',lost);
  renderer.domElement.addEventListener('webglcontextrestored',restored);
  renderer.info.autoReset=false;
  // Too slow for the cinematic pipeline (about 22 fps or less over two seconds): fall back to standard by itself.
  let slowFrames = 0;
  let frames = 0;
  let lastFrameAt = 0;
  function watchFrameRate(now) {
    const gap = lastFrameAt ? now - lastFrameAt : 16;
    lastFrameAt = now;
    fps = fps ? fps*0.9+(1000/gap)*0.1 : 1000/gap;
    if(document.hidden) return;
    if(gap>25) { cheapAt=0; expensiveAt ||= now; } else { expensiveAt=0; }
    if(gap<14) { cheapAt ||= now; } else { cheapAt=0; }
    let next=resolution;
    if(expensiveAt && now-expensiveAt>1000) { next=Math.max(0.75/Math.min(window.devicePixelRatio||1,1.75),resolution-0.15); expensiveAt=now; }
    if(cheapAt && now-cheapAt>3000) { next=Math.min(1,resolution+0.1); cheapAt=now; }
    if(next!==resolution) { resolution=next; renderer.setPixelRatio(pixelRatio()); composer?.setPixelRatio(renderer.getPixelRatio()); resize(); }
    if(fps<20) lowAt ||= now; else lowAt=0;
    if(lowAt && now-lowAt>3000 && quality==='high') {
      canUpgrade=false; setQuality('standard',true);
      if(!performanceNotified) { performanceNotified=true; onPerformance?.('smooth'); }
    }
    if (!qualityAuto || gap > 500) return;
    frames++;
    if (gap > 45) slowFrames++;
    if (quality === "standard") {
      if (!canUpgrade || frames < 90) return;
      canUpgrade = false;
      if (slowFrames < 10) setQuality("high", true);
      frames = slowFrames = 0;
      return;
    }
    if (frames >= 40) {
      if (slowFrames > 25) setQuality("standard", true);
      frames = slowFrames = 0;
    }
  }

  function resize() {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    // Centre the picture in the part of the stage the side panels leave free.
    const shift = (insets.right - insets.left) / 2;
    if (shift) camera.setViewOffset(w, h, shift, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    if (cells.length > 1 || cellEnd[0] > 0) setView(currentView);
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro ? ro.observe(container) : window.addEventListener("resize", resize);

  pendingPlan = { cells: [{ steps: [] }] };
  relayout();
  buildComposer();
  resize();
  raf = requestAnimationFrame(frame);

  const api = {
    setSteps(newSteps) {
      pendingPlan = { cells: [{ steps: newSteps || [] }] }; pendingModels=[];
      planChanged();
      relayout();
      playing = true;
      emit(true);
    },
    setPlan(plan) {
      pendingPlan = plan; pendingModels=[];
      planChanged();
      relayout();
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
    /**
     * Put the user's chosen robot / end-of-arm tool on robot cell i:
     * robot { name, brand, reachMm, payloadKg, collaborative }, eoat { name, kind? },
     * accessories: ["changer" | "sensor" | "camera"].
     * Pass null to go back to the planned robot.
     */
    setEquipment(i, eq) {
      const c = cells[i];
      if (!eq || (!eq.robot && !eq.eoat && !(eq.accessories && eq.accessories.length))) {
        pendingModels[i] = null;
      } else {
        const r = eq.robot;
        const reachM = r ? (r.reachMm ? r.reachMm / 1000 : estimateReach(r.payloadKg)) : null;
        pendingModels[i] = {
          scale: reachM ? clamp(reachM / 1.45, 0.55, 1.7) : null,
          paint: r ? brandPaint(r.brand || r.name, r.collaborative) : null,
          label: r ? [r.name, r.payloadKg ? `${r.payloadKg} kg` : "", reachM ? `${Math.round(reachM * 1000)} mm` : ""].filter(Boolean).join(" · ") : eq.eoat ? eq.eoat.name : "",
          eoat: eq.eoat ? eq.eoat.kind || eoatKind(eq.eoat.name) : null,
          look: eq.eoat ? eoatLook(eq.eoat.name) : null,
          tools: (eq.tools || []).map((t) => t.kind || eoatKind(t.name)),
          looks: (eq.tools || []).map((t) => eoatLook(t.name)),
          hasRobot: !!r,
          reachM: reachM,
          accessories: eq.accessories || [],
        };
      }
      cellProducts[i] = (eq && eq.components) || [];
      relayout();
    },
    setEquipmentAll(list) {
      list.forEach((eq,i)=>api.setEquipment(i,eq));
      pendingModels.length=list.length;
      cellProducts.length=list.length;
    },
    setView,
    setLabels(mode) { labelMode=['key','all','off'].includes(mode)?mode:'key'; lastLabels=0; invalidated=true; },
    stats() { flushPending(true); draw(0); return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,fps,pixelRatio:renderer.getPixelRatio(),quality,rebuilds}; },
    reload() { if(contextLost) renderer.getContext().getExtension('WEBGL_lose_context')?.restoreContext(); else relayout(); },
    cellAt,
    setHover,
    motionClearance() { return motionClearance(); },
    /** Pause and frame the camera on robot i's closest approach (the "Show me" of the clearance check). */
    showClash(i) {
      const m = motionClearance()[Number(i) || 0];
      if (!m || !m.at) return;
      playing = false;
      const at = new THREE.Vector3(m.at[0], m.at[1], m.at[2]);
      framedByHand = true;
      controls.autoRotate = false;
      moveCamera(at.clone().add(new THREE.Vector3(1.3, 1.0, 1.7)), at);
      emit(true);
    },
    setShowPaths(on) { showPaths = !!on; pathGroup.visible = showPaths; lastPathDraw = 0; drawPaths(true); invalidated = true; onLayout?.({ edits: editList(), moveMode, showPaths }); emit(true); },
    get showPaths() { return showPaths; },
    setMoveMode(on) { setMoveMode(on); },
    get moveMode() { return moveMode; },
    getLayoutEdits() { return editList(); },
    /** Everything Move mode can pick up, with where it is on screen (client pixels), for checks and tests. */
    layoutTargets() {
      flushPending(true);
      scene.updateMatrixWorld(true);
      const r = renderer.domElement.getBoundingClientRect();
      return movables().map((t) => {
        const b = meshBox(t.obj), c = b.getCenter(new THREE.Vector3());
        const p = new THREE.Vector3(c.x, b.isEmpty() ? 0 : b.max.y * 0.6, c.z).project(camera);
        return { kind: t.kind, cell: t.cell, key: t.key, name: t.name, screen: [r.left + ((p.x + 1) / 2) * r.width, r.top + ((1 - p.y) / 2) * r.height], at: [c.x, c.z] };
      });
    },
    setLayoutEdits(list) { setEdits(list, false); },
    undoMove() { return undoMove(); },
    resetLayout() { if (edits.size) setEdits([], true); },
    /** Cell builder: show only chosen equipment (call before setPlan). */
    setBuildMode(on) {
      buildMode = !!on;
      relayout();
    },
    /** Pixels covered by floating panels on the left and right of the stage. */
    setInsets(left, right) {
      insets.left = Math.max(0, Number(left) || 0);
      insets.right = Math.max(0, Number(right) || 0);
      resize();
      setView(currentView);
    },
    /** "layout" (factory plan), "flow" (material flow) or "none" on the same live line. */
    setOverlay,
    /** The picture as it is now, as a PNG data URL (for "Save image"). */
    snapshot() {
      flushPending(true);
      draw(0);
      return renderer.domElement.toDataURL("image/png");
    },
    /** Frame a shot by hand: camera at `position`, looking at `target` (metres, world axes); `orbit` circles it slowly. */
    setCamera(position, target, orbit = false) {
      framedByHand = true;
      glide=null; invalidated=true;
      controls.autoRotate = !!orbit;
      camera.position.set(position[0], position[1], position[2]);
      controls.target.set(target[0], target[1], target[2]);
      controls.update();
    },
    /**
     * Fence the robot cells: true / false for all, or one flag per cell. Neighbouring fenced cells share one
     * enclosure; `separate` gives every robot its own.
     */
    setFencing(on, opts = {}) {
      onStatus?.("building"); delete container.dataset.sceneReady;
      fenceCells = Array.isArray(on) ? on.map(Boolean) : (pendingPlan?.cells || cells).map(() => !!on);
      fenceSeparate = !!opts.separate;
      // Industrial robots in yellow; cobots in white and blue (a fence alone does not make a robot industrial).
      cells.forEach((c, i) => c.setPaint(industrialOf(i)));
      // A fenced cell has a controller cabinet and a light curtain; a cobot cell a control box and an area scanner.
      placeEquipment();
      placeFence();
      if (overlay === "layout") setOverlay(overlay);
    },
    /** Which robots are cobots (paint, control box, area scanner); call before setFencing. Empty: follow the fence. */
    setCobots(flags) {
      cobotCells = Array.isArray(flags) ? flags.map(Boolean) : [];
      cells.forEach((c, i) => c.setPaint(industrialOf(i)));
    },
    /** Space between robots: "compact" (3.6 m, neighbours share space), "clear" (0.5 m between reaches), "roomy". */
    setSpacing(mode) {
      const m = mode === "compact" || mode === "roomy" ? mode : "clear";
      if (m === spacing) return;
      spacing = m;
      if ((pendingPlan?.cells.length || cells.length) > 1) relayout();
    },
    /** Robots that can reach another robot's stations, equipment, base or working space (none in a clear line). */
    interference() { flushPending(true); return interference(); },
    /** Show a photo of the user's manual process behind the line (null hides it). */
    setReference(url, label) {
      refUrl = url || null;
      if (label) refLabel = label;
      placeReference();
    },
    setFocus(i) {
      focus = clamp(Number(i) || 0, 0, Math.max(0,(pendingPlan?.cells.length || cells.length)-1));
      emit(true);
    },
    setJoint(i, deg) {
      if (playing) return;
      cells[focus].setJoint(i, (Number(deg) * Math.PI) / 180);
      emit(true);
    },
    /** "high" (cinematic: ambient occlusion, glow, smooth edges) or "standard" (fast, for phones). */
    setQuality(q) {
      setQuality(q);
    },
    get quality() {
      return quality;
    },
    /** Move the focused robot along its track, lift or gantry by hand (metres); only while paused. */
    setTravel(m) {
      if (playing || !cells[focus]) return;
      cells[focus].setTravel(m);
      emit(true);
    },
    /** Stations, conveyors, robot bases and equipment that stand on each other's floor (none in a good layout). */
    layoutIssues() { flushPending(true); return layoutIssues(); },
    checkReach(stepsToCheck) {
      flushPending(true);
      if (cells.length === 1) return cells[0].checkReach(stepsToCheck);
      const out = new Set();
      cells.forEach((c) => c.checkReach().forEach((u) => out.add(u)));
      return [...out];
    },
    dispose() {
      disposed=true; compileToken++; builder?.return(); io?.disconnect();
      unbindMove();
      clearPaths();
      renderer.domElement.removeEventListener('pointermove',pointerMove);
      renderer.domElement.removeEventListener('pointerleave',pointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost',lost);
      renderer.domElement.removeEventListener('webglcontextrestored',restored);
      cancelAnimationFrame(raf);
      ro ? ro.disconnect() : window.removeEventListener("resize", resize);
      refToken++;
      clearReference();
      clearFence();
      disposeLine();
      if (kit) kit.dispose();
      toolKit.dispose();
      equipModels.dispose();
      laserPanel.dispose(); fenceMesh.dispose(); contactMaterial.dispose();
      addOnMats.forEach((m) => m.dispose());
      hoverRing.geometry.dispose();
      hoverMat.dispose();
      controls.dispose();
      if (envTexture) envTexture.dispose();
      hallTextures.forEach((t) => t.dispose());
      sceneTextures.forEach((t) => t.dispose());
      building.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      disposeGroup(scene);
      Object.values(M).forEach((m)=>m.dispose());
      disposeComposer();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
  if (import.meta.env?.DEV) renderer.domElement.__robotSimulation = api;
  return api;
}
