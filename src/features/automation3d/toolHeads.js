/**
 * RobotVerse Automation Studio 3D — end-of-arm tools as they really look.
 *
 * A food cell grips with soft silicone fingers, a glass cell lifts with a vacuum frame, a paint cell sprays
 * with a spray gun and a meat cell cuts with a blade. Each tool is built in the robot's flange frame:
 * x runs along the tool axis from the flange (x = 0) to the tool centre point (x = TOOL_LEN).
 *
 * headFor() names the process tool a step needs from the job's words; eoatLook() reads the look of a tool the
 * user chose from the Directory. eoatKind() in robotSim.js keeps the tool family the robot program depends on.
 */

const lower = (t) => String(t || "").toLowerCase();

/** What each tool is called, for the scene and the plan. */
export const TOOL_LOOK_NAMES = {
  parallel: "Parallel gripper",
  dual: "Dual gripper",
  soft: "Food-grade soft gripper",
  cups: "Vacuum cup gripper",
  vacuum: "Vacuum gripper",
  frame: "Vacuum lifting frame",
  magnet: "Magnetic gripper",
  fork: "Fork / sack gripper",
  torch: "MIG/MAG welding torch",
  laser: "Laser head",
  spotgun: "Spot welding gun",
  studgun: "Stud welding gun",
  sonotrode: "Ultrasonic sonotrode",
  fsw: "Friction stir spindle",
  iron: "Soldering iron",
  spraygun: "Spray gun",
  powdergun: "Powder coating gun",
  nozzle: "Dispensing valve",
  polisher: "Polishing spindle",
  grinder: "Grinding spindle",
  spindle: "Process spindle",
  brush: "Rotary brush",
  blaster: "Blast nozzle",
  router: "Router spindle",
  drill: "Drilling spindle",
  roller: "Hemming roller",
  blade: "Cutting blade",
  fillnozzle: "Filling valve",
  pipette: "Pipetting head",
  capper: "Capping head",
  crimper: "Crimping head",
  sealhead: "Heat-sealing head",
  labeler: "Label applicator",
  printer: "Print head",
  driver: "Screwdriving spindle",
  riveter: "Riveting tool",
  nailer: "Nail gun",
  tier: "Rebar tying tool",
};

/** Looks that move like a gripper's fingers. */
const FINGERED = new Set(["parallel", "dual", "soft"]);

/**
 * The process tool a step needs, from the job's words and the step's action; null when the gripper does the work
 * (placing components is gripper work).
 */
export function headFor(text, action) {
  const t = lower(text);
  switch (action) {
    case "weld":
      return /laser/.test(t) ? "laser" : /spot/.test(t) ? "spotgun" : /stud/.test(t) ? "studgun" : /ultrason|sonotrode/.test(t) ? "sonotrode" : /friction stir/.test(t) ? "fsw" : /solder/.test(t) ? "iron" : "torch";
    case "apply":
      return /powder/.test(t) ? "powdergun"
        : /glue|adhesive|seal|dispens|urethane|potting|gap filler|bead|icing|topping|mask|conformal/.test(t) ? "nozzle"
          : "spraygun";
    case "finish":
      return /polish|buff/.test(t) ? "polisher"
        : /laser/.test(t) ? "laser"
          : /clean|wash|brush/.test(t) ? "brush"
            : /blast/.test(t) ? "blaster"
              : /rout|trim/.test(t) ? "router"
                : /drill/.test(t) ? "drill"
                  : /hem/.test(t) ? "roller"
                    : /cut|saw|slic|portion|meat|debon/.test(t) ? "blade"
                      : "grinder";
    case "assemble":
      return /screw|nut|bolt|fasten/.test(t) ? "driver" : /rivet/.test(t) ? "riveter" : /nail|stapl/.test(t) ? "nailer" : /rebar|tying/.test(t) ? "tier" : /crimp/.test(t) ? "crimper" : null;
    case "fill":
      return /pipet|dosing|lab/.test(t) ? "pipette" : "fillnozzle";
    case "cap":
      return /vial|crimp/.test(t) ? "crimper" : /tray seal|^seal|sealing/.test(t) && !/cap/.test(t) ? "sealhead" : "capper";
    case "label":
      return /laser|mark|engrav/.test(t) ? "laser" : /print|pad|screen|ink|coding/.test(t) ? "printer" : "labeler";
    default:
      return /drill/.test(t) ? "drill" : /cut|saw|slic|meat/.test(t) ? "blade" : /rout|trim/.test(t) ? "router" : /hem/.test(t) ? "roller" : /laser/.test(t) ? "laser" : "spindle";
  }
}

