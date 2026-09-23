/**
 * Automation Studio — description analyzer.
 *
 * Reads the free-text process description a user types in Step 1 and derives
 * matching process stations from it. Falls back to the selected industry
 * blueprint when the description is empty or has no recognisable keywords.
 */

import {
  getBlueprint,
  type Automation,
  type ProcessCard,
} from "@/data/automationStudioIndustries";

type Template = Omit<ProcessCard, "index">;

const t = (
  name: string,
  short: string,
  automation: Automation,
  current: [string, string, string],
  automated: [string, string, string],
  model: string,
  payload: string,
  reach: string,
  controller: string,
  eoat: [string, string, string],
  opts: { stock?: string; qty?: number; quick?: boolean; risk?: "High" | "Medium" | "Low" } = {},
): Template => {
  const quick = opts.quick ?? false;
  return {
    name,
    short,
    automation,
    current,
    automated,
    robot: { model, payload, reach, controller, stock: opts.stock ?? "In Stock" },
    eoat,
    qty: opts.qty ?? 1,
    cycleTimeCurrent: quick ? "45-75 sec" : "6-9 min",
    cycleTimeAutomated: quick ? "18 sec" : automation === "full" ? "2.5 min" : "3.5 min",
    cycleImprovement: quick ? "68% faster" : automation === "full" ? "65% faster" : "52% faster",
    safetyRiskCurrent: opts.risk ?? (automation === "semi" ? "Medium" : "Low"),
    safetyRiskAutomated: "Low",
    integrationNote: `Requires ${
      automation === "full" ? "safety fencing, light curtains" : "collaborative safety zoning"
    }, ${controller} PLC tie-in, and interface commissioning for the ${eoat[0].toLowerCase()}.`,
  };
};

/* ------------------------------ templates ------------------------------ */

