// Component breakdown ("what is inside") for any Directory robot, built from its type, brand,
// payload, reach and applications. Families and rules are industry-typical; exact part numbers
// depend on the robot's serial number and must be confirmed with the OEM.
import type { CatalogItem } from "./directoryTypes";

export interface BomItem {
  group: BomGroup;
  name: string;
  qty: string;
  what: string;
  spec?: string;
  service?: string;
  /** component_type in directory_parts, used to list matching OEM parts */
  partType?: string;
  /** words for the RobotVerse spare-parts search */
  search: string;
}

export const BOM_GROUPS = [
  "Joint drives (per axis)",
  "Arm mechanics",
  "Controller & electronics",
  "Teach pendant & operator",
  "Cables & dress pack",
  "Power & backup",
  "Lubrication & wear parts",
  "Safety",
  "Tooling & application",
] as const;
export type BomGroup = (typeof BOM_GROUPS)[number];

interface BrandFamily {
  controller: string;
  pendant: string;
  motor: string;
  encoder: string;
  drive: string;
  battery: string;
  cobotController?: string;
}

/** Well-known controller / pendant / motor families per OEM. */
const FAMILIES: Record<string, BrandFamily> = {
  fanuc: {
    controller: "FANUC R-30iB Plus (current) · R-30iB / R-30iA (older units); R-30iB Mate Plus for LR Mate / small robots",
    cobotController: "FANUC R-30iB Mini Plus (CRX)",
    pendant: "FANUC iPendant (touch) / standard teach pendant",
    motor: "FANUC αi / βi series AC servo motor with brake",
    encoder: "FANUC Pulsecoder (absolute serial encoder)",
    drive: "FANUC 6-axis servo amplifier",
    battery: "Pulsecoder backup battery pack (in the robot base)",
  },
  abb: {
    controller: "ABB OmniCore (current) · IRC5 (older units)",
    pendant: "ABB FlexPendant",
    motor: "ABB AC servo motor with brake",
    encoder: "Resolver + Serial Measurement Board (SMB)",
    drive: "ABB main drive unit / axis drive units",
    battery: "SMB battery pack (keeps revolution counters)",
  },
  kuka: {
    controller: "KUKA KR C5 (current) · KR C4 (older units); KR C5 micro / KR C4 compact for small robots",
    pendant: "KUKA smartPAD",
    motor: "KUKA AC servo motor with brake",
    encoder: "Resolver + RDC (resolver-to-digital converter)",
    drive: "KUKA KPP power pack + KSP servo packs",
    battery: "Controller backup batteries (controlled shutdown)",
  },
  yaskawa: {
    controller: "Yaskawa YRC1000 / YRC1000micro (current) · DX200 / DX100 (older units)",
    pendant: "Yaskawa programming pendant",
    motor: "Yaskawa Σ (Sigma) series AC servo motor with brake",
    encoder: "Absolute serial encoder",
    drive: "Yaskawa SERVOPACK amplifiers",
    battery: "Encoder backup battery",
  },
  kawasaki: {
    controller: "Kawasaki F-series controller (current) · E-series (older units)",
    pendant: "Kawasaki teach pendant",
    motor: "Kawasaki AC servo motor with brake",
    encoder: "Absolute encoder",
    drive: "Kawasaki servo amplifier",
    battery: "Encoder backup battery",
  },
  nachi: { controller: "Nachi CFD / FD series controller", pendant: "Nachi teach pendant", motor: "AC servo motor with brake", encoder: "Absolute encoder", drive: "Servo amplifier", battery: "Encoder backup battery" },
  staubli: { controller: "Stäubli CS9 (current) · CS8C (older units)", pendant: "Stäubli SP2 / SP1 pendant", motor: "Stäubli servo motor with brake", encoder: "Absolute encoder", drive: "Stäubli drive modules", battery: "Encoder backup battery" },
  denso: { controller: "DENSO RC9 / RC8 controller", pendant: "DENSO teach pendant", motor: "AC servo motor with brake", encoder: "Absolute encoder", drive: "Servo amplifier", battery: "Encoder backup battery" },
  epson: { controller: "Epson RC700 / RC90 controller", pendant: "Epson teach pendant (TP)", motor: "AC servo motor with brake", encoder: "Absolute encoder", drive: "Servo drive", battery: "Encoder backup battery" },
  mitsubishi: { controller: "Mitsubishi CR800 (current) · CR750 (older units)", pendant: "Mitsubishi R56TB / R32TB teaching box", motor: "Mitsubishi AC servo motor with brake", encoder: "Absolute encoder", drive: "Servo amplifier", battery: "Encoder backup battery" },
  comau: { controller: "Comau R-1C (current) · C5G (older units)", pendant: "Comau teach pendant", motor: "AC servo motor with brake", encoder: "Absolute encoder", drive: "Servo drive modules", battery: "Encoder backup battery" },
  universal: { controller: "Universal Robots control box (e-Series / CB3)", pendant: "UR teach pendant", motor: "Integrated joint module (motor + gear + encoders + brake)", encoder: "Dual absolute encoders in each joint", drive: "Joint-integrated drive", battery: "—" },
};
const familyOf = (brand: string): BrandFamily | null => {
  const b = brand.toLowerCase();
  if (b.includes("fanuc") || b === "gmf") return FAMILIES.fanuc;
  if (b.includes("yaskawa") || b.includes("motoman")) return FAMILIES.yaskawa;
  if (b.startsWith("universal")) return FAMILIES.universal;
  if (b.startsWith("st") && b.includes("ubli")) return FAMILIES.staubli;
  return FAMILIES[b.split(/\s+/)[0]] ?? null;
};