/** The look of a tool from its product name, or null for the family's plain look. */
export function eoatLook(text) {
  const t = lower(text);
  if (!t) return null;
  if (/soft|food|fin ?ray|silicone|mgrip|bellow finger/.test(t)) return "soft";
  if (/glass|panel lift|vacuum frame|sheet lift|tube lift|vacuum lift|lifting frame/.test(t)) return "frame";
  if (/laser/.test(t) && /weld|clean|cut|head|optic|scanner/.test(t)) return "laser";
  if (/spot ?weld|spot gun|servo gun|c-gun|x-gun/.test(t)) return "spotgun";
  if (/stud/.test(t)) return "studgun";
  if (/ultrason|sonotrode/.test(t)) return "sonotrode";
  if (/friction stir/.test(t)) return "fsw";
  if (/solder/.test(t)) return "iron";
  if (/powder/.test(t)) return "powdergun";
  if (/paint|spray gun|atomi[sz]er|bell cup|rotary bell/.test(t)) return "spraygun";
  if (/polish|buff/.test(t)) return "polisher";
  if (/brush/.test(t)) return "brush";
  if (/blast/.test(t)) return "blaster";
  if (/router|routing|trimm/.test(t)) return "router";
  if (/drill/.test(t)) return "drill";
  if (/hemm/.test(t)) return "roller";
  if (/blade|knife|slic/.test(t)) return "blade";
  if (/rivet/.test(t)) return "riveter";
  if (/nail|stapl/.test(t)) return "nailer";
  if (/label/.test(t)) return "labeler";
  if (/capper|capping/.test(t)) return "capper";
  if (/pipet/.test(t)) return "pipette";
  if (/fill(ing)? (valve|nozzle)/.test(t)) return "fillnozzle";
  if (/grind/.test(t)) return "grinder";
  return null;
}

/** Sparks, mist or a beam while a process tool works: colour, spread, and extras. */
export const HEAD_FX = {
  torch: { color: 0xffd27a, spread: 1 },
  laser: { color: 0xfff1c4, spread: 0.35, beam: true },
  spotgun: { color: 0xffc56b, spread: 1.3 },
  studgun: { color: 0xffd27a, spread: 0.8 },
  fsw: { color: 0xc0c8d0, spread: 0.25 },
  iron: { color: 0xe5e7eb, spread: 0.12 },
  spraygun: { mist: true, spread: 0.4 },
  powdergun: { mist: true, color: 0xe5e7eb, spread: 0.5 },
  polisher: { color: 0xe5e7eb, spread: 0.2 },
  grinder: { color: 0xffc56b, spread: 0.6 },
  spindle: { color: 0xffc56b, spread: 0.5 },
  brush: { color: 0xbfe6ff, spread: 0.55 },
  blaster: { color: 0x9ca3af, spread: 0.75 },
  router: { color: 0xd6c7a1, spread: 0.5 },
  drill: { color: 0xb0b8c4, spread: 0.4 },
};

/**
 * createToolKit(THREE) — builds tools with shared materials.
 *   build(look, { half, span }) → { group, fingers, fingerTool, look, beam, spin }
 *     half: half-width the fingers close to; span: [w, d] of a vacuum frame.
 *   dispose()
 */
