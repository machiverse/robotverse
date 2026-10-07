/**
 * Automation Studio — engineering knowledge base.
 *
 * The rules a senior system integrator applies when choosing grippers,
 * vision, robot type and compliance for a job. Used by the built-in solution
 * engine (solutionEngine.ts) and shown to users as the reasoning behind a
 * design. Every rule is a plain pattern → recommendation with the reason.
 */

export interface Rule {
  /** Matches the brief (lower-case). */
  when: RegExp;
  pick: string;
  why: string;
}

/** End-of-arm tooling by what is being handled. First match wins. */
export const GRIPPER_RULES: Rule[] = [
  { when: /\b(sack|sacks|bag|bags|cement bag|rice bag)\b/, pick: "Fork / claw sack gripper", why: "Sacks sag and have no flat face; forks support them from below." },
  { when: /\b(steel sheet|sheet metal|metal sheet|plate|blank|blanks)\b/, pick: "Magnetic or vacuum sheet gripper with double-sheet detection", why: "Flat steel sheets lift best by face; oiled sheets stick together, so detect doubles." },
  { when: /\b(glass|windshield|windscreen|panel|solar)\b/, pick: "Vacuum cup frame with breakage / vacuum-loss sensing", why: "Brittle flat parts need even support over the whole face." },
  { when: /\b(carton|cartons|box|boxes|case|cases|parcel|parcels)\b/, pick: "Foam-pad vacuum gripper (zoned)", why: "Foam seals on uneven cardboard; zones let one tool pick one or several boxes." },
  { when: /\b(bottle|bottles|jar|jars|can|cans|container|containers|vial|vials)\b/, pick: "Neck / multi-finger container gripper", why: "Round containers are gripped at the neck or body for stable, fast transfer." },
  { when: /\b(meat|chicken|fish|fruit|vegetable|bakery|bread|cake|chocolate|egg|eggs|soft)\b/, pick: "Food-grade soft (compliant) fingers or needle gripper", why: "Soft, irregular food needs gentle, hygienic contact that adapts to shape." },
  { when: /\b(fabric|textile|cloth|garment|leather|foam)\b/, pick: "Needle or electro-adhesive gripper", why: "Porous, limp material cannot be held by vacuum or fingers reliably." },
  { when: /\b(pcb|circuit board|electronic|chip|connector)\b/, pick: "ESD-safe vacuum or small parallel gripper", why: "Electronics must be handled without static discharge or edge damage." },
  { when: /\b(tyre|tyres|tire|tires|wheel|wheels)\b/, pick: "Inner-bead expanding clamp", why: "Tyres are gripped from the inside bead without marking the tread." },
  // Only when the carrier itself is handled: "stack parts on a pallet" is a destination, not the part.
  { when: /\b(lift|lifts|lifting|move|moves|moving|handle|handles|handling|carry|carries|transfer|transfers|destack|destacking)\s+(the\s+|empty\s+|full\s+)?(pallet|pallets|crate|crates|tote|totes|bin|bins)\b|\b(crate|crates|tote|totes)\b/, pick: "Fork or tote clamp gripper", why: "Rigid carriers are lifted from below or clamped at the rim." },
  { when: /\b(wood|timber|plank|board|boards|mdf|plywood)\b/, pick: "Vacuum or needle gripper", why: "Smooth boards take vacuum; rough timber needs needles." },
  { when: /\b(casting|castings|forging|forgings|shaft|shafts|gear|gears|machined|billet|billets|bracket|brackets|flange|flanges|housing|housings|steel part|steel parts|metal part|metal parts)\b/, pick: "2- or 3-jaw pneumatic gripper with custom jaws (dual for machine tending)", why: "Rigid metal parts are clamped positively; a dual gripper swaps finished and raw parts in one visit." },
];

/** Vision by how parts arrive and what must be checked. All matches apply. */
export const VISION_RULES: Rule[] = [
  { when: /\b(random|jumbled|loose|bulk|bin pick|bin-pick|pile|heap|mixed orientation)\b/, pick: "3D vision for bin picking", why: "Parts in random orientation need a 3D camera to find each pick pose." },
  { when: /\b(moving conveyor|on the move|conveyor tracking|while moving|continuous conveyor)\b/, pick: "Conveyor tracking with encoder + 2D camera", why: "The robot follows the belt so the line never stops." },
  { when: /\b(inspect|inspection|defect|crack|scratch|quality check|verify|verification)\b/, pick: "2D inspection camera with controlled lighting", why: "Consistent lighting makes defect detection repeatable." },
  { when: /\b(measure|measurement|dimension|gauge|gauging|tolerance|flatness)\b/, pick: "Laser profiler / 3D measurement sensor", why: "Dimensional checks need calibrated 3D data, not just an image." },
  { when: /\b(barcode|qr|datamatrix|serial|traceability|label check)\b/, pick: "Fixed code reader / OCR camera", why: "Every part is read and logged for traceability." },
  { when: /\b(variant|variants|different sizes|mixed|high mix|many parts)\b/, pick: "2D camera for part recognition and offset", why: "The robot identifies the variant and corrects its path automatically." },
];

