/*
 * Automation Studio — the complete robot system for one job: how the process runs step by step, the
 * robot, its controller hardware, teach pendant, software, the end-of-arm tool by name, every cable and
 * hose, the signals between robot and machine, and the small wear parts.
 *
 * Pure static data. Brands and models are typical examples, never quotes: no part numbers.
 */
import { SKILL_LIBRARY } from "@/utils/processAnalyzer";
import { areaOf, cellEquipment, type Area } from "./cellEquipment.js";

export type SystemArea = Area | "general";
export type CableKind = "arm" | "pendant" | "mains" | "earth" | "safety" | "fieldbus" | "dress" | "tool" | "track" | "process";

export interface BrandSystem {
  brand: string;
  /** false: not a 6-axis arm (vision system, AMR, gantry…); the template's own controller text is kept. */
  arm: boolean;
  controllers: { current: string; compact?: string; large?: string; older?: string; notes?: string };
  pendant: string;
  pendantCable: string;
  armCables: string;
  software: string[];
  safety: string;
  fieldbus: string;
  flange: string;
  /** Single-phase supply (cobots, small controllers). */
  singlePhase?: boolean;
}

export interface ToolItem { name: string; examples: string; what: string }
export interface CableItem { name: string; from: string; to: string; carries: string; kind?: CableKind }
export interface WearItem { name: string; replace: string }
export interface ProcessSystem {
  howItWorks: string[];
  eoat: ToolItem[];
  onArm: string[];
  cables: CableItem[];
  signals: string[];
  consumables: WearItem[];
}

/* ------------------------------------------------------------------ brands */

export const BRAND_SYSTEMS: Record<string, BrandSystem> = {
  FANUC: {
    brand: "FANUC",
    arm: true,
    controllers: {
      current: "R-30iB Plus",
      compact: "R-30iB Mini Plus",
      large: "R-30iB Plus B-cabinet",
      older: "R-30iB / R-30iA",
      notes: "A-cabinet standard, B-cabinet for large robots; R-50iA is the newest generation",
    },
    pendant: "iPendant touch",
    pendantCable: "10 m (20 / 30 m options)",
    armCables: "Servo-power cable (RM1) + Pulsecoder / signal cable (RP1)",
    software: ["ROBOGUIDE (offline simulation)", "ArcTool / HandlingTool / SpotTool+ / PaintTool / DispenseTool", "iRVision"],
    safety: "DCS (Dual Check Safety)",
    fieldbus: "EtherNet/IP, PROFINET",
    flange: "ISO 9409-1 flange",
  },
  ABB: {
    brand: "ABB",
    arm: true,
    controllers: {
      current: "OmniCore C30",
      compact: "OmniCore E10",
      large: "OmniCore V250XT / V400XT",
      older: "IRC5",
      notes: "C30 / C90XT up to IRB 1600 class; V250XT / V400XT for large robots such as IRB 6700; IRC5P for IRB 5500 paint robots",
    },
    pendant: "FlexPendant (hot-swappable)",
    pendantCable: "10 m",
    armCables: "Motor power cable + SMB signal cable",
    software: ["RobotWare 7", "RobotStudio (offline simulation)", "RobotWare Arc / Spot / Dispense", "Integrated Vision", "Force Control"],
    safety: "SafeMove",
    fieldbus: "PROFINET, EtherNet/IP",
    flange: "ISO 9409-1 flange",
  },
  KUKA: {
    brand: "KUKA",
    arm: true,
    controllers: { current: "KR C5", compact: "KR C5 micro", large: "KR C5", older: "KR C4", notes: "Sunrise Cabinet for LBR iiwa" },
    pendant: "smartPAD pro / smartPAD-2",
    pendantCable: "10 m",
    armCables: "Motor cable (X20) + data cable (X21), 7 / 15 / 25 m",
    software: ["KUKA.WorkVisual", "KUKA.Sim (offline simulation)", "KUKA.ArcTech", "KUKA.ForceTorqueControl", "KUKA.mxAutomation (PLC)"],
    safety: "KUKA.SafeOperation",
    fieldbus: "PROFINET, EtherNet/IP, EtherCAT",
    flange: "ISO 9409-1 flange",
  },
  Yaskawa: {
    brand: "Yaskawa",
    arm: true,
    controllers: { current: "YRC1000", compact: "YRC1000micro", large: "YRC1000", older: "DX200 / FS100" },
    pendant: "Programming pendant or Smart Pendant (10\" touch)",
    pendantCable: "10 m",
    armCables: "Power cable + encoder cable",
    software: ["MotoSim EG-VRC (offline simulation)", "Universal Weldcom Interface", "MotoSight 2D / 3D BinPick"],
    safety: "Functional Safety Unit (FSU)",
    fieldbus: "EtherNet/IP, PROFINET",
    flange: "ISO 9409-1 flange",
  },
  Kawasaki: {
    brand: "Kawasaki",
    arm: true,
    controllers: { current: "F-series (F60)", older: "E-series (E01–E04)" },
    pendant: "5.7\" touch teach pendant",
    pendantCable: "10 m",
    armCables: "Motor power cable + encoder signal cable",
    software: ["K-ROSET (offline simulation)", "AS language"],
    safety: "Cubic-S",
    fieldbus: "EtherNet/IP, PROFINET",
    flange: "ISO 9409-1 flange",
  },
  "Universal Robots": {
    brand: "Universal Robots",
    arm: true,
    controllers: { current: "Control Box CB 5.5", compact: "Control Box CB 5.5", notes: "CB 5.5 runs PolyScope 5; CB 5.6 runs PolyScope X; 100–240 V single-phase" },
    pendant: "12\" touch teach pendant",
    pendantCable: "4.5 m",
    armCables: "Arm cable 6 m",
    software: ["PolyScope 5 / PolyScope X", "URSim (offline simulation)", "URCaps"],
    safety: "17 built-in safety functions (PLd Cat 3)",
    fieldbus: "Modbus TCP, EtherNet/IP, PROFINET / PROFIsafe",
    flange: "ISO 9409-1-50-4-M6 with M8 8-pin tool connector (UR20 / UR30: ISO 9409-1-80-6-M8)",
    singlePhase: true,
  },
  Stäubli: {
    brand: "Stäubli",
    arm: true,
    controllers: { current: "CS9" },
    pendant: "SP2 pendant (SP1 older)",
    pendantCable: "10 m",
    armCables: "Arm power + signal cable",
    software: ["Stäubli Robotics Suite (offline simulation)", "VAL 3", "uniVAL drive / PLC integration"],
    safety: "CS9 built-in safety",
    fieldbus: "EtherNet/IP, PROFINET, EtherCAT",
    flange: "ISO 9409-1 flange",
  },
  Epson: {
    brand: "Epson",
    arm: true,
    controllers: { current: "RC800", compact: "Built-in controller (VT6L, T-series)", older: "RC700-E / RC700-A" },
    pendant: "TP4 / TP3 teach pendant (or PC with Epson RC+)",
    pendantCable: "5 m",
    armCables: "Motor power + signal cable",
    software: ["Epson RC+ (programming and simulation)"],
    safety: "Safety Board option",
    fieldbus: "EtherNet/IP, PROFINET",
    flange: "Tool flange per model",
    singlePhase: true,
  },
  "Doosan Robotics": {
    brand: "Doosan Robotics",
    arm: true,
    controllers: { current: "Cobot controller", compact: "Cobot controller" },
    pendant: "Teach pendant (touch)",
    pendantCable: "4.5 m",
    armCables: "Arm cable",
    software: ["DART-Platform", "DART-Studio"],
    safety: "Built-in collaborative safety functions",
    fieldbus: "Modbus TCP, EtherNet/IP, PROFINET",
    flange: "ISO 9409-1-50-4-M6",
    singlePhase: true,
  },
  Other: {
    brand: "Other",
    arm: false,
    controllers: { current: "Special machine — controller as specified" },
    pendant: "Operator panel / HMI",
    pendantCable: "As specified",
    armCables: "Motor power + encoder cables (as specified)",
    software: [],
    safety: "Safety controller as specified",
    fieldbus: "EtherNet/IP or PROFINET to the line PLC",
    flange: "As specified",
  },
};

