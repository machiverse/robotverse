/**
 * Automation Studio — everything a job needs besides the robot and its tool, the way an
 * integrator writes the bill of materials:
 *   - accessories on the arm (tool changer, force/torque sensor, camera or seam sensor);
 *   - components beside the robot or between flange and tool (welding power source, wire
 *     feeder, torch cleaner, tip dresser, vacuum generator, screw feeder, proportioner…);
 *   - other equipment the cell needs that the catalogue does not list (fume extraction,
 *     machine interface, lighting…);
 *   - the software: the robot maker's programming and simulation package, its application
 *     package for the job, and the job's specialist software (vision, bin picking, CAM, PLC).
 * Pure functions over the catalogue the builder already loaded; nothing is added for the
 * user — the builder shows these as one-click suggestions.
 */

import { processKind, type ProcessKind } from "./processProfiles";
import type { Match } from "./equipmentScore";
import { COBOT_EOAT, gearFor, isCobotName, isComponent } from "./jobGear";
import { TOOL_NAMES } from "./cellProgram";

export type KitSlot = "changer" | "sensor" | "camera";
export interface KitAccessory { slot: KitSlot; why: string; match: Match }
export interface KitComponent { why: string; match: Match }
export interface Software { name: string; maker: string; does: string }
export interface JobKit {
  accessories: KitAccessory[];
  components: KitComponent[];
  /** Equipment the job needs that the catalogue does not list. */
  also: string[];
  software: Software[];
}
export interface KitInput {
  job: string;
  robot?: Match;
  tool?: Match;
  tool2?: Match;
  changer?: Match;
  sensor?: Match;
  camera?: Match;
  fenced?: boolean;
  /** Stations placed in the cell (a fixed vision station replaces a wrist camera). */
  stations?: string[];
}

const text = (m?: Match) => (m ? `${m.brand} ${m.name} ${m.type ?? ""}` : "");
const isCobotArm = (m?: Match) => !!m && (m.reasons.includes("Collaborative") || isCobotName(`${m.type ?? ""} ${m.name}`));

/** The first catalogue item whose name matches, marketplace listings before the Directory. */
function find(catalog: Match[], re: RegExp, extra?: (m: Match) => boolean): Match | undefined {
  const hits = catalog.filter((m) => m.kind === "tool" && re.test(m.name) && (!extra || extra(m)));
  return hits.find((m) => m.source === "market") ?? hits[0];
}

/* ---------------------------------------------------------------- job areas */

type Area = "arc" | "spot" | "laserweld" | "ultrasonic" | "laserclean" | "pallet" | "paint" | "dispense" | "pick" | "bin" | "force" | "vision" | "screw" | "rivet" | "tend" | "mark" | "label" | "mobile";
/** What kind of work a job is, for its equipment and software. */
export function areaOf(job: string, kind: ProcessKind = processKind({ name: job || "Loading & Unloading" })): Area {
  const j = job.toLowerCase();
  if (/spot weld/.test(j)) return "spot";
  if (/laser weld/.test(j)) return "laserweld";
  if (/ultrasonic/.test(j)) return "ultrasonic";
  if (kind === "welding") return "arc";
  if (/laser clean/.test(j)) return "laserclean";
  if (/pallet|sack|bag|stack/.test(j)) return "pallet";
  if (/paint|spray/.test(j)) return "paint";
  if (/rivet/.test(j)) return "rivet";
  if (/screw|\bcap(?:ping)?\b/.test(j)) return "screw";
  if (/laser mark|marking|coding|engrav/.test(j)) return "mark";
  if (/label/.test(j)) return "label";
  if (/mobile manipulator/.test(j)) return "mobile";
  if (/bin pick/.test(j)) return "bin";
  if (kind === "coating" || kind === "filling") return "dispense";
  if (kind === "finishing" || /insert|assembl|harness/.test(j)) return "force";
  if (kind === "inspection") return "vision";
  if (kind === "machining") return "tend";
  return "pick";
}

