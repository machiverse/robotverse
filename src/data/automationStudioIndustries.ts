/**
 * Automation Studio demo blueprints.
 *
 * The studio is industry-agnostic: each entry below is one worked EXAMPLE of the
 * kind of output the analysis produces. Nothing here is specific to a single
 * customer or material — the selected industry decides which blueprint renders.
 */

export type Automation = "full" | "semi";

export interface ProcessCard {
  index: string;
  name: string;
  short: string;
  automation: Automation;
  current: string[];
  automated: string[];
  robot: { model: string; payload: string; reach: string; controller: string; stock: string };
  eoat: string[];
  qty?: number;
  cycleTimeCurrent: string;
  cycleTimeAutomated: string;
  cycleImprovement: string;
  safetyRiskCurrent: "High" | "Medium" | "Low";
  safetyRiskAutomated: "Low";
  integrationNote: string;
}

export interface IndustryBlueprint {
  key: string;
  label: string;
  emoji: string;
  placeholder: string;
  roi: { throughput: string; labor: string; payback: string; defect: string };
  processes: ProcessCard[];
}

export interface InventoryRow {
  model: string;
  controller: string;
  qty: number;
  payload: string;
  reach: string;
  station: string;
  eoat: string;
}

const p = (
  name: string,
  short: string,
  automation: Automation,
  current: [string, string, string],
  automated: [string, string, string],
  model: string,
  payload: string,
  reach: string,
  controller: string,
  stock: string,
  eoat: string[],
  qty = 1,
): Omit<ProcessCard, "index"> => {
  const highRisk = /weld|paint|cut|grind|block|panel|rebar|transport|handling|polish/i.test(name);
  const quickCycle = /inspect|label|test|solder|cap|sort|pick/i.test(name);
  return {
    name,
    short,
    automation,
    current,
    automated,
    robot: { model, payload, reach, controller, stock },
    eoat,
    qty,
    cycleTimeCurrent: quickCycle ? "45-75 sec" : "6-9 min",
    cycleTimeAutomated: quickCycle ? "18 sec" : automation === "full" ? "2.5 min" : "3.5 min",
    cycleImprovement: quickCycle ? "68% faster" : automation === "full" ? "65% faster" : "52% faster",
    safetyRiskCurrent: highRisk ? "High" : automation === "semi" ? "Medium" : "Low",
    safetyRiskAutomated: "Low",
    integrationNote: `Requires ${automation === "full" ? "safety fencing, light curtains" : "collaborative safety zoning"}, ${controller} PLC tie-in, and interface commissioning for the ${eoat[0].toLowerCase()}.`,
  };
};

type Raw = Omit<IndustryBlueprint, "processes"> & { processes: Omit<ProcessCard, "index">[] };

