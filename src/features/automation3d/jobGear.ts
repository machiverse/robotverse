/**
 * Automation Studio — the robot and the end-of-arm tool each job really needs,
 * the way an integrator picks them before looking at any catalogue:
 *   - the tool family follows the job's program (a gripper loads a machine, a
 *     torch welds, a vacuum gripper takes parts out of a mould or off a pallet);
 *   - some jobs have robots made for them (hollow-wrist arc robots, heavy
 *     spot-welding robots, 4-axis palletizers, painting robots);
 *   - painting, laboratory and classroom robots are never offered for other work.
 * Pure data and regexes: equipmentScore.ts applies them to the catalogue.
 */

import { processKind, type ProcessKind } from "./processProfiles";

/** End-of-arm tool families, as eoatKind() in robotSim.js names them. */
export type ToolFamily = "parallel" | "dual" | "vacuum" | "magnet" | "fork" | "torch" | "spindle" | "driver" | "nozzle";
export const GRIP_FAMILIES: ToolFamily[] = ["parallel", "dual", "vacuum", "magnet", "fork"];

export interface JobGear {
  /** Tool families this job's program can use, best first. */
  tools: ToolFamily[];
  /** Words of the best tool for this job inside its family ("spot", "sander", "spray"). */
  prefer?: RegExp;
  /** A broad rule (welding, assembly, packing…): the station's tooling words may narrow it to a specific tool. */
  generic?: boolean;
  /** Tools of the right family that are wrong for this job (a spot gun for MIG welding). */
  avoid?: RegExp;
  /** A tool the job needs that the Directory may not list, and the words that name it: when no listed
   *  tool has them, the nearest tool is offered and says so. */
  special?: [string, RegExp];
  robot: {
    /** Robot model families built for this job. */
    prefer?: (name: string) => boolean;
    /** What the preferred family is, for the reason shown to the user. */
    why?: string;
    /** Robot type made for this job ("Palletizing" = 4-axis palletizer). */
    type?: string;
    /** Painting robots (explosion-proof, hollow wrist for paint lines) are offered only for painting. */
    paint?: boolean;
    /** Collaborative robot required (works next to people without a fence). */
    cobot?: boolean;
    /** Laboratory robots allowed. */
    lab?: boolean;
    /** The catalogue's application tags do not cover this job: rank by model family instead. */
    anyApps?: boolean;
  };
}

/* ------------------------------------------------------------ robot families */