const TEMPLATES: Record<string, Template> = {
  /* Warehouse & logistics */
  pick: t("Order Picking", "Pick", "semi",
    ["Workers walk the aisles to each pick face", "Pick errors traced back from customer claims", "Fatigue-driven slowdown late in the shift"],
    ["Cobot pick cell fed by an AMR tote loop", "Pick-by-light confirmation on every unit", "Steady rate across all three shifts"],
    "Universal Robots UR10e", "12.5 kg", "1300 mm", "PolyScope 5", ["Multi-Zone Vacuum Gripper", "Pick Sensor", "Tote Presence Scanner"],
    { quick: true }),
  scan: t("Barcode Scanning & Verification", "Scan", "full",
    ["Handheld scanners, one trigger pull per item", "Mis-scans corrected manually at dispatch", "No image record of what shipped"],
    ["Fixed tunnel scanner over the conveyor", "Automatic reject of unread or mismatched codes", "Image + timestamp archived per order"],
    "Cognex DataMan 380 Tunnel", "Fixed station", "Tunnel 900 mm", "In-Sight Vision Suite", ["6-Sided Scan Tunnel", "Encoder Trigger", "Reject Pusher"],
    { quick: true }),
  pack: t("Packing & Box Forming", "Pack", "semi",
    ["Cartons hand-formed and taped at the bench", "Void fill judged by eye, inconsistent", "Repetitive reaching and taping motions"],
    ["Cobot packs to a validated carton recipe", "Right-sized void fill dosed automatically", "Operator retained for exceptions only"],
    "Doosan M1013", "10 kg", "1300 mm", "DART Platform", ["Soft Vacuum Cup Array", "Carton Erector Tool", "Tape Head"],
    { quick: true }),
  box: t("Box Forming & Sizing", "Box", "full",
    ["Flat blanks erected by hand per order", "One carton size used for all orders", "Excess dunnage and freight cost"],
    ["Auto box erector with on-demand sizing", "Carton chosen from cubed order data", "Freight and dunnage cost reduced"],
    "Universal Robots UR10e", "12.5 kg", "1300 mm", "PolyScope 5", ["Carton Erector Tool", "Blank Magazine Feeder", "Tape Head"],
    { quick: true }),
  label: t("Labeling & Weighing", "Label", "full",
    ["Labels printed then peeled and applied by hand", "Placement varies, scan failures downstream", "Weight recorded on a manual checkweigher"],
    ["Print-and-apply head on a fixed applicator", "Placement verified by vision after apply", "Inline checkweigher logs every parcel"],
    "Universal Robots UR5e", "5 kg", "850 mm", "PolyScope 5", ["Print & Apply Label Head", "Vision Verify Camera", "Inline Checkweigher"],
    { quick: true }),
  ship: t("Shipping & Dispatch", "Ship", "semi",
    ["Parcels staged and sorted by destination manually", "Manifest keyed in at the end of the shift", "Truck loading queues at the dock"],
    ["Robotic dispatch sortation to lane chutes", "Manifest generated automatically per lane", "Dock loading sequenced by departure time"],
    "Yaskawa GP25", "25 kg", "1730 mm", "YRC1000", ["Vacuum Parcel Tool", "Lane Diverter", "Manifest Scanner"],
    { risk: "Medium" }),
  palletize: t("Palletizing", "Pallet", "full",
    ["Operators stack cases onto pallets by hand", "Layer patterns vary by who is on shift", "Lifting injuries and transit damage claims"],
    ["Palletizing robot with a pattern generator", "Consistent layers and slip-sheet placement", "Stretch wrap and label applied inline"],
    "FANUC M-410iC/315", "315 kg", "3143 mm", "R-30iB Plus", ["Clamp + Vacuum Combi Tool", "Slip-Sheet Feeder", "Label Applicator"],
    { stock: "2-3 Weeks", risk: "High" }),
  sort: t("Sorting & Classification", "Sort", "full",
    ["Items divided into bins by hand", "Mis-sorts found only at the next station", "Throughput drops as volume spikes"],
    ["Vision-guided delta robot sortation", "Classification logged per item ID", "Rate holds through peak volume"],
    "ABB IRB 360 FlexPicker", "8 kg", "1600 mm", "OmniCore C30", ["Vacuum Cup Tool", "Line-Scan Vision", "Reject Chute"],
    { quick: true }),
  transport: t("Material Transport", "Transport", "semi",
    ["Forklifts and pallet trucks move every load", "Long queue times between stations", "Mixed pedestrian and vehicle traffic"],
    ["AMR fleet on a fixed loop with call points", "Queue time cut to a few minutes", "Forklift retained for yard work only"],
    "AMR Fleet (Geek+ / Locus class)", "500 kg / unit", "Loop route", "Fleet Manager", ["Roller Top Deck", "LiDAR Safety Scanner", "Fleet Call Button"],
    { qty: 3, risk: "High" }),

  /* Welding */
  weld: t("Robotic Welding", "Weld", "full",
    ["Manual torch work, quality varies by welder", "Fume and arc exposure at the bench", "Rework on distortion and undercut"],
    ["Robot welding with seam tracking", "Enclosed cell with fume extraction", "Repeatable heat input, low rework"],
    "ABB IRB 2600-20/1.65", "20 kg", "1650 mm", "OmniCore C90XT", ["Welding Torch Package", "Seam Tracking Sensor", "Torch Cleaning Station"],
    { risk: "High" }),
  mig: t("MIG/MAG Welding", "MIG", "full",
    ["Hand-held MIG gun on a fixed bench", "Spatter and wire feed stoppages", "Operator skill sets the weld quality"],
    ["Robot MIG package with synergic settings", "Automatic wire feed and anti-spatter cycle", "Consistent bead across every part"],
    "FANUC ARC Mate 100iD/8L", "8 kg", "2032 mm", "R-30iB Plus", ["MIG Torch Package", "Wire Feeder", "Nozzle Cleaning Station"],
    { risk: "High" }),
  tig: t("TIG Welding", "TIG", "semi",
    ["Precision TIG done by a senior welder only", "Throughput limited by available skill", "Discolouration rework on thin material"],
    ["Robot TIG with pulsed current control", "Skill captured in a program library", "Operator retained for first-article checks"],
    "Yaskawa AR900", "4 kg", "927 mm", "YRC1000", ["TIG Torch Package", "Cold Wire Feeder", "Arc Voltage Sensor"],
    { risk: "High" }),
  spotweld: t("Spot Welding", "Spot", "full",
    ["Hand-held gun, operator carries the load", "Weld count verified by counting marks", "Gun cable and tip wear cause misses"],
    ["Servo gun robot with weld timer feedback", "Every spot logged against the part ID", "Automatic tip dressing schedule"],
    "KUKA KR 210 R2700-2", "210 kg", "2700 mm", "KR C5", ["Servo Spot Weld Gun", "Tip Dresser", "Weld Controller Interface"],
    { stock: "4-6 Weeks", risk: "High" }),

  /* Machining */
  cnc: t("CNC Machining", "CNC", "full",
    ["Operator loads and unloads each cycle", "Machine idles between parts", "Single-shift utilisation only"],
    ["Robot tends the machine door to door", "Lights-out running between shifts", "Spindle utilisation lifted sharply"],
    "FANUC R-2000iC/165F", "165 kg", "2655 mm", "R-30iB Plus", ["Dual Pneumatic Chuck Gripper", "Part Presence Sensor", "Chip Blow-Off"],
    { risk: "Medium" }),
  mill: t("CNC Milling", "Mill", "full",
    ["Vices loaded by hand between cycles", "Setup sheets interpreted per operator", "Scrap from mis-clamped blanks"],
    ["Robot loads fixtures from a blank magazine", "Recipe-driven clamping and probing", "Clamp confirmation before spindle start"],
    "KUKA KR 120 R2700-2", "120 kg", "2700 mm", "KR C5", ["Dual Jaw Gripper", "Clamp Confirm Sensor", "Coolant Blow-Off"],
    { stock: "4-6 Weeks", risk: "Medium" }),
  turn: t("CNC Turning", "Turn", "full",
    ["Lathe chuck loaded manually each part", "Hot swarf and coolant exposure", "Cycle waits on operator availability"],
    ["Robot bar-to-chuck load and unload", "Enclosed cell with swarf management", "Continuous turning with a part buffer"],
    "FANUC M-20iD/25", "25 kg", "1831 mm", "R-30iB Plus", ["Dual Chuck Gripper", "Part Length Probe", "Swarf Blow-Off"],
    { risk: "Medium" }),
  drill: t("Drilling", "Drill", "full",
    ["Hole positions marked and drilled by hand", "Position drift across a batch", "Burr and breakout rework"],
    ["Robot drilling from the CAD hole table", "Position held within programmed tolerance", "Peck cycle tuned per material"],
    "ABB IRB 4600-45/2.05", "45 kg", "2050 mm", "OmniCore C90XT", ["Spindle Drill End-Effector", "Pressure Foot", "Chip Extraction Nozzle"],
    { risk: "Medium" }),
  grind: t("Grinding & Surface Prep", "Grind", "full",
    ["Hand grinders, 2-3 operators per shift", "Finish depends on operator technique", "Dust and vibration exposure"],
    ["Force-controlled robotic grinding head", "Constant contact pressure per pass", "Enclosed cell with dust extraction"],
    "ABB IRB 6700-235/2.65", "235 kg", "2650 mm", "OmniCore C90XT", ["Active Force Compliance Head", "Abrasive Belt Changer", "Dust Extraction Shroud"],
    { qty: 2, risk: "High" }),
  polish: t("Polishing", "Polish", "full",
    ["Hand polishing, gloss varies part to part", "Slow rework loop on rejected finish", "Compound mist in the work area"],
    ["Robot polishing with a pad changer", "Repeatable gloss to a measured target", "Enclosed wet cell, no mist exposure"],
    "Yaskawa GP50", "50 kg", "2061 mm", "YRC1000", ["Force Compliance Polishing Head", "Pad Changer", "Compound Dosing Nozzle"],
    { risk: "High" }),
  cut: t("Cutting & Sawing", "Cut", "full",
    ["Manual marking then saw or torch cutting", "Kerf and offcut waste is high", "Sparks, noise and pinch-point risk"],
    ["Robot cutting from nested programs", "Nesting cuts offcut waste materially", "Enclosed cell with fume extraction"],
    "KUKA KR 60 HA", "60 kg", "2033 mm", "KR C5", ["Plasma/Laser Cutting Head", "Height Follower", "Fume Extraction Hood"],
    { risk: "High" }),

  /* Assembly */
  assembly: t("Assembly", "Assembly", "semi",
    ["Parts joined by hand at a bench line", "Missed components found at final test", "Takt time varies by operator"],
    ["Cobot assembly with force-guided insertion", "Poka-yoke checks at every step", "Operator retained for variant handling"],
    "Epson T6 SCARA", "6 kg", "600 mm", "RC700-E", ["Compliant Insertion Gripper", "Force/Torque Sensor", "Part Feeder Interface"],
    { quick: true }),
  screw: t("Screw Driving", "Screw", "full",
    ["Hand drivers, torque judged by feel", "Missed or cross-threaded fasteners", "Wrist strain across the shift"],
    ["Robot driver with torque and angle monitoring", "Every fastener logged pass or fail", "Automatic screw feed from a bowl"],
    "Universal Robots UR5e", "5 kg", "850 mm", "PolyScope 5", ["Servo Screwdriving Spindle", "Screw Feeder", "Torque/Angle Monitor"],
    { quick: true }),
  solder: t("Soldering", "Solder", "full",
    ["Hand soldering irons at the bench", "Joint quality varies, cold joints escape", "Flux fume exposure at head height"],
    ["Robotic selective soldering head", "Thermal profile held per joint type", "Fume extracted at the nozzle"],
    "Epson T3 SCARA", "3 kg", "400 mm", "RC700-E", ["Selective Solder Tip", "Solder Wire Feeder", "Fume Extraction Nozzle"],
    { quick: true }),

  /* Coating */
  paint: t("Painting & Coating", "Paint", "full",
    ["Manual spray guns in a booth", "Film thickness varies, runs and sags", "Solvent exposure and high overspray"],
    ["Explosion-proof paint robot with path recipes", "Film build held to a measured window", "Overspray and solvent use reduced"],
    "ABB IRB 5500 FlexPainter", "25 kg", "2975 mm", "IRC5P", ["Rotary Bell Atomizer", "Colour Changer Valve", "Air Flow Regulator"],
    { risk: "High" }),
  spray: t("Spray Coating", "Spray", "full",
    ["Hand spraying, coverage checked by eye", "Rework on thin or heavy coats", "Booth downtime for colour changes"],
    ["Robot spray with programmed gun paths", "Coverage verified against a target film", "Fast colour change from the recipe"],
    "Stäubli TX2-90 XL", "15 kg", "1450 mm", "CS9", ["Airless Spray Gun", "Colour Change Manifold", "Booth Interlock Sensor"],
    { risk: "High" }),
  powdercoat: t("Powder Coating", "Coat", "full",
    ["Manual powder guns on a hanging line", "Faraday cage areas under-coated", "Powder reclaim loss is significant"],
    ["Robot powder guns with reciprocator paths", "Recipe tuned per part geometry", "Higher first-pass transfer efficiency"],
    "ABB IRB 5500 FlexPainter", "25 kg", "2975 mm", "IRC5P", ["Electrostatic Powder Gun", "Powder Hopper Interface", "Reclaim Booth Sensor"],
    { risk: "High" }),

  /* Inspection */
  inspect: t("Quality Inspection", "QC", "full",
    ["Visual inspection under a work lamp", "No dimensional record per part", "Defects found late, after value is added"],
    ["Vision plus laser measurement in-line", "Full record stored per part ID", "Reject gated before the next station"],
    "Universal Robots UR5e", "5 kg", "850 mm", "PolyScope 5", ["Vision Camera Mount", "Laser Profilometer", "LED Ring Light"],
    { quick: true }),
  test: t("Testing & Validation", "Test", "semi",
    ["Functional tests run by hand per unit", "Test results written on paper travellers", "Sampling only, not every unit"],
    ["Robot-loaded test fixture with auto sequencing", "Results written to the traceability database", "100% test coverage at takt"],
    "Epson T6 SCARA", "6 kg", "600 mm", "RC700-E", ["Test Fixture Gripper", "Contact Probe Interface", "Pass/Fail Sorter"],
    { quick: true }),
  vision: t("Vision Inspection", "Vision", "full",
    ["Defects judged by eye under mixed lighting", "Escape rate varies by inspector", "No image evidence for claims"],
    ["Fixed vision station with controlled lighting", "Consistent thresholds, tuned per defect", "Image archive attached to each unit"],
    "Cognex In-Sight 3800 + UR5e", "5 kg", "850 mm", "In-Sight Vision Suite", ["Line-Scan Camera", "Diffuse Dome Light", "Reject Pusher"],
    { quick: true }),

  /* Food & beverage */
  fill: t("Filling", "Fill", "full",
    ["Containers filled and topped by hand", "Over-fill giveaway on every unit", "Spillage and hygiene wash-down time"],
    ["Servo filling heads with flow metering", "Fill weight trimmed to the target", "Washdown-rated cell, less spillage"],
    "Stäubli TX2-60 HE", "9 kg", "670 mm", "CS9", ["Hygienic Filling Nozzle", "Flow Meter Interface", "Drip Tray Sensor"],
    { quick: true }),
  seal: t("Sealing", "Seal", "full",
    ["Heat sealer operated per pack", "Seal integrity failures reach dispatch", "Burn risk at the sealing bar"],
    ["Robot-fed sealing station with temperature control", "Seal integrity verified inline", "Guarded cell, no burn exposure"],
    "Yaskawa GP8", "8 kg", "727 mm", "YRC1000", ["Heat Seal Head", "Seal Integrity Sensor", "Web Feed Interface"],
    { quick: true }),
  cap: t("Capping", "Cap", "full",
    ["Caps placed and torqued by hand", "Leaks from inconsistent torque", "Repetitive twisting motion all shift"],
    ["Servo capper with torque verification", "Every cap torque logged", "Reject diverted before labelling"],
    "Epson T6 SCARA", "6 kg", "600 mm", "RC700-E", ["Servo Capping Chuck", "Torque Transducer", "Cap Feeder Interface"],
    { quick: true }),
  bottle: t("Bottling", "Bottle", "full",
    ["Bottles loaded to the line by hand", "Line stoppages from mis-feeds", "Glass breakage and cut risk"],
    ["Robot depalletiser feeding the rinser", "Mis-feed detection before the filler", "No manual glass handling"],
    "ABB IRB 660-180/3.15", "180 kg", "3150 mm", "OmniCore C90XT", ["Layer Vacuum Head", "Bottle Presence Sensor", "Slip-Sheet Gripper"],
    { stock: "2-3 Weeks", risk: "Medium" }),

  /* Material handling */
  load: t("Loading & Unloading", "Load", "full",
    ["Parts loaded and unloaded by hand each cycle", "Machine waits for the operator", "Bending and lifting all shift"],
    ["Robot tends the station door to door", "Machine runs without waiting", "No manual lifting in the cycle"],
    "FANUC R-2000iC/125L", "125 kg", "3100 mm", "R-30iB Plus", ["Dual Station Gripper", "Part Presence Sensor", "Tool Changer"],
    { risk: "Medium" }),
  lift: t("Heavy Lifting & Positioning", "Lift", "full",
    ["Two operators plus hoist per heavy part", "Slinging and pinch-point risk", "Positioning accuracy varies"],
    ["Heavy-payload robot with a vacuum lift head", "Programmed positioning every time", "Single supervisor, no manual slinging"],
    "FANUC M-2000iA/900L", "900 kg", "4683 mm", "R-30iB Plus", ["Vacuum Lift Head", "Load Cell", "Anti-Drop Check Valve"],
    { stock: "8-12 Weeks", risk: "High" }),
  stack: t("Stacking", "Stack", "full",
    ["Items stacked by hand onto racks", "Stack height and alignment vary", "Toppling and damage in transit"],
    ["Robot stacking to a programmed pattern", "Alignment held through the stack", "Separators placed automatically"],
    "KUKA KR 180 PA", "180 kg", "3200 mm", "KR C5", ["Clamp + Vacuum Combi Tool", "Separator Feeder", "Stack Height Sensor"],
    { stock: "4-6 Weeks", risk: "High" }),
};