/* ------------------------------------------------------------- accessories */

function accessoriesFor(k: KitInput, area: Area, kind: ProcessKind, catalog: Match[]): KitAccessory[] {
  const out: KitAccessory[] = [];
  const cobot = isCobotArm(k.robot);
  const payload = k.robot?.payload ?? 10;
  // Two tools: the one on the stand is used only through a tool changer of the robot's class.
  if (k.tool2 && !k.changer) {
    const m = cobot ? find(catalog, /onrobot quick (?:tool )?changer|quick changer/i, (x) => !/dual/i.test(x.name)) : find(catalog, /\bATI QC-\d+ Tool Changer \(Master/i);
    if (m) out.push({ slot: "changer", why: "Swaps the tool on the arm and the one on the tool stand inside the cycle", match: m });
  }
  // Force control: constant contact force for surface work, search-and-insert for assembly.
  // A compliant tool (active contact flange, compliant spindle) keeps its own contact force.
  const compliantTool = kind === "finishing" && /FerRobotics|ACF|AOK|compliance|CGV|AOV|RC-\d/i.test(text(k.tool));
  if (!k.sensor && area === "force" && !compliantTool) {
    const m = cobot ? find(catalog, /Robotiq FT 300|OnRobot HEX/i) : find(catalog, payload > 40 ? /ATI Omega160/i : /ATI Axia80|SCHUNK FTE-Axia80/i);
    if (m) out.push({ slot: "sensor", why: kind === "finishing" ? "Keeps the contact force constant while grinding or polishing" : "Finds the hole and inserts the part by feel, without jamming", match: m });
  }
  // Seeing: a seam sensor for arc welding, a wrist camera for checks when no fixed camera station is placed.
  if (!k.camera) {
    if (area === "arc" || area === "laserweld") {
      const m = find(catalog, /seam tracking/i);
      if (m) out.push({ slot: "camera", why: "Finds and follows the real seam when parts and fixtures vary", match: m });
    } else if (area === "vision" && /inspect|vision|measur|gaug|dimension/i.test(k.job) && !k.stations?.includes("vision")) {
      // Robotiq's wrist camera is made for UR arms; OnRobot Eyes fits most robots.
      const m = /measur|gaug|dimension/i.test(k.job) ? find(catalog, /Zivid Two Camera/i) : find(catalog, /\bUR\d/i.test(k.robot?.name ?? "") ? /Robotiq Wrist Camera/i : /OnRobot Eyes/i);
      if (m) out.push({ slot: "camera", why: /measur|gaug|dimension/i.test(k.job) ? "3D camera measures the part on the arm" : "Wrist camera checks each part the robot holds", match: m });
    }
  }
  return out;
}

/* -------------------------------------------------------------- components */

function componentsFor(k: KitInput, area: Area, catalog: Match[]): { components: KitComponent[]; also: string[] } {
  const c: KitComponent[] = [];
  const also: string[] = [];
  const add = (re: RegExp, why: string, extra?: (m: Match) => boolean) => {
    const m = find(catalog, re, extra);
    if (m && isComponent(m.name, m.type) && !c.some((x) => x.match.id === m.id)) c.push({ why, match: m });
  };
  const tool = text(k.tool);
  const vacuum = /vacuum|suction|epick|airpick|powerpick|\bvg[cp]?\d|picobot|fxcb|fmp/i.test(tool);
  switch (area) {
    case "arc": {
      const tig = /\btig\b/i.test(k.job);
      if (!tig) {
        add(/TPS 400i Welding Power Source/i, "MIG/MAG power source for the robot torch");
        add(/WF 25i.*Wire Feeder/i, "Feeds the wire to the torch, mounted on the robot arm");
        // The torch maker's cleaner first.
        if (/tregaskiss/i.test(tool)) add(/TT3 Reamer/i, "Cleans spatter from the nozzle between welds");
        else if (/fronius/i.test(tool)) add(/Robacta TC 2000/i, "Cleans spatter from the nozzle between welds");
        else add(/BRS-CC Torch Cleaning/i, "Cleans spatter from the nozzle between welds");
      } else also.push("TIG power source with a cold-wire feeder");
      add(/Torch Collision Sensor/i, "Stops the robot before a crash bends the torch");
      also.push("Fume extraction at the welding table", "Welding screens or arc-flash curtains");
      break;
    }
    case "spot":
      add(/Tip Dresser/i, "Re-shapes the electrode tips every few hundred welds");
      also.push("Weld timer / servo-gun controller", "Cooling-water circuit for the gun");
      break;
    case "laserweld":
      also.push("Fibre laser source and chiller", "Class 1 laser-safe enclosure");
      break;
    case "ultrasonic":
      also.push("Ultrasonic generator matched to the horn", "Anvil / nest fixture for the parts");
      break;
    case "laserclean":
      also.push("Laser source with fume extraction", "Class 1 laser enclosure");
      break;
    case "paint":
      add(/PD2K Proportioner/i, "Mixes two-component paint at the gun and changes colour fast");
      also.push("ATEX (explosion-proof) spray booth with extraction");
      break;
    case "dispense":
      if (/potting|2k|two.?component/i.test(k.job)) add(/PD2K Proportioner/i, "Meters and mixes two-component material");
      also.push(/fill/i.test(k.job) ? "Product tank and dosing pump, drip tray" : "Material pump / dosing unit; bead inspection camera (optional)");
      break;
    case "screw":
      if (/cap/i.test(k.job)) also.push("Cap feeder / sorter");
      else {
        add(/Screw Feeder/i, "Presents one screw at a time to the screwdriver");
        if (/atlas copco|nutrunner/i.test(tool)) also.push("Tightening controller for the nutrunner");
      }
      break;
    case "rivet":
      also.push("Rivet feed system and setting controller");
      break;
    case "force":
      if (/assembl|insert|harness/i.test(k.job)) add(/AGE-F Compensation Unit/i, "Lets the gripper float so parts slide into place");
      if (/grind|polish|sand|deburr|finish|surface/i.test(k.job)) also.push("Dust extraction", "Spare abrasive discs or an abrasive change station");
      if (/harness/i.test(k.job)) also.push("Harness board / fixture");
      break;
    case "tend":
      if (/mould|mold/i.test(k.job)) also.push("Euromap 67 / SPI interface to the moulding machine", "Sprue and part separation chute");
      else if (/press|stamp|bend|brake/i.test(k.job)) also.push("Press interface and press safety control", "Double-blank detection");
      else if (/die ?cast|forg/i.test(k.job)) also.push("Heat-resistant gripper fingers", "Quench tank or cooling conveyor");
      else also.push("Machine interface: door, chuck and cycle-start signals", "Air blow-off for chips and coolant");
      break;
    case "pallet":
      if (/depallet/i.test(k.job)) also.push("Pallet stops and pallet-present sensors", "3D camera for shifted or mixed cases (optional)");
      else also.push("Pallet stops and pallet-present sensors", /sack|bag/i.test(k.job) ? "Bag flattening conveyor" : "Slip-sheet magazine if layers need them");
      break;
    case "vision":
      also.push(/leak/i.test(k.job) ? "Leak tester and test fixture" : "Lighting matched to the defect (ring, bar or back light)", "Reject chute or bin");
      break;
    case "mark":
      also.push("Fume extraction at the laser marker");
      break;
    case "label":
      also.push("Label printer (print-and-apply)", "Barcode verifier");
      break;
    case "bin":
      also.push("Bins located with stops so the camera finds them in the same place");
      break;
    case "mobile":
      also.push("AMR base and charger", "Docking markers at each machine");
      break;
    case "pick":
      if (/kitting|sequenc/i.test(k.job)) also.push("Kit trays with fixed pockets");
      if (/pack|carton|box/i.test(k.job)) also.push("Carton erector or magazine", "Case sealer");
      if (/sheet/i.test(k.job)) also.push("Double-sheet detection and sheet fanning");
      if (/transport/i.test(k.job)) also.push("AMR / AGV or conveyor between stations");
      break;
  }
  // Vacuum tools: electric generator for small grippers without one built in, spare cups for any.
  if (vacuum) {
    if (!/\bvg[cp]?\d|epick|picobot|fxcb|fmp/i.test(tool)) add(/Vacuum Generator/i, "Makes the vacuum without compressed air");
    else if (/fxcb|fmp/i.test(tool)) also.push("Vacuum blower or ejectors sized for the area gripper");
    add(/BGX Bellows Suction Cup/i, "Spare cups; bellows cups grip uneven or flexible parts");
  }
  // A cobot tool on an industrial robot (or the other way) needs a flange adapter.
  if (k.tool && k.robot && COBOT_EOAT.test(k.tool.name) && !isCobotArm(k.robot)) also.push("ISO 9409-1 adapter plate: the tool is made for a cobot flange");
  return { components: c, also };
}

/* ---------------------------------------------------------------- software */

const S = (name: string, maker: string, does: string): Software => ({ name, maker, does });
/** Each robot maker's programming / simulation software and its application packages. */
const MAKERS: { brand: RegExp; sim: Software; apps: Partial<Record<Area, Software>> }[] = [
  {
    brand: /^ABB\b/i,
    sim: S("RobotStudio", "ABB", "Offline programming and simulation of the cell"),
    apps: {
      arc: S("RobotWare Arc", "ABB", "Arc welding functions in the robot controller"),
      pallet: S("Palletizing PowerPac", "ABB", "Pallet patterns and palletizing programs in RobotStudio"),
      paint: S("Painting PowerPac", "ABB", "Paint paths and brush tables in RobotStudio"),
      pick: S("PickMaster Twin", "ABB", "Pick-and-place with vision and conveyor tracking"),
      force: S("Force Control", "ABB", "Force-controlled grinding, polishing and assembly"),
    },
  },
  {
    brand: /fanuc/i,
    sim: S("ROBOGUIDE", "FANUC", "Offline programming and simulation of the cell"),
    apps: {
      arc: S("ArcTool + ROBOGUIDE WeldPRO", "FANUC", "Arc welding software and weld path simulation"),
      spot: S("SpotTool+", "FANUC", "Spot welding software for servo guns"),
      pallet: S("PalletTool + ROBOGUIDE PalletPRO", "FANUC", "Palletizing software and pallet pattern design"),
      paint: S("PaintTool + ROBOGUIDE PaintPRO", "FANUC", "Painting software and paint path simulation"),
      pick: S("iRPickTool", "FANUC", "Vision-guided picking from moving conveyors"),
      vision: S("iRVision", "FANUC", "Robot vision built into the FANUC controller"),
      bin: S("iRVision", "FANUC", "Robot vision built into the FANUC controller"),
      tend: S("HandlingTool + ROBOGUIDE HandlingPRO", "FANUC", "Material handling software and cell simulation"),
    },
  },
  {
    brand: /kuka/i,
    sim: S("KUKA.Sim", "KUKA", "Offline programming and simulation of the cell"),
    apps: {
      arc: S("KUKA.ArcTech", "KUKA", "Arc welding software package"),
      spot: S("KUKA.ServoGun", "KUKA", "Servo spot-welding gun control"),
      pallet: S("KUKA.PalletTech", "KUKA", "Palletizing software package"),
      force: S("KUKA.ForceTorqueControl", "KUKA", "Force-controlled processes"),
      vision: S("KUKA.VisionTech", "KUKA", "Robot vision package"),
      pick: S("KUKA.ConveyorTech", "KUKA", "Picking from moving conveyors"),
    },
  },
  {
    brand: /yaskawa|motoman/i,
    sim: S("MotoSim EG-VRC", "Yaskawa", "Offline programming and simulation of the cell"),
    apps: { pallet: S("PalletSolver", "Yaskawa", "Palletizing pattern software"), arc: S("ComArc", "Yaskawa", "Through-arc seam tracking for welding") },
  },
  { brand: /kawasaki/i, sim: S("K-ROSET", "Kawasaki", "Offline programming and simulation of the cell"), apps: {} },
  {
    brand: /universal robots|^UR\d|\bUR\d/i,
    sim: S("PolyScope + URSim", "Universal Robots", "Programming on the teach pendant and simulation on a PC"),
    apps: { force: S("PolyScope force mode", "Universal Robots", "Built-in force control on e-Series robots") },
  },
  { brand: /doosan/i, sim: S("DART-Platform", "Doosan Robotics", "Programming and apps for Doosan cobots"), apps: {} },
  { brand: /techman|omron tm|\btm\d/i, sim: S("TMflow", "Techman Robot", "Flowchart programming with built-in TM Vision"), apps: {} },
  { brand: /st[aä]ubli/i, sim: S("Stäubli Robotics Suite", "Stäubli", "Offline programming and simulation (VAL 3)"), apps: {} },
  { brand: /denso/i, sim: S("WINCAPS III", "Denso", "Offline programming and simulation"), apps: {} },
  { brand: /epson/i, sim: S("Epson RC+", "Epson", "Programming, simulation and vision for Epson robots"), apps: {} },
  { brand: /mitsubishi/i, sim: S("RT ToolBox3", "Mitsubishi Electric", "Programming and simulation"), apps: {} },
  { brand: /nachi/i, sim: S("FD on Desk", "Nachi", "Offline programming and simulation"), apps: {} },
];
const ROBODK = S("RoboDK", "RoboDK", "Offline programming and simulation for most robot brands");

function softwareFor(k: KitInput, area: Area): Software[] {
  const out: Software[] = [];
  const brand = `${k.robot?.brand ?? ""} ${k.robot?.name ?? ""}`;
  const maker = k.robot ? MAKERS.find((m) => m.brand.test(brand)) : undefined;
  out.push(maker?.sim ?? ROBODK);
  const app = maker?.apps[area];
  if (app && app.name !== out[0].name) out.push(app);
  const cobot = isCobotArm(k.robot);
  const tool = text(k.tool);
  // The job's specialist software.
  if (area === "arc") out.push(S("OCTOPUZ", "OCTOPUZ", "Offline programming of weld paths from CAD"));
  if (area === "spot") out.push(S("Process Simulate", "Siemens", "Spot-weld line simulation and reach studies"));
  if (area === "laserweld" && /precitec/i.test(tool)) out.push(S("LWM (Laser Welding Monitor)", "Precitec", "Monitors every laser weld"));
  if (area === "bin") out.push(S("Bin Picking Studio", "Photoneo", "3D vision bin picking"), S("Pickit 3D", "Pickit", "3D vision part localisation for robots"));
  if (area === "vision") out.push(S("In-Sight Vision Suite", "Cognex", "Set up the inspection and pass / fail rules"));
  if (area === "pallet" && cobot) out.push(S("Pally", "Rocketfarm", "Pallet patterns and palletizing for cobots"));
  if (area === "force" && /grind|polish|sand|deburr|finish|surface/i.test(k.job)) out.push(S("Robotmaster", "Hypertherm / Mastercam", "Tool paths from CAD for grinding, deburring and polishing"));
  if (area === "screw" && /atlas copco/i.test(tool)) out.push(S("ToolsTalk 2", "Atlas Copco", "Tightening programs and results for the nutrunner"));
  if (area === "label") out.push(S("BarTender", "Seagull Scientific", "Label design and printing"));
  if (area === "mark") out.push(S("EzCad", "Beijing JCZ", "Mark layouts and codes for the laser marker"));
  if (area === "mobile") out.push(S("MiR Fleet", "Mobile Industrial Robots", "Fleet and mission control for the mobile base"));
  if (/zivid/i.test(text(k.camera))) out.push(S("Zivid Studio", "Zivid", "Set up and test the 3D camera"));
  if (/onrobot/i.test(tool) && cobot) out.push(S("D:PLOY", "OnRobot", "Builds and runs the application without code"));
  if (!maker && k.robot) out.push(ROBODK);
  // Every cell: line control, and safety configuration for a fenced cell.
  out.push(S("TIA Portal or Studio 5000", "Siemens / Rockwell", "PLC and HMI program that runs the line and talks to the robot"));
  if (k.fenced) out.push(S("Safety Designer", "SICK", "Configures the safety scanners, light curtains and safety controller"));
  // One of each.
  return out.filter((s, i) => out.findIndex((x) => x.name === s.name) === i);
}

/** Accessories, components, other equipment and software for a job with the chosen robot and tools. */
export function jobKit(k: KitInput, catalog: Match[]): JobKit {
  if (!k.job) return { accessories: [], components: [], also: [], software: [] };
  const kind = processKind({ name: k.job });
  const area = areaOf(k.job, kind);
  const { components, also } = componentsFor(k, area, catalog);
  return { accessories: accessoriesFor(k, area, kind, catalog), components, also, software: softwareFor(k, area) };
}

/* ------------------------------------------------------- the skill, in words */

/** What each kind of work needs on and around the arm, by type (the builder picks the products). */
const GUIDE: Partial<Record<Area, { accessories?: string[]; components?: string[] }>> = {
  arc: { accessories: ["Laser seam tracking sensor"], components: ["Welding power source", "Wire feeder (MIG/MAG)", "Torch cleaning station or reamer", "Torch collision sensor"] },
  spot: { components: ["Electrode tip dresser"] },
  laserweld: { accessories: ["Laser seam tracking sensor"] },
  force: { accessories: ["Force/torque sensor — not needed with a compliant tool (active contact flange)"] },
  vision: { accessories: ["Wrist camera, or a fixed camera station"] },
  screw: { components: ["Screw feeder / presenter"] },
  paint: { components: ["Two-component proportioner"] },
  bin: { accessories: ["3D camera over the bin"] },
};

export interface KitGuide { tool: string; accessories: string[]; components: string[]; also: string[]; software: string[] }
/** The equipment kit of a job as an engineer describes it, without choosing products: for the playbook. */
export function kitGuide(job: string): KitGuide {
  const kind = processKind({ name: job });
  const area = areaOf(job, kind);
  const gear = gearFor(job, kind);
  const tool = gear.tools.map((t) => TOOL_NAMES[t] ?? t).join(" or ");
  const guide = GUIDE[area] ?? {};
  const components = [...(guide.components ?? [])];
  if (/assembl|insert|harness/i.test(job)) components.push("Compensation unit");
  if (/potting|2k/i.test(job)) components.push("Two-component proportioner");
  if (gear.tools[0] === "vacuum") components.push("Vacuum generator", "Spare suction cups");
  const { also } = componentsFor({ job }, area, []);
  // The robot makers' packages for this work, then the specialist and line software.
  const makers = MAKERS.map((m) => m.apps[area]).filter((x): x is Software => !!x).map((x) => `${x.name} (${x.maker})`);
  const rest = softwareFor({ job, fenced: true }, area).map((x) => `${x.name} (${x.maker})`);
  return {
    tool: gear.special ? `${gear.special[0]} (${tool})` : tool,
    accessories: guide.accessories ?? [],
    components,
    also,
    software: [...new Set([...makers, ...rest])],
  };
}