/** Robot type beyond the standard 6-axis arm. First match wins. */
export const ROBOT_TYPE_RULES: Rule[] = [
  { when: /\b(\d{3,}\s*(kg|kgs)|heavy|ton|tons|tonne|engine block|die)\b/, pick: "Heavy-payload robot (165–1000 kg) or gantry", why: "Large loads need a heavy-duty arm or a gantry for rigidity and safety." },
  { when: /\b(long|track|large area|several machines|many machines|\d{2,}\s*m long|7th axis)\b/, pick: "6-axis robot on a floor track (7th axis) or overhead gantry", why: "One robot can serve several machines spread along a line." },
  { when: /\b(pick and place|pick & place|sorting|sort)\b.*\b(small|light|tablet|chocolate|candy|sachet|pouch)\b|\b(small|light)\b.*\b(pick and place|sorting)\b/, pick: "Delta robot (high-speed picker)", why: "Light products at very high rates are picked fastest by a delta robot." },
  { when: /\b(screw|insert|assembly|assemble)\b.*\b(small|pcb|electronic|precision)\b|\b(small|pcb|electronic|precision)\b.*\b(screw|insert|assembly|assemble)\b/, pick: "SCARA robot", why: "SCARA is fast and rigid for vertical insertion and screwing of small parts." },
  { when: /\b(warehouse|move pallets|between machines|intralogistics|agv|amr|mobile)\b/, pick: "AMR / AGV (autonomous mobile robot) for transport", why: "Material moves between areas without fixed conveyors." },
  { when: /\b(cobot|collaborative|alongside|next to (the )?operator|small batch|low volume)\b/, pick: "Collaborative robot (cobot)", why: "Works next to people without full fencing; quick to redeploy for small batches." },
];

export interface IndustryNote {
  when: RegExp;
  industry: string;
  notes: string[];
  standards: string[];
}

/** Industry-specific design rules and standards. All matches apply. */
export const INDUSTRY_RULES: IndustryNote[] = [
  { when: /\b(food|meat|dairy|bakery|beverage|snack|chocolate|fruit|vegetable)\b/, industry: "Food & beverage", notes: ["Washdown-rated robot (IP67/IP69K) and stainless tooling", "Food-grade (NSF H1) lubricants", "Hygienic design: no crevices, easy cleaning"], standards: ["FSSAI / FSSC 22000 hygiene", "EHEDG hygienic design guidance"] },
  { when: /\b(pharma|tablet|syringe|vial|ampoule|sterile|aseptic|medical)\b/, industry: "Pharma & medical", notes: ["Cleanroom-rated or isolator-compatible robot", "Validation documents (IQ / OQ / PQ)", "Audit trail and batch records (21 CFR Part 11 where exported)"], standards: ["Schedule M (GMP)", "EU GMP Annex 1 for sterile"] },
  { when: /\b(automotive|car|vehicle|body in white|biw|chassis|tier ?1|oem)\b/, industry: "Automotive", notes: ["High uptime: preventive maintenance plan and spare robots strategy", "Weld / dispense quality data to MES", "Standard robot & PLC brands per customer spec"], standards: ["IATF 16949 process control", "Customer-specific robot standards"] },
  { when: /\b(electronic|pcb|smt|semiconductor|mobile phone|connector)\b/, industry: "Electronics", notes: ["ESD-safe tooling and grounding", "SCARA / small 6-axis for precision", "Vision alignment for fine pitch parts"], standards: ["IEC 61340-5-1 (ESD control)"] },
  { when: /\b(foundry|casting|forging|die cast|furnace|hot)\b/, industry: "Foundry & forging", notes: ["Heat- and dust-protective robot jacket (IP67)", "High-temperature grippers or cooling", "Heavy-duty cable dress"], standards: ["Heat stress & fume exposure limits (Factories Act)"] },
  { when: /\b(paint|painting|coating|powder|spray|solvent)\b/, industry: "Painting & coating", notes: ["Explosion-proof painting robot or purged robot", "Booth airflow and filtration", "Colour-change and gun-cleaning cycle"], standards: ["ATEX / IECEx zone rating", "PESO approval for solvent storage"] },
  { when: /\b(warehouse|logistics|parcel|e-?commerce|dispatch|distribution)\b/, industry: "Warehouse & logistics", notes: ["WMS integration for orders and labels", "Mixed-case palletizing patterns", "AMR traffic management"], standards: ["ISO 3691-4 (driverless trucks / AMR)"] },
  { when: /\b(construction|concrete|building|cement|precast|3d print)\b/, industry: "Construction", notes: ["Printable mortar mix design and open time", "Site-level gantry or robot on track", "Weather protection and levelling"], standards: ["IS 456 structural concrete basis", "Site safety plan"] },
];

export const GENERAL_STANDARDS = ["ISO 10218-1/-2 (industrial robot safety)", "ISO 13849-1 (safety control systems)", "ISO 12100 (risk assessment)", "IEC 60204-1 (machine electrical)"];

export const matchFirst = (rules: Rule[], text: string) => rules.find((r) => r.when.test(text)) ?? null;
export const matchAll = (rules: Rule[], text: string) => rules.filter((r) => r.when.test(text));