/* ------------------------------- keywords ------------------------------- */

/** Ordered longest-first at match time so "spot weld" beats "weld". */
const PROCESS_KEYWORDS: Record<string, keyof typeof TEMPLATES> = {
  // Warehouse & logistics
  pick: "pick", picking: "pick", picker: "pick", "order pick": "pick",
  scan: "scan", scanning: "scan", scanner: "scan", barcode: "scan", "bar code": "scan", rfid: "scan",
  pack: "pack", packing: "pack", packaging: "pack", packer: "pack",
  box: "box", carton: "box", "box forming": "box",
  label: "label", labeling: "label", labelling: "label", weighing: "label", checkweigh: "label",
  shipping: "ship", dispatch: "ship", despatch: "ship", outbound: "ship",
  palletiz: "palletize", palletis: "palletize", pallet: "palletize", depalletiz: "palletize",
  sort: "sort", sorting: "sort", sortation: "sort", classif: "sort",
  conveyor: "transport", forklift: "transport", "pallet truck": "transport", agv: "transport", amr: "transport", transport: "transport",

  // Welding
  "spot weld": "spotweld", "spot welding": "spotweld", "resistance weld": "spotweld",
  mig: "mig", mag: "mig", "gmaw": "mig",
  tig: "tig", gtaw: "tig",
  weld: "weld", welding: "weld", welder: "weld", "arc weld": "weld",

  // Machining
  cnc: "cnc", "machine tending": "cnc", machining: "cnc",
  mill: "mill", milling: "mill", "machining center": "mill",
  lathe: "turn", turning: "turn",
  drill: "drill", drilling: "drill", "hole": "drill",
  grind: "grind", grinding: "grind", deburr: "grind", "surface prep": "grind",
  polish: "polish", polishing: "polish", buff: "polish",
  cut: "cut", cutting: "cut", saw: "cut", sawing: "cut", plasma: "cut", laser: "cut",

  // Assembly
  assembl: "assembly", assembly: "assembly", assembling: "assembly", fitting: "assembly",
  screw: "screw", screwdriv: "screw", fasten: "screw", bolt: "screw",
  solder: "solder", soldering: "solder",

  // Coating
  "powder coat": "powdercoat", "powder coating": "powdercoat",
  paint: "paint", painting: "paint", coating: "paint",
  spray: "spray", spraying: "spray",

  // Inspection
  inspect: "inspect", inspection: "inspect", quality: "inspect", qc: "inspect", "check": "inspect",
  vision: "vision", camera: "vision",
  test: "test", testing: "test", validation: "test",

  // Food & beverage
  fill: "fill", filling: "fill", dosing: "fill",
  seal: "seal", sealing: "seal",
  cap: "cap", capping: "cap",
  bottle: "bottle", bottling: "bottle", "glass bottle": "bottle",

  // Material handling
  load: "load", loading: "load", unload: "load", unloading: "load", "machine load": "load",
  lift: "lift", lifting: "lift", hoist: "lift", crane: "lift",
  stack: "stack", stacking: "stack", stacked: "stack", rack: "stack",
};

