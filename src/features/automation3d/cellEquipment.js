/*
 * Automation Studio — the whole set-up of a robot cell, the way an integrator installs it: not just the
 * arm and its tool, but the robot controller, the process equipment the job runs on (welding power source,
 * wire drum, gas, torch cleaner, fume extraction, spot-weld timer, laser source and chiller, paint supply
 * and booth, dosing unit, dust collector, feeders…), the safety equipment and the utilities.
 *
 * One source for both the equipment list the Studio and the Builder show and the 3D models robotSim.js
 * places in the cell, so what the list says is what the picture shows. Framework-free: THREE is passed in.
 */
import { PROCESS_HEAD, processKind } from "./processProfiles";

/* ------------------------------------------------------------------ the job */

/** What kind of work a job is, for its equipment and software. */
export function areaOf(job, kind = processKind({ name: job || "Loading & Unloading" })) {
  const j = String(job || "").toLowerCase();
  if (/spot weld/.test(j)) return "spot";
  if (/laser weld/.test(j)) return "laserweld";
  // Ultrasonic plastic welding, not ultrasonic testing (NDT).
  if (/ultrasonic (?:plastic )?weld/.test(j)) return "ultrasonic";
  // Joining without an arc torch and wire: no MIG power source, wire feeder or torch cleaner.
  if (/solder/.test(j)) return "solder";
  if (/friction stir/.test(j)) return "fsw";
  if (/stud weld/.test(j)) return "stud";
  if (kind === "welding") return "arc";
  if (/laser clean/.test(j)) return "laserclean";
  if (/bag plac|rotary packer|packer spout/.test(j)) return "pick";
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
  // The robot carries the cutting, drilling or hemming head: no machine to tend.
  if (kind === "machining" && PROCESS_HEAD.test(j)) return "head";
  if (kind === "machining") return "tend";
  return "pick";
}

/** What a job needs around the robot that the catalogue does not list: what an integrator adds to the quote. */
export const JOB_ALSO = [
  [/order pick|parcel|recycl|classification|singulat|fruit|\begg|gemstone|diamond/i, ["Camera over the pick area for vision-guided picking"]],
  [/meat|debon/i, ["Knife sterilizer (82 °C) between cuts", "Washdown-rated (IP69K) robot and cover"]],
  [/waterjet/i, ["High-pressure intensifier pump", "Catcher tank under the cut"]],
  [/plasma|laser cut|cutting & sawing/i, ["Plasma or fibre-laser power source", "Fume extraction and a spark-proof cutting table"]],
  [/drill|rout(?:ing|er)\b/i, ["Spindle drive with chip or dust extraction", "Tool length setter and tool rack"]],
  [/part cleaning|wash/i, ["High-pressure pump with filtration and water recycling", "Splash-proof enclosure"]],
  [/blast/i, ["Blast pot with abrasive recovery", "Blast-proof robot jacket and dust collector"]],
  [/crate|\btotes?\b/i, ["Crate destacker and stacker conveyors"]],
  [/strapping|bundle/i, ["Strapping machine (PET or steel strap)"]],
  [/tube bend|pipe bend/i, ["CNC tube bender interface", "Tube supports for long lengths"]],
  [/solar module|photovolt/i, ["Electroluminescence (EL) crack tester", "Laminator and framer interfaces"]],
  [/plating|dip coat|galvani|anodi/i, ["Corrosion-proof robot cover", "Tank-line controller interface with dwell-time records"]],
  [/mask/i, ["Plug and cap feeder"]],
  [/friction stir/i, ["Heavy clamping fixture with a backing bar"]],
  [/stud weld/i, ["Stud feeder and stud-welding controller"]],
  [/heavy fabrication|gantry weld/i, ["Positioner, track or gantry for long structures", "Touch sensing and through-arc seam tracking"]],
  [/pipe & orbital|pipe weld/i, ["Pipe rotator / positioner"]],
  [/wire arc|waam/i, ["Build plate, interpass temperature check and CAM slicing software"]],
  [/thermal spray|cladding/i, ["Spray booth with dust extraction and sound enclosure", "Powder or wire feeder"]],
  [/glaze/i, ["Glaze pump with recirculation", "Spray booth with water curtain"]],
  [/sole|footwear/i, ["Adhesive heating or UV activation tunnel", "3D scanner for the bonding line"]],
  [/glass handling/i, ["Glass racks / A-frames", "Breakage detection"]],
  [/tyre|tire/i, ["Tyre centring station"]],
  [/bobbin|yarn|\bcones?\b/i, ["Doffing trolley or creel interface"]],
  [/bag plac|rotary packer/i, ["Empty-bag magazine and separator"]],
  [/compression|rubber mou?ld/i, ["Charge weighing scale", "Mould-release spray"]],
  [/blow mou?ld/i, ["Trimming station", "Leak tester"]],
  [/smt|reel/i, ["Reel barcode reader", "ESD grounding"]],
  [/steel plant|probing/i, ["Probe magazine", "Heat shield and cooled robot jacket"]],
  [/wafer/i, ["Equipment front-end module (EFEM) or ISO 5 mini-environment", "Wafer aligner"]],
  [/aseptic|vial/i, ["Isolator or RABS with VHP decontamination"]],
  [/blister|pharmacy|pharma/i, ["GMP documentation (IQ / OQ / PQ)"]],
  [/bakery|food|slice|portion|icing|kitchen|tray seal/i, ["Food-grade (NSF H1) grease and washdown covers"]],
  [/greenhouse|seedling/i, ["Tray conveyors and plant rejection camera"]],
  [/milking/i, ["Teat-cup cleaning and milk-quality sensors", "Cow ID reader"]],
  [/truck|container/i, ["Telescopic conveyor into the truck"]],
  [/coil|\broll(?:s)?\b/i, ["Coil saddle, mandrel or C-hook"]],
  [/extrusion/i, ["Profile saw and run-out table interface", "Ageing baskets or stillages"]],
  [/harden|heat treat|induction/i, ["Induction generator interface", "Quench tank"]],
  [/ladl|pour/i, ["Heat-resistant robot jacket", "Furnace and mould line interface"]],
  [/sand core/i, ["Core gluing or venting station"]],
  [/rebar/i, ["Tie-wire feeder"]],
  [/battery/i, ["Insulated tools and cell polarity check"]],
  [/stator|hairpin/i, ["Hairpin forming, twisting and laser-welding stations"]],
  [/cabinet wiring|panel wiring/i, ["Wire processing machine (cut, strip, crimp, print)"]],
  [/crimp/i, ["Crimp press with crimp-force monitoring"]],
  [/\btht\b/i, ["Component feeders (tape, tube, tray)", "Selective or wave soldering after insertion"]],
  [/disassembl/i, ["Sorting bins for reuse, recycling and scrap"]],
  [/printer farm/i, ["Flexible build plates for easy part release"]],
  [/layup|composite/i, ["Ply cutting table", "Temperature- and humidity-controlled layup room"]],
  [/drywall|ceiling/i, ["Total station for positioning from the BIM model"]],
  [/nail|stapl/i, ["Nail or staple feeder"]],
  [/screen|pad print/i, ["Ink drying (UV or IR)"]],
  [/ev charg/i, ["Charge-port camera and vehicle detection"]],
  [/pipet/i, ["Barcode reader and LIMS connection"]],
  [/x-ray|xray/i, ["Radiation-shielded cabinet and interlocks"]],
  [/ndt/i, ["Water couplant (squirter) and ultrasonic acquisition"]],
  [/denest/i, ["Tray or cup magazine with separator fingers"]],
  [/bag opening|emptying/i, ["Bag-cutting knife, dust extraction and empty-bag compactor"]],
  [/asrs|goods-to-person/i, ["Storage grid and picking port"]],
  [/furniture|edge band/i, ["Edge-banding machine interface", "Label scanner for batch-size-one parts"]],
  [/shell build|wax tree/i, ["Slurry tanks with mixers and a rainfall or fluidised-bed sander", "Drying room with humidity control"]],
  [/lamination|transformer core/i, ["Step-lap stacking table with centring pins", "Lamination cutting line interface"]],
  [/hemm/i, ["Hemming bed (anvil) for each panel model", "Hem adhesive dispensing before hemming"]],
  [/\begg/i, ["Egg candling and crack detection"]],
  [/ceramic tile/i, ["Shade and calibre grading camera", "Box erector and case sealer"]],
  [/panel clean|solar clean/i, ["Row-to-row transfer shuttle", "Docking and charging station with a soiling sensor"]],
  [/battery cell|cell grad/i, ["OCV / internal-resistance tester", "Grade bins or trays for each cell class"]],
  [/plaster|wall finish/i, ["Mortar or paint pump", "Wall scanner and site positioning"]],
  [/jewel/i, ["Buffing wheels with compound feed", "Dust collector for gold recovery"]],
  [/diamond|gemstone/i, ["Stone imaging and measuring camera", "Graded parcel trays with traceability"]],
  [/windshield|windscreen/i, ["Heated urethane pump and primer station", "Bead inspection camera"]],
  [/\bbale/i, ["Bale weighing scale and ID reader", "Bale opener or truck-loading interface"]],
  [/sample tube|pathology/i, ["Decapper / recapper", "Barcode reader and LIS connection"]],
];