export function createToolKit(THREE, TOOL_LEN = 0.16) {
  const mats = new Map();
  const mat = (id, o) => {
    if (!mats.has(id)) mats.set(id, new (o.clearcoat ? THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial : THREE.MeshStandardMaterial)(o));
    return mats.get(id);
  };
  const C = {
    dark: () => mat("dark", { color: 0x2b3442, metalness: 0.5, roughness: 0.42 }),
    black: () => mat("black", { color: 0x15181c, metalness: 0.2, roughness: 0.55 }),
    alu: () => mat("alu", { color: 0xc6cdd5, metalness: 0.85, roughness: 0.3 }),
    steel: () => mat("steel", { color: 0x8e99a6, metalness: 0.8, roughness: 0.32 }),
    chrome: () => mat("chrome", { color: 0xe8edf2, metalness: 1, roughness: 0.12 }),
    rubber: () => mat("rubber", { color: 0x1a1d22, roughness: 0.9 }),
    copper: () => mat("copper", { color: 0xc27a3a, metalness: 0.85, roughness: 0.3 }),
    brass: () => mat("brass", { color: 0xb58d4a, metalness: 0.85, roughness: 0.3 }),
    blue: () => mat("blue", { color: 0x1d4ed8, metalness: 0.3, roughness: 0.4 }),
    teal: () => mat("teal", { color: 0x0e7490, metalness: 0.3, roughness: 0.4 }),
    orange: () => mat("orange", { color: 0xea580c, metalness: 0.2, roughness: 0.45 }),
    red: () => mat("red", { color: 0xb91c1c, metalness: 0.3, roughness: 0.45 }),
    yellow: () => mat("yellow", { color: 0xf2b705, metalness: 0.2, roughness: 0.45 }),
    white: () => mat("white", { color: 0xeef0f2, metalness: 0.1, roughness: 0.4 }),
    silicone: () => mat("silicone", { color: 0x2b6cb0, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    bellows: () => mat("bellows", { color: 0x3a3f46, roughness: 0.85 }),
    beam: () => mat("beam", { color: 0xff3b30, emissive: 0xff2010, emissiveIntensity: 2.5, transparent: true, opacity: 0.85, depthWrite: false }),
    pad: () => mat("pad", { color: 0xf3e3b0, roughness: 1 }),
    bristle: () => mat("bristle", { color: 0x1f3a8a, roughness: 1 }),
    abrasive: () => mat("abrasive", { color: 0x8b5e34, roughness: 0.95 }),
    tin: () => mat("tin", { color: 0xd4a017, metalness: 0.85, roughness: 0.3 }),
    translucent: () => mat("translucent", { color: 0xf3f4f6, roughness: 0.2, transparent: true, opacity: 0.6 }),
  };

  function build(look = "parallel", opts = {}) {
    const group = new THREE.Group();
    group.name = `tool:${look}`;
    let fingers = [];
    let beam = null;
    let spin = null;
    const put = (geo, m, x, y = 0, z = 0, rx = 0, ry = 0, rz = 0, parent = group) => {
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z);
      o.rotation.set(rx, ry, rz);
      o.castShadow = true;
      o.receiveShadow = true;
      parent.add(o);
      return o;
    };
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    /** A cylinder along the tool axis from x0 to x1. */
    const rod = (r0, r1, x0, x1, m, y = 0, z = 0, seg = 20, parent = group) => put(new THREE.CylinderGeometry(r1, r0, x1 - x0, seg), m, (x0 + x1) / 2, y, z, 0, 0, -Math.PI / 2, parent);
    const hose = (pts, r, m) => put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 20, r, 8, false), m, 0);
    const adapter = () => rod(0.045, 0.045, 0, 0.022, C.dark());
    const half = Math.max(0.01, opts.half || 0.05);
    const open = Math.max(0.075, half + 0.03);

    switch (look) {
      case "parallel":
      case "dual": {
        adapter();
        const depth = Math.max(0.16, 2 * open + 0.04);
        put(box(0.07, 0.09, depth), C.dark(), 0.055);
        put(new THREE.CylinderGeometry(0.006, 0.006, depth - 0.02, 10), C.chrome(), 0.08, 0.03, 0, Math.PI / 2);
        put(new THREE.CylinderGeometry(0.006, 0.006, depth - 0.02, 10), C.chrome(), 0.08, -0.03, 0, Math.PI / 2);
        for (const sgn of [-1, 1]) {
          const f = new THREE.Group();
          put(box(0.09, 0.04, 0.016), C.alu(), 0.12, 0, 0, 0, 0, 0, f);
          put(box(0.035, 0.034, 0.004), C.rubber(), 0.145, 0, -sgn * 0.01, 0, 0, 0, f);
          f.position.z = sgn * open;
          group.add(f);
          fingers.push(f);
        }
        if (look === "dual") {
          put(box(0.06, 0.07, depth * 0.8), C.dark(), 0.05, 0.1);
          for (const sgn of [-1, 1]) put(box(0.08, 0.03, 0.016), C.alu(), 0.11, 0.1, sgn * (half + 0.012));
        }
        break;
      }
      case "soft": {
        adapter();
        rod(0.04, 0.04, 0.022, 0.06, C.white());
        put(box(0.03, 0.09, Math.max(0.12, 2 * open + 0.03)), C.white(), 0.07);
        for (const sgn of [-1, 1]) {
          const f = new THREE.Group();
          for (const y of [-0.024, 0.024]) {
            const seg = new THREE.CapsuleGeometry(0.011, 0.06, 4, 10);
            const o = put(seg, C.silicone(), 0.12, y, 0, 0, 0, -Math.PI / 2, f);
            // Curl the fingertip in towards the product.
            o.rotation.y = sgn * 0.28;
            o.position.z = -sgn * 0.004;
          }
          f.position.z = sgn * open;
          group.add(f);
          fingers.push(f);
        }
        hose([[0.03, 0.05, 0], [0.05, 0.08, 0.02], [0.02, 0.12, 0.03]], 0.004, C.translucent());
        break;
      }
      case "cups": {
        adapter();
        put(box(0.03, 0.1, 0.1), C.alu(), 0.04);
        for (const [y, z] of [[-0.03, -0.03], [-0.03, 0.03], [0.03, -0.03], [0.03, 0.03]]) {
          rod(0.006, 0.006, 0.055, 0.12, C.steel(), y, z, 8);
          for (let k = 0; k < 3; k++) rod(0.013, 0.013, 0.12 + k * 0.011, 0.128 + k * 0.011, C.bellows(), y, z, 14);
          rod(0.016, 0.01, 0.152, 0.16, C.bellows(), y, z, 14);
        }
        break;
      }
      case "vacuum": {
        adapter();
        put(box(0.03, 0.24, 0.24), C.alu(), 0.045);
        put(box(0.06, 0.05, 0.08), C.blue(), 0.035, 0.08);
        for (const [y, z] of [[-0.08, -0.08], [-0.08, 0.08], [0.08, -0.08], [0.08, 0.08]]) {
          rod(0.007, 0.007, 0.06, 0.13, C.steel(), y, z, 8);
          for (let k = 0; k < 2; k++) rod(0.024, 0.024, 0.13 + k * 0.012, 0.139 + k * 0.012, C.bellows(), y, z, 18);
          rod(0.03, 0.018, 0.152, 0.16, C.bellows(), y, z, 18);
        }
        hose([[0.04, 0.1, 0], [0.02, 0.16, 0.04], [-0.04, 0.2, 0.05]], 0.008, C.black());
        break;
      }
      case "frame": {
        adapter();
        const [sw, sd] = opts.span || [0.5, 0.35];
        const a = Math.max(0.3, sw * 0.85) / 2, b = Math.max(0.22, sd * 0.85) / 2;
        put(box(0.04, 0.05, 0.08), C.blue(), 0.04);
        put(box(0.025, 2 * a, 0.03), C.alu(), 0.07);
        put(box(0.025, 0.03, 2 * b), C.alu(), 0.07);
        for (const [y, z] of [[-a, -b], [-a, b], [a, -b], [a, b], [0, -b], [0, b]]) {
          put(box(0.025, 0.03, 0.03), C.alu(), 0.07, y, z);
          rod(0.006, 0.006, 0.08, 0.135, C.steel(), y, z, 8);
          rod(0.036, 0.022, 0.135, 0.16, C.bellows(), y, z, 18);
        }
        if (Math.abs(b) > 0.12) for (const y of [-a, a]) put(box(0.025, 0.03, 2 * b), C.alu(), 0.07, y);
        break;
      }
      case "magnet": {
        adapter();
        put(box(0.04, 0.12, 0.12), C.dark(), 0.04);
        put(box(0.09, 0.2, 0.16), mat("magnet", { color: 0x3a3f46, metalness: 0.6, roughness: 0.5 }), 0.105);
        put(box(0.012, 0.202, 0.162), C.red(), 0.08);
        put(box(0.006, 0.19, 0.15), C.steel(), 0.157);
        hose([[0.06, 0.1, 0], [0.03, 0.15, 0.03], [-0.03, 0.18, 0.04]], 0.006, C.black());
        break;
      }
      case "fork": {
        // Claw gripper: side plates reach down past the product and close their tines under it.
        adapter();
        const [sw, sd] = opts.span || [0.5, 0.32];
        const hh = opts.height || 0.13;
        const a = sw / 2 + 0.02, dz = Math.max(0.16, sd * 0.8);
        put(box(0.04, 2 * a + 0.03, dz), C.dark(), 0.05);
        put(box(0.02, 2 * a - 0.05, dz * 0.85), C.yellow(), TOOL_LEN - 0.012);
        rod(0.012, 0.012, 0.07, TOOL_LEN - 0.022, C.chrome(), a * 0.45, 0, 10);
        rod(0.012, 0.012, 0.07, TOOL_LEN - 0.022, C.chrome(), -a * 0.45, 0, 10);
        const bottom = TOOL_LEN + hh + 0.014;
        for (const sgn of [-1, 1]) {
          put(box(bottom - 0.07, 0.012, dz), C.steel(), (0.07 + bottom) / 2, sgn * a);
          for (const z of [-dz * 0.35, 0, dz * 0.35]) put(box(0.012, 0.08, 0.026), C.steel(), bottom, sgn * (a - 0.04), z);
        }
        break;
      }
      case "torch": {
        adapter();
        put(box(0.04, 0.07, 0.05), C.red(), 0.035, 0.04);
        rod(0.022, 0.02, 0.02, 0.11, C.black());
        const neck = new THREE.Group();
        neck.position.set(0.11, 0, 0);
        neck.rotation.z = -0.55;
        rod(0.016, 0.014, 0, 0.06, C.black(), 0, 0, 14, neck);
        rod(0.014, 0.009, 0.06, 0.085, C.copper(), 0, 0, 14, neck);
        rod(0.004, 0.0035, 0.085, 0.092, C.copper(), 0, 0, 8, neck);
        group.add(neck);
        hose([[0.04, 0.07, 0], [0.02, 0.13, 0.02], [-0.05, 0.16, 0.03]], 0.01, C.black());
        break;
      }
      case "laser": {
        adapter();
        put(box(0.07, 0.06, 0.06), C.white(), 0.06);
        put(box(0.03, 0.062, 0.062), C.dark(), 0.04);
        rod(0.018, 0.016, 0.095, 0.14, C.alu());
        rod(0.012, 0.006, 0.14, TOOL_LEN - 0.004, C.copper());
        hose([[0.06, 0.03, 0.02], [0.03, 0.1, 0.04], [-0.04, 0.14, 0.05]], 0.006, mat("fibre", { color: 0xf59e0b, roughness: 0.5 }));
        beam = put(new THREE.CylinderGeometry(0.0018, 0.0018, 1, 6), C.beam(), TOOL_LEN + 0.03, 0, 0, 0, 0, -Math.PI / 2);
        beam.scale.y = 0.06;
        beam.visible = false;
        beam.castShadow = false;
        break;
      }
      case "spotgun": {
        adapter();
        put(box(0.1, 0.11, 0.12), mat("xformer", { color: 0x51606f, metalness: 0.5, roughness: 0.45 }), 0.06);
        rod(0.02, 0.02, 0.11, 0.14, C.alu());
        rod(0.008, 0.006, 0.14, TOOL_LEN, C.copper());
        put(box(0.03, 0.1, 0.03), C.alu(), 0.12, 0.09);
        put(box(0.08, 0.03, 0.03), C.alu(), 0.17, 0.125);
        put(box(0.03, 0.1, 0.03), C.alu(), 0.2, 0.085);
        rod(0.006, 0.008, TOOL_LEN + 0.016, 0.2, C.copper(), 0.04);
        break;
      }
      case "studgun": {
        adapter();
        rod(0.03, 0.03, 0.02, 0.12, mat("studbody", { color: 0x3f6b4a, metalness: 0.3, roughness: 0.45 }));
        rod(0.012, 0.009, 0.12, TOOL_LEN, C.brass());
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          put(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 6), C.steel(), 0.13, Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0, 0, -Math.PI / 2);
        }
        hose([[0.06, 0.03, 0], [0.04, 0.09, 0.02], [-0.03, 0.12, 0.03]], 0.007, C.black());
        break;
      }
      case "sonotrode": {
        adapter();
        rod(0.032, 0.032, 0.022, 0.08, C.alu());
        rod(0.026, 0.026, 0.08, 0.11, C.chrome());
        put(new THREE.TorusGeometry(0.028, 0.004, 6, 20), C.black(), 0.095, 0, 0, 0, Math.PI / 2);
        put(box(0.05, 0.05, 0.02), mat("horn", { color: 0xaeb4bb, metalness: 0.9, roughness: 0.25 }), 0.135);
        break;
      }
      case "fsw": {
        adapter();
        rod(0.055, 0.05, 0.022, 0.11, C.dark());
        rod(0.025, 0.02, 0.11, 0.14, C.steel());
        rod(0.012, 0.012, 0.14, TOOL_LEN - 0.006, C.chrome());
        rod(0.004, 0.003, TOOL_LEN - 0.006, TOOL_LEN + 0.004, C.chrome(), 0, 0, 8);
        break;
      }
      case "iron": {
        adapter();
        rod(0.016, 0.014, 0.022, 0.1, C.blue());
        rod(0.007, 0.006, 0.1, 0.14, C.steel());
        const tip = new THREE.Group();
        tip.position.x = 0.14;
        tip.rotation.z = -0.4;
        rod(0.004, 0.0015, 0, 0.025, C.copper(), 0, 0, 8, tip);
        group.add(tip);
        hose([[0.05, 0.02, 0.02], [0.1, 0.03, 0.025], [0.15, 0.01, 0.01]], 0.0016, C.tin());
        break;
      }
      case "spraygun":
      case "powdergun": {
        adapter();
        if (look === "spraygun") {
          put(box(0.06, 0.07, 0.045), C.alu(), 0.06);
          rod(0.018, 0.014, 0.09, 0.135, C.chrome());
          rod(0.012, 0.007, 0.135, TOOL_LEN, C.brass());
          put(box(0.012, 0.012, 0.05), C.chrome(), TOOL_LEN - 0.006);
        } else {
          rod(0.02, 0.018, 0.022, 0.14, mat("powder", { color: 0xe5e7eb, metalness: 0.1, roughness: 0.45 }));
          put(new THREE.ConeGeometry(0.016, 0.02, 16), C.black(), TOOL_LEN - 0.01, 0, 0, 0, 0, Math.PI / 2);
        }
        hose([[0.05, 0.035, 0], [0.03, 0.1, 0.03], [-0.05, 0.13, 0.04]], 0.007, C.black());
        hose([[0.05, 0.035, 0.015], [0.02, 0.09, 0.05], [-0.05, 0.12, 0.06]], 0.005, C.blue());
        break;
      }
      case "nozzle": {
        adapter();
        put(box(0.05, 0.06, 0.05), C.teal(), 0.05);
        rod(0.016, 0.016, 0.03, 0.12, C.translucent(), 0.05);
        rod(0.012, 0.012, 0.035, 0.11, mat("adhesive", { color: 0xd97706, roughness: 0.4 }), 0.05, 0, 14);
        rod(0.012, 0.006, 0.075, 0.13, C.steel());
        rod(0.0025, 0.0018, 0.13, TOOL_LEN, C.chrome(), 0, 0, 8);
        break;
      }
      case "polisher":
      case "grinder":
      case "spindle":
      case "router":
      case "drill": {
        adapter();
        rod(0.04, 0.04, 0.022, 0.1, look === "router" || look === "drill" ? C.white() : C.dark());
        const head = new THREE.Group();
        if (look === "polisher") {
          rod(0.05, 0.05, 0.1, 0.11, C.dark(), 0, 0, 24, head);
          rod(0.065, 0.065, 0.11, TOOL_LEN, C.pad(), 0, 0, 28, head);
        } else if (look === "router") {
          rod(0.02, 0.016, 0.1, 0.125, C.chrome(), 0, 0, 16, head);
          rod(0.004, 0.004, 0.125, TOOL_LEN, C.tin(), 0, 0, 8, head);
        } else if (look === "drill") {
          rod(0.022, 0.016, 0.1, 0.12, C.steel(), 0, 0, 16, head);
          rod(0.003, 0.003, 0.12, TOOL_LEN + 0.01, C.tin(), 0, 0, 8, head);
          put(new THREE.CylinderGeometry(0.003, 0.003, 0.07, 6), C.steel(), 0.13, 0.035, 0, 0, 0, -Math.PI / 2);
          put(new THREE.CylinderGeometry(0.003, 0.003, 0.07, 6), C.steel(), 0.13, -0.035, 0, 0, 0, -Math.PI / 2);
          put(box(0.008, 0.09, 0.04), C.dark(), 0.165);
        } else {
          rod(0.03, 0.03, 0.1, 0.13, C.steel(), 0, 0, 20, head);
          rod(0.07, 0.07, 0.13, TOOL_LEN - 0.012, C.abrasive(), 0, 0, 32, head);
          put(new THREE.CylinderGeometry(0.078, 0.078, 0.03, 24, 1, true, 0, Math.PI), C.steel(), 0.125, 0, 0, 0, 0, -Math.PI / 2);
        }
        group.add(head);
        spin = head;
        break;
      }
      case "brush": {
        adapter();
        rod(0.04, 0.04, 0.022, 0.1, C.dark());
        const head = new THREE.Group();
        rod(0.03, 0.03, 0.1, 0.12, C.steel(), 0, 0, 16, head);
        rod(0.08, 0.075, 0.12, TOOL_LEN, C.bristle(), 0, 0, 28, head);
        group.add(head);
        spin = head;
        hose([[0.06, 0.05, 0], [0.12, 0.09, 0.02], [0.16, 0.07, 0.03]], 0.004, C.blue());
        break;
      }
      case "blaster": {
        adapter();
        put(box(0.05, 0.06, 0.05), C.dark(), 0.05);
        rod(0.016, 0.009, 0.075, TOOL_LEN, C.black());
        hose([[0.05, 0.035, 0], [0.02, 0.1, 0.03], [-0.05, 0.13, 0.04]], 0.012, C.black());
        break;
      }
      case "roller": {
        adapter();
        put(box(0.08, 0.06, 0.06), C.dark(), 0.06);
        put(box(0.05, 0.012, 0.05), C.steel(), 0.12, 0.025);
        put(box(0.05, 0.012, 0.05), C.steel(), 0.12, -0.025);
        put(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 24), C.chrome(), TOOL_LEN - 0.022, 0, 0, Math.PI / 2);
        break;
      }
      case "blade": {
        adapter();
        put(box(0.06, 0.05, 0.05), C.white(), 0.05);
        put(box(0.03, 0.03, 0.03), C.steel(), 0.09);
        put(box(0.07, 0.11, 0.003), C.chrome(), 0.13);
        break;
      }
      case "fillnozzle": {
        adapter();
        rod(0.028, 0.028, 0.022, 0.1, C.chrome());
        put(box(0.03, 0.05, 0.05), C.steel(), 0.07, 0.04);
        put(new THREE.ConeGeometry(0.012, 0.06, 18), C.chrome(), 0.13, 0, 0, 0, 0, -Math.PI / 2);
        hose([[0.07, 0.065, 0], [0.04, 0.12, 0.03], [-0.04, 0.15, 0.04]], 0.008, C.translucent());
        break;
      }
      case "pipette": {
        adapter();
        put(box(0.08, 0.05, 0.04), C.white(), 0.06);
        rod(0.006, 0.006, 0.1, 0.12, C.steel(), 0, 0, 10);
        put(new THREE.ConeGeometry(0.006, 0.045, 12), C.translucent(), 0.14, 0, 0, 0, 0, -Math.PI / 2);
        break;
      }
      case "capper":
      case "crimper": {
        adapter();
        rod(0.035, 0.035, 0.022, 0.1, look === "capper" ? C.dark() : C.alu());
        const head = new THREE.Group();
        rod(0.03, 0.03, 0.1, TOOL_LEN - 0.008, C.steel(), 0, 0, 20, head);
        put(new THREE.TorusGeometry(0.024, 0.005, 6, 20), C.red(), TOOL_LEN - 0.006, 0, 0, 0, Math.PI / 2, 0, head);
        group.add(head);
        spin = look === "capper" ? head : null;
        break;
      }
      case "sealhead": {
        adapter();
        put(box(0.06, 0.08, 0.08), C.dark(), 0.05);
        put(box(0.03, 0.15, 0.12), mat("heater", { color: 0xb45309, metalness: 0.6, roughness: 0.4, emissive: 0x3a1004 }), 0.11);
        put(box(0.012, 0.16, 0.13), C.steel(), TOOL_LEN - 0.006);
        hose([[0.06, 0.04, 0.04], [0.04, 0.1, 0.06], [-0.03, 0.12, 0.06]], 0.004, C.red());
        break;
      }
      case "labeler": {
        adapter();
        put(box(0.03, 0.14, 0.04), C.alu(), 0.05, 0.03);
        put(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 24), C.white(), 0.06, 0.07, 0, Math.PI / 2);
        put(new THREE.CylinderGeometry(0.015, 0.015, 0.032, 16), C.dark(), 0.06, 0.07, 0, Math.PI / 2);
        put(box(0.07, 0.03, 0.03), C.dark(), 0.12);
        put(box(0.012, 0.06, 0.05), mat("tamp", { color: 0x16a34a, roughness: 0.6 }), TOOL_LEN - 0.006);
        break;
      }
      case "printer": {
        adapter();
        put(box(0.09, 0.08, 0.06), C.dark(), 0.08);
        put(box(0.01, 0.06, 0.04), C.black(), TOOL_LEN - 0.005);
        for (const [z, c] of [[-0.015, 0x0ea5e9], [0, 0xdb2777], [0.015, 0xf59e0b]]) hose([[0.06, 0.04, z], [0.03, 0.09, z], [-0.04, 0.12, z]], 0.003, mat("ink" + c, { color: c, roughness: 0.4 }));
        break;
      }
      case "driver":
      case "riveter":
      case "nailer":
      case "tier": {
        adapter();
        if (look === "nailer" || look === "tier") {
          put(box(0.1, 0.06, 0.05), look === "tier" ? C.yellow() : C.red(), 0.07);
          put(box(0.12, 0.025, 0.03), C.dark(), 0.08, -0.05, 0, 0, 0, 0.35);
          rod(0.01, 0.008, 0.12, TOOL_LEN, C.steel());
        } else {
          rod(0.03, 0.03, 0.022, 0.11, look === "riveter" ? C.dark() : C.blue());
          const head = new THREE.Group();
          rod(0.014, 0.01, 0.11, 0.14, C.steel(), 0, 0, 14, head);
          rod(0.004, 0.003, 0.14, TOOL_LEN, C.chrome(), 0, 0, 8, head);
          group.add(head);
          spin = look === "driver" ? head : null;
          if (look === "driver") hose([[0.1, 0.02, 0.02], [0.05, 0.08, 0.04], [-0.03, 0.11, 0.05]], 0.005, C.translucent());
        }
        break;
      }
      case "none":
        break;
      default:
        adapter();
        rod(0.028, 0.028, 0.03, 0.12, C.orange());
        rod(0.012, 0.012, 0.12, TOOL_LEN, C.steel());
    }
    return { look, group, fingers, fingerTool: FINGERED.has(look), beam, spin, open };
  }

  return {
    build,
    dispose() {
      mats.forEach((m) => m.dispose());
      mats.clear();
    },
  };
}