/** Hollow-wrist arc-welding robots: the torch cable runs through the arm. */
const ARC_CASE = /\dID\b|LeanID/;
const ARC = /ARC ?Mate|M-10iD|\bAR\d{3,4}\b|\bMA\d{4}\b|\bBA0\d\d|\bT[AMLS]-\d{4}\b|\barc\b|\bHW\b|\bFD-[A-Z]|\bAX-V|\bNV\d|QIROX|Romat/i;
export const isArcRobot = (name: string) => ARC_CASE.test(name) || ARC.test(name);
/** Series sold for spot welding only (dress pack, servo-gun axis); general robots with spot variants are not. */
export const isSpotSeries = (name: string) => /SpotPack|\bBX\d{3}|\bSRA\d{3}|\bSP\d{3}|\bES\d{3}/i.test(name);
/** Heavy robots built and dressed for spot-welding guns. */
const SPOT = /SpotPack|\bBX\d{3}|\bSRA\d{3}|\bSP\d{3}|\bES\d{3}|R-2000i[A-D]\/\d{3}F\b|\bKR (?:210|240) R2[5-9]00|\bIRB 6700-2\d\d|\bHS2\d\d|\bNJ 2\d\d/i;
/** Painting robots. */
const PAINT = /IRB 5[2-5]\d\d|IRB 5510|IRB 580|\bP-\d{2,3}i|\bK[EFGJ]\d{3}|\b[ME]PX\d|EcoRP/i;
export const isPaintRobot = (name: string, apps?: string[]) => PAINT.test(name) || !!apps?.includes("Painting");
/** Collaborative robots by their well-known names, for listings that do not say so. */
export const isCobotName = (text: string) => /cobot|collaborative|\bur\d|crx|techman|doosan|gofa|crb\s?1|iisy/i.test(text);
/** Arms in the makers' current ranges: an integrator quotes these for a new cell, not a discontinued model. */
const CURRENT = [
  /\bIRB (?:1200|1300|1520ID|1600|1660ID|2600|2600ID|4600|6650S|6700|7600|460|660|760)\b/,
  /LR Mate 200iD|M-10iD|M-20iD|M-710iC|M-900iB|R-2000i[CD]|M-410iC|ARC Mate 1\d0iD|\bCRX-/,
  /\bKR \d+ R\d{3,4}(?:-2)?\b|\b(?:prime|ultra|extra)\b|\bKR \d+ PA\b|sixx|iisy/,
  /\bGP\d{1,3}L?\b|\bAR\d{3,4}\b|\bHC\d{2}|\bPL\d{3}\b|\bSP\d{3}\b|\bMPX\d{4}/,
  /\bRS0\d{2}[NLX]|\bRS\d{3}[NLX]|\bBX\d{3}[LNSX]|\bCP\d{3}L|\bBA0\d{2}[NL]/,
  /\bMZ\d{2}|\bMC\d{2,3}|\bSRA\d{3}|TX2-\d+|Racer|\bNJ ?\d{3}|RV-\d+FR|\bUR\d+e\b|\bUR(?:15|20|30)\b/,
];
export const isCurrentRobot = (name: string) => CURRENT.some((re) => re.test(name));
/** Laboratory / semiconductor robots. */
export const isLabRobot = (name: string) => /PreciseFlex|wafer|semi(?:con|star)|clean ?room/i.test(name);
/** Desktop and classroom arms. */
export const isEduRobot = (name: string) => /Magician|uArm|Wlkata|Niryo|myCobot|Annin|\bMG400\b|Ned2/i.test(name);
/** Mounting variants a floor-standing cell cannot use. */
export const isMountVariant = (name: string) => /ceiling|\bwall\b|shelf/i.test(name);

/* ------------------------------------------------------------- tool families */

/** Grippers sized by the parts they carry, from the product line (light ≈ 2 kg, medium ≈ 8 kg, heavy above). */
const GRIP_LIGHT = /label applicator|\bRG2\b|2F-85|2F-140|Hand-E|EGP 40|EGK 40|PGN-plus-P (?:40|50)\b|GEP2016|ZXP7|EPick|AirPick|MPG-plus|EHPS|SP1\b|piGRIP|SPOB|Bernoulli/i;
const GRIP_HEAVY = /sack|clamp gripper|mandrel|PZN-plus|PGN-plus-E 100|80-1-AS|FXCB|FMP|MHM-25D|PowerPick|piCOBOT L\b|VGP20|2FGP20/i;
export type GripSize = "light" | "medium" | "heavy";
export const gripSize = (name: string): GripSize => (GRIP_LIGHT.test(name) ? "light" : GRIP_HEAVY.test(name) ? "heavy" : "medium");
/** The gripper size for a robot payload: the part is about 60% of it, the gripper and margin the rest. */
export const sizeFor = (robotKg: number): GripSize => (robotKg * 0.6 <= 3 ? "light" : robotKg * 0.6 <= 12 ? "medium" : "heavy");

/** Tools built for one robot model or brand, and the robots they fit. */
const LOCKED: [RegExp, RegExp][] = [
  [/yumi|irb 14000/i, /yumi|irb 1405?0/i],
  [/preciseflex/i, /brooks|preciseflex/i],
  [/kinova/i, /kinova/i],
  [/niryo/i, /niryo/i],
  [/ufactory|xarm|lite ?6|bio gripper/i, /ufactory|xarm|lite ?6/i],
  [/mecademic/i, /mecademic|meca500/i],
  [/e\.do/i, /e\.do/i],
];
/** True when the tool is made for another robot than `arm` (brand and model text). */
export const lockedOut = (tool: string, arm?: string) => {
  const rule = LOCKED.find(([re]) => re.test(tool));
  return !!rule && !(arm && rule[1].test(arm));
};
/** Parts of the cell that are not the working tool: they stand beside the robot (power source, wire
 *  feeder, torch cleaner, tip dresser, screw feeder, proportioner, vacuum generator) or sit between the
 *  flange and the tool (collision sensor, compensation unit, adapter plate, spare suction cups). */