/* ------------------------------------------------------------- the set-up */

/*
 * Each item: what it is (name, short 3D label), why the cell needs it, its group, and where it goes:
 *   outside — behind the safety fence, where operators and maintenance reach it (controllers, power sources,
 *             gas, chillers, extraction units);
 *   reach   — inside the cell, where the robot reaches it (torch cleaner, tip dresser, feeders, chutes);
 *   base    — beside the robot base (wire drum, area scanner);
 *   work    — at the work station: the weld table or work table (fume hood, welding screens, spray booth);
 *   pallet  — at the pallet's aisle side (light curtain);
 *   arm     — on the robot itself (wire feeder, seam sensor, collision sensor): listed, part of the arm;
 *   null    — no single place: listed only (interfaces, software, fixtures drawn as stations).
 * `model` is the 3D model buildModel() makes, or null when nothing is drawn for it.
 */
const I = (name, label, why, group, model, at, extra) => ({ name, label, why, group, model, at, ...extra });

const ARC = [
  I("Welding power source with robot interface", "Welding power source", "Makes the welding arc and talks to the robot controller", "process", "weldPower", "outside"),
  I("Wire feeder on the robot's upper arm", "Wire feeder", "Pushes the welding wire to the torch at the programmed speed", "process", "wireFeeder", "arm"),
  I("Welding wire drum (250 kg) with conduit", "Wire drum", "A full shift of wire without stopping to change spools", "process", "wireDrum", "base"),
  I("Shielding-gas cylinders (Ar / CO₂ mix) with regulator", "Shielding gas", "Shields the molten weld from air", "process", "gasRack", "outside"),
  I("Torch cleaning station: reamer, anti-spatter spray, wire cutter", "Torch cleaner", "Clears spatter from the nozzle and cuts the wire every few welds", "process", "torchCleaner", "reach"),
  I("Robotic MIG/MAG torch with collision sensor", "Torch", "Breaks away before a crash bends the torch", "process", null, "arm"),
  I("Seam finding / tracking sensor", "Seam sensor", "Finds the real joint when parts and fixtures vary", "process", null, "arm"),
  I("Fume extraction hood over the welding table", "Fume hood", "Takes welding fumes away at the source", "process", "fumeArm", "work"),
  I("Fume extractor with filters", "Fume extractor", "Filters the fumes the hood collects", "process", "fumeUnit", "outside"),
  I("Welding screens (arc-flash curtains)", "Welding screens", "Protect people nearby from the arc light", "safety", "weldScreen", "work"),
  I("Welding fixture with clamps", "Fixture", "Holds the parts in the same place for every weld", "process", null, null),
];
const TIG = [
  I("TIG welding power source with HF start", "TIG power source", "Makes the TIG arc and talks to the robot controller", "process", "weldPower", "outside"),
  I("Cold-wire feeder on the arm", "Cold-wire feeder", "Adds filler wire to the TIG weld pool", "process", "wireFeeder", "arm"),
  I("Torch water cooler", "Water cooler", "Cools the TIG torch for long welds", "process", "chiller", "outside"),
  I("Argon cylinder with regulator", "Argon", "Shields the tungsten and the weld from air", "process", "gasRack", "outside", { single: true }),
  I("Robotic TIG torch with collision sensor", "TIG torch", "Breaks away before a crash bends the torch", "process", null, "arm"),
  I("Fume extraction hood over the welding table", "Fume hood", "Takes welding fumes away at the source", "process", "fumeArm", "work"),
  I("Fume extractor with filters", "Fume extractor", "Filters the fumes the hood collects", "process", "fumeUnit", "outside"),
  I("Welding screens (arc-flash curtains)", "Welding screens", "Protect people nearby from the arc light", "safety", "weldScreen", "work"),
  I("Welding fixture with clamps", "Fixture", "Holds the parts in the same place for every weld", "process", null, null),
];

/** Process equipment for each kind of work. */
const AREA_SET = {
  arc: ARC,
  spot: [
    I("Servo spot-welding gun", "Spot gun", "Squeezes and welds the sheets", "process", null, "arm"),
    I("Weld timer and servo-gun controller", "Weld timer", "Sets current, time and squeeze force for each spot", "process", "cabinet", "outside", { tint: "grey" }),
    I("Cooling-water unit for gun and transformer", "Cooling water", "Keeps the electrodes and transformer cool", "process", "waterUnit", "outside"),
    I("Electrode tip dresser", "Tip dresser", "Re-shapes the electrode tips every few hundred welds", "process", "tipDresser", "reach"),
    I("Spark guards / welding screens", "Spark guards", "Stop sparks and expulsions leaving the cell", "safety", "weldScreen", "work"),
  ],
  laserweld: [
    I("Fibre laser source", "Laser source", "Makes the welding laser beam", "process", "laserSource", "outside"),
    I("Chiller for the laser and the optics", "Chiller", "Keeps the laser source and the head at temperature", "process", "chiller", "outside"),
    I("Laser welding head with wobble optics", "Laser head", "Focuses and moves the beam along the seam", "process", null, "arm"),
    I("Seam tracking sensor", "Seam sensor", "Keeps the beam on the joint", "process", null, "arm"),
    I("Fume extraction at the welding point", "Fume hood", "Takes the welding fumes away", "process", "fumeArm", "work"),
    I("Fume extractor with filters", "Fume extractor", "Filters the fumes the hood collects", "process", "fumeUnit", "outside"),
    I("Class 1 laser-safe enclosure with laser windows", "Laser enclosure", "Contains reflected laser light: required for any laser cell", "safety", null, null, { enclosure: "laser" }),
  ],
  laserclean: [
    I("Pulsed fibre laser source for cleaning", "Laser source", "Makes the cleaning laser beam", "process", "laserSource", "outside"),
    I("Chiller", "Chiller", "Keeps the laser source at temperature", "process", "chiller", "outside"),
    I("Fume and dust extraction at the nozzle", "Extraction hood", "Takes the removed rust, paint and fumes away", "process", "fumeArm", "work"),
    I("Fume extractor with filters", "Fume extractor", "Filters what the hood collects", "process", "fumeUnit", "outside"),
    I("Class 1 laser-safe enclosure with laser windows", "Laser enclosure", "Contains reflected laser light: required for any laser cell", "safety", null, null, { enclosure: "laser" }),
  ],
  ultrasonic: [
    I("Ultrasonic generator matched to the horn", "Ultrasonic generator", "Drives the horn at its frequency", "process", "ctrlBox", "outside"),
    I("Anvil / nest fixture for the parts", "Anvil", "Supports the parts under the horn", "process", null, null),
  ],
  solder: [
    I("Soldering unit with tip cleaner", "Soldering unit", "Heats the iron and cleans the tip", "process", "ctrlBox", "outside"),
    I("Solder wire feeder", "Solder feeder", "Feeds solder wire to the tip", "process", null, "arm"),
    I("Fume extraction at the soldering tip", "Fume extractor", "Takes flux fumes away", "process", "fumeUnit", "outside", { small: true }),
  ],
  fsw: [
    I("Friction-stir spindle drive with axial force control", "Spindle drive", "Turns the pin tool and holds the forging force", "process", "cabinet", "outside", { tint: "blue" }),
    I("Chiller for the spindle", "Chiller", "Cools the spindle and tool holder", "process", "chiller", "outside"),
    I("Heavy clamping fixture with a backing bar", "Clamping fixture", "Takes the forging force under the joint", "process", null, null),
  ],
  stud: [
    I("Stud welding controller", "Stud controller", "Sets current and time for each stud", "process", "ctrlBox", "outside"),
    I("Stud feeder", "Stud feeder", "Blows one stud at a time to the gun", "process", "partFeeder", "outside"),
    I("Welding screens (arc-flash curtains)", "Welding screens", "Protect people nearby from the arc light", "safety", "weldScreen", "work"),
  ],
  paint: [
    I("Paint supply: pumps, pressure pots and agitators", "Paint supply", "Feeds mixed paint to the gun at a steady pressure", "process", "paintSupply", "outside"),
    I("Colour changer and dosing pump on the arm", "Colour changer", "Changes colour and meters the paint at the gun", "process", null, "arm"),
    I("Spray booth with filtered extraction", "Spray booth", "Catches overspray and keeps solvent below explosive levels", "process", "sprayBooth", "work"),
    I("Booth exhaust fan and stack", "Booth exhaust", "Pulls air through the booth filters", "process", "boothExhaust", "outside"),
    I("Robot protective cover (jacket)", "Robot cover", "Keeps paint off the robot", "process", null, "arm"),
    I("ATEX (explosion-proof) robot or purge kit", "ATEX", "Required where solvent paint is sprayed", "safety", null, null),
  ],
  dispense: [
    I("Material dosing unit: drum pump and controller", "Dosing unit", "Pumps and meters the adhesive, sealant or product", "process", "dosingUnit", "outside"),
    I("Dispensing valve or nozzle on the arm", "Dispense valve", "Lays the bead or dose where the program says", "process", null, "arm"),
    I("Bead inspection camera (optional)", "Bead check", "Checks every bead for gaps", "process", null, null),
  ],
  pallet: [
    I("Slip-sheet magazine", "Slip sheets", "Puts a sheet between layers so the stack holds", "process", "slipSheets", "reach"),
    I("Pallet stops and pallet-present sensors", "Pallet sensors", "Tell the robot a pallet is in place", "process", null, null),
    I("Light curtain at the pallet exit", "Light curtain", "Stops the robot when someone walks in to take the pallet", "safety", "lightCurtain", "pallet", { fencedOnly: true }),
  ],
  tend: [],
  head: [],
  force: [],
  vision: [
    I("Vision controller / PC", "Vision PC", "Runs the inspection and sends pass or fail to the robot", "process", "ctrlBox", "outside"),
    I("Inspection lighting matched to the defect", "Lighting", "Ring, bar or back light makes the defect visible", "process", null, null),
    I("Reject chute and bin", "Reject bin", "Keeps failed parts apart from good ones", "process", "rejectBin", "reach"),
  ],
  screw: [
    I("Screw feeder / presenter", "Screw feeder", "Presents one screw at a time to the screwdriver", "process", "screwFeeder", "reach"),
    I("Tightening controller", "Tightening controller", "Sets and records torque and angle for every screw", "process", "ctrlBox", "outside"),
  ],
  rivet: [
    I("Rivet feeder", "Rivet feeder", "Blows one rivet at a time to the setting tool", "process", "partFeeder", "reach"),
    I("Riveting controller", "Riveting controller", "Sets and monitors every rivet", "process", "ctrlBox", "outside"),
  ],
  mark: [
    I("Laser marker controller", "Marker controller", "Holds the mark layouts and drives the marker", "process", "ctrlBox", "outside"),
    I("Fume extraction at the laser marker", "Fume extractor", "Takes marking fumes away", "process", "fumeUnit", "outside", { small: true }),
  ],
  label: [
    I("Print-and-apply labeller", "Label printer", "Prints each label with its data", "process", "labelPrinter", "reach"),
    I("Barcode verifier", "Barcode verifier", "Checks every printed code can be read", "process", null, null),
  ],
  bin: [
    I("3D camera over the bin", "3D camera", "Finds parts lying in any position", "process", null, null),
    I("Vision PC for bin picking", "Vision PC", "Locates the parts and plans the grip", "process", "ctrlBox", "outside"),
  ],
  mobile: [
    I("AMR base and charging dock", "Charging dock", "Charges the mobile base between runs", "process", "charger", "outside"),
    I("Docking markers at each machine", "Docking markers", "Let the arm find the machine again after driving", "process", null, null),
  ],
  pick: [],
};

