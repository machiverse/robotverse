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
  binpick: t("Bin Picking", "Bin", "full",
    ["Parts sorted out of mixed bins by hand", "Reaching into deep bins all shift", "Feed rate depends on the operator"],
    ["3D vision guides the robot to each part", "Bins emptied without manual reach-in", "Steady feed to the next station"],
    "FANUC M-20iD/25", "25 kg", "1831 mm", "R-30iB Plus", ["3D Vision Sensor", "Magnetic / Vacuum Gripper", "Collision Guard"],
    { quick: true }),
  depal: t("Depalletizing", "Depal", "full",
    ["Cases lifted off inbound pallets by hand", "Heavy lifts at floor and head height", "Slip sheets removed manually"],
    ["Robot unloads layer by layer with 3D vision", "No manual lifting at the infeed", "Slip sheets removed automatically"],
    "ABB IRB 460", "110 kg", "2400 mm", "OmniCore", ["Layer Vacuum Gripper", "3D Layer Camera", "Slip-Sheet Remover"],
    { quick: true, risk: "High" }),
  kit: t("Kitting & Sequencing", "Kit", "semi",
    ["Kits built by hand from part racks", "Missing or wrong parts reach the line", "Kits prepared a shift in advance"],
    ["Robot builds each kit to the order", "Every part verified before release", "Kits sequenced just in time"],
    "Universal Robots UR10e", "12.5 kg", "1300 mm", "PolyScope 5", ["Multi-Part Gripper", "Kit Tray Locator", "Pick-to-Light Interface"],
    { quick: true }),
  food: t("Food Handling & Tray Loading", "Food", "full",
    ["Products placed into trays by hand", "Hygiene risk from manual contact", "Speed limited by line staff"],
    ["Delta robot picks with vision tracking", "Hygienic, washdown-rated handling", "High-speed tray loading"],
    "ABB IRB 360 FlexPicker", "8 kg", "1600 mm", "OmniCore", ["Hygienic Vacuum Gripper", "Conveyor Tracking Camera", "Washdown Covers"],
    { quick: true }),
  press: t("Press Tending & Stamping", "Press", "full",
    ["Blanks fed into the press by hand", "Hands near the die every stroke", "Stroke rate limited by the operator"],
    ["Robot loads and unloads the press", "No hands in the die area", "Press runs at its rated stroke rate"],
    "ABB IRB 6700-150/3.20", "150 kg", "3200 mm", "OmniCore", ["Tooling Boom Vacuum Gripper", "Double-Blank Sensor", "Part Presence Sensor"],
    { risk: "High" }),
  bend: t("Press Brake Bending", "Bend", "full",
    ["Sheets held and followed by hand at the brake", "Heavy sheets lifted every bend", "Angle varies with operator support"],
    ["Robot feeds, follows and regrips each bend", "Repeatable bend sequence per program", "Operator only changes tooling"],
    "Yaskawa GP50", "50 kg", "2061 mm", "YRC1000", ["Vacuum Sheet Gripper", "Regrip Station", "Bend Follow Sensor"],
    { risk: "High" }),
  mould: t("Injection Moulding Tending", "Mould", "full",
    ["Operator removes parts at every cycle", "Moulding machine waits for the operator", "Sprues cut off by hand"],
    ["Robot extracts, degates and places each part", "Machine runs at its own cycle", "Sprues separated automatically"],
    "Yaskawa GP25", "25 kg", "1730 mm", "YRC1000", ["Sprue Picker Gripper", "Vacuum Part Gripper", "Degating Station"],
    { quick: true }),
  cast: t("Die Casting Extraction", "Cast", "full",
    ["Hot castings pulled out with tongs", "Heat and splash exposure at the machine", "Quench timing varies"],
    ["Foundry-rated robot extracts and quenches", "No operator at the hot zone", "Consistent quench and trim timing"],
    "KUKA KR 120 R2700-2 F", "120 kg", "2700 mm", "KR C5", ["Heat-Resistant Gripper", "Release Agent Spray Tool", "Quench Tank Interface"],
    { risk: "High" }),
  forge: t("Forging Handling", "Forge", "full",
    ["Hot billets handled with tongs", "Heavy, hot and repetitive work", "Transfer time cools the part"],
    ["Robot transfers billets furnace to press", "No manual hot handling", "Short, repeatable transfer time"],
    "FANUC M-900iB/280", "280 kg", "2655 mm", "R-30iB Plus", ["Forging Tong Gripper", "Heat Shield", "Billet Temperature Sensor"],
    { stock: "4-6 Weeks", risk: "High" }),
  mark: t("Laser Marking & Coding", "Mark", "full",
    ["Parts marked with stamps or stickers", "Codes smudged or unreadable", "Traceability kept on paper"],
    ["Robot presents parts to a fibre laser", "Every code verified after marking", "Full part traceability"],
    "Epson VT6L", "6 kg", "900 mm", "Built-in", ["Fibre Laser Marking Head", "Fume Extraction", "Code Verification Reader"],
    { quick: true }),
  dispense: t("Adhesive & Sealant Dispensing", "Glue", "full",
    ["Beads applied by hand with a cartridge gun", "Bead width varies and misses occur", "Excess material cleaned off by hand"],
    ["Robot applies a constant bead on the path", "Bead checked by an inline sensor", "Material use cut by metered dosing"],
    "FANUC LR Mate 200iD/7L", "7 kg", "911 mm", "R-30iB Mini Plus", ["Dispensing Valve & Nozzle", "Bead Inspection Sensor", "Metering Pump Unit"],
    { quick: true }),
  rivet: t("Riveting Assembly", "Rivet", "full",
    ["Rivets set by hand with a pneumatic tool", "Missed or crooked rivets", "Vibration exposure for operators"],
    ["Robot sets each rivet with force monitoring", "Every joint logged", "No hand-arm vibration"],
    "KUKA KR 60-3", "60 kg", "2033 mm", "KR C5", ["Self-Pierce Riveting Gun", "Rivet Feeder", "Force/Stroke Monitor"],
    { risk: "Medium" }),
  deflash: t("Deflashing & Surface Finishing", "Deflash", "full",
    ["Flash trimmed off with hand tools", "Cuts and repetitive strain", "Edge quality varies"],
    ["Compliant spindle follows every edge", "Consistent edge quality", "No hand trimming"],
    "Staubli TX2-90", "12 kg", "1000 mm", "CS9", ["Compliant Deflashing Spindle", "Force Sensor", "Chip Extraction Nozzle"],
    { risk: "Medium" }),
  clean: t("Part Cleaning & Surface Prep", "Clean", "full",
    ["Parts washed and blown off by hand", "Splash and chemical exposure", "Residue left on hidden areas"],
    ["Robot washes and blows off to a program", "Every surface reached the same way", "Operator away from the wash zone"],
    "FANUC M-10iD/12", "12 kg", "1441 mm", "R-30iB Plus", ["High-Pressure Wash Nozzle", "Air Blow-Off Nozzle", "Splash Guard"],
    { quick: true }),
  measure: t("Dimensional Measurement & Gauging", "Gauge", "full",
    ["Parts measured with hand gauges", "Sampling only, not every part", "Results written on paper"],
    ["Robot presents each part to a 3D scanner", "Every part measured and logged", "Out-of-tolerance parts sorted out"],
    "FANUC CRX-10iA", "10 kg", "1249 mm", "R-30iB Mini Plus", ["3D Laser Scanner", "Probe Gauge Head", "Reference Fixture"],
    { quick: true }),
  bag: t("Bag & Sack Palletizing", "Bag", "full",
    ["Heavy sacks lifted by hand", "Back strain on every bag", "Stack pattern varies"],
    ["Robot handles every bag with a fork gripper", "No manual sack lifting", "Uniform, stable stacks"],
    "FANUC M-410iC/185", "185 kg", "3143 mm", "R-30iB Plus", ["Bag Fork Gripper", "Bag Flattener", "Check Weigher Interface"],
    { quick: true, risk: "High" }),
  pipette: t("Lab Sample Pipetting & Dosing", "Lab", "full",
    ["Samples pipetted by hand", "Repetitive strain and pipetting errors", "Throughput limited by staff"],
    ["Robot handles tubes and doses to protocol", "Every sample barcode-tracked", "Runs overnight unattended"],
    "Staubli TX2-40", "2.3 kg", "515 mm", "CS9", ["Pipetting Head", "Tube Gripper", "Barcode Reader"],
    { quick: true }),
};