const COMPONENT = /torch cleaning|cleaning station|reamer|power source|feeder|presenter|proportioner|controller|vacuum generator|compensation unit|collision|tip dress|suction cup|bracket|flange|extender|on-arm mount/i;
export const isComponent = (name: string, category = "") => COMPONENT.test(name) || /mounting|adapter/i.test(category);

/** Grippers for one kind of part only (soft food, flat glass, wafers): offered when the job says so. */
export const SPECIALTY_GRIP = /soft gripper|gecko|bernoulli|adaptive shape|adaptive gripper finger|magnetic|robotic hand/i;
/** Parts of a gripper rather than a gripper. */
export const GRIP_PART = /suction cup|vacuum generator|compensation unit|finger\b/i;
/** Grippers made for cobots (electric, ISO 9409-1-50 flange, plug-and-play). */
export const COBOT_EOAT = /onrobot|robotiq|co-act|\bEGH\b|HRC-\d|piCOBOT|GEH6000/i;
/** Industrial grippers (pneumatic or electric, sized for fenced cells). */
export const INDUSTRIAL_EOAT = /SCHUNK (?:PGN|PZN|JGP|EGU|EGP|EGK)|Zimmer GEP|Festo|SMC|Schmalz|Piab piGRIP|Piab BGX/i;

/* ------------------------------------------------------------------ the jobs */