type Kind = "industrial" | "cobot" | "scara" | "delta" | "palletizer";
const COBOT_BRANDS = /universal robots|techman|doosan|aubo|jaka|elite|duco|franka|kinova|neura|fairino|dobot|ufactory|flexiv|kassow|rainbow|realman|neuromeka|agile robots|productive robotics|standard bots|inovo|rozum|elephant|niryo|han's/i;
export function robotKind(r: CatalogItem): Kind {
  const t = (r.t ?? "").toLowerCase();
  if (t.includes("scara")) return "scara";
  if (t.includes("delta")) return "delta";
  if (t.includes("palletiz") || ((r.a ?? 6) <= 5 && r.ap?.includes("Palletizing"))) return "palletizer";
  if (r.ap?.includes("Collaborative") || /\bcrx\b|cobot|\bur\d|\btm\d/i.test(r.n) || COBOT_BRANDS.test(r.b)) return "cobot";
  return "industrial";
}

/** Indicative servo motor size from payload (main axes) — for planning spares, not a rating. */
const motorSize = (p: number, wrist: boolean) => {
  const tiers: [number, string, string][] = [
    [7, "0.1–0.4 kW", "0.05–0.2 kW"],
    [25, "0.4–1.5 kW", "0.1–0.5 kW"],
    [80, "1.5–4 kW", "0.4–1.5 kW"],
    [250, "3–7 kW", "1–3 kW"],
    [Infinity, "5–15 kW", "2–5 kW"],
  ];
  const t = tiers.find(([max]) => p <= max)!;
  return wrist ? t[2] : t[1];
};

const JOINTS_6 = ["J1 base rotation", "J2 lower arm", "J3 upper arm", "J4 wrist roll", "J5 wrist bend", "J6 flange rotation"];