/* ------------------------------- keywords ------------------------------- */

/** Ordered longest-first at match time so "spot weld" beats "weld". */
const PROCESS_KEYWORDS: Record<string, keyof typeof TEMPLATES> = {
  // Warehouse & logistics
  pick: "pick", picking: "pick", picker: "pick", "order pick": "pick",
  scan: "scan", scanning: "scan", scanner: "scan", barcode: "scan", "bar code": "scan", rfid: "scan",
  pack: "pack", packing: "pack", packaging: "pack", packer: "pack",
  box: "pack", carton: "pack", "box forming": "box", "carton erect": "box", "erect": "box", "box erect": "box",
  label: "label", labeling: "label", labelling: "label", weighing: "label", checkweigh: "label",
  shipping: "ship", dispatch: "ship", despatch: "ship", outbound: "ship",
  palletiz: "palletize", palletis: "palletize", pallet: "palletize",
  sort: "sort", sorting: "sort", sortation: "sort", classif: "sort",
  "convey to": "transport", "conveyed to": "transport", forklift: "transport", "pallet truck": "transport", agv: "transport", amr: "transport", transport: "transport",

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
  "heat treat": "load", furnace: "load", oven: "load", autoclave: "load", feed: "load", feeding: "load",
  "bin pick": "binpick", "bin picking": "binpick", "random pick": "binpick",
  depalletiz: "depal", depalletis: "depal", "unload pallet": "depal",
  kitting: "kit", kit: "kit", sequencing: "kit",
  tray: "food", "pick and place": "food", "pick & place": "food", delta: "food",

  // Forming, moulding and foundry
  "press machine": "press", "power press": "press", "press tend": "press", "the press": "press", stamping: "press", stamp: "press", punching: "press",
  bend: "bend", bending: "bend", "press brake": "bend", folding: "bend",
  "injection mo": "mould", moulding: "mould", molding: "mould", mould: "mould", mold: "mould", "plastic part": "mould",
  "die cast": "cast", casting: "cast", foundry: "cast",
  forging: "forge", forge: "forge", billet: "forge",

  // Marking, joining and finishing
  "laser mark": "mark", marking: "mark", engrav: "mark", etch: "mark", inkjet: "mark", "date cod": "mark", serial: "mark",
  "laser weld": "weld", "laser welding": "weld", brazing: "weld",
  glue: "dispense", gluing: "dispense", adhesive: "dispense", sealant: "dispense", dispens: "dispense", caulk: "dispense",
  rivet: "rivet", riveting: "rivet", clinch: "rivet", hemming: "rivet", hemmed: "rivet",
  deflash: "deflash", flash: "deflash", trimming: "deflash", deburring: "grind", sanding: "polish", sand: "polish", finishing: "polish",
  clean: "clean", cleaning: "clean", wash: "clean", washing: "clean", "blow off": "clean",
  tapping: "drill", threading: "drill", routing: "cut", waterjet: "cut", trim: "cut",
  insert: "assembly", inserting: "assembly", "press fit": "assembly", mounting: "assembly", install: "assembly",
  nutrunn: "screw", tighten: "screw",
  glaz: "paint", enamel: "paint", varnish: "paint", lacquer: "paint", primer: "paint",

  // Measurement and lab
  measur: "measure", gaug: "measure", dimension: "measure", cmm: "measure", "3d scan": "measure",
  weigh: "label", "leak test": "test", "function test": "test", grading: "sort", grade: "sort", reject: "sort",
  bag: "bag", bagging: "bag", sack: "bag", wrapping: "pack", wrap: "pack", "case pack": "pack",
  pipett: "pipette", "lab sample": "pipette", "test tube": "pipette", vial: "fill",
};