const ARC_ROBOT = { prefer: isArcRobot, why: "hollow-wrist arc-welding robot" };
const SPOT_ROBOT = { prefer: (n: string) => SPOT.test(n), why: "spot-welding robot", anyApps: true };
const PAINT_ROBOT = { prefer: (n: string) => PAINT.test(n), why: "painting robot", paint: true, anyApps: true };
const RULES: [RegExp, JobGear][] = [
  // Welding: the torch family, with the right gun for the process.
  [/spot weld/i, { tools: ["torch"], prefer: /spot/i, robot: SPOT_ROBOT }],
  [/stud weld/i, { tools: ["torch"], prefer: /stud/i, avoid: /spot|plasma|cutting|friction/i, special: ["stud welding gun", /stud/i], robot: {} }],
  [/laser weld/i, { tools: ["torch"], prefer: /laser weld/i, avoid: /spot|stud|plasma|cutting|friction/i, special: ["laser welding head", /laser weld/i], robot: ARC_ROBOT }],
  [/ultrasonic/i, { tools: ["torch"], prefer: /ultrason/i, avoid: /spot|stud|plasma|cutting|friction/i, special: ["ultrasonic welding horn", /ultrason/i], robot: {} }],
  [/\btig\b/i, { tools: ["torch"], prefer: /\btig\b/i, avoid: /spot|stud|plasma|cutting|friction/i, robot: ARC_ROBOT }],
  // Friction stir: a stiff spindle head pushed with kilonewtons, on a heavy robot.
  [/friction stir/i, { tools: ["torch", "spindle"], prefer: /friction|fsw/i, avoid: /spot|mig|tig/i, special: ["friction-stir welding head", /friction|fsw/i], robot: { anyApps: true, why: "heavy, stiff robot for the process force" } }],
  // Soldering is not arc welding: a soldering head on a small robot.
  [/solder/i, { tools: ["torch"], prefer: /solder/i, avoid: /\bmig\b|weld|spot|plasma|cutting/i, special: ["soldering head", /solder/i], robot: {} }],
  [/heavy fabrication|gantry weld/i, { tools: ["torch"], prefer: /water-cooled|w500/i, avoid: /spot|stud|plasma|cutting|friction/i, robot: ARC_ROBOT }],
  [/weld|solder/i, { generic: true, tools: ["torch"], prefer: /\bmig\b|robotic torch/i, avoid: /spot|stud|plasma|cutting|friction/i, robot: ARC_ROBOT }],
  // Surface work: the spindle family, the head that suits the finish.
  // Jewellery: a small polishing spindle, or the robot holds the piece against fixed buffing wheels.
  [/jewel/i, { tools: ["spindle", "parallel"], prefer: /polish|sander|sanding|buff/i, avoid: /blade|knife|\bsaw\b/i, robot: {} }],
  [/polish/i, { tools: ["spindle"], prefer: /polish|sander|sanding/i, avoid: /blade|knife|\bsaw\b/i, robot: {} }],
  [/laser clean/i, { tools: ["spindle"], prefer: /laser clean/i, special: ["laser cleaning head", /laser clean/i], robot: {} }],
  [/deflash/i, { tools: ["spindle"], prefer: /deburr/i, avoid: /blade|knife|\bsaw\b/i, robot: {} }],
  [/deburr/i, { tools: ["spindle"], prefer: /deburr/i, avoid: /blade|knife|\bsaw\b/i, robot: {} }],
  // Washing and blasting: a nozzle does the work, a spindle (brush) is the alternative.
  [/part cleaning|wash|dry ice/i, { tools: ["nozzle", "spindle"], prefer: /wash|clean|blow/i, avoid: /paint|dispens|fill/i, special: ["high-pressure wash nozzle", /wash|clean/i], robot: {} }],
  [/blast/i, { tools: ["nozzle", "spindle"], prefer: /blast/i, avoid: /paint|dispens|fill/i, special: ["blast nozzle", /blast/i], robot: {} }],
  [/grind|surface prep|finish/i, { generic: true, tools: ["spindle"], prefer: /grind/i, avoid: /blade|knife|\bsaw\b/i, robot: {} }],
  // Coating and dosing: the nozzle family.
  [/potting|conformal|gap filler/i, { tools: ["nozzle"], prefer: /dispens/i, avoid: /spray|paint|waterjet|wash|blast|concrete|thermal|hvof/i, robot: {} }],
  [/thermal spray|cladding/i, { tools: ["nozzle"], prefer: /thermal|hvof|plasma spray/i, avoid: /paint|waterjet|wash|blast|concrete/i, special: ["thermal spray gun", /thermal|hvof/i], robot: {} }],
  [/powder coat/i, { tools: ["nozzle"], prefer: /spray|paint/i, avoid: /waterjet|wash|blast|concrete|thermal|hvof/i, robot: {} }],
  // Masking places plugs and tape; a plating line hangs racks in tanks: grippers first.
  [/mask/i, { tools: ["parallel", "nozzle"], prefer: /EGP|EGK|Hand-E|2F-85|RG2/i, robot: {} }],
  [/plating|dip coat|galvani|anodi/i, { tools: ["parallel", "nozzle"], prefer: /PZN|centric|PGN-plus/i, robot: {} }],
  // Concrete printing: the print nozzle on a large robot or gantry.
  [/concrete/i, { tools: ["nozzle"], prefer: /concrete|print|extru/i, special: ["concrete print nozzle", /concrete/i], robot: {} }],
  // Site plastering and wall painting: a spray gun on a mobile robot, not an explosion-proof painting robot.
  [/plaster|wall finish/i, { tools: ["nozzle"], prefer: /spray|paint/i, avoid: /waterjet|wash|blast|concrete|thermal|hvof/i, robot: {} }],
  [/paint|spray/i, { generic: true, tools: ["nozzle"], prefer: /spray|paint/i, avoid: /waterjet|wash|blast|concrete|thermal|hvof/i, robot: PAINT_ROBOT }],
  [/sole adhesive|footwear|shoe/i, { tools: ["nozzle"], prefer: /dispens|adhesive/i, avoid: /paint|waterjet|wash|blast|concrete|thermal|hvof/i, robot: {} }],
  [/adhesive|sealant|glue|dispens/i, { generic: true, tools: ["nozzle"], prefer: /dispens/i, avoid: /spray|paint|waterjet|wash|blast|concrete|thermal|hvof/i, robot: {} }],
  [/fill|dosing/i, { tools: ["nozzle"], prefer: /filling|dosing/i, avoid: /spray|paint|waterjet|wash|blast|concrete|thermal|hvof/i, robot: {} }],
  // Assembly.
  [/screw/i, { tools: ["driver"], prefer: /screw|nutrunner/i, robot: {} }],
  [/rivet/i, { tools: ["driver"], prefer: /rivet/i, special: ["riveting tool", /rivet/i], robot: {} }],
  [/\bcap(?:ping|per)?\b|stopper/i, { tools: ["driver", "parallel"], prefer: /capping/i, robot: {} }],
  [/harness/i, { tools: ["parallel", "dual"], prefer: /EGP|EGK|Hand-E|2F-85|RG2|PGN-plus-P (?:40|50)\b/i, robot: {} }],
  [/solar module|photovolt/i, { tools: ["vacuum", "parallel"], prefer: /area|FXCB|FMP|vacuum/i, robot: {} }],
  [/assembl/i, { generic: true, tools: ["parallel", "driver", "dual"], robot: {} }],
  // Machines: what an integrator puts on the arm for each.
  // Process heads that a robot carries for cutting, drilling and routing (the part stays fixtured).
  [/waterjet/i, { tools: ["nozzle", "parallel"], prefer: /waterjet/i, avoid: /paint|dispens|fill/i, special: ["waterjet cutting head", /waterjet/i], robot: {} }],
  [/plasma|laser cut|cutting & sawing|\bsaw(?:ing)?\b/i, { tools: ["torch", "spindle", "parallel"], prefer: /plasma|cutting|cutter|saw/i, avoid: /spot|\bmig\b|\btig\b|weld/i, special: ["plasma / laser cutting head", /plasma|laser cut|cutting head|saw/i], robot: {} }],
  [/meat|debon|carcass/i, { tools: ["spindle", "parallel"], prefer: /blade|knife|saw|cutter/i, special: ["hygienic cutting blade", /blade|knife|band ?saw/i], robot: {} }],
  [/drill/i, { tools: ["spindle", "parallel"], prefer: /drill|spindle|milling/i, avoid: /grind|sand|polish/i, special: ["drilling spindle", /drill|spindle/i], robot: {} }],
  [/rout(?:ing|er)\b/i, { tools: ["spindle", "parallel"], prefer: /router|milling|spindle/i, avoid: /grind|sand|polish/i, special: ["router spindle", /router|spindle/i], robot: {} }],
  [/tube bend|pipe bend/i, { tools: ["parallel", "fork"], prefer: /PZN|centric|clamp/i, robot: {} }],
  [/crate|\btotes?\b/i, { tools: ["fork", "parallel", "vacuum"], prefer: /crate|tote/i, special: ["crate clamp gripper", /crate|clamp/i], robot: {} }],
  [/strapping|bundle/i, { tools: ["fork", "parallel", "vacuum"], prefer: /bundle/i, special: ["bundle clamp gripper", /bundle|clamp/i], robot: {} }],
  [/loading & unloading/i, { tools: ["parallel", "dual", "vacuum"], robot: {} }],
  [/roller hemm|hemming/i, { tools: ["spindle", "parallel"], prefer: /hemm/i, special: ["roller hemming head", /hemm/i], robot: { anyApps: true, why: "heavy robot for the rolling force" } }],
  [/lamination|transformer core/i, { tools: ["vacuum", "magnet"], prefer: /magnet|vacuum|EPick|VG\d/i, robot: {} }],
  [/windshield|windscreen/i, { tools: ["vacuum"], prefer: /area|FXCB|FMP/i, robot: {} }],
  [/\bbale/i, { tools: ["fork", "parallel"], prefer: /bale/i, special: ["bale clamp gripper", /bale/i], robot: {} }],
  [/ceramic tile|\btiles?\b/i, { tools: ["vacuum"], prefer: /area|FXCB|FMP/i, robot: {} }],
  [/\begg/i, { tools: ["vacuum", "parallel"], prefer: /soft|vacuum|VG\d|piCOBOT|EPick/i, robot: {} }],
  [/diamond|gemstone/i, { tools: ["vacuum", "parallel"], prefer: /EPick|micro|vacuum/i, robot: {} }],
  [/wax tree|shell build/i, { tools: ["parallel"], prefer: /PZN|centric|PGN-plus/i, robot: {} }],
  [/battery cell|cell grad/i, { tools: ["parallel", "vacuum"], prefer: /EGP|EGK|Hand-E|2F-85|RG2/i, robot: {} }],
  [/panel clean|solar clean/i, { tools: ["spindle", "vacuum"], prefer: /brush/i, special: ["panel-cleaning robot with brushes", /brush|clean/i], robot: {} }],
  [/sample tube|pathology/i, { tools: ["parallel"], robot: { lab: true } }],
  [/wafer/i, { tools: ["parallel", "vacuum"], prefer: /bernoulli|wafer|edge grip/i, robot: { lab: true } }],
  [/pcb|depanel/i, { tools: ["vacuum", "parallel"], prefer: /EPick|VG\d|ZXP|piCOBOT|EGK|EGP/i, avoid: /FMP|FXCB|area/i, robot: {} }],
  [/pouch|sachet/i, { tools: ["vacuum", "parallel"], prefer: /EPick|VG\d|ZXP|piCOBOT/i, robot: {} }],
  [/denest/i, { tools: ["vacuum", "parallel"], prefer: /EPick|VG\d|ZXP|piCOBOT/i, robot: {} }],
  [/ladl|pouring/i, { tools: ["parallel"], prefer: /PZN|centric|PGN-plus/i, special: ["foundry ladle", /ladle/i], robot: {} }],
  [/heavy lift/i, { tools: ["vacuum", "fork", "parallel"], prefer: /area|FMP|FXCB|clamp/i, robot: {} }],
  [/coil|\broll(?:s)?\b/i, { tools: ["parallel", "fork"], prefer: /mandrel|c-hook/i, special: ["coil mandrel or C-hook", /mandrel|c-hook/i], robot: {} }],
  [/layup|composite ply|fibre placement/i, { tools: ["vacuum", "parallel"], prefer: /needle|electro|area|FMP|FXCB/i, robot: {} }],
  [/textile|garment|fabric/i, { tools: ["parallel", "vacuum"], prefer: /needle|electro/i, robot: {} }],
  [/nail|stapl/i, { tools: ["driver", "parallel"], prefer: /nail|stapl/i, special: ["nail or staple gun", /nail|stapl/i], robot: {} }],
  [/rebar/i, { tools: ["driver", "parallel"], prefer: /tie|rebar/i, special: ["rebar tying tool", /tie|rebar/i], robot: {} }],
  [/fruit|vegetable|harvest/i, { tools: ["parallel", "vacuum"], prefer: /soft|SG-/i, robot: {} }],
  [/milking/i, { tools: ["vacuum", "parallel"], special: ["teat-cup attacher", /teat|milking/i], robot: {} }],
  [/ev charg/i, { tools: ["parallel"], special: ["charging-connector gripper", /charg|connector/i], robot: {} }],
  [/stone slab|granite slab|marble slab|quartz slab/i, { tools: ["vacuum"], prefer: /area|FXCB|FMP/i, robot: {} }],
  [/bobbin|yarn|\bcones?\b/i, { tools: ["parallel"], prefer: /3FG|centric|PZN/i, robot: {} }],
  [/compression mou?ld|rubber mou?ld/i, { tools: ["parallel", "vacuum"], prefer: /PGN|PZN|EGU/i, robot: {} }],
  [/bag plac|rotary packer|packer spout/i, { tools: ["vacuum"], prefer: /area|FXCB|FMP|vacuum/i, robot: {} }],
  [/glass|\bpanels?\b/i, { tools: ["vacuum"], prefer: /area|FXCB|FMP/i, robot: {} }],
  [/tyre|tire|wheel/i, { tools: ["parallel"], prefer: /PZN|centric/i, robot: {} }],
  [/food|tray loading|bakery/i, { tools: ["vacuum", "parallel"], prefer: /soft|vacuum|piCOBOT|VG\d/i, robot: {} }],
  [/truck|container unload/i, { tools: ["vacuum"], prefer: /area|FXCB|FMP/i, robot: {} }],
  [/order pick|sorting|sort\b/i, { tools: ["vacuum", "parallel"], prefer: /vacuum|EPick|VG\d|piCOBOT/i, robot: {} }],
  [/mobile manipulator/i, { tools: ["parallel", "dual"], prefer: /hand-e|2F-85|RG6|2FG7|co-act/i, robot: { cobot: true } }],
  [/mould|mold/i, { tools: ["vacuum", "parallel"], prefer: /vacuum|VG\d|VGC|EPick|piCOBOT/i, robot: {} }],
  [/die ?cast|forg/i, { tools: ["parallel"], prefer: /PZN|centric|PGN-plus/i, robot: {} }],
  [/sheet|\bpress(?!ur)|stamp|bend|brake/i, { tools: ["vacuum", "magnet"], prefer: /area|FMP|FXCB/i, robot: {} }],
  [/cnc|machin|lathe|tending/i, { generic: true, tools: ["dual", "parallel"], prefer: /dual/i, avoid: /preciseflex/i, robot: {} }],
  // End of line.
  [/brick|block stack/i, { tools: ["fork", "parallel"], prefer: /brick|block/i, special: ["brick clamp gripper", /clamp/i], robot: { type: "Palletizing", why: "palletizing robot" } }],
  [/depallet/i, { tools: ["vacuum", "fork"], prefer: /area|FXCB|FMP/i, robot: { type: "Palletizing", why: "palletizing robot" } }],
  [/sack|bag/i, { tools: ["fork", "vacuum"], prefer: /sack|bag|fork|claw/i, avoid: /2FGP/i, special: ["sack (fork) gripper", /sack|bag|fork|claw/i], robot: { type: "Palletizing", why: "palletizing robot" } }],
  [/pallet|stack/i, { generic: true, tools: ["vacuum", "fork"], prefer: /area|FXCB|FMP|palletiz/i, robot: { type: "Palletizing", why: "palletizing robot" } }],
  [/box form|erect/i, { tools: ["vacuum", "parallel"], prefer: /box erector/i, robot: {} }],
  [/pack|carton|case/i, { generic: true, tools: ["vacuum", "parallel"], prefer: /vacuum|EPick|VG\d|piCOBOT/i, robot: {} }],
  [/laser mark|marking|engrav|coding/i, { tools: ["parallel", "vacuum"], robot: {} }],
  [/label/i, { tools: ["vacuum", "parallel"], prefer: /label/i, robot: {} }],
  // Handling: a gripper sized for the part.
  [/\blab\b|laborator|sample|pipet|test tube|wafer/i, { tools: ["parallel"], robot: { lab: true } }],
  [/bin pick/i, { tools: ["parallel", "vacuum"], prefer: /EGU|PGN-plus|2F-85|Hand-E|RG6|VG\d/i, robot: {} }],
  [/kitting|sequenc/i, { tools: ["parallel", "vacuum"], robot: {} }],
];