const MAX_STATIONS = 8;

/** Matches keywords in the description and returns unique template ids in order of appearance. */
export const matchTemplateIds = (description: string): string[] => {
  const text = ` ${description.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ")} `;
  if (text.trim().length === 0) return [];

  const hits: { id: string; at: number }[] = [];
  const seen = new Set<string>();
  const keywords = Object.keys(PROCESS_KEYWORDS).sort((a, b) => b.length - a.length);

  for (const keyword of keywords) {
    const at = text.indexOf(keyword);
    if (at === -1) continue;
    const id = PROCESS_KEYWORDS[keyword];
    if (seen.has(id)) continue;
    seen.add(id);
    hits.push({ id, at });
  }

  return hits.sort((a, b) => a.at - b.at).map((h) => h.id).slice(0, MAX_STATIONS);
};

/**
 * Builds process cards from the user's description. Falls back to the selected
 * industry blueprint when nothing recognisable is found.
 */
export const analyzeDescription = (description: string, industry: string | null): ProcessCard[] => {
  const ids = matchTemplateIds(description ?? "");
  if (ids.length === 0) return getBlueprint(industry).processes;

  return ids.map((id, i) => ({
    ...TEMPLATES[id],
    index: `S${i + 1}`,
  }));
};

export type { Template as ProcessTemplate };