const RAW: Raw[] = [
  {
    key: "stone",
    label: "Stone & Granite",
    emoji: "🪨",
    placeholder:
      "Example: We cut granite blocks into slabs, polish them by hand, profile the edges on a CNC, then stack onto A-frames for dispatch.",
    roi: { throughput: "2-3×", labor: "60-70%", payback: "18-30 mo", defect: "<2%" },
    processes: [
      p("Block Handling & Loading", "Block Loading", "full",
        ["Overhead crane with 2 operators per block", "Manual slinging, high pinch-point risk", "6-9 minute cycle per block"],
        ["Heavy-payload robot with vacuum lift head", "Auto block detection via 3D area scanner", "2.5 minute cycle, single supervisor"],
        "FANUC M-2000iA/900L", "900 kg", "4683 mm", "R-30iB Plus", "In Stock",
        ["Vacuum Pad Gripper", "Load Cell", "Anti-Drop Check Valve"]),
      p("Surface Polishing", "Polishing", "full",
        ["Hand-held polisher, 4 operators per shift", "Finish quality varies between operators", "High silica dust exposure"],
        ["Force-controlled robotic polishing head", "Constant contact pressure, repeatable gloss", "Enclosed wet cell, no dust exposure"],
        "ABB IRB 6700-235/2.65", "235 kg", "2650 mm", "OmniCore C90XT", "In Stock",
        ["Active Force Compliance Head", "Pad Changer", "Coolant Nozzle"], 2),
      p("Edge Profiling & Chamfering", "Edge Profiling", "semi",
        ["CNC edge machine loaded by hand", "Profile templates swapped manually", "Rework rate around 8%"],
        ["Robot load/unload with profile recipe library", "Operator retained for first-article approval", "Rework target below 2%"],
        "KUKA KR 210 R2700-2", "210 kg", "2700 mm", "KR C5", "4-6 Weeks",
        ["Dual Clamp Gripper", "Tool Changer", "Force/Torque Sensor"]),
      p("Quality Inspection", "Inspection", "full",
        ["Visual inspection under a work lamp", "No dimensional record per slab", "Defects found late, after polishing"],
        ["Line-scan vision + laser profilometer", "Full dimensional record per part ID", "Inline reject before value is added"],
        "Yaskawa GP25-12", "25 kg", "1730 mm", "YRC1000", "In Stock",
        ["Vision Camera Mount", "Laser Profilometer", "LED Ring Light"]),
      p("Palletizing & Crating", "Palletizing", "full",
        ["3 operators stacking onto A-frames", "Transit damage claims every month", "Pattern depends on who is on shift"],
        ["Palletizing robot with pattern generator", "Consistent layer and separator placement", "Auto label and pack-list print"],
        "FANUC M-410iC/315", "315 kg", "3143 mm", "R-30iB Plus", "2-3 Weeks",
        ["Clamp + Vacuum Combi Tool", "Separator Feeder", "Label Applicator"]),
      p("Inter-Station Transport", "Transport Loop", "semi",
        ["Forklift moves between all stations", "Average 11 minute queue per move", "Mixed pedestrian and forklift traffic"],
        ["AMR fleet on a fixed loop with call buttons", "Queue time reduced to under 3 minutes", "Forklift retained for yard work only"],
        "AMR 1500 Heavy Deck", "1500 kg", "Loop route", "Fleet Manager", "6-8 Weeks",
        ["Roller Deck Top", "Safety Scanner Pair", "Charge Dock"], 2),
    ],
  },
  {
    key: "metal",
    label: "Metal Fabrication",
    emoji: "🔧",
    placeholder:
      "Example: We laser-cut sheet, press-brake the parts, MIG weld sub-assemblies by hand, then powder coat and inspect before dispatch.",
    roi: { throughput: "2-2.5×", labor: "50-65%", payback: "14-24 mo", defect: "<1.5%" },
    processes: [
      p("Sheet Loading & Laser Cutting", "Sheet Loading", "full",
        ["Two operators lift sheet onto the cutting bed", "Nest changeover takes 12-15 minutes", "Scratched blanks from manual handling"],
        ["Vacuum sheet loader with thickness sensing", "Nest changeover under 3 minutes", "Cut parts sorted to kit trolleys automatically"],
        "KUKA KR 120 R2700-2", "120 kg", "2700 mm", "KR C5", "In Stock",
        ["Vacuum Sheet Gripper", "Double-Blank Detector", "Part Sorter Fingers"]),
      p("Press Brake Bending", "Bending", "semi",
        ["Operator handles every flange by hand", "Angle drift across a batch", "Back strain from long blanks"],
        ["Robot bend cell with follow-along motion", "Angle measured and corrected per stroke", "Operator handles setup and first article"],
        "Yaskawa GP180", "180 kg", "2702 mm", "YRC1000", "4-6 Weeks",
        ["Magnetic + Vacuum Combi Tool", "Regrip Station", "Angle Sensor Link"]),
      p("MIG / MAG Welding", "Welding", "full",
        ["4 manual welding bays, output varies daily", "Weld penetration inconsistent", "Fume exposure and long rework queue"],
        ["Arc welding cell with touch sensing and seam tracking", "Repeatable penetration with logged parameters", "Fume extraction at the torch, rework near zero"],
        "ABB IRB 2600ID-15/1.85", "15 kg", "1850 mm", "OmniCore C30", "In Stock",
        ["Integrated Dress Torch", "Seam Tracker", "Torch Cleaning Station"], 2),
      p("Grinding & Surface Prep", "Grinding", "semi",
        ["Hand grinders, heavy noise and vibration", "Over-grinding thins the material", "No record of which welds were dressed"],
        ["Force-compliant robotic grinding with belt changer", "Constant material removal per pass", "Per-part dressing record"],
        "Kawasaki RS020N", "20 kg", "1725 mm", "E Controller", "3-5 Weeks",
        ["Force Compliance Spindle", "Belt Changer", "Dust Shroud"]),
      p("Powder Coat & Paint", "Painting", "full",
        ["Manual spray, thickness varies by operator", "High overspray and powder waste", "Reworked parts re-enter the line late"],
        ["Paint robot with programmed spray paths", "Even film thickness, less overspray", "Recipe per part number"],
        "Stäubli TX2-90 XL", "7 kg", "1200 mm", "CS9", "6-8 Weeks",
        ["Electrostatic Spray Gun", "Colour Changer", "Wash Interface"]),
      p("Final Inspection & Dispatch", "Inspection", "full",
        ["Sample-based visual check only", "Dimensional issues found by the customer", "Manual packing list"],
        ["Vision and probe inspection on every part", "Pass/fail logged against work order", "Auto label and pack list"],
        "Universal Robots UR10e", "12.5 kg", "1300 mm", "PolyScope X", "In Stock",
        ["Vision Camera Mount", "Touch Probe", "Marking Head"]),
    ],
  },
  {
    key: "automotive",
    label: "Automotive",
    emoji: "🚗",
    placeholder:
      "Example: We weld car frames on manual MIG stations, move them by trolley to a paint booth, then assemble and test by hand.",
    roi: { throughput: "2.5-3×", labor: "55-70%", payback: "20-34 mo", defect: "<0.5%" },
    processes: [
      p("Body-in-White Spot Welding", "Body Welding", "full",
        ["Hand-held weld guns on a fixture line", "Spot placement drifts across shifts", "Cycle limited by operator fatigue"],
        ["Servo gun spot welding with weld monitoring", "Every spot logged to the VIN", "Balanced line cycle, no fatigue drop"],
        "FANUC R-2000iC/210F", "210 kg", "2655 mm", "R-30iB Plus", "In Stock",
        ["Servo Spot Weld Gun", "Tip Dresser", "Weld Controller Link"], 3),
      p("Sealant & Adhesive Application", "Sealing", "semi",
        ["Manual bead application, uneven width", "Material waste from overfill", "Leak complaints in the field"],
        ["Robot dispensing with flow control and vision check", "Consistent bead width and volume", "Bead verified before cure"],
        "ABB IRB 4600-45/2.05", "45 kg", "2050 mm", "OmniCore C30", "2-4 Weeks",
        ["Metering Dispense Head", "Bead Inspection Camera", "Nozzle Purge"]),
      p("Paint & Clear Coat", "Painting", "full",
        ["Manual spray in a shared booth", "Orange peel and thickness variation", "Solvent exposure for painters"],
        ["7-axis paint robot with atomiser control", "Uniform film build, less overspray", "Operators out of the booth"],
        "KUKA KR 30 R2100 (paint)", "30 kg", "2100 mm", "KR C5 (Ex)", "8-10 Weeks",
        ["Bell Atomiser", "Colour Changer", "Explosion-Proof Wrist"], 2),
      p("Interior & Trim Assembly", "Assembly", "semi",
        ["Repetitive clip insertion by hand", "Missed clips found at final audit", "Ergonomic complaints at the station"],
        ["Collaborative robot beside the operator for clip insertion", "Insertion force checked per clip", "Operator handles the judgement work"],
        "Doosan H2017", "20 kg", "1700 mm", "DART Suite", "3-5 Weeks",
        ["Clip Insertion Tool", "Force Sensor", "Screwdriver Spindle"], 2),
      p("End-of-Line Testing", "Testing", "full",
        ["Manual gap-and-flush gauges", "Records kept on paper", "Slow feedback to the weld line"],
        ["Robot-mounted vision and laser gauging", "Digital gap-and-flush record per unit", "Same-shift feedback to upstream cells"],
        "Yaskawa GP12", "12 kg", "1440 mm", "YRC1000", "In Stock",
        ["Laser Gap Sensor", "Vision Head", "Calibration Artefact"]),
      p("Line-Side Material Supply", "Transport Loop", "full",
        ["Tugger trains on a fixed timetable", "Line-side stock-outs and overstock", "Aisle congestion at shift change"],
        ["AMR fleet on call from each station", "Replenishment on actual consumption", "Traffic managed by the fleet controller"],
        "AMR 1000 Tow Deck", "1000 kg", "Loop route", "Fleet Manager", "6-8 Weeks",
        ["Tow Hitch", "Safety Scanner Pair", "Charge Dock"], 4),
    ],
  },
  {
    key: "packaging",
    label: "Packaging",
    emoji: "📦",
    placeholder:
      "Example: We hand-pack pouches into cartons, tape the cases manually, apply labels, then stack pallets and shrink wrap them.",
    roi: { throughput: "3-4×", labor: "65-75%", payback: "10-18 mo", defect: "<1%" },
    processes: [
      p("High-Speed Product Pick & Place", "Pick & Place", "full",
        ["6 packers on the belt per shift", "Rate drops sharply in the last hour", "Product damage from rushed handling"],
        ["Delta robot picking from vision-tracked belt", "Steady 120 picks per minute", "Gentle tool, damage near zero"],
        "ABB IRB 390 FlexPacker", "15 kg", "1600 mm", "OmniCore C30", "In Stock",
        ["Multi-Cup Vacuum Tool", "Belt Tracking Camera", "Wash-Down Cover"], 2),
      p("Carton Forming & Loading", "Carton Forming", "full",
        ["Cartons folded and taped by hand", "Flap misalignment jams the sealer", "Changeover between sizes takes 20 minutes"],
        ["Robot carton erector with recipe per SKU", "Square cartons, no sealer jams", "Size changeover in 3 minutes"],
        "Epson C8L SCARA", "8 kg", "1400 mm", "RC800A", "2-3 Weeks",
        ["Suction Blank Picker", "Flap Tucker", "Tape Head Interface"]),
      p("Labelling & Coding", "Labelling", "semi",
        ["Labels applied by hand, often skewed", "Date codes missed on some packs", "Audit failures on traceability"],
        ["Robot label applicator with print verification", "Barcode read after every application", "Operator handles reel changes only"],
        "Universal Robots UR5e", "5 kg", "850 mm", "PolyScope X", "In Stock",
        ["Label Applicator Head", "Barcode Verifier", "Reel Sensor"]),
      p("Case Packing", "Case Packing", "full",
        ["Packs placed into cases by hand", "Count errors reach the customer", "Repetitive strain complaints"],
        ["Robot case packer with count verification", "Every case count checked before sealing", "Station becomes a supervisory role"],
        "Kawasaki RS007N", "7 kg", "730 mm", "E Controller", "In Stock",
        ["Multi-Pack Gripper", "Case Presence Sensor", "Divider Inserter"], 2),
      p("Palletizing & Shrink Wrap", "Palletizing", "full",
        ["Two operators stack every pallet", "Unstable loads fall in transit", "Wrapping quality varies"],
        ["Palletizer with pattern library and slip sheets", "Stable, scanned loads", "Inline wrapper triggered by the robot"],
        "FANUC M-710iC/50", "50 kg", "2050 mm", "R-30iB Plus", "In Stock",
        ["Clamp + Vacuum Combi Tool", "Slip Sheet Picker", "Pallet Sensor"]),
    ],
  },
  {
    key: "food",
    label: "Food & Beverage",
    emoji: "🥫",
    placeholder:
      "Example: We sort incoming produce by hand, fill and seal jars on a semi-auto line, label them, then case pack and palletize.",
    roi: { throughput: "2.5-3.5×", labor: "60-70%", payback: "12-20 mo", defect: "<1%" },
    processes: [
      p("Incoming Sorting & Grading", "Sorting", "full",
        ["Hand sorting on a belt, 5 operators", "Grade calls differ between people", "Foreign material slips through"],
        ["Vision grading with high-speed robotic rejection", "Objective grade per piece", "Foreign material removed inline"],
        "ABB IRB 360 FlexPicker", "8 kg", "1600 mm", "OmniCore C30", "In Stock",
        ["Food-Grade Vacuum Cups", "Colour Vision Head", "Wash-Down Shroud"], 2),
      p("Filling & Dosing", "Filling", "semi",
        ["Semi-auto filler with manual jar placement", "Fill weight varies, giveaway cost", "Spillage around the station"],
        ["Robot jar handling with checkweigher feedback", "Fill weight held to target", "Sealed, wash-down station"],
        "Stäubli TX2-60 HE", "3.7 kg", "670 mm", "CS9", "4-6 Weeks",
        ["Hygienic Jar Gripper", "Checkweigher Link", "IP67 Wrist Seal"]),
      p("Capping & Sealing", "Sealing", "full",
        ["Manual capping, torque not measured", "Leakers found by customers", "Wrist injuries from repetitive torque"],
        ["Servo capping with torque and height logging", "Every cap torque recorded", "No manual torque work"],
        "Epson LS10-B SCARA", "10 kg", "1000 mm", "RC700A", "In Stock",
        ["Servo Cap Chuck", "Torque Transducer", "Cap Feeder Nest"]),
      p("Labelling & Date Coding", "Labelling", "full",
        ["Labels hand-applied, skew and bubbles", "Date code smudging", "Reprints and waste"],
        ["Robot applicator with vision verification", "Straight labels, verified codes", "Waste reduced to trim only"],
        "Universal Robots UR5e", "5 kg", "850 mm", "PolyScope X", "In Stock",
        ["Label Applicator Head", "Code Reader", "Reject Chute Link"]),
      p("Case Packing & Palletizing", "Palletizing", "full",
        ["Cases packed and stacked by hand", "Heavy lifting all shift", "Pallet patterns inconsistent"],
        ["Robot case packing and palletizing in one cell", "Pattern per SKU with slip sheets", "Manual lifting removed"],
        "Yaskawa PL80", "80 kg", "2100 mm", "YRC1000", "2-4 Weeks",
        ["Case Clamp Tool", "Slip Sheet Picker", "Pallet Dispenser Link"]),
    ],
  },
  {
    key: "pharma",
    label: "Pharma",
    emoji: "💊",
    placeholder:
      "Example: We fill and cap vials on a semi-auto line, inspect them visually, label by hand, then carton and serialise for dispatch.",
    roi: { throughput: "2-3×", labor: "50-60%", payback: "16-28 mo", defect: "<0.2%" },
    processes: [
      p("Aseptic Vial Filling", "Filling", "full",
        ["Operators inside the filling isolator", "Intervention risk to sterility", "Batch records compiled by hand"],
        ["Isolator robot handling vials, no human entry", "Contamination risk sharply reduced", "Electronic batch record per vial"],
        "Stäubli TX2-60 Stericlean", "3.7 kg", "670 mm", "CS9", "10-12 Weeks",
        ["Sterile Vial Gripper", "H2O2-Resistant Coating", "Nest Transfer Tool"]),
      p("Stoppering & Capping", "Capping", "full",
        ["Manual stopper placement and crimping", "Seal integrity varies", "Rejected batches after leak testing"],
        ["Robot stoppering with crimp force monitoring", "Seal force recorded per unit", "Leak rejects near zero"],
        "Epson LS6-B SCARA", "6 kg", "700 mm", "RC700A", "6-8 Weeks",
        ["Stopper Pick Nest", "Crimp Force Sensor", "Cleanroom Cover"]),
      p("Visual Particle Inspection", "Inspection", "full",
        ["Human inspection under lamps, 100% visual", "Detection varies with fatigue", "No image evidence retained"],
        ["Robot presentation to a vision inspection head", "Consistent detection thresholds", "Image retained per unit for audit"],
        "Yaskawa GP8", "8 kg", "727 mm", "YRC1000", "In Stock",
        ["Vial Spin Gripper", "Backlight Panel", "High-Res Vision Head"], 2),
      p("Labelling & Serialisation", "Labelling", "semi",
        ["Labels applied and checked manually", "Serial numbers reconciled in spreadsheets", "Regulatory reporting is slow"],
        ["Robot labelling with serial print and verify", "Aggregation built from verified reads", "Reports generated from the line data"],
        "Universal Robots UR3e", "3 kg", "500 mm", "PolyScope X", "In Stock",
        ["Label Applicator Head", "2D Code Verifier", "Reject Diverter"]),
      p("Cartoning & Case Aggregation", "Cartoning", "full",
        ["Cartons filled and counted by hand", "Aggregation errors at case level", "Recount before dispatch"],
        ["Robot cartoning with parent-child aggregation", "Verified counts at every level", "No recount needed"],
        "Kawasaki RS007L", "7 kg", "930 mm", "E Controller", "3-5 Weeks",
        ["Blister Pack Gripper", "Leaflet Inserter", "Case Code Reader"]),
    ],
  },
  {
    key: "construction",
    label: "Construction",
    emoji: "🏗️",
    placeholder:
      "Example: We cut and bend rebar by hand, weld cages on trestles, and move panels around the yard with a crane and forklift.",
    roi: { throughput: "2-2.5×", labor: "55-65%", payback: "18-30 mo", defect: "<2%" },
    processes: [
      p("Rebar Cutting & Bending", "Rebar Bending", "full",
        ["Manual measuring, cutting and bending", "Length errors scrap whole bars", "Heavy repetitive lifting"],
        ["Robot cell fed from bar stock with a cut list", "Length and angle verified per bar", "Lifting handled by the robot"],
        "KUKA KR 240 R2900-2", "240 kg", "2900 mm", "KR C5", "6-8 Weeks",
        ["Bar Clamp Gripper", "Bend Angle Encoder", "Cut Shear Interface"]),
      p("Cage & Mesh Welding", "Welding", "full",
        ["Cages tack-welded by hand on trestles", "Geometry drifts across a batch", "Fume and arc exposure"],
        ["Robotic arc welding on an indexing fixture", "Repeatable cage geometry", "Extraction at the torch"],
        "ABB IRB 2600-20/1.65", "20 kg", "1650 mm", "OmniCore C30", "In Stock",
        ["Integrated Dress Torch", "Seam Tracker", "Fixture Clamp Link"], 2),
      p("Panel & Formwork Handling", "Panel Handling", "full",
        ["Crane and 3-man crew per panel", "Long slinging and waiting time", "Edge damage in handling"],
        ["Heavy-payload robot with vacuum panel head", "Single-supervisor handling", "Panel edges protected"],
        "FANUC M-2000iA/1700L", "1700 kg", "4683 mm", "R-30iB Plus", "8-12 Weeks",
        ["Vacuum Panel Head", "Load Cell", "Anti-Drop Valve"]),
      p("Concrete Element Finishing", "Finishing", "semi",
        ["Hand trowelling and grinding of surfaces", "Finish varies panel to panel", "Silica dust in the bay"],
        ["Force-controlled robotic trowel and grind passes", "Consistent surface finish", "Enclosed, extracted bay"],
        "Kawasaki BX200L", "200 kg", "2600 mm", "E Controller", "6-8 Weeks",
        ["Force Compliance Head", "Trowel / Disc Changer", "Dust Shroud"]),
      p("Yard Material Transport", "Transport Loop", "semi",
        ["Forklifts between bays with long queues", "Congested traffic routes", "Delivery timing unpredictable"],
        ["Outdoor AMR loop between bays and dispatch", "Queue time cut sharply", "Forklifts for exceptions only"],
        "AMR 2000 Flatbed", "2000 kg", "Loop route", "Fleet Manager", "8-10 Weeks",
        ["Flatbed Deck", "Safety Scanner Pair", "Weather Cover"], 2),
    ],
  },
  {
    key: "electronics",
    label: "Electronics",
    emoji: "🔌",
    placeholder:
      "Example: We load PCBs by hand into the reflow line, hand-solder connectors, test boards on a bench, then assemble and box them.",
    roi: { throughput: "3-4×", labor: "60-75%", payback: "10-18 mo", defect: "<0.5%" },
    processes: [
      p("PCB Load & Unload", "PCB Handling", "full",
        ["Boards handled by hand between machines", "ESD and flex damage risk", "Machine idle while waiting on an operator"],
        ["SCARA load/unload from magazines", "ESD-safe tooling, no flex damage", "Machines fed continuously"],
        "Epson LS6-B SCARA", "6 kg", "700 mm", "RC700A", "In Stock",
        ["ESD Vacuum Tool", "Magazine Sensor", "Board Edge Locator"], 2),
      p("Selective Soldering", "Soldering", "full",
        ["Hand soldering of through-hole parts", "Joint quality depends on the operator", "Touch-up loop after every batch"],
        ["Robotic selective soldering with thermal profiles", "Profile logged per joint", "Touch-up nearly eliminated"],
        "Universal Robots UR5e", "5 kg", "850 mm", "PolyScope X", "In Stock",
        ["Solder Iron Head", "Wire Feeder", "Tip Cleaner"]),
      p("Dispensing & Conformal Coating", "Coating", "semi",
        ["Manual brush and syringe application", "Coverage gaps cause field failures", "Solvent exposure at the bench"],
        ["Robot dispensing with programmed keep-out zones", "Even coverage, verified by UV vision", "Enclosed, extracted cell"],
        "Stäubli TX2-40", "2 kg", "515 mm", "CS9", "4-6 Weeks",
        ["Precision Dispense Valve", "UV Inspection Camera", "Needle Purge"]),
      p("Functional Test Handling", "Testing", "full",
        ["Boards placed into test fixtures by hand", "Fixture pin damage from misalignment", "Test results logged manually"],
        ["Robot fixture loading with alignment vision", "Pin wear reduced sharply", "Results tied to the board serial"],
        "Yaskawa GP7", "7 kg", "927 mm", "YRC1000", "In Stock",
        ["ESD Gripper Fingers", "Alignment Camera", "Fixture Latch Tool"], 2),
      p("Final Assembly & Boxing", "Assembly", "semi",
        ["Screwdriving and boxing by hand", "Missed screws found at audit", "Repetitive strain complaints"],
        ["Collaborative screwdriving beside the operator", "Torque logged per fastener", "Operator handles cabling and judgement"],
        "Doosan M1013", "10 kg", "1300 mm", "DART Suite", "2-4 Weeks",
        ["Servo Screwdriver", "Torque Sensor", "Carton Vacuum Tool"]),
    ],
  },
];