/** The brand of a robot model or name text ("Staubli" and "Stäubli" are the same brand). */
export function brandOf(text: string | undefined | null): string {
  const t = String(text || "").toLowerCase();
  if (/fanuc/.test(t)) return "FANUC";
  if (/\babb\b|\birb\b/.test(t)) return "ABB";
  if (/kuka|\bkr\s?\d|agilus|lbr/.test(t)) return "KUKA";
  if (/yaskawa|motoman|\bgp\d|\bhc\d/.test(t)) return "Yaskawa";
  if (/kawasaki/.test(t)) return "Kawasaki";
  if (/universal robots?|\bur\s?\d/.test(t)) return "Universal Robots";
  if (/st(a|ä)ubli/.test(t)) return "Stäubli";
  if (/epson/.test(t)) return "Epson";
  if (/doosan/.test(t)) return "Doosan Robotics";
  return "Other";
}

const HARDWARE = /r-30i|r-50i|omnicore|irc5|kr c\d|sunrise|yrc|dx200|fs100|cs9|rc\d{3}|built-in|f-series|e-series|control box|controller/i;
const SOFTWARE = /polyscope|dart|in-sight|software|suite/i;

/* ------------------------------------------------------------------ processes */

const T = (name: string, examples: string, what: string): ToolItem => ({ name, examples, what });
const C = (name: string, from: string, to: string, carries: string, kind: CableKind = "process"): CableItem => ({ name, from, to, carries, kind });
const W = (name: string, replace: string): WearItem => ({ name, replace });

const GRIP_ON_ARM = ["ISO 9409-1 adapter plate", "Tool changer master / tool plate with signal and air modules (optional)", "Collision sensor / breakaway"];