const MAX_STATIONS = 10;

/** Matches keywords in the description and returns unique template ids in order of appearance. */
export const matchTemplateIds = (description: string): string[] => {
  const text = ` ${description
    .toLowerCase()
    // "…on pallets for dispatch" states a purpose, not an extra station.
    .replace(/\b(ready )?for (dispatch|despatch|shipping|shipment|delivery|sale|storage)\b/g, " ")
    // Picking parts off a conveyor is machine loading, not warehouse order picking.
    .replace(/\bpick(s|ed|ing)?\b((?: [a-z]+){0,3}) from (the )?(conveyor|belt|line)/g, "load$2 from the $4")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")} `;
  if (text.trim().length === 0) return [];

  const hits: { id: string; at: number }[] = [];
  const seen = new Set<string>();
  const keywords = Object.keys(PROCESS_KEYWORDS).sort((a, b) => b.length - a.length);

  for (const keyword of keywords) {
    // Keywords match at the start of a word; short ones ("cap", "cut", "mig")
    // must be the whole word so "capacity" or "image" do not count.
    const at =
      keyword.length <= 4
        ? text.search(new RegExp(` ${keyword}(s|es|ed|ped|ting|ing)? `))
        : text.indexOf(` ${keyword}`);
    if (at === -1) continue;
    const id = PROCESS_KEYWORDS[keyword];
    if (seen.has(id)) continue;
    seen.add(id);
    hits.push({ id, at });
  }

  const ids = new Set(hits.map((h) => h.id));
  // A specific process replaces its generic parent, and stacking onto pallets is palletizing.
  const SUPERSEDED: Record<string, string[]> = {
    weld: ["mig", "tig", "spotweld"],
    paint: ["powdercoat", "dispense", "spray"],
    stack: ["palletize", "depal", "bag"],
    cnc: ["mill", "turn"],
    inspect: ["vision", "measure"],
    assembly: ["screw", "rivet"],
    polish: ["deflash"],
    grind: ["deflash"],
    pick: ["binpick", "kit", "food"],
    palletize: ["depal", "bag"],
    load: ["press", "mould", "cast", "forge", "bend", "depal"],
    cut: ["mark", "deflash"],
    test: ["pipette"],
    spray: ["dispense"],
    seal: ["dispense", "cap"],
    label: ["mark"],
    fill: ["pipette"],
  };
  const keep = hits.filter((h) => !(SUPERSEDED[h.id] || []).some((specific) => ids.has(specific)));
  return keep.sort((a, b) => a.at - b.at).map((h) => h.id).slice(0, MAX_STATIONS);
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
    index: String(i + 1).padStart(2, "0"),
  }));
};

/**
 * Every industrial robot skill the studio knows, with the words that trigger
 * it in a description. Shown as the Skills library in the 3D simulator.
 */
export const SKILL_LIBRARY = Object.entries(TEMPLATES).map(([id, template]) => ({
  id,
  template,
  keywords: Object.entries(PROCESS_KEYWORDS)
    .filter(([, v]) => v === id)
    .map(([k]) => k),
}));

/**
 * Process cards for a list of skill names (as returned by the photo / video
 * analysis). Unknown names fall back to keyword matching; duplicates are dropped.
 */
export const processesFromSkills = (names: string[]): ProcessCard[] => {
  const byName = new Map(Object.entries(TEMPLATES).map(([id, t]) => [t.name.toLowerCase(), id]));
  const ids: string[] = [];
  for (const n of names) {
    const id = byName.get(String(n).toLowerCase().trim()) ?? matchTemplateIds(String(n))[0];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, MAX_STATIONS).map((id, i) => ({ ...TEMPLATES[id], index: String(i + 1).padStart(2, "0") }));
};

export type { Template as ProcessTemplate };