/** Work where the robot carries the product, so its gripper is part of the set-up. */
const GRIPPED = new Set(["pick", "pallet", "bin", "mobile", "vision", "label"]);
const GRIPPER = I("Gripper for the product (fingers, vacuum or clamp)", "Gripper", "Holds the part the way it must be handled", "process", null, "arm");

const PALLET_GRIPPER = { ...GRIPPER, name: "Palletizing gripper (vacuum, fork or clamp)", label: "Palletizing gripper", why: "Lifts each case, bag or layer square and safe" };

/** Machine tending: the interface and helpers depend on the machine. */
function tendSet(job) {
  const out = [{ ...GRIPPER, name: "Dual gripper (raw part in, finished part out)", label: "Dual gripper", why: "Swaps parts at the machine in one visit" }];
  if (/mou?ld/i.test(job)) out.push(I("Euromap 67 / SPI interface to the moulding machine", "Euromap 67", "Lets the robot and the moulding machine take turns safely", "process", null, null));
  else if (/\bpress\b|stamp|brake|bend/i.test(job))
    out.push(
      I("Press interface and press safety control", "Press interface", "Lets the robot and the press take turns safely", "process", null, null),
      I("Double-blank detection", "Double blank", "Stops two stuck sheets going into the die", "process", null, null),
    );
  else if (/die ?cast|forg/i.test(job)) out.push(I("Heat-resistant gripper fingers", "Hot fingers", "Hold parts straight out of the die or furnace", "process", null, "arm"), I("Machine interface: door and cycle signals", "Machine interface", "Lets the robot and the machine take turns", "process", null, null));
  else
    out.push(
      I("Machine interface: door, chuck and cycle-start signals", "Machine interface", "Lets the robot and the machine take turns", "process", null, null),
      I("Air blow-off station", "Air blow-off", "Blows chips and coolant off the part and the gripper", "process", "airBlow", "reach"),
    );
  return out;
}

/** A head the robot carries (cutting, drilling, routing, hemming, deboning): its drive and helpers depend on the head. */
function headSet(job) {
  if (/waterjet/i.test(job))
    return [
      I("Waterjet cutting head with abrasive feed", "Waterjet head", "Cuts with water and garnet at high pressure", "process", null, "arm"),
      I("High-pressure intensifier pump", "Intensifier pump", "Pressurises water to about 4,000 bar", "process", "intensifier", "outside"),
      I("Abrasive (garnet) hopper and metering", "Abrasive hopper", "Feeds abrasive to the cutting head", "process", "dosingUnit", "outside"),
      I("Catcher tank under the cut", "Catcher tank", "Absorbs the jet's energy after the cut", "process", "quenchTank", "reach"),
    ];
  if (/plasma|laser cut/i.test(job))
    return [
      I("Plasma or laser cutting torch", "Cutting torch", "Cuts the profile", "process", null, "arm"),
      I("Fume extraction and a spark-proof cutting table", "Cutting fume extraction", "Takes cutting fumes away", "process", "fumeUnit", "outside"),
    ];
  if (/meat|debon/i.test(job)) return [I("Food-grade knife or bandsaw head", "Knife", "Cuts and debones", "process", null, "arm")];
  if (/hemm/i.test(job))
    return [
      I("Roller hemming head", "Hemming head", "Folds the flange in passes", "process", null, "arm"),
      I("Hemming bed (anvil) for each panel model", "Hemming bed", "Supports the panel under the rollers", "process", null, null),
    ];
  return [
    I("Spindle head (cutting, drilling or routing)", "Spindle", "Turns the cutter", "process", null, "arm"),
    I("Spindle drive and tool controller", "Spindle drive", "Drives the spindle at the programmed speed", "process", "cabinet", "outside", { tint: "blue" }),
    I("Chip and dust extraction", "Dust collector", "Takes chips and dust away from the cut", "process", "dustCollector", "outside"),
    I("Tool rack and tool length setter", "Tool rack", "Holds spare tools and measures each new one", "process", "toolRack", "reach"),
  ];
}

/** Finishing (grinding, polishing…) and assembly share an area; their equipment differs. */
function forceSet(job) {
  const out = [];
  if (/grind|polish|sand|deburr|deflash|fettl|finish|surface|stone|jewel|blast|clean/i.test(job)) {
    if (/blast/i.test(job)) out.push(I("Blast pot with abrasive recovery", "Blast pot", "Feeds abrasive to the nozzle and recovers it", "process", "dosingUnit", "outside"));
    else if (/clean|wash/i.test(job)) out.push(I("High-pressure pump with filtration and recycling", "HP pump", "Feeds the cleaning nozzle", "process", "intensifier", "outside"));
    else out.push(I("Abrasive / disc change station", "Disc changer", "Changes worn discs and belts without an operator", "process", "abrasiveStation", "reach"));
    out.push(
      I("Force-control unit (active contact flange)", "Force control", "Keeps the contact force constant on the surface", "process", null, "arm"),
      I("Extraction hood at the work table", "Extraction hood", "Takes dust and sparks away at the source", "process", "fumeArm", "work"),
      I("Dust collector with filters", "Dust collector", "Filters the dust the hood collects", "process", "dustCollector", "outside"),
    );
  } else {
    out.push(
      I("Compensation unit", "Compensation unit", "Lets the gripper float so parts slide into place", "process", null, "arm"),
      I("Parts feeder (bowl or flexible feeder)", "Parts feeder", "Presents small parts one at a time", "process", "partFeeder", "reach"),
      I("Assembly fixture / nest", "Fixture", "Holds the base part while parts go in", "process", null, null),
    );
  }
  return out;
}