export const PROCESS_SYSTEMS: Record<SystemArea, ProcessSystem> = {
  arc: {
    howItWorks: [
      "The operator clamps the parts in the welding fixture on the positioner and presses start.",
      "The robot checks the part position by touch sensing with the wire.",
      "The robot moves the torch to the first seam and the gas starts flowing.",
      "The arc strikes and the robot welds the seam at set speed, wire speed and voltage.",
      "Through-arc seam tracking keeps the torch on the joint if the part is a little off.",
      "The positioner turns the part so every seam is welded in the best position.",
      "After a set number of parts the robot cleans the torch: reamer, anti-spatter spray, wire cut.",
      "The robot goes home, the operator unloads the welded part and loads the next.",
    ],
    eoat: [
      T("Robotic MIG torch", "Fronius Robacta / MTB, Binzel ABIROB, Tregaskiss TOUGH GUN", "Carries wire, gas and weld current to the arc."),
      T("Torch cleaning station", "Reamer + anti-spatter sprayer + wire cutter", "Keeps the nozzle clean and the wire stick-out the same."),
    ],
    onArm: ["Insulating flange", "Collision sensor / breakaway", "Through-arm (hollow wrist) or external unicable", "Robot wire feeder on axis 3"],
    cables: [
      C("Weld power cable (+)", "Power source", "Wire feeder", "Weld current"),
      C("Intermediate hose package", "Wire feeder", "Torch", "Wire, gas, current, coolant"),
      C("Work return cable (−)", "Power source", "Table clamp", "Weld current back"),
      C("Wire conduit", "Wire drum", "Wire feeder", "Welding wire"),
      C("Gas hose", "Gas regulator", "Wire feeder", "Shielding gas"),
      C("Coolant hoses", "Water cooler", "Torch", "Cooling water (water-cooled torches)"),
      C("Robot ⇄ power-source interface cable", "Robot controller", "Power source", "Fieldbus / interface signals"),
    ],
    signals: ["Arc on / off", "Job / schedule number", "Wire feed speed & voltage", "Arc established", "Gas test", "Wire inch / retract", "Wire stick", "Touch sensing", "Through-arc seam tracking", "Torch clean request"],
    consumables: [
      W("Contact tips", "Per shift or per spool — change on schedule, not after failure"),
      W("Nozzles", "When spatter builds up or damaged"),
      W("Gas diffusers", "Every few tip changes"),
      W("Liners (steel for steel wire, PTFE / nylon for aluminium)", "Every wire drum or when feeding is rough"),
      W("Reamer cutter blades", "When cleaning gets poor"),
      W("Anti-spatter liquid", "Refill as used"),
      W("Drive rolls", "When worn or changing wire size"),
      W("Wire drum", "When empty"),
      W("Shielding gas", "When the cylinder / bulk tank is low"),
    ],
  },
  spot: {
    howItWorks: [
      "Parts are loaded into the clamping fixture and clamped.",
      "The robot moves the servo spot gun to the first weld point.",
      "The gun closes on the sheet with the set force (the servo motor is the 7th axis).",
      "The weld timer sends the current for the weld schedule.",
      "The gun opens and the robot moves to the next point.",
      "After a set number of welds the tip dresser cuts the electrode caps clean.",
      "When all points are done the fixture unclamps and the part is unloaded.",
    ],
    eoat: [
      T("Servo spot gun (C- or X-type)", "Obara, ARO, Nimak", "Squeezes the sheets and passes the weld current."),
      T("Tip dresser", "Station by the robot", "Cuts the electrode caps back to shape."),
    ],
    onArm: ["ISO 9409-1 adapter plate", "Spot dress pack (LeanID-style)", "Gun servo motor (7th axis)"],
    cables: [
      C("Gun servo power + encoder cable", "Robot controller", "Spot gun", "Gun axis drive"),
      C("Weld transformer power cable", "MFDC weld timer", "Spot gun", "Weld current supply"),
      C("Cooling water hoses", "Water & air unit on robot base", "Spot gun", "Cooling water for caps and transformer"),
      C("Timer interface cable", "Robot controller", "Weld timer", "Fieldbus signals"),
    ],
    signals: ["Gun close / force", "Weld schedule number", "Weld complete", "Weld fault", "Tip-dress request", "Tip-wear offset"],
    consumables: [W("Electrode caps", "Every few hundred welds after dressing limit"), W("Tip-dresser cutter blades", "When the cap shape gets poor"), W("Shunts", "When frayed"), W("Cooling-water filter", "Monthly")],
  },
  laserweld: {
    howItWorks: [
      "Parts are loaded and clamped; the laser enclosure door closes.",
      "The safety interlocks confirm the door is closed and the laser is ready.",
      "Seam tracking finds the joint.",
      "The shutter opens and the laser welds along the seam at set power.",
      "Process monitoring checks the weld while it is made.",
      "The shutter closes, the door opens and the part is unloaded.",
    ],
    eoat: [
      T("Laser welding or scanner head", "Precitec YW50 class, wobble head", "Focuses the laser beam on the seam."),
      T("Seam tracking / process monitoring", "Sensor on the head", "Keeps the beam on the joint and checks the weld."),
    ],
    onArm: ["ISO 9409-1 adapter plate", "Head mounting bracket", "Fibre guide with bend-radius protection"],
    cables: [
      C("Fibre optic cable (LLK connector)", "Fibre laser source", "Welding head", "Laser beam — keep minimum bend radius, never kink"),
      C("Chiller water hoses", "Chiller", "Laser source and head", "Cooling water"),
      C("Crossjet / shielding gas hose", "Gas supply", "Welding head", "Shielding gas and air knife"),
      C("Head signal cable", "Robot controller", "Welding head", "Head and sensor signals"),
      C("Enclosure safety interlock", "Enclosure doors", "Safety controller", "Door closed (dual channel)"),
    ],
    signals: ["Laser on", "Laser power (analog)", "Shutter open", "Program select", "Door closed", "Laser ready"],
    consumables: [W("Protective cover glass", "When dirty or spattered — check every shift"), W("Nozzle", "When damaged"), W("Chiller filter / DI water", "Per maker schedule")],
  },
  ultrasonic: {
    howItWorks: ["Plastic parts are placed in the anvil nest.", "The robot positions the ultrasonic stack on the joint.", "The horn presses down with set force.", "The generator vibrates the horn and melts the joint.", "The joint holds while it cools.", "The robot lifts and the part is unloaded."],
    eoat: [T("Ultrasonic stack / sonotrode", "Branson, Herrmann", "Vibrates and melts the plastic joint.")],
    onArm: ["ISO 9409-1 adapter plate", "Stack mounting with force sensor"],
    cables: [C("RF / HF cable", "Ultrasonic generator", "Stack", "Ultrasonic power"), C("Generator interface cable", "Robot controller", "Generator", "Start / result signals")],
    signals: ["Weld start", "Weld complete", "Energy / time OK", "Fault"],
    consumables: [W("Horn (sonotrode) wear", "When worn or cracked"), W("Anvil", "When worn")],
  },
  solder: {
    howItWorks: ["The board is placed in the fixture.", "The robot moves the iron to the first joint.", "The feeder pushes solder wire onto the hot tip.", "The joint flows and the robot moves on.", "The tip is cleaned at set intervals.", "Finished boards are checked and unloaded."],
    eoat: [T("Robotic soldering iron", "JBC, Apollo Seiko", "Heats the joint."), T("Solder wire feeder", "On the iron", "Feeds solder wire to the tip.")],
    onArm: ["ISO 9409-1 adapter plate", "Iron holder"],
    cables: [C("Iron heater cable", "Soldering station", "Iron", "Heater power and temperature"), C("Feeder cable", "Soldering station", "Wire feeder", "Feed signals")],
    signals: ["Feed start", "Tip temperature OK", "Tip clean request"],
    consumables: [W("Soldering tips", "When the tip stops wetting"), W("Solder wire", "When the spool is empty"), W("Flux", "Refill as used"), W("Tip cleaner", "When clogged")],
  },
  fsw: {
    howItWorks: ["The parts are clamped tightly in the fixture.", "The robot places the spinning pin tool on the joint.", "Axial force control presses down with the set force.", "The tool travels along the joint and stirs the metal together.", "The tool lifts out at the end.", "The part is unclamped and unloaded."],
    eoat: [T("FSW spindle head", "With axial force control", "Spins the pin tool and holds the force.")],
    onArm: ["ISO 9409-1 adapter plate", "Spindle mount with force sensor"],
    cables: [C("Spindle power + encoder cable", "Spindle drive", "FSW head", "Spindle drive"), C("Coolant hoses", "Cooler", "FSW head", "Spindle cooling")],
    signals: ["Spindle on", "Axial force", "Weld complete", "Fault"],
    consumables: [W("Pin tool", "By weld length or when worn")],
  },
  stud: {
    howItWorks: ["The part is placed in the fixture.", "The feeder blows a stud into the gun.", "The robot places the gun on the weld spot.", "The controller fires the arc and plunges the stud.", "The robot moves to the next spot.", "The part is unloaded."],
    eoat: [T("Stud-welding gun", "Nelson, Soyer", "Holds and welds the stud."), T("Stud feeder", "Automatic feeder", "Sends studs to the gun.")],
    onArm: ["ISO 9409-1 adapter plate", "Collision sensor / breakaway"],
    cables: [C("Weld cable", "Stud controller", "Gun", "Weld current"), C("Feed tube", "Stud feeder", "Gun", "Studs"), C("Work return cable", "Stud controller", "Part clamp", "Weld current back")],
    signals: ["Feed stud", "Weld start", "Weld OK / NOK"],
    consumables: [W("Studs", "As used"), W("Ferrules", "As used"), W("Chuck", "When worn")],
  },
  laserclean: {
    howItWorks: ["The part is placed in the laser enclosure.", "The door closes and interlocks confirm.", "The robot moves the cleaning head over the surface.", "The laser removes rust, paint or oil.", "Fume extraction takes away the dust.", "The part is unloaded."],
    eoat: [T("Laser cleaning head", "On fibre laser", "Scans the beam across the surface.")],
    onArm: ["ISO 9409-1 adapter plate", "Fibre guide"],
    cables: [C("Fibre optic cable", "Fibre laser", "Cleaning head", "Laser beam — never kink"), C("Fume extraction hose", "Head", "Fume extractor", "Fumes and dust")],
    signals: ["Laser on", "Laser ready", "Door closed"],
    consumables: [W("Protective window", "When dirty"), W("Fume filters", "When the extractor alarms")],
  },
  pallet: {
    howItWorks: [
      "Cases arrive on the infeed conveyor and stop at the pick point.",
      "The robot picks one or more cases with the palletizing gripper.",
      "The robot places them on the pallet in the set pattern.",
      "After each layer the robot can place a slip sheet.",
      "Light curtains with muting let the operator change pallets safely.",
      "When the pallet is full the robot moves to the second pallet station.",
      "The full pallet is taken away and an empty one is placed.",
    ],
    eoat: [T("Palletizing gripper (vacuum, fork, clamp or layer)", "Schmalz vacuum, fork / clamp grippers", "Picks cases, bags or whole layers."), T("Vacuum generator", "Ejector or blower", "Makes the vacuum for the gripper.")],
    onArm: ["ISO 9409-1 adapter plate", "Gripper mounting with axis-6 rotation"],
    cables: [C("Vacuum hose", "Vacuum generator", "Gripper", "Vacuum"), C("Gripper signal cable", "Robot controller", "Gripper", "Valves and sensors")],
    signals: ["Pallet present", "Pallet full", "Layer count", "Pattern number", "Slip-sheet request", "Muting active"],
    consumables: [W("Suction cups / foam pads", "When worn or torn"), W("Vacuum filters", "Monthly or when vacuum drops"), W("Silencers", "When clogged")],
  },
  paint: {
    howItWorks: [
      "The part enters the paint booth on the conveyor.",
      "The robot selects the colour and the colour-change valves flush.",
      "The bell starts spinning and high voltage is switched on.",
      "The robot sprays the part along the paint path with shaping air.",
      "The paint pumps deliver the exact flow.",
      "After the part the gun is purged with solvent for the next colour.",
      "The part leaves the booth to the oven.",
    ],
    eoat: [T("Rotary bell atomizer or spray gun", "ABB RB1000, Dürr EcoBell, Graco, Binks", "Atomizes and sprays the paint."), T("Colour-change valves and 2K mixer", "In the process arm", "Switch colours and mix 2K paint.")],
    onArm: ["Ex-proof / purged robot in the booth", "Paint pumps in the process arm", "Robot protective cover"],
    cables: [C("Paint lines", "Paint supply", "Colour changer", "Paint"), C("Solvent and air lines", "Booth supply", "Atomizer", "Solvent, shaping and bearing air"), C("High-voltage cable", "HV unit", "Atomizer", "Electrostatic charge")],
    signals: ["Colour select", "Gun trigger", "Bell speed", "Shaping air", "High voltage on", "Purge / solvent flush"],
    consumables: [W("Bell cups", "When damaged or by hours"), W("Paint filters", "Per batch / weekly"), W("Robot protective covers", "When dirty"), W("Solvent", "As used")],
  },
  dispense: {
    howItWorks: [
      "The part is located in the fixture.",
      "The dosing unit is filled from the drum pump.",
      "The robot moves the nozzle to the start of the bead.",
      "Dispense starts; the flow follows the robot speed.",
      "The robot lays the bead along the path.",
      "The bead-inspection camera checks the bead.",
      "The nozzle is purged if needed and the part is unloaded.",
    ],
    eoat: [T("Dispensing valve / nozzle", "Graco, Nordson, Sames, Sika", "Lays the adhesive or sealant bead."), T("Bead-inspection camera", "On the nozzle", "Checks the bead width and gaps.")],
    onArm: ["ISO 9409-1 adapter plate", "Dosing unit (volumetric doser / shot meter or gear meter)"],
    cables: [C("Heated material hose", "Drum / ram pump", "Dosing unit", "Adhesive / sealant"), C("Hose heater cable", "Temperature controller", "Heated hose", "Heater power")],
    signals: ["Dispense on / off", "Flow proportional to robot speed (analog)", "Purge", "Bead OK / NOK"],
    consumables: [W("Nozzles", "When worn or blocked"), W("Static mixers (2K)", "Every pot-life stop"), W("Filters", "Monthly"), W("Purge material", "As used")],
  },
  force: {
    howItWorks: ["The part is placed in the fixture.", "The robot picks the right abrasive tool.", "The robot moves the tool to the surface.", "The compliant tool holds a steady contact force.", "The robot follows the path over the part.", "Worn discs are changed automatically.", "The dust collector removes dust; the part is unloaded."],
    eoat: [T("Active compliant spindle or flange", "FerRobotics ACF", "Keeps a constant force on the surface."), T("Compliant deburring tool", "ATI", "Takes off burrs on edges."), T("Force-torque sensor", "ATI Axia", "Measures the contact force.")],
    onArm: ["ISO 9409-1 adapter plate", "Force-torque sensor", "Compliance unit"],
    cables: [C("Spindle power cable", "Spindle drive", "Tool", "Spindle power"), C("F/T sensor cable", "Sensor", "Robot controller", "Force data"), C("Dust hose", "Tool", "Dust collector", "Dust")],
    signals: ["Spindle on", "Contact force", "Disc change request", "Force limit"],
    consumables: [W("Abrasive discs / belts", "By wear or part count"), W("Polishing compound", "As used"), W("Deburring burrs", "When dull")],
  },
  pick: {
    howItWorks: ["Parts arrive at the pick point on a conveyor or tray.", "A sensor or camera confirms the part is there.", "The robot moves above the part.", "The gripper grips (vacuum or fingers) and confirms the part.", "The robot carries the part to the place point.", "The gripper releases (blow-off for vacuum).", "The robot returns for the next part."],
    eoat: [T("Vacuum gripper", "Schmalz, Piab", "Picks flat or boxed parts by suction."), T("Electric parallel gripper", "Schunk EGU / EGP, OnRobot RG2 / RG6, Robotiq 2F-85 / 140", "Picks parts with fingers.")],
    onArm: GRIP_ON_ARM,
    cables: [C("Vacuum / air hoses", "Valves", "Gripper", "Vacuum supply and blow-off"), C("Gripper cable", "Robot", "Gripper", "Gripper power and signals")],
    signals: ["Part present", "Grip / release", "Vacuum OK (part-present)", "Place done"],
    consumables: [W("Suction cups", "When worn or torn"), W("Vacuum filters", "Monthly"), W("Gripper fingers", "When worn")],
  },
  bin: {
    howItWorks: ["The bin of mixed parts is placed in the cell.", "The 3D camera scans the bin.", "The vision PC matches parts to the CAD model and picks one it can reach.", "Collision checking plans a safe path.", "The robot grips the part however it lies.", "The robot places it in a fixed position.", "When the bin is empty the operator is told."],
    eoat: [T("3D camera", "Photoneo PhoXi, Zivid, Pickit, Yaskawa MotoSight 3D", "Sees the parts in 3D."), T("Bin-picking gripper (magnet, vacuum or fingers)", "Per part", "Grips parts in any position.")],
    onArm: GRIP_ON_ARM,
    cables: [C("GigE / Ethernet camera cable", "3D camera", "Vision PC", "Images"), C("Camera power cable", "Cabinet", "3D camera", "24 V"), C("Trigger I/O cable", "Robot controller", "Vision PC", "Trigger and result")],
    signals: ["Trigger scan", "Pose result", "No part found", "Bin empty"],
    consumables: [W("Gripper pads / fingers", "When worn"), W("Camera window", "Clean weekly")],
  },
  vision: {
    howItWorks: ["The part arrives under the camera.", "The robot or sensor triggers the camera.", "Lights switch on and the camera takes the image.", "The vision controller checks the part.", "Pass or fail and an offset go back to the robot.", "Bad parts are rejected; good parts go on."],
    eoat: [T("Smart camera", "Cognex In-Sight, Keyence", "Takes and checks the image."), T("Lights", "Ring / bar lights", "Light the part evenly.")],
    onArm: ["ISO 9409-1 adapter plate", "Camera bracket"],
    cables: [C("Camera Ethernet cable", "Camera", "Vision controller", "Images and results"), C("Light cable", "Cabinet", "Lights", "Light power and strobe")],
    signals: ["Trigger", "Pass / fail", "Offset"],
    consumables: [W("Lens covers", "When scratched"), W("Lights", "When dim")],
  },
  screw: {
    howItWorks: ["The part is placed in the fixture.", "The feeder blows a screw to the nosepiece (or presents it).", "The robot moves to the hole.", "The driver runs the program for torque and angle.", "The controller reports OK or NOK.", "The robot moves to the next screw and the part is unloaded."],
    eoat: [T("Screwdriving module", "Atlas Copco QST / Power Focus 6000, Desoutter CVIR + ERS, Weber", "Drives screws to torque."), T("Screw feeder", "Step feeder with blow-feed tube or screw presenter", "Supplies screws one by one.")],
    onArm: ["ISO 9409-1 adapter plate", "Driver mount with compliance"],
    cables: [C("Tool cable", "Screw controller", "Driver", "Motor and transducer"), C("Feed tube", "Feeder", "Nosepiece", "Screws")],
    signals: ["Program select", "Start", "Torque / angle OK / NOK", "Feeder ready"],
    consumables: [W("Bits", "Every few thousand screws"), W("Nosepiece jaws", "When worn"), W("Feed tube", "When worn")],
  },
  rivet: {
    howItWorks: ["The parts are clamped.", "The feeder sends a rivet to the tool.", "The robot places the tool on the hole.", "The setting controller sets the rivet.", "The result is checked.", "The part is unloaded."],
    eoat: [T("Blind-rivet or self-pierce riveting tool", "With feeder and setting controller", "Sets the rivet.")],
    onArm: ["ISO 9409-1 adapter plate", "Collision sensor / breakaway"],
    cables: [C("Tool cable", "Setting controller", "Tool", "Power and signals"), C("Feed hose", "Rivet feeder", "Tool", "Rivets")],
    signals: ["Set rivet", "Set OK / NOK", "Feeder ready"],
    consumables: [W("Nose tips / jaws", "When worn"), W("Rivets", "As used"), W("Mandrel bin", "Empty when full")],
  },
  tend: {
    howItWorks: [
      "Raw parts wait in the part buffer (drawers or trays).",
      "The robot picks a raw part with one gripper.",
      "The machine signals it is ready and the automatic door opens.",
      "The robot takes the finished part with the second gripper and air blows the chuck clean.",
      "The robot loads the raw part and the chuck clamps.",
      "The robot leaves, the door closes and the cycle starts.",
      "The robot puts the finished part in the buffer and waits for cycle complete.",
    ],
    eoat: [T("Dual gripper", "Schunk PGN-plus / PZN-plus with soft jaws", "Holds a raw and a finished part."), T("Air blow-off", "Nozzle on the gripper", "Blows chips off the chuck and part.")],
    onArm: GRIP_ON_ARM,
    cables: [C("Machine interface cable", "Robot controller", "Machine controller", "I/O handshake or PROFINET"), C("Gripper air hoses", "Valve terminal", "Grippers", "Compressed air")],
    signals: ["Machine ready", "Door open / close", "Chuck clamp / unclamp", "Cycle start", "Cycle complete", "Program number", "Machine alarm"],
    consumables: [W("Gripper jaws", "When worn or new part"), W("Blow-off nozzles", "When blocked")],
  },
  head: {
    howItWorks: ["The part is clamped.", "The robot picks the right cutter (tool change).", "The spindle starts and coolant / air flows.", "The robot follows the cutting path.", "The cutter is checked or changed.", "The part is unloaded."],
    eoat: [T("HF spindle with tool change", "HSD, Kessler", "Drills, routes or cuts.")],
    onArm: ["ISO 9409-1 adapter plate", "Spindle mount"],
    cables: [C("Spindle power cable", "Spindle drive", "Spindle", "Spindle power"), C("Coolant / air hoses", "Supply", "Spindle", "Coolant and air")],
    signals: ["Spindle on", "Spindle speed", "Tool change", "Spindle alarm"],
    consumables: [W("Cutters", "By tool life"), W("Collets", "When worn"), W("Coolant", "Top up")],
  },
  mark: {
    howItWorks: ["The part is placed.", "The robot presents the part or the marker.", "The marker loads the text or code.", "The laser marks the part.", "A scanner reads the mark back.", "The part is unloaded."],
    eoat: [T("Fibre laser marker", "Keyence MD-X, Trumpf TruMark", "Marks text and codes.")],
    onArm: ["ISO 9409-1 adapter plate", "Marker head bracket"],
    cables: [C("Marker head cable", "Marker controller", "Head", "Laser and scan signals"), C("Fume hose", "Head", "Fume filter", "Fumes")],
    signals: ["Mark start", "Mark complete", "Read OK / NOK"],
    consumables: [W("Lens protection window", "When dirty"), W("Fume filters", "When the unit alarms")],
  },
  label: {
    howItWorks: ["The product arrives on the conveyor.", "The print engine prints the label.", "The tamp pad picks the label.", "The robot applies it at the right place.", "A scanner checks the label.", "The product moves on."],
    eoat: [T("Print-and-apply labeller", "Print engine + tamp pad", "Prints and applies labels."), T("Scanner", "Barcode reader", "Checks the label.")],
    onArm: ["ISO 9409-1 adapter plate", "Tamp pad / vacuum pad"],
    cables: [C("Printer data cable", "Line PLC", "Print engine", "Label data"), C("Vacuum hose", "Valve", "Tamp pad", "Vacuum")],
    signals: ["Print request", "Label ready", "Apply done", "Read OK / NOK"],
    consumables: [W("Labels", "Per roll"), W("Ribbons", "Per roll"), W("Print head", "By km printed")],
  },
  mobile: {
    howItWorks: ["The AMR gets a job from the fleet manager.", "It drives to the station.", "It docks on the markers.", "The cobot picks or places the parts.", "The AMR drives to the next station.", "It goes to the charger when the battery is low."],
    eoat: [T("Gripper on the cobot", "Vacuum or electric", "Picks parts at stations."), T("AMR base", "MiR, OMRON LD", "Carries the cobot.")],
    onArm: GRIP_ON_ARM,
    cables: [C("Battery power", "AMR battery", "Cobot controller", "DC supply"), C("Charger contacts", "Charger", "AMR", "Charging current")],
    signals: ["Mission start", "Docked", "Battery low", "Job done"],
    consumables: [W("Battery", "By cycles / years"), W("Wheels", "When worn"), W("Scanner windows", "Clean weekly")],
  },
  general: {
    howItWorks: ["The part arrives at the cell.", "A sensor confirms the part.", "The robot moves to the part.", "The robot does the process with its tool.", "The result is checked.", "The robot unloads the part and returns."],
    eoat: [T("Gripper or process tool", "Per job", "Does the work on the part.")],
    onArm: GRIP_ON_ARM,
    cables: [C("Tool cable", "Robot", "Tool", "Power and signals")],
    signals: ["Part present", "Start", "Done", "Fault"],
    consumables: [W("Gripper pads / fingers", "When worn"), W("Filters", "Monthly")],
  },
};