/** Tool families when the job name is not one of the rules (skills-library tasks, custom jobs). */
const BY_KIND: Record<ProcessKind, ToolFamily[]> = {
  handling: ["parallel", "vacuum"], transport: ["parallel", "vacuum"], welding: ["torch"], machining: ["parallel", "dual"],
  finishing: ["spindle"], coating: ["nozzle"], inspection: ["parallel", "vacuum"], palletizing: ["vacuum", "fork"],
  packing: ["vacuum", "parallel"], assembly: ["parallel", "driver"], filling: ["nozzle"], sealing: ["parallel", "driver"], labeling: ["vacuum", "parallel"],
};

/** What a job needs on the arm and under it. */
export function gearFor(job: string, kind: ProcessKind = processKind({ name: job || "Loading & Unloading" })): JobGear {
  const rule = job ? RULES.find(([re]) => re.test(job))?.[1] : undefined;
  if (rule && kindAgrees(rule, kind)) return rule;
  return { tools: BY_KIND[kind], generic: true, robot: {} };
}
/** A rule's tool must suit the job's kind (an inspection job named "…press parts…" still needs a gripper). */
function kindAgrees(rule: JobGear, kind: ProcessKind) {
  const process: Partial<Record<ProcessKind, ToolFamily>> = { welding: "torch", finishing: "spindle", coating: "nozzle", filling: "nozzle" };
  const need = process[kind];
  return need ? rule.tools.includes(need) : !rule.tools.every((t) => ["torch", "spindle"].includes(t));
}