export function buildBom(r: CatalogItem): BomItem[] {
  const kind = robotKind(r);
  const fam = familyOf(r.b);
  const p = r.p ?? 10;
  const axes = r.a ?? (kind === "scara" || kind === "palletizer" ? 4 : kind === "delta" ? 4 : 6);
  const apps = (r.ap ?? []).join(" ").toLowerCase();
  const brand = r.b;
  const out: BomItem[] = [];
  const add = (x: Omit<BomItem, "search"> & { search?: string }) => out.push({ ...x, search: x.search ?? `${brand} ${x.name}` });
  const encoder = fam?.encoder ?? "Absolute multi-turn encoder";
  const motor = fam?.motor ?? "AC servo motor with holding brake";

  // ---- Joint drives
  if (kind === "cobot") {
    for (let i = 1; i <= axes; i++)
      add({
        group: "Joint drives (per axis)",
        name: `J${i} joint module`,
        qty: "1",
        what: "Integrated joint: frameless servo motor, strain-wave (harmonic) gear, input and output encoders, brake and drive electronics in one housing.",
        spec: `${i <= 3 ? "Large" : "Small"} joint size · strain-wave gear · dual encoders`,
        service: "Swapped as a complete module; no routine greasing.",
        partType: "Harmonic Drives",
        search: `${brand} joint module`,
      });
  } else if (kind === "scara") {
    add({ group: "Joint drives (per axis)", name: "J1 arm 1 rotation drive", qty: "1", what: `${motor}; strain-wave gear reducer.`, spec: `${motorSize(p, false)} · harmonic reducer · ${encoder}`, partType: "Servo Motors" });
    add({ group: "Joint drives (per axis)", name: "J2 arm 2 rotation drive", qty: "1", what: `${motor}; strain-wave gear reducer.`, spec: `${motorSize(p, true)} · harmonic reducer · ${encoder}`, partType: "Harmonic Drives" });
    add({ group: "Joint drives (per axis)", name: "J3 vertical (Z) + J4 rotation drives", qty: "2 motors", what: "Two servo motors driving the ball-screw spline through timing belts: up/down stroke and tool rotation.", spec: `${motorSize(p, true)} each · ball-screw spline · timing belts`, service: "Check belt tension; grease the ball-screw spline shaft regularly.", partType: "Servo Motors" });
    add({ group: "Arm mechanics", name: "Ball-screw spline shaft", qty: "1", what: "Combined ball screw and ball spline: the Z-axis and tool rotation shaft.", service: "Grease every few months in heavy duty; replace when play or noise appears.", partType: "Bearings", search: `${brand} SCARA ball screw spline` });
    add({ group: "Arm mechanics", name: "Timing belts (Z and U axes)", qty: "2", what: "Belts from J3/J4 motors to the spline shaft.", service: "Inspect yearly; replace when worn or cracked.", search: `${brand} SCARA timing belt` });
  } else if (kind === "delta") {
    add({ group: "Joint drives (per axis)", name: "Main axis drives (×3)", qty: "3", what: `${motor} with a planetary gearbox, one per arm.`, spec: `${motorSize(p, false)} · planetary gearbox · ${encoder}`, partType: "Planetary Gearboxes" });
    if (axes >= 4) add({ group: "Joint drives (per axis)", name: "Rotary (4th) axis drive", qty: "1", what: "Servo motor driving the telescopic centre shaft for tool rotation.", spec: motorSize(p, true), partType: "Servo Motors" });
    add({ group: "Arm mechanics", name: "Parallel arms & ball joints", qty: "3 sets", what: "Carbon-fibre forearms with ball joints and springs linking the base to the travelling plate.", service: "Inspect ball cups and springs; replace worn cups.", search: `${brand} delta robot ball joint` });
    add({ group: "Arm mechanics", name: "Telescopic centre shaft", qty: "1", what: "Carries rotation to the tool (4-axis models).", search: `${brand} delta telescopic shaft` });
  } else {
    const n = Math.max(axes, 4);
    const names = kind === "palletizer" ? ["J1 base rotation", "J2 lower arm", "J3 upper arm", "J4 flange rotation", "J5 wrist"] : [...JOINTS_6, "J7 elbow / extra axis"];
    for (let i = 0; i < n && i < names.length; i++) {
      const wrist = kind === "palletizer" ? i >= 3 : i >= 3 && i !== 6;
      const rv = !wrist || p >= 20 || i === 3;
      add({
        group: "Joint drives (per axis)",
        name: `${names[i]} drive`,
        qty: "1",
        what: `${motor}; ${rv ? "RV (cycloidal) precision reducer" : "strain-wave (harmonic) gear"}; ${encoder}.`,
        spec: `${motorSize(p, wrist)} (indicative) · ${rv ? "RV reducer" : "harmonic reducer"} · holding brake`,
        service: "Motor and encoder are replaced as a unit; re-master (zero) the axis after replacement.",
        partType: "Servo Motors",
        search: `${brand} ${r.m} ${names[i].split(" ")[0]} motor`,
      });
    }
    add({ group: "Arm mechanics", name: `Precision reducers (${n})`, qty: String(n), what: `RV reducers on the main axes${p < 20 ? ", strain-wave gears in the small wrist" : " and wrist"}.`, service: "Watch for noise, vibration or backlash; grease/oil change per OEM interval.", partType: p < 20 ? "Harmonic Drives" : "RV Reducers", search: `${brand} ${r.m} reducer` });
    if (p >= 100 || kind === "palletizer")
      add({ group: "Arm mechanics", name: "J2 balancer (gas or spring)", qty: "1", what: "Counterbalances the arm so J2 motor and reducer carry less load.", service: "Check pressure / seals; a failing balancer overloads J2.", search: `${brand} ${r.m} balancer` });
    if (kind === "palletizer") add({ group: "Arm mechanics", name: "Parallel link arm set", qty: "1", what: "Links that keep the flange level while stacking.", search: `${brand} palletizing robot link arm` });
    add({ group: "Arm mechanics", name: apps.includes("weld") ? "Hollow wrist unit" : "Wrist unit", qty: "1", what: apps.includes("weld") ? "J4–J6 assembly with a hollow path for the torch cable." : "J4–J6 assembly carrying the tool flange.", search: `${brand} ${r.m} wrist unit` });
  }
  add({ group: "Arm mechanics", name: "Main bearings", qty: kind === "delta" ? "3+" : "per axis", what: "Cross-roller / angular-contact bearings at the joints.", partType: "Bearings", search: `${brand} robot cross roller bearing` });
  add({ group: "Arm mechanics", name: "Covers, castings & mechanical stoppers", qty: "set", what: "Base, turntable, arm castings, covers and hard stops.", search: `${brand} ${r.m} cover` });

  // ---- Controller & electronics
  const controller = kind === "cobot" && fam?.cobotController ? fam.cobotController : fam?.controller ?? `${brand} robot controller`;
  add({ group: "Controller & electronics", name: "Robot controller", qty: "1", what: controller, service: "Back up the programs and system files before any service.", partType: "Main Robot Controller", search: `${brand} robot controller` });
  if (kind !== "cobot") add({ group: "Controller & electronics", name: "Servo amplifier / drive unit", qty: "1", what: fam?.drive ?? "Multi-axis servo amplifier", partType: "Servo Drives", search: `${brand} servo amplifier` });
  add({ group: "Controller & electronics", name: "Main CPU board", qty: "1", what: "Motion and program processor; holds the robot software and options.", search: `${brand} controller main board` });
  add({ group: "Controller & electronics", name: "I/O and fieldbus boards", qty: "1–4", what: "Digital I/O, EtherNet/IP, PROFINET, EtherCAT or DeviceNet boards to the PLC and tools.", partType: "I/O Modules", search: `${brand} robot I/O board` });
  add({ group: "Controller & electronics", name: "Safety board / safety I/O", qty: "1", what: "Emergency stop, door and enabling-switch circuits; safe speed / zones when fitted.", partType: "Safety PLC Modules", search: `${brand} robot safety board` });
  add({ group: "Controller & electronics", name: "Power supply unit", qty: "1", what: "DC supplies for boards and brakes.", partType: "Power Supply Units", search: `${brand} robot power supply` });
  add({ group: "Controller & electronics", name: "Cooling fans & filters", qty: "set", what: "Cabinet fans and air filters.", service: "Clean or replace filters every 3–6 months in dusty plants.", search: `${brand} controller fan` });

  // ---- Pendant
  add({ group: "Teach pendant & operator", name: "Teach pendant", qty: "1", what: fam?.pendant ?? `${brand} teach pendant`, service: "Keep a spare pendant cable; the enabling switch wears with use.", partType: "Teach Pendants", search: `${brand} teach pendant` });
  add({ group: "Teach pendant & operator", name: "Pendant cable & enabling switch", qty: "1", what: "Cable between pendant and controller; 3-position enabling (dead-man) switch.", search: `${brand} teach pendant cable` });

  // ---- Cables
  if (kind !== "cobot") add({ group: "Cables & dress pack", name: "Robot–controller cables", qty: "2–3", what: "Motor power and encoder signal cables between the robot base and controller.", partType: "Encoder Cables", search: `${brand} ${r.m} robot cable` });
  add({ group: "Cables & dress pack", name: "Internal cable harness", qty: "1", what: "Cables inside the arm up to the wrist; flexes every cycle.", service: "Replace at the first sign of intermittent encoder or motor alarms.", partType: "High-Flex Cables", search: `${brand} ${r.m} internal cable harness` });
  if (/weld|handling|pallet|machine|dispens|paint/.test(apps))
    add({ group: "Cables & dress pack", name: "External dress pack", qty: "1", what: "Hose and cable package to the tool (air, signals, weld cable or media) with retraction system.", partType: "Robot Dress Packs", search: `robot dress pack ${brand}` });

  // ---- Power & backup
  if (fam?.battery !== "—") add({ group: "Power & backup", name: "Encoder backup batteries", qty: "1 set", what: fam?.battery ?? "Keeps absolute encoder position when power is off.", service: "Replace every 1–2 years or at the low-battery alarm — with the controller ON, or the robot loses its position and must be re-mastered.", partType: "Encoder Batteries", search: `${brand} robot encoder battery` });
  add({ group: "Power & backup", name: "Controller memory battery", qty: "1", what: "Backs up the controller clock and memory.", service: "Replace per OEM interval; back up programs first.", partType: "Encoder Batteries", search: `${brand} controller battery` });

  // ---- Lubrication
  if (kind !== "cobot") add({ group: "Lubrication & wear parts", name: "Reducer grease / oil", qty: "per axis", what: "OEM-specified grease or oil for each reducer and gear train.", service: "Change every ~3 years or 10,000–20,000 h (see the OEM manual); never mix grease types.", partType: "Grease", search: `${brand} robot reducer grease` });
  add({ group: "Lubrication & wear parts", name: "Oil seals & O-rings", qty: "set", what: "Seals on each joint and gear case.", service: "Replace when grease weeps from a joint or at overhaul.", partType: "Seals & Bellows", search: `${brand} ${r.m} oil seal kit` });
  if (/paint|foundry|clean|food/.test(apps) || /paint/i.test(r.n)) add({ group: "Lubrication & wear parts", name: "Protective jacket / cover", qty: "1", what: "Washable or paint / foundry protective suit for the arm.", partType: "Robot Protective Covers", search: `${brand} ${r.m} robot protective cover` });

  // ---- Safety
  add({ group: "Safety", name: "Emergency stop buttons", qty: "2+", what: "On the pendant, controller and around the cell.", partType: "Emergency Stop Units", search: "robot emergency stop button" });
  if (kind === "cobot") add({ group: "Safety", name: "Risk assessment & safety settings", qty: "—", what: "Force / speed limits set to ISO/TS 15066; area scanner if the cobot runs fast.", partType: "Safety Laser Scanners", search: "safety laser scanner cobot" });
  else add({ group: "Safety", name: "Fence, door switch & light curtain", qty: "1 set", what: "Guarding required around an industrial robot (ISO 10218-2).", partType: "Safety Light Curtains", search: "robot cell safety light curtain" });

  // ---- Tooling
  add({ group: "Tooling & application", name: "Tool flange interface", qty: "1", what: "ISO 9409-1 mounting flange for the end-of-arm tool.", partType: "Tool Changers", search: `ISO 9409 tool flange ${r.p ?? ""} kg` });
  if (apps.includes("weld")) {
    add({ group: "Tooling & application", name: "Welding torch & collision sensor", qty: "1", what: "Robotic MIG/MAG or TIG torch on a breakaway / collision sensor.", partType: "Welding Torches", search: "robotic welding torch" });
    add({ group: "Tooling & application", name: "Wire feeder & welding power source", qty: "1", what: "Robot-interface welding power source and wire feeder.", partType: "Welding Power Sources", search: "robotic welding power source" });
    add({ group: "Tooling & application", name: "Contact tips, nozzles & liners", qty: "consumable", what: "Wear parts changed daily to weekly.", partType: "Contact Tips", search: "welding contact tip" });
  }
  if (/handling|pallet|machine|pack|pick/.test(apps) || kind === "scara" || kind === "delta")
    add({ group: "Tooling & application", name: "Gripper (mechanical or vacuum)", qty: "1", what: "Sized for the part weight within the robot's payload.", partType: p > 20 || kind === "palletizer" ? "Vacuum Grippers" : "Mechanical Grippers", search: `robot gripper ${p} kg` });
  if (apps.includes("paint")) add({ group: "Tooling & application", name: "Spray gun / rotary atomizer", qty: "1", what: "Paint applicator with colour-change valves.", partType: "Spray Guns", search: "robot spray gun" });
  if (apps.includes("dispens")) add({ group: "Tooling & application", name: "Dispensing valve & pump", qty: "1", what: "Glue / sealant dispensing system.", partType: "Dispensing Systems", search: "robot dispensing system" });

  return out;
}