const TIG_WEAR: WearItem[] = [W("Tungsten electrodes", "When contaminated or tip worn"), W("Ceramic cups", "When cracked"), W("Collets", "When worn")];

/* ------------------------------------------------------------------ the system */

export interface RobotSystem {
  job: string;
  area: SystemArea;
  robot: { model: string; payload: string; reach: string };
  brand: string;
  isArm: boolean;
  controller: string;
  controllerNote?: string;
  pendant: string;
  pendantCable: string;
  software: string[];
  safety: string;
  fieldbus: string;
  flange: string;
  howItWorks: string[];
  eoat: ToolItem[];
  onArm: string[];
  cables: CableItem[];
  signals: string[];
  processEquipment: string[];
  consumables: WearItem[];
}

const skillOf = (job: string) => {
  const j = job.trim().toLowerCase();
  return SKILL_LIBRARY.find((s) => s.template.name.toLowerCase() === j) ?? SKILL_LIBRARY.find((s) => j.includes(s.template.name.toLowerCase()));
};

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);

export function robotSystem(job: string, opts: { robot?: { name: string; brand?: string }; fenced?: boolean } = {}): RobotSystem {
  const t = skillOf(job || "")?.template;
  const area: SystemArea = (areaOf(job || "") as SystemArea) || "general";
  const proc = PROCESS_SYSTEMS[area] ?? PROCESS_SYSTEMS.general;
  const model = opts.robot?.name ?? t?.robot.model ?? "Industrial robot";
  const brandKey = brandOf(opts.robot ? `${opts.robot.brand ?? ""} ${opts.robot.name}` : t?.robot.model);
  const b = BRAND_SYSTEMS[brandKey];
  const tText = t?.robot.controller ?? "";
  const cobot = /cobot|collab|\bcrx|lr mate|\bur\d|agilus|iisy|gofa|yumi|hc\d|motomini|\bgp[78]\b|gp12|micro/i.test(`${model} ${tText}`);
  const big = (parseFloat(opts.robot ? "" : t?.robot.payload ?? "") || 0) >= 200;

  let controller: string;
  let controllerNote = b.controllers.notes;
  const software = [...b.software];
  if (!b.arm) {
    controller = tText || b.controllers.current;
    controllerNote = "Special machine — controller as specified";
  } else if (!opts.robot && tText && HARDWARE.test(tText) && !SOFTWARE.test(tText)) {
    controller = tText;
  } else {
    controller = (cobot && b.controllers.compact) || (big && b.controllers.large) || b.controllers.current;
    if (tText && SOFTWARE.test(tText) && !software.some((s) => s.toLowerCase().includes(tText.toLowerCase().split(" ")[0]))) software.unshift(tText);
  }
  const singlePhase = b.singlePhase || cobot;
  const track = /track|7th/i.test(`${job} ${tText} ${model}`);

  const common: CableItem[] = [
    C("Robot ⇄ controller cables", "Robot base", "Robot controller", `${b.armCables}; 4–30 m, high-flex${track ? " through the cable chain" : ""}`, "arm"),
    C("Teach-pendant cable", b.pendant, "Robot controller", `Pendant signals and E-stop · ${b.pendantCable}`, "pendant"),
    C("Controller mains supply", "Factory supply", "Robot controller", singlePhase ? "Single-phase 100–240 V" : "3-phase 380–480 V", "mains"),
    C("Earth cable", "Robot base", "Robot controller", `Protective earth${area === "arc" || area === "spot" || area === "stud" ? " — essential for welding" : ""}`, "earth"),
    C("Safety I/O cables", "E-stops, door switch, light curtain / area scanner", "Safety controller", "Dual-channel safety signals", "safety"),
    C("Ethernet / fieldbus", "Robot controller", "Line PLC and HMI", b.fieldbus, "fieldbus"),
    C("Dress pack along the arm", "Axis 1", "Wrist", "Air, signals, vacuum or process media; retract system on axes 3–6", "dress"),
    C("Tool cable", "Wrist", "Tool-changer modules / tool connector", "Tool power and signals", "tool"),
  ];
  if (track) common.push(C("Track servo motor cable", "Robot controller", "Track motor", "Servo power + encoder, in the cable chain", "track"));

  // The template's own tool names first, matched to the area's typical models.
  const eoat: ToolItem[] = [];
  for (const name of t?.eoat ?? []) {
    const w = words(name);
    const hit = proc.eoat.find((x) => words(x.name).some((y) => w.includes(y)));
    eoat.push({ name, examples: hit?.examples ?? "Typical industrial models", what: hit?.what ?? "Part of the end-of-arm tooling for this job." });
  }
  for (const x of proc.eoat) if (!eoat.some((y) => y.name === x.name)) eoat.push(x);

  const tig = area === "arc" && /\btig\b/i.test(job);
  return {
    job,
    area,
    robot: { model, payload: t?.robot.payload ?? "", reach: t?.robot.reach ?? "" },
    brand: b.arm ? b.brand : brandOf(model) === "Other" ? (t?.robot.model.split(" ")[0] ?? "Other") : b.brand,
    isArm: b.arm,
    controller,
    controllerNote,
    pendant: b.pendant,
    pendantCable: b.pendantCable,
    software,
    safety: b.safety,
    fieldbus: b.fieldbus,
    flange: b.flange,
    howItWorks: proc.howItWorks,
    eoat,
    onArm: proc.onArm,
    cables: [...common, ...proc.cables],
    signals: proc.signals,
    processEquipment: cellEquipment([job], { fenced: opts.fenced }).map((x) => x.name),
    consumables: tig ? [...TIG_WEAR, ...proc.consumables.filter((x) => !/contact tip|nozzle|reamer|anti-spatter/i.test(x.name))] : proc.consumables,
  };
}