/** Job-specific machines and devices, drawn in 3D. */
const JOB_SET = [
  [/pipe & orbital|pipe weld|wire arc|waam|heavy fabrication/i, [I("Welding positioner", "Positioner", "Turns the part so every seam is welded flat", "process", "positioner", "reach")]],
  [/plasma/i, [I("Plasma cutting power source and gas console", "Plasma source", "Makes the plasma arc", "process", "weldPower", "outside", { tint: "red" }), I("Plasma gas cylinders", "Plasma gas", "Supply the cutting and shield gas", "process", "gasRack", "outside")]],
  [/laser cut/i, [I("Fibre laser source and chiller for cutting", "Laser source", "Makes the cutting beam", "process", "laserSource", "outside"), I("Chiller", "Chiller", "Keeps the laser source cool", "process", "chiller", "outside")]],
  [/meat|debon/i, [I("Knife sterilizer (82 °C)", "Knife sterilizer", "Sterilises the blade between cuts", "process", "sterilizer", "reach")]],
  [/harden|heat treat|induction/i, [I("Induction generator", "Induction generator", "Powers the induction coil", "process", "cabinet", "outside", { tint: "grey" }), I("Quench tank", "Quench tank", "Quenches the hot part", "process", "quenchTank", "reach")]],
  [/die ?cast|forg/i, [I("Quench tank or cooling conveyor", "Quench tank", "Cools the hot casting or forging", "process", "quenchTank", "reach")]],
  [/mou?ld/i, [I("Sprue and part separation chute", "Sprue chute", "Separates runners from good parts", "process", "rejectBin", "reach")]],
  [/\bpress\b|stamp|brake/i, [I("Press safety light curtain", "Press light curtain", "Stops the press when a hand is in the die", "safety", "lightCurtain", "pallet", { fencedOnly: true })]],
  [/^(?!.*strapping).*(?:packing|box form|carton|wrapping|ceramic tile)/i, [I("Case erector", "Case erector", "Folds and bottom-seals empty cartons", "process", "machine", "outside"), I("Case sealer", "Case sealer", "Tapes the filled carton shut", "process", "machine", "outside", { small: true })]],
  [/strapping|bundle/i, [I("Strapping machine", "Strapping machine", "Straps the bundle with PET or steel strap", "process", "machine", "outside")]],
  [/tray seal|^sealing/i, [I("Tray sealing machine", "Tray sealer", "Seals film onto filled trays", "process", "machine", "outside")]],
  [/glass handling/i, [I("Glass rack (A-frame)", "Glass rack", "Holds glass sheets upright and safe", "process", "aFrame", "reach")]],
  [/leak/i, [I("Leak tester and test fixture", "Leak tester", "Pressurises the part and measures the decay", "process", "ctrlBox", "outside")]],
  [/^palleti|^stacking|sack pallet|block stack/i, [I("Stretch wrapper after the pallet station", "Stretch wrapper", "Wraps the finished pallet for transport", "process", "stretchWrapper", "outside")]],
  [/order pick|parcel|recycl|classification|singulat|fruit|\begg|gemstone|diamond|kitting/i, [I("Camera over the pick area", "Pick camera", "Finds each item for vision-guided picking", "process", null, null)]],
];

/** Robot system, safety and utilities: every cell has them. */
function baseSet(fenced) {
  return fenced
    ? [
        I("Robot controller cabinet with teach pendant", "Robot controller", "Drives the six axes and runs the program", "robot", "controller", "outside"),
        I("Robot base plate anchored to the floor", "Base plate", "Holds the robot rigid at full speed", "robot", null, null),
        I("Safety fence with interlocked door", "Safety fence", "Keeps people out while the robot runs", "safety", null, null),
        I("Safety PLC / safety relay and emergency stops", "Safety controller", "Stops the robot safely when a door opens or a button is pressed", "safety", null, null),
      ]
    : [
        I("Cobot control box with teach pendant", "Cobot controller", "Drives the arm and runs the program", "robot", "cobotBox", "outside"),
        I("Robot base plate or mobile stand", "Base plate", "Holds the cobot steady", "robot", null, null),
        I("Area scanner (slows the cobot when people come close)", "Area scanner", "Collaborative safety without a fence", "safety", "scanner", "base"),
        I("Risk assessment to ISO/TS 15066", "Risk assessment", "Proves forces stay below body-region limits", "safety", null, null),
      ];
}
const UTILITIES = [I("Compressed-air service unit (filter, regulator, valve)", "Air supply", "Clean, steady air for the gripper, valves and cleaners", "utility", "airUnit", "outside")];

const STOP = new Set(["and", "with", "for", "the", "or", "of", "a", "an", "to", "at", "on", "in", "each", "between", "under", "after"]);
/** The significant words of a name, singular: "Glass racks / A-frames" → glass, rack, a, frame. */
const words = (s) =>
  String(s)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 5 && w.endsWith("ing") ? w.slice(0, -3) : w.length > 5 && w.endsWith("er") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
/** Two names for the same equipment: they share two significant words ("Induction generator interface", "Induction generator"). */
function sameThing(a, b) {
  const wb = new Set(words(b));
  return words(a).filter((w) => wb.has(w)).length >= 2;
}

/** The product the user chose for an item ("Fronius TPS 400i Welding Power Source" for the power source), if any. */
export function chosenProduct(item, names) {
  return (names || []).find((n) => sameThing(n, item.name) || sameThing(n, item.label)) || null;
}

/** The job a cell does, when its title does not say: from what its steps do. */
function jobFromSteps(steps) {
  const acts = (steps || []).map((s) => s.action);
  const texts = (steps || []).map((s) => s.text || s.label || "").join(" ");
  if (acts.includes("weld")) return /spot/i.test(texts) ? "Spot Welding" : /tig/i.test(texts) ? "TIG Welding" : "MIG/MAG Welding";
  if (/paint|spray|coat/i.test(texts)) return "Painting & Coating";
  if (/glue|seal|adhesive|dispens/i.test(texts)) return "Adhesive & Sealant Dispensing";
  if (/grind|polish|sand|deburr/i.test(texts)) return "Grinding & Surface Prep";
  if (/screw/i.test(texts)) return "Screw Driving";
  if ((steps || []).some((s) => s.station === "cnc")) return "CNC Machining";
  if (acts.includes("inspect") || acts.includes("check")) return "Vision Inspection";
  if ((steps || []).some((s) => s.station === "pallet")) return "Palletizing";
  return "Loading & Unloading";
}

/** The jobs of a robot from its plan title, e.g. "Robot 1: MIG/MAG Welding + Palletizing". */
export function jobsOfTitle(title) {
  return String(title || "")
    .replace(/^Robot \d+:?\s*/, "")
    .split(" + ")
    .map((s) => s.trim())
    .filter((s) => s && !/^robot cell simulator$/i.test(s) && !/^robot \d+$/i.test(s));
}

/**
 * The whole set-up of one robot cell: robot system, process equipment, safety and utilities, for its jobs.
 * @param {string[]} jobs the robot's jobs, in order
 * @param {{ fenced?: boolean, steps?: { action: string, station?: string, text?: string, label?: string }[] }} [opts]
 */
export function cellEquipment(jobs, opts = {}) {
  const fenced = opts.fenced !== false;
  const list = (jobs || []).filter(Boolean);
  if (!list.length) list.push(jobFromSteps(opts.steps));
  const out = [...baseSet(fenced)];
  const seen = new Set(out.map((x) => x.name));
  const push = (x) => {
    if (x.fencedOnly && !fenced) return;
    // One of each piece of equipment, even when two jobs need it (two jobs, one controller box).
    const same = out.find((y) => y.name === x.name || (x.model && y.model === x.model && y.label === x.label));
    if (same || seen.has(x.name)) return;
    seen.add(x.name);
    out.push({ ...x, job: x.job || null });
  };
  for (const job of list) {
    const area = areaOf(job);
    const set =
      area === "arc" && /\btig\b/i.test(job)
        ? TIG
        : area === "force"
          ? forceSet(job)
          : area === "tend"
            ? tendSet(job)
            : area === "head"
              ? headSet(job)
              : [...(GRIPPED.has(area) ? [area === "pallet" ? PALLET_GRIPPER : GRIPPER] : []), ...(AREA_SET[area] || [])];
    for (const x of set) push({ ...x, job });
    for (const [re, items] of JOB_SET) if (items && re.test(job)) for (const x of items) push({ ...x, job });
    // Everything else the job needs, from the integrator's notes: listed, not drawn.
    for (const [re, names] of JOB_ALSO)
      if (re.test(job))
        for (const n of names) {
          if (out.some((y) => sameThing(n, y.name))) continue;
          push(I(n, n, "Needed for this job", "process", null, null, { job }));
        }
  }
  for (const x of UTILITIES) push(x);
  return out;
}

/** Equipment the whole line shares, once: the line PLC and operator panel. */
export function lineEquipment() {
  return [I("Line PLC and operator HMI with emergency stop", "Line HMI", "Starts, stops and monitors the line; recipes and alarms", "robot", "hmi", "front")];
}

export const EQUIPMENT_GROUPS = [
  ["robot", "Robot system"],
  ["process", "Process equipment"],
  ["safety", "Safety"],
  ["utility", "Utilities"],
];

/* --------------------------------------------------------------- 3D models */

/**
 * The 3D models. Each is built standing on the floor at the origin, its front (the side an operator
 * uses, or the side that faces the robot) towards +z, and reports its footprint [w, h, d] in metres.
 */