export const INDUSTRY_BLUEPRINTS: IndustryBlueprint[] = RAW.map((r) => ({
  ...r,
  processes: r.processes.map((proc, i) => ({ ...proc, index: String(i + 1).padStart(2, "0") })),
}));

export const INDUSTRIES = INDUSTRY_BLUEPRINTS.map(({ key, label, emoji, placeholder }) => ({
  key,
  label,
  emoji,
  placeholder,
}));

export const DEFAULT_BLUEPRINT_KEY = "metal";

export const getBlueprint = (key: string | null): IndustryBlueprint =>
  INDUSTRY_BLUEPRINTS.find((b) => b.key === key) ??
  INDUSTRY_BLUEPRINTS.find((b) => b.key === DEFAULT_BLUEPRINT_KEY)!;

export const buildInventory = (bp: IndustryBlueprint): InventoryRow[] =>
  bp.processes.map((proc, i) => ({
    model: proc.robot.model,
    controller: proc.robot.controller,
    qty: proc.qty ?? 1,
    payload: proc.robot.payload,
    reach: proc.robot.reach,
    station: `S${i + 1} ${proc.short}`,
    eoat: proc.eoat[0],
  }));

export const buildStats = (bp: IndustryBlueprint) => {
  const full = bp.processes.filter((x) => x.automation === "full").length;
  const robots = bp.processes.reduce((sum, x) => sum + (x.qty ?? 1), 0);
  return [
    { value: String(bp.processes.length), label: "Processes Found" },
    { value: String(full), label: "Fully Automatable" },
    { value: String(bp.processes.length - full), label: "Semi-Automatable" },
    { value: String(robots), label: "Robots Matched" },
  ];
};