export const bomCsv = (r: CatalogItem, items: BomItem[]) => {
  const q = (s: string | undefined) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const head = ["Group", "Component", "Qty", "What it is", "Spec (indicative)", "Service", "Search"];
  return [
    `${q(`${r.n} (${r.id}) — component breakdown. Indicative; confirm part numbers with the OEM using the robot serial number.`)}`,
    head.map(q).join(","),
    ...items.map((i) => [i.group, i.name, i.qty, i.what, i.spec, i.service, i.search].map(q).join(",")),
  ].join("\n");
};

/** A–Z guide to robot components shown in the Parts & Components tab. */
export interface GuideEntry {
  type: string;
  what: string;
  where: string;
  signs?: string;
}
export const COMPONENT_GUIDE: GuideEntry[] = [
  { type: "Balancers", what: "Gas or spring cylinder that counterbalances the J2 arm of large robots.", where: "Industrial robots ≥ 100 kg, palletizers", signs: "J2 overload / overcurrent alarms, oil on the cylinder" },
  { type: "Bearings", what: "Cross-roller and angular-contact bearings carrying each joint.", where: "All robots", signs: "Noise, play at the joint" },
  { type: "Brakes", what: "Spring-applied holding brake on each servo motor; holds the arm when power is off.", where: "All industrial robots and cobots", signs: "Arm drops slightly at power-off, brake alarms" },
  { type: "Collision Sensors", what: "Breakaway mount that stops the robot when the tool hits something.", where: "Welding and handling robots" },
  { type: "Contact Tips", what: "Copper tip that transfers weld current to the wire; a daily consumable.", where: "Welding robots" },
  { type: "Emergency Stop Units", what: "Latching stop buttons wired to the safety circuit.", where: "Every robot cell" },
  { type: "Encoder Batteries", what: "Batteries that keep the absolute encoder position while power is off.", where: "Most industrial robots", signs: "Low-battery alarm — replace with power ON" },
  { type: "Encoder Cables", what: "Signal cables from the motor encoders to the controller.", where: "Industrial robots", signs: "Intermittent encoder / communication alarms" },
  { type: "Encoders", what: "Absolute encoders or resolvers measuring each joint's position.", where: "All robots", signs: "Position lost, pulse-coder alarms" },
  { type: "Grease", what: "OEM-specified lubricant for RV / harmonic reducers.", where: "Industrial robots, SCARA ball-screws", signs: "Due every ~3 years or 10,000–20,000 h" },
  { type: "Harmonic Drives", what: "Strain-wave gear: zero-backlash reducer for wrists, SCARA and cobot joints.", where: "Cobots, SCARA, small robot wrists", signs: "Ratcheting, vibration, position error" },
  { type: "High-Flex Cables", what: "Torsion-rated cables and harnesses inside the arm.", where: "All robots", signs: "Alarms that come and go with arm position" },
  { type: "I/O Modules", what: "Digital / fieldbus boards linking the robot to PLCs and tools.", where: "All controllers" },
  { type: "Main Robot Controller", what: "Cabinet with CPU, drives, safety and I/O that runs the robot.", where: "All robots" },
  { type: "Mechanical Grippers", what: "Parallel / angular fingers driven by air or electric motor.", where: "Handling, machine tending, assembly" },
  { type: "Planetary Gearboxes", what: "Compact gearbox between motor and arm.", where: "Delta robots, linear tracks, positioners" },
  { type: "Power Supply Units", what: "DC supplies inside the controller.", where: "All controllers" },
  { type: "Robot Dress Packs", what: "External hose and cable package to the tool, with retraction.", where: "Welding, handling, painting robots", signs: "Worn sleeves, snagging" },
  { type: "Robot Protective Covers", what: "Washable, paint or foundry jackets for the arm.", where: "Painting, foundry, food, washdown" },
  { type: "RV Reducers", what: "Cycloidal precision reducers with high torque and stiffness.", where: "Main axes of industrial robots", signs: "Noise, iron powder in grease, backlash" },
  { type: "Safety Light Curtains", what: "Light barrier that stops the robot when someone enters.", where: "Industrial robot cells" },
  { type: "Safety PLC Modules", what: "Safety controller / safety board for stop and zone functions.", where: "All robot cells" },
  { type: "Seals & Bellows", what: "Oil seals and O-rings keeping grease in and dirt out.", where: "All robots", signs: "Grease weeping at a joint" },
  { type: "Servo Drives", what: "Amplifiers that power the servo motors.", where: "All robots", signs: "Overcurrent, DC-link or fan alarms" },
  { type: "Servo Motors", what: "AC servo motors with encoder and brake — one per axis.", where: "All robots", signs: "Overheating, overcurrent, noise" },
  { type: "Spray Guns", what: "Paint and coating applicators.", where: "Painting robots" },
  { type: "Teach Pendants", what: "Hand-held programming unit with enabling switch and E-stop.", where: "All robots", signs: "Dead touch screen, broken cable" },
  { type: "Tool Changers", what: "Quick-change plates for swapping tools automatically.", where: "Multi-tool cells" },
  { type: "Vacuum Grippers", what: "Suction cups / foam grippers with vacuum generators.", where: "Palletizing, packing, sheet handling" },
  { type: "Welding Power Sources", what: "Robot-interface power source and wire feeder.", where: "Welding robots" },
  { type: "Welding Torches", what: "Robotic MIG/MAG or TIG torch.", where: "Welding robots" },
];