export function createEquipmentModels(THREE) {
  // Materials are shared by every model and freed by dispose(); each model's geometry is its own,
  // freed by whoever removes the model from the scene.
  const mats = [];
  const mat = (o) => {
    const m = new THREE.MeshStandardMaterial(o);
    mats.push(m);
    return m;
  };
  const C = {
    cabinet: mat({ color: 0xd3d7dc, metalness: 0.2, roughness: 0.5 }),
    cabinetDark: mat({ color: 0x3a4048, metalness: 0.3, roughness: 0.55 }),
    blue: mat({ color: 0x2f5d8a, metalness: 0.25, roughness: 0.45 }),
    red: mat({ color: 0xb42318, metalness: 0.2, roughness: 0.45 }),
    green: mat({ color: 0x4f7a5a, metalness: 0.2, roughness: 0.55 }),
    grey: mat({ color: 0x8b9199, metalness: 0.3, roughness: 0.5 }),
    dark: mat({ color: 0x24282e, metalness: 0.35, roughness: 0.6 }),
    rubber: mat({ color: 0x15171a, metalness: 0, roughness: 0.85 }),
    steel: mat({ color: 0xb8bec6, metalness: 0.75, roughness: 0.3 }),
    amber: mat({ color: 0xf2b705, metalness: 0.2, roughness: 0.5 }),
    orange: mat({ color: 0xea6a12, metalness: 0.2, roughness: 0.5 }),
    white: mat({ color: 0xeef1f4, metalness: 0.1, roughness: 0.45 }),
    card: mat({ color: 0xc49a6c, metalness: 0, roughness: 0.9 }),
    brass: mat({ color: 0xc9a43a, metalness: 0.8, roughness: 0.3 }),
    screen: mat({ color: 0x0b2540, emissive: 0x2a7de1, emissiveIntensity: 0.7, roughness: 0.25 }),
    greenLamp: mat({ color: 0x1f7a3a, emissive: 0x22c55e, emissiveIntensity: 0.9 }),
    redLamp: mat({ color: 0x7a1f1f, emissive: 0xef4444, emissiveIntensity: 0.6 }),
    curtain: mat({ color: 0xc2410c, metalness: 0, roughness: 0.6, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
    glass: mat({ color: 0xa9d2e8, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.35, depthWrite: false }),
    water: mat({ color: 0x2c6e91, metalness: 0.1, roughness: 0.15, transparent: true, opacity: 0.75 }),
    filter: mat({ color: 0xe9e4d6, metalness: 0, roughness: 0.95 }),
    film: mat({ color: 0xdfe7ee, metalness: 0, roughness: 0.3, transparent: true, opacity: 0.55, depthWrite: false }),
    panel: mat({ color: 0xe8eef4, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    scan: mat({ color: 0xf2b705, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }),
  };
  const TINT = { grey: C.cabinet, blue: C.blue, red: C.red, green: C.green };

  const geo = (g) => g;
  /** A box w × h × d with its base at y (centre x, z). */
  const B = (p, w, h, d, m, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), m);
    o.position.set(x, y + h / 2, z);
    o.castShadow = o.receiveShadow = true;
    p.add(o);
    return o;
  };
  /** An upright cylinder r × h with its base at y; rot turns it (e.g. [Math.PI / 2, 0, 0] lies along z). */
  const Cy = (p, r, h, m, x = 0, y = 0, z = 0, rot, seg = 24, r2 = r) => {
    const o = new THREE.Mesh(geo(new THREE.CylinderGeometry(r, r2, h, seg)), m);
    if (rot) {
      o.rotation.set(rot[0], rot[1], rot[2]);
      o.position.set(x, y, z);
    } else o.position.set(x, y + h / 2, z);
    o.castShadow = o.receiveShadow = true;
    p.add(o);
    return o;
  };
  const wheels = (g, w, d) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Cy(g, 0.04, 0.03, C.rubber, sx * (w / 2 - 0.06), 0.04, sz * (d / 2 - 0.06), [0, 0, Math.PI / 2], 14);
  };

  const MODELS = {
    /* Industrial robot controller: cabinet, door, main switch, vents, and the teach pendant on its hook. */
    controller() {
      const g = new THREE.Group();
      B(g, 0.62, 0.08, 0.56, C.dark);
      B(g, 0.6, 1.05, 0.52, C.cabinet, 0, 0.08);
      B(g, 0.004, 0.98, 0.004, C.dark, 0.0, 0.11, 0.262);
      B(g, 0.08, 0.08, 0.03, C.amber, 0.2, 0.92, 0.27);
      Cy(g, 0.025, 0.05, C.red, 0.2, 0.96, 0.29, [Math.PI / 2, 0, 0], 16);
      for (let i = 0; i < 6; i++) B(g, 0.22, 0.008, 0.01, C.dark, -0.15, 0.25 + i * 0.03, 0.262);
      B(g, 0.14, 0.09, 0.01, C.screen, -0.15, 0.85, 0.262);
      B(g, 0.5, 0.04, 0.4, C.grey, 0, 1.13, 0);
      // Teach pendant on the side hook, its cable looping down.
      const p = B(g, 0.06, 0.32, 0.24, C.dark, 0.34, 0.6, 0.02);
      p.rotation.z = 0.08;
      B(g, 0.004, 0.18, 0.15, C.screen, 0.372, 0.68, 0.02);
      Cy(g, 0.012, 0.5, C.rubber, 0.34, 0.12, -0.1);
      return { group: g, size: [0.74, 1.17, 0.56] };
    },
    /* Cobot control box on a small cart, its tablet pendant on top. */
    cobotBox() {
      const g = new THREE.Group();
      B(g, 0.5, 0.03, 0.42, C.grey, 0, 0.08);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, 0.025, 0.6, 0.025, C.grey, sx * 0.22, 0.08, sz * 0.18);
      B(g, 0.5, 0.03, 0.42, C.grey, 0, 0.66);
      wheels(g, 0.5, 0.42);
      B(g, 0.44, 0.34, 0.24, C.white, 0, 0.11, -0.05);
      B(g, 0.3, 0.04, 0.005, C.blue, 0, 0.36, 0.072);
      const tab = B(g, 0.3, 0.2, 0.025, C.dark, 0, 0.69, 0.04);
      tab.rotation.x = -0.5;
      const s = B(g, 0.26, 0.16, 0.004, C.screen, 0, 0.71, 0.056);
      s.rotation.x = -0.5;
      return { group: g, size: [0.5, 0.86, 0.42] };
    },
    /* Welding power source on casters: control panel with display and knobs, sockets, handle. */
    weldPower(o = {}) {
      const g = new THREE.Group();
      const body = TINT[o.tint] || C.blue;
      wheels(g, 0.5, 0.7);
      B(g, 0.5, 0.06, 0.72, C.dark, 0, 0.07);
      B(g, 0.46, 0.32, 0.68, C.cabinetDark, 0, 0.13);
      B(g, 0.48, 0.5, 0.7, body, 0, 0.45);
      B(g, 0.4, 0.3, 0.01, C.dark, 0, 0.6, 0.351);
      B(g, 0.16, 0.08, 0.005, C.screen, -0.08, 0.76, 0.357);
      for (const [x, y] of [[0.1, 0.78], [0.1, 0.66]]) Cy(g, 0.028, 0.03, C.grey, x, y, 0.36, [Math.PI / 2, 0, 0], 16);
      for (const x of [-0.1, 0.0]) Cy(g, 0.022, 0.03, C.brass, x, 0.5, 0.36, [Math.PI / 2, 0, 0], 14);
      for (let i = 0; i < 5; i++) B(g, 0.38, 0.006, 0.01, C.dark, 0, 0.18 + i * 0.05, 0.341);
      for (const sx of [-1, 1]) B(g, 0.025, 0.12, 0.025, C.steel, sx * 0.2, 0.95, 0.25);
      B(g, 0.43, 0.025, 0.025, C.steel, 0, 1.06, 0.25);
      return { group: g, size: [0.5, 1.08, 0.72] };
    },
    /* Wire feeder: a box on the robot's upper arm (placed by the sim). */
    wireFeeder() {
      const g = new THREE.Group();
      B(g, 0.24, 0.16, 0.14, C.blue, 0, 0, 0);
      B(g, 0.18, 0.1, 0.01, C.dark, 0, 0.03, 0.071);
      Cy(g, 0.05, 0.02, C.steel, 0, 0.08, 0.075, [Math.PI / 2, 0, 0], 18);
      return { group: g, size: [0.24, 0.16, 0.14] };
    },
    /* Bulk welding wire in an eight-sided drum, with its hat and the conduit rising to the robot. */
    wireDrum() {
      const g = new THREE.Group();
      Cy(g, 0.26, 0.82, C.card, 0, 0, 0, null, 8);
      B(g, 0.38, 0.03, 0.06, C.dark, 0, 0.35, 0.235);
      Cy(g, 0.25, 0.14, C.amber, 0, 0.82, 0, null, 24, 0.06);
      const conduit = Cy(g, 0.018, 0.9, C.rubber, 0, 0, 0, [0.85, 0, 0], 10);
      conduit.position.set(0, 1.2, 0.3);
      return { group: g, size: [0.52, 1.5, 0.52] };
    },
    /* Gas cylinders chained in a stand, regulators and gauges on top. */
    gasRack(o = {}) {
      const g = new THREE.Group();
      const n = o.single ? 1 : 2;
      const w = n === 1 ? 0.32 : 0.56;
      B(g, w, 0.04, 0.32, C.grey);
      for (const sx of [-1, 1]) B(g, 0.035, 1.3, 0.035, C.grey, sx * (w / 2 - 0.02), 0.04, -0.13);
      B(g, w, 0.03, 0.03, C.grey, 0, 1.0, -0.13);
      B(g, w, 0.02, 0.02, C.dark, 0, 0.95, 0.12);
      const colours = o.single ? [C.blue] : [C.grey, C.dark];
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0 : (i - 0.5) * 0.26;
        Cy(g, 0.11, 1.25, colours[i], x, 0.04, 0, null, 24);
        Cy(g, 0.11, 0.18, i ? C.white : C.green, x, 1.1, 0, null, 24, 0.07);
        Cy(g, 0.03, 0.08, C.brass, x, 1.33, 0);
        Cy(g, 0.035, 0.015, C.white, x + 0.05, 1.42, 0.02, [Math.PI / 2, 0, 0], 16);
      }
      return { group: g, size: [w, 1.46, 0.32] };
    },
    /* Torch cleaning station on its pedestal: reamer, spray head and wire cutter. */
    torchCleaner() {
      const g = new THREE.Group();
      B(g, 0.36, 0.03, 0.36, C.dark);
      B(g, 0.12, 0.82, 0.12, C.grey, 0, 0.03);
      B(g, 0.32, 0.26, 0.24, C.blue, 0, 0.85);
      Cy(g, 0.045, 0.05, C.dark, -0.06, 1.11, 0.02);
      Cy(g, 0.02, 0.04, C.steel, -0.06, 1.15, 0.02);
      B(g, 0.08, 0.06, 0.08, C.steel, 0.09, 1.11, 0.03);
      B(g, 0.1, 0.06, 0.006, C.dark, 0, 0.98, 0.123);
      Cy(g, 0.008, 0.6, C.blue, 0.13, 0.25, -0.08, null, 8);
      return { group: g, size: [0.36, 1.17, 0.36] };
    },
    /* Extraction arm: a post with an articulated arm whose hood hangs over the work, ducting in silver. */
    fumeArm() {
      const g = new THREE.Group();
      B(g, 0.3, 0.03, 0.3, C.dark);
      B(g, 0.09, 1.9, 0.09, C.amber, 0, 0.03);
      Cy(g, 0.06, 0.62, C.steel, 0, 1.78, 0.3, [Math.PI / 2, 0, 0], 16);
      B(g, 0.04, 0.04, 0.62, C.amber, 0, 1.86, 0.3);
      const down = Cy(g, 0.055, 0.42, C.steel, 0, 1.55, 0.6, null, 16);
      down.rotation.x = 0.15;
      Cy(g, 0.05, 0.12, C.amber, 0, 1.24, 0.66, null, 24, 0.17);
      return { group: g, size: [0.36, 1.93, 0.9] };
    },
    /* Fume or dust extractor: filter cabinet with a fan on top and the duct coming in. */
    fumeUnit(o = {}) {
      const s = o.small ? 0.7 : 1;
      const g = new THREE.Group();
      wheels(g, 0.56 * s, 0.56 * s);
      B(g, 0.56 * s, 0.95 * s, 0.56 * s, C.green, 0, 0.07);
      B(g, 0.44 * s, 0.6 * s, 0.01, C.dark, 0, 0.2, 0.28 * s + 0.001);
      B(g, 0.08, 0.05, 0.01, C.greenLamp, 0.18 * s, 0.9 * s, 0.28 * s + 0.002);
      Cy(g, 0.17 * s, 0.14 * s, C.grey, 0, 0.07 + 0.95 * s);
      Cy(g, 0.075 * s, 0.4, C.steel, 0, 1.15 * s + 0.07, 0);
      return { group: g, size: [0.56 * s, 1.55 * s, 0.56 * s] };
    },
    /* Two welding curtains on a frame, angled like a screen bay. */
    weldScreen() {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) {
        B(g, 0.03, 1.85, 0.03, C.dark, sx * 0.7, 0);
        B(g, 0.05, 0.03, 0.5, C.dark, sx * 0.7, 0);
      }
      B(g, 1.43, 0.03, 0.03, C.dark, 0, 1.82);
      const c = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.36, 1.62)), C.curtain);
      c.position.set(0, 0.2 + 0.81, 0);
      g.add(c);
      for (let i = 0; i < 6; i++) B(g, 0.004, 1.62, 0.006, C.red, -0.6 + i * 0.24, 0.2);
      return { group: g, size: [1.43, 1.85, 0.5] };
    },
    /* Tall electrical cabinet: weld timer, spindle drive, induction generator. */
    cabinet(o = {}) {
      const g = new THREE.Group();
      const body = TINT[o.tint] || C.cabinet;
      B(g, 0.62, 0.1, 0.52, C.dark);
      B(g, 0.6, 1.55, 0.5, body, 0, 0.1);
      B(g, 0.004, 1.48, 0.004, C.dark, 0, 0.13, 0.252);
      B(g, 0.16, 0.1, 0.01, C.screen, -0.14, 1.35, 0.252);
      for (const y of [1.2, 1.15]) Cy(g, 0.015, 0.02, y > 1.18 ? C.greenLamp : C.redLamp, 0.12, y, 0.26, [Math.PI / 2, 0, 0], 12);
      B(g, 0.03, 0.18, 0.03, C.steel, 0.25, 0.8, 0.26);
      for (let i = 0; i < 4; i++) B(g, 0.24, 0.008, 0.01, C.dark, -0.14, 0.3 + i * 0.03, 0.252);
      return { group: g, size: [0.62, 1.65, 0.52] };
    },
    /* Small control box on a stand: generators, vision PC, tightening and marking controllers. */
    ctrlBox() {
      const g = new THREE.Group();
      B(g, 0.32, 0.03, 0.32, C.dark);
      B(g, 0.06, 0.75, 0.06, C.grey, 0, 0.03);
      B(g, 0.44, 0.34, 0.3, C.cabinet, 0, 0.78);
      B(g, 0.18, 0.1, 0.008, C.screen, -0.08, 0.95, 0.152);
      Cy(g, 0.015, 0.02, C.greenLamp, 0.14, 1.0, 0.155, [Math.PI / 2, 0, 0], 12);
      for (let i = 0; i < 3; i++) B(g, 0.14, 0.006, 0.008, C.dark, 0.09, 0.84 + i * 0.03, 0.152);
      return { group: g, size: [0.44, 1.12, 0.32] };
    },
    /* Cooling-water unit: tank box, pump, blue and red hoses, flow meters. */
    waterUnit() {
      const g = new THREE.Group();
      B(g, 0.5, 0.85, 0.42, C.cabinet);
      B(g, 0.3, 0.12, 0.01, C.dark, 0, 0.62, 0.211);
      for (const [x, m] of [[-0.12, C.blue], [0.12, C.red]]) {
        Cy(g, 0.03, 0.12, C.glass, x, 0.35, 0.23);
        Cy(g, 0.015, 0.5, m, x, 0.85, 0.05, null, 10);
      }
      Cy(g, 0.08, 0.16, C.blue, 0.13, 0.85, -0.08);
      return { group: g, size: [0.5, 1.35, 0.42] };
    },
    /* Tip dresser on a pedestal: the cutter head the gun closes on, and its motor. */
    tipDresser() {
      const g = new THREE.Group();
      B(g, 0.32, 0.03, 0.32, C.dark);
      B(g, 0.11, 0.9, 0.11, C.grey, 0, 0.03);
      B(g, 0.26, 0.16, 0.2, C.dark, 0, 0.93);
      Cy(g, 0.065, 0.05, C.steel, 0, 1.0, 0.0, [Math.PI / 2, 0, 0], 20);
      Cy(g, 0.05, 0.16, C.blue, -0.12, 0.98, 0.0, [0, 0, Math.PI / 2], 18);
      return { group: g, size: [0.36, 1.09, 0.32] };
    },
    /* Fibre laser source: white cabinet with a blue band, display and the yellow process fibre. */
    laserSource() {
      const g = new THREE.Group();
      wheels(g, 0.6, 0.7);
      B(g, 0.6, 0.95, 0.7, C.white, 0, 0.07);
      B(g, 0.602, 0.08, 0.702, C.blue, 0, 0.8);
      B(g, 0.2, 0.1, 0.008, C.screen, -0.12, 0.62, 0.352);
      Cy(g, 0.02, 0.03, C.amber, 0.18, 0.66, 0.36, [Math.PI / 2, 0, 0], 12);
      const f = Cy(g, 0.008, 0.9, C.amber, 0, 0, 0, [0.6, 0, 0], 8);
      f.position.set(0.2, 1.2, 0.2);
      return { group: g, size: [0.6, 1.5, 0.7] };
    },
    /* Chiller: grey box with a vent grille, display and coolant hoses. */
    chiller() {
      const g = new THREE.Group();
      wheels(g, 0.52, 0.56);
      B(g, 0.52, 0.85, 0.56, C.cabinet, 0, 0.07);
      for (let i = 0; i < 9; i++) B(g, 0.4, 0.012, 0.008, C.dark, 0, 0.18 + i * 0.045, 0.281);
      B(g, 0.14, 0.07, 0.008, C.screen, -0.12, 0.75, 0.282);
      for (const [x, m] of [[0.1, C.blue], [0.18, C.red]]) Cy(g, 0.012, 0.3, m, x, 0.92, -0.15, null, 8);
      return { group: g, size: [0.52, 1.22, 0.56] };
    },
    /* Spray booth: a steel frame with clear side and back panels and the filter bank, open towards the robot (+z). */
    sprayBooth(o = {}) {
      const g = new THREE.Group();
      const H = 1.95, W = 1.8, z0 = -0.8, z1 = 0.35;
      const sides = [o.left !== false && -W / 2, o.right !== false && W / 2].filter((x) => x !== false);
      for (const x of [-W / 2, W / 2]) B(g, 0.05, H, 0.05, C.grey, x, 0, z0);
      for (const x of sides) B(g, 0.05, H, 0.05, C.grey, x, 0, z1);
      B(g, W + 0.05, 0.08, 0.08, C.grey, 0, H - 0.08, z0);
      for (const x of sides) B(g, 0.06, 0.08, z1 - z0, C.grey, x, H - 0.08, (z0 + z1) / 2);
      // Clear panels, so the robot stays in view; the filter bank low on the back wall where it pulls the overspray.
      B(g, W, H - 0.1, 0.01, C.panel, 0, 0.02, z0);
      for (const x of sides) B(g, 0.01, H - 0.1, z1 - z0, C.panel, x, 0.02, (z0 + z1) / 2);
      for (let c = 0; c < 4; c++) B(g, 0.4, 0.62, 0.02, C.filter, -0.66 + c * 0.44, 0.12, z0 + 0.02);
      B(g, W, 0.1, 0.12, C.dark, 0, 0, z0 + 0.06);
      return { group: g, size: [W + 0.05, H, z1 - z0 + 0.05] };
    },
    /* Paint kitchen on a skid: two pressure pots, a pump and its regulators. */
    paintSupply() {
      const g = new THREE.Group();
      B(g, 0.95, 0.06, 0.6, C.grey);
      for (const x of [-0.24, 0.12]) {
        Cy(g, 0.15, 0.62, C.steel, x, 0.06, 0);
        Cy(g, 0.155, 0.04, C.dark, x, 0.68, 0);
        Cy(g, 0.03, 0.12, C.brass, x, 0.72, 0);
      }
      B(g, 0.2, 0.3, 0.2, C.blue, 0.37, 0.06, 0);
      B(g, 0.03, 1.05, 0.03, C.grey, 0.45, 0.06, -0.26);
      Cy(g, 0.035, 0.02, C.white, 0.45, 0.95, -0.22, [Math.PI / 2, 0, 0], 14);
      return { group: g, size: [0.95, 1.11, 0.6] };
    },
    /* Booth exhaust: fan housing at the foot of a tall stack. */
    boothExhaust() {
      const g = new THREE.Group();
      B(g, 0.7, 0.6, 0.7, C.grey);
      Cy(g, 0.26, 0.04, C.dark, 0, 0.3, 0.36, [Math.PI / 2, 0, 0], 28);
      Cy(g, 0.2, 1.9, C.steel, 0, 0.6, 0);
      return { group: g, size: [0.7, 2.5, 0.7] };
    },
    /* Drum pump press: a 200 L drum under a follower plate, the pump on top and its controller. */
    dosingUnit() {
      const g = new THREE.Group();
      B(g, 0.85, 0.05, 0.65, C.dark);
      Cy(g, 0.29, 0.88, C.blue, -0.08, 0.05, 0);
      for (const sx of [-1, 1]) B(g, 0.05, 1.6, 0.05, C.grey, -0.08 + sx * 0.36, 0.05, 0);
      B(g, 0.8, 0.08, 0.12, C.grey, -0.08, 1.55, 0);
      Cy(g, 0.06, 0.55, C.steel, -0.08, 0.95, 0);
      B(g, 0.2, 0.36, 0.18, C.cabinet, 0.32, 0.6, 0.12);
      B(g, 0.1, 0.06, 0.006, C.screen, 0.32, 0.85, 0.213);
      return { group: g, size: [0.85, 1.63, 0.65] };
    },
    /* Dust collector: filter cabinet over a hopper, bin below, inlet duct on top. */
    dustCollector() {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, 0.05, 0.6, 0.05, C.grey, sx * 0.3, 0, sz * 0.3);
      B(g, 0.3, 0.25, 0.3, C.dark, 0, 0);
      Cy(g, 0.36, 0.35, C.grey, 0, 0.35, 0, null, 4, 0.14).rotation.y = Math.PI / 4;
      B(g, 0.7, 0.85, 0.7, C.green, 0, 0.7);
      B(g, 0.5, 0.5, 0.01, C.dark, 0, 0.85, 0.351);
      Cy(g, 0.11, 0.5, C.steel, 0, 1.55, 0);
      return { group: g, size: [0.72, 2.05, 0.72] };
    },
    /* Abrasive change station: a magazine of new discs and a bin for worn ones. */
    abrasiveStation() {
      const g = new THREE.Group();
      B(g, 0.4, 0.03, 0.4, C.dark);
      B(g, 0.12, 0.8, 0.12, C.grey, 0, 0.03);
      B(g, 0.34, 0.04, 0.3, C.steel, 0, 0.83);
      for (let i = 0; i < 7; i++) Cy(g, 0.075, 0.012, i % 2 ? C.orange : C.dark, -0.07, 0.87 + i * 0.013, 0);
      B(g, 0.12, 0.12, 0.12, C.red, 0.1, 0.87, 0);
      return { group: g, size: [0.4, 1.0, 0.4] };
    },
    /* Compressed-air service unit on a post: filter bowl, regulator with gauge, valve, blue hose. */
    airUnit() {
      const g = new THREE.Group();
      B(g, 0.22, 0.03, 0.18, C.dark);
      B(g, 0.06, 1.3, 0.06, C.grey, 0, 0.03);
      B(g, 0.2, 0.07, 0.07, C.steel, 0, 1.0, 0.05);
      Cy(g, 0.03, 0.12, C.glass, -0.06, 0.88, 0.05);
      Cy(g, 0.028, 0.02, C.white, 0.05, 1.1, 0.09, [Math.PI / 2, 0, 0], 14);
      B(g, 0.05, 0.06, 0.05, C.blue, 0.08, 0.93, 0.05);
      Cy(g, 0.008, 1.0, C.blue, 0.09, 0, 0.06, null, 8);
      return { group: g, size: [0.22, 1.33, 0.18] };
    },
    /* Light curtain: emitter and receiver posts either side of an opening `width` wide. */
    lightCurtain(o = {}) {
      const g = new THREE.Group();
      const w = o.width || 1.1;
      for (const sx of [-1, 1]) {
        B(g, 0.16, 0.03, 0.16, C.dark, sx * w / 2, 0);
        B(g, 0.06, 1.55, 0.06, C.amber, sx * w / 2, 0.03);
        B(g, 0.012, 1.3, 0.012, C.redLamp, sx * (w / 2 - 0.032), 0.18);
      }
      return { group: g, size: [w + 0.16, 1.58, 0.16] };
    },
    /* Area scanner on the floor and the faint fan it watches. */
    scanner() {
      const g = new THREE.Group();
      B(g, 0.15, 0.15, 0.15, C.amber);
      Cy(g, 0.05, 0.05, C.dark, 0, 0.15, 0.02);
      const fan = new THREE.Mesh(geo(new THREE.CircleGeometry(1.6, 32, Math.PI * 0.15, Math.PI * 0.7)), C.scan);
      fan.rotation.x = -Math.PI / 2;
      fan.position.y = 0.006;
      g.add(fan);
      return { group: g, size: [0.15, 0.2, 0.15] };
    },
    /* Operator panel on a pedestal: touch screen, start/stop, emergency stop and a stack light. */
    hmi() {
      const g = new THREE.Group();
      B(g, 0.4, 0.03, 0.4, C.dark);
      B(g, 0.08, 1.05, 0.08, C.grey, 0, 0.03);
      const p = B(g, 0.46, 0.34, 0.12, C.cabinet, 0, 1.05);
      p.rotation.x = -0.35;
      const s = B(g, 0.32, 0.2, 0.01, C.screen, 0, 1.12, 0.07);
      s.rotation.x = -0.35;
      Cy(g, 0.035, 0.035, C.red, 0.17, 1.38, 0.02);
      Cy(g, 0.02, 0.06, C.amber, 0.17, 1.32, 0.02);
      for (const [y, m] of [[1.42, C.greenLamp], [1.5, C.amber], [1.58, C.redLamp]]) Cy(g, 0.03, 0.07, m, -0.17, y, -0.02, null, 14);
      return { group: g, size: [0.46, 1.65, 0.4] };
    },
    /* Slip-sheet magazine: a stack of sheets on a low stand with guides. */
    slipSheets() {
      const g = new THREE.Group();
      B(g, 0.9, 0.12, 0.7, C.card);
      B(g, 0.84, 0.18, 0.64, C.filter, 0, 0.12);
      for (const sx of [-1, 1]) B(g, 0.03, 0.6, 0.03, C.amber, sx * 0.46, 0, 0.36);
      return { group: g, size: [0.95, 0.6, 0.75] };
    },
    /* Stretch wrapper: turntable, mast and film carriage. */
    stretchWrapper() {
      const g = new THREE.Group();
      Cy(g, 0.8, 0.08, C.grey, 0, 0, 0, null, 36);
      Cy(g, 0.78, 0.01, C.dark, 0, 0.08, 0, null, 36);
      B(g, 0.28, 2.2, 0.22, C.blue, 0, 0, -0.98);
      B(g, 0.26, 0.4, 0.3, C.cabinet, 0, 0.8, -0.8);
      Cy(g, 0.06, 0.25, C.film, 0, 0.88, -0.66);
      return { group: g, size: [1.6, 2.2, 2.0] };
    },
    /* Screw presenter on a stand: hopper, rail and the pick point. */
    screwFeeder() {
      const g = new THREE.Group();
      B(g, 0.3, 0.03, 0.3, C.dark);
      B(g, 0.07, 0.7, 0.07, C.grey, 0, 0.03);
      B(g, 0.32, 0.18, 0.24, C.cabinet, 0, 0.73);
      B(g, 0.2, 0.08, 0.16, C.dark, -0.04, 0.91);
      B(g, 0.12, 0.02, 0.03, C.steel, 0.12, 0.91, 0.05);
      return { group: g, size: [0.32, 0.99, 0.3] };
    },
    /* Vibratory bowl feeder on a stand with its outfeed track. */
    partFeeder() {
      const g = new THREE.Group();
      B(g, 0.42, 0.03, 0.42, C.dark);
      B(g, 0.32, 0.65, 0.32, C.grey, 0, 0.03);
      Cy(g, 0.2, 0.14, C.steel, 0, 0.68, 0, null, 28, 0.15);
      Cy(g, 0.205, 0.015, C.dark, 0, 0.82, 0, null, 28);
      B(g, 0.03, 0.02, 0.3, C.steel, 0.18, 0.8, 0.18);
      return { group: g, size: [0.42, 0.84, 0.48] };
    },
    /* Air blow-off station: a pedestal with a ring of nozzles the robot holds the part in. */
    airBlow() {
      const g = new THREE.Group();
      B(g, 0.32, 0.03, 0.32, C.dark);
      B(g, 0.08, 0.85, 0.08, C.grey, 0, 0.03);
      Cy(g, 0.14, 0.03, C.steel, 0, 0.9, 0, null, 24);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        Cy(g, 0.008, 0.12, C.blue, Math.cos(a) * 0.12, 0.93, Math.sin(a) * 0.12, null, 8);
      }
      B(g, 0.3, 0.2, 0.3, C.glass, 0, 0.88);
      return { group: g, size: [0.32, 1.08, 0.32] };
    },
    /* Tool rack: spare spindles / cutters in holders, and the tool length setter. */
    toolRack() {
      const g = new THREE.Group();
      B(g, 0.6, 0.03, 0.3, C.dark);
      for (const sx of [-1, 1]) B(g, 0.04, 0.85, 0.04, C.grey, sx * 0.26, 0.03);
      B(g, 0.6, 0.04, 0.24, C.steel, 0, 0.88);
      for (let i = 0; i < 4; i++) Cy(g, 0.03, 0.14, C.dark, -0.21 + i * 0.14, 0.92, 0, null, 16);
      B(g, 0.08, 0.1, 0.08, C.amber, 0.22, 0.03);
      return { group: g, size: [0.6, 1.06, 0.3] };
    },
    /* Reject bin under a short chute. */
    rejectBin() {
      const g = new THREE.Group();
      B(g, 0.42, 0.42, 0.42, C.red);
      B(g, 0.36, 0.02, 0.36, C.dark, 0, 0.42);
      const ch = B(g, 0.3, 0.02, 0.5, C.steel, 0, 0.62, 0.1);
      ch.rotation.x = 0.45;
      for (const sx of [-1, 1]) B(g, 0.03, 0.5, 0.03, C.grey, sx * 0.14, 0.4, 0.3);
      return { group: g, size: [0.42, 0.9, 0.62] };
    },
    /* Quench tank with water and a drain grid. */
    quenchTank() {
      const g = new THREE.Group();
      B(g, 0.8, 0.55, 0.6, C.dark);
      B(g, 0.72, 0.02, 0.52, C.water, 0, 0.5);
      B(g, 0.82, 0.03, 0.04, C.steel, 0, 0.55, 0.3);
      return { group: g, size: [0.8, 0.58, 0.6] };
    },
    /* Print-and-apply labeller on its stand. */
    labelPrinter() {
      const g = new THREE.Group();
      B(g, 0.36, 0.03, 0.36, C.dark);
      B(g, 0.07, 0.9, 0.07, C.grey, 0, 0.03);
      B(g, 0.34, 0.28, 0.24, C.cabinet, 0, 0.93);
      Cy(g, 0.1, 0.06, C.white, -0.05, 1.08, 0.13, [Math.PI / 2, 0, 0], 22);
      B(g, 0.12, 0.08, 0.008, C.screen, 0.08, 1.1, 0.122);
      B(g, 0.14, 0.03, 0.12, C.steel, 0.05, 0.86, 0.12);
      return { group: g, size: [0.36, 1.21, 0.36] };
    },
    /* Packaging machine: case erector, sealer, strapper, tray sealer. */
    machine(o = {}) {
      const s = o.small ? 0.75 : 1;
      const g = new THREE.Group();
      B(g, 1.2 * s, 0.75 * s, 0.85, C.cabinet);
      B(g, 1.2 * s, 0.55 * s, 0.85, C.white, 0, 0.75 * s);
      B(g, 0.9 * s, 0.4 * s, 0.01, C.glass, 0, 0.82 * s, 0.426);
      B(g, 0.16, 0.12, 0.08, C.dark, 0.45 * s, 1.0 * s, 0.45);
      B(g, 0.1, 0.06, 0.004, C.screen, 0.45 * s, 1.04 * s, 0.492);
      Cy(g, 0.02, 0.05, C.red, 0.55 * s, 1.15 * s, 0.4);
      return { group: g, size: [1.2 * s, 1.3 * s, 0.9] };
    },
    /* High-pressure pump skid (waterjet intensifier, washing pump). */
    intensifier() {
      const g = new THREE.Group();
      B(g, 1.2, 0.9, 0.7, C.blue);
      B(g, 1.0, 0.5, 0.01, C.dark, 0, 0.25, 0.351);
      Cy(g, 0.08, 0.9, C.steel, 0, 1.0, 0, [0, 0, Math.PI / 2], 18);
      B(g, 0.16, 0.1, 0.006, C.screen, 0.42, 0.7, 0.354);
      return { group: g, size: [1.2, 1.1, 0.7] };
    },
    /* Knife sterilizer: a stainless tank of hot water with the knife slot. */
    sterilizer() {
      const g = new THREE.Group();
      B(g, 0.08, 0.7, 0.08, C.steel);
      B(g, 0.28, 0.32, 0.22, C.steel, 0, 0.7);
      B(g, 0.2, 0.01, 0.04, C.dark, 0, 1.02);
      return { group: g, size: [0.28, 1.03, 0.22] };
    },
    /* Two-axis welding positioner: base, tilting arm and the faceplate. */
    positioner() {
      const g = new THREE.Group();
      B(g, 0.7, 0.5, 0.6, C.blue);
      const arm = B(g, 0.16, 0.5, 0.5, C.blue, 0.3, 0.5);
      arm.rotation.z = 0.2;
      Cy(g, 0.32, 0.06, C.steel, 0.36, 0.95, 0, [0, 0, Math.PI / 2], 32);
      return { group: g, size: [0.8, 1.27, 0.64] };
    },
    /* Glass A-frame rack with sheets leaning on it. */
    aFrame() {
      const g = new THREE.Group();
      B(g, 1.2, 0.08, 0.9, C.dark);
      for (const sx of [-1, 1]) {
        const a = B(g, 0.05, 1.3, 0.05, C.amber, sx * 0.55, 0.08, 0.15);
        a.rotation.x = -0.18;
      }
      for (let i = 0; i < 3; i++) {
        const p = B(g, 1.0, 1.15, 0.012, C.glass, 0, 0.08, 0.2 + i * 0.05);
        p.rotation.x = -0.18;
      }
      return { group: g, size: [1.2, 1.38, 0.9] };
    },
    /* AMR charging dock: a low box with contact plates. */
    charger() {
      const g = new THREE.Group();
      B(g, 0.5, 0.35, 0.25, C.cabinet);
      for (const sx of [-1, 1]) B(g, 0.08, 0.04, 0.02, C.brass, sx * 0.12, 0.12, 0.13);
      B(g, 0.08, 0.04, 0.006, C.greenLamp, 0, 0.27, 0.126);
      return { group: g, size: [0.5, 0.35, 0.25] };
    },
  };

  /** Build a model: { group, size: [w, h, d] }, or null for a model this module does not draw. */
  function buildModel(key, opts) {
    const f = MODELS[key];
    return f ? f(opts || {}) : null;
  }
  function dispose() {
    mats.forEach((m) => m.dispose());
  }
  return { buildModel, has: (key) => !!MODELS[key], dispose };
}

/** Every model buildModel() can make: the audit checks the knowledge only asks for these. */
export const EQUIPMENT_MODELS = [
  "controller", "cobotBox", "weldPower", "wireFeeder", "wireDrum", "gasRack", "torchCleaner", "fumeArm", "fumeUnit", "weldScreen",
  "cabinet", "ctrlBox", "waterUnit", "tipDresser", "laserSource", "chiller", "sprayBooth", "paintSupply", "boothExhaust", "dosingUnit",
  "dustCollector", "abrasiveStation", "airUnit", "lightCurtain", "scanner", "hmi", "slipSheets", "stretchWrapper", "screwFeeder",
  "partFeeder", "airBlow", "toolRack", "rejectBin", "quenchTank", "labelPrinter", "machine", "intensifier", "sterilizer", "positioner",
  "aFrame", "charger",
];
