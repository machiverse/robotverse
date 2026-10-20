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
  { when: /\b(battery cells?|pouch cells?|prismatic cells?|cylindrical cells?)\b/, pick: "Insulated multi-cell gripper with non-marking fingers", why: "Cells are live: insulated fingers grip them without short circuits or dents." },
  { when: /\b(coil|coils|reel|reels|paper roll|paper rolls|film roll|film rolls|jumbo roll|jumbo rolls)\b/, pick: "Expanding mandrel or C-hook coil gripper", why: "Coils and rolls are lifted through the eye so the outer wraps are not crushed." },
  { when: /\b(test tubes?|sample tubes?|microplates?|well plates?|cuvettes?)\b/, pick: "Labware gripper for tubes and microplates (SBS format)", why: "Lab ware comes in standard sizes; the gripper centres tubes and plates without spilling." },
  { when: /\b(tube|tubes|pipe|pipes|rod|rods|bar stock|profile|profiles|extrusion|extrusions)\b/, pick: "V-jaw or multi-point clamp gripper", why: "Round and profiled parts centre themselves in V-jaws; long lengths need several clamp points so they do not sag." },
  { when: /\b(silicon wafers?|wafer handling|foup|semiconductor)\b/, pick: "Edge-grip or Bernoulli wafer end effector", why: "Wafers must not be touched on the active face; edge grip or an air cushion holds them particle-free." },
  { when: /\b(blister|blisters|tablet|tablets|capsule|capsules)\b/, pick: "Small-cup vacuum gripper (pharma grade)", why: "Light blister cards and packs are picked fast with small cups, without touching the product." },
  { when: /\b(pouch|pouches|sachet|sachets|flow pack|flow packs)\b/, pick: "Bellows vacuum cups", why: "Bellows cups follow the uneven, flexible surface of filled pouches." },
  { when: /\b(prepreg|ply|plies|layup|lay up|composite layup)\b/, pick: "Vacuum ply gripper or electro-adhesive pad", why: "Thin, tacky plies need gentle, even holding force over the whole area." },
  { when: /\b(seedlings?|plug trays?|saplings?|potted plants?)\b/, pick: "Needle plug gripper or soft fingers", why: "Seedlings are lifted by the soil plug, not by the stem." },
  { when: /\b(sand cores?)\b/, pick: "Soft-pad or needle core gripper", why: "Sand cores are fragile; spread the grip over a large area." },
  { when: /\b(cable|cables|harness|harnesses)\b/, pick: "Cable gripper with guide fingers", why: "Flexible cables are held near the end and guided so they do not tangle." },
];

/** Vision by how parts arrive and what must be checked. All matches apply. */
export const VISION_RULES: Rule[] = [
  { when: /\b(random|jumbled|loose|bulk|bin pick|bin-pick|pile|heap|mixed orientation)\b/, pick: "3D vision for bin picking", why: "Parts in random orientation need a 3D camera to find each pick pose." },
  { when: /\b(moving conveyor|on the move|conveyor tracking|while moving|continuous conveyor)\b/, pick: "Conveyor tracking with encoder + 2D camera", why: "The robot follows the belt so the line never stops." },
  { when: /\b(inspect|inspection|defect|crack|scratch|quality check|verify|verification)\b/, pick: "2D inspection camera with controlled lighting", why: "Consistent lighting makes defect detection repeatable." },
  { when: /\b(measure|measurement|dimension|gauge|gauging|tolerance|flatness)\b/, pick: "Laser profiler / 3D measurement sensor", why: "Dimensional checks need calibrated 3D data, not just an image." },
  { when: /\b(barcode|qr|datamatrix|serial|traceability|label check)\b/, pick: "Fixed code reader / OCR camera", why: "Every part is read and logged for traceability." },
  { when: /\b(variant|variants|different sizes|mixed|high mix|many parts)\b/, pick: "2D camera for part recognition and offset", why: "The robot identifies the variant and corrects its path automatically." },
  { when: /\b(colou?r (grading|sorting|check|inspection)|by colou?r|shade|shades|ripeness|ripe)\b/, pick: "Colour camera with calibrated lighting", why: "Colour grading needs a colour camera and stable, calibrated light." },
  { when: /\b(shiny|reflective|chrome|mirror|transparent|clear plastic)\b/, pick: "Dome or polarised lighting for shiny and transparent parts", why: "Reflections and see-through parts fool standard lighting." },
  { when: /\b(recycling|waste sorting|waste stream|plastic sorting|polymer type|material type)\b/, pick: "NIR / hyperspectral camera with AI classification", why: "Materials that look alike are told apart by their spectrum." },
  { when: /\b(foreign body|foreign bodies|contamination|internal defects?|porosity)\b/, pick: "X-ray inspection", why: "Defects inside the part or pack are invisible to normal cameras." },
  { when: /\b(date codes?|expiry|lot codes?|batch codes?|print quality|ocr)\b/, pick: "OCR / OCV camera for printed codes", why: "Every printed code is read and checked against the batch record." },
  { when: /\b(hot spots?|thermal camera|temperature check|thermograph\w*)\b/, pick: "Thermal (IR) camera", why: "Heat patterns reveal bad joints, seals and electrical faults." },
  { when: /\b(bead|seam|seams)\s+(inspection|check|checking)\b|\b(inspect|check)\s+the\s+(bead|seam|seams)\b/, pick: "3D laser bead inspection sensor", why: "Bead width, height and gaps are measured in 3D along the whole path." },
  { when: /\b(irregular|deformable|natural products?|organic shapes?|every piece is different|deep learning|ai vision)\b/, pick: "Deep-learning vision trained on real samples", why: "Natural, variable products cannot be described by fixed rules; a trained model handles the variation." },
];

/** Robot type beyond the standard 6-axis arm. First match wins. */
export const ROBOT_TYPE_RULES: Rule[] = [
  { when: /\b(\d{3,}\s*(kg|kgs)|heavy|ton|tons|tonne|engine block|die)\b/, pick: "Heavy-payload robot (165–1000 kg) or gantry", why: "Large loads need a heavy-duty arm or a gantry for rigidity and safety." },
  { when: /\b(long|track|large area|several machines|many machines|\d{2,}\s*m long|7th axis)\b/, pick: "6-axis robot on a floor track (7th axis) or overhead gantry", why: "One robot can serve several machines spread along a line." },
  { when: /\b(pick and place|pick & place|sorting|sort)\b.*\b(small|light|tablet|chocolate|candy|sachet|pouch)\b|\b(small|light)\b.*\b(pick and place|sorting)\b/, pick: "Delta robot (high-speed picker)", why: "Light products at very high rates are picked fastest by a delta robot." },
  { when: /\b(screw|insert|assembly|assemble)\b.*\b(small|pcb|electronic|precision)\b|\b(small|pcb|electronic|precision)\b.*\b(screw|insert|assembly|assemble)\b/, pick: "SCARA robot", why: "SCARA is fast and rigid for vertical insertion and screwing of small parts." },
  { when: /\b(mobile manipulator|(cobot|robot|arm) on (an )?(amr|agv|mobile robot))\b/, pick: "Mobile manipulator (cobot on an AMR)", why: "One robot drives between machines and tends each in turn, with docking markers for accuracy." },
  { when: /\b(warehouse|move pallets|between machines|intralogistics|agv|amr|mobile)\b/, pick: "AMR / AGV (autonomous mobile robot) for transport", why: "Material moves between areas without fixed conveyors." },
  { when: /\b(cobot|collaborative|alongside|next to (the )?operator|small batch|low volume)\b/, pick: "Collaborative robot (cobot)", why: "Works next to people without full fencing; quick to redeploy for small batches." },
  { when: /\b(dual arm|dual-arm|two arms|two-armed|bimanual|both hands)\b/, pick: "Dual-arm robot", why: "Two arms hold and work on a part together, like a person at a bench." },
  { when: /\b(wafer|wafers|semiconductor|clean ?room|iso class [1-5])\b/, pick: "Cleanroom-rated SCARA or wafer-transfer robot", why: "Sealed, low-particle robots keep the cleanroom class." },
  { when: /\b(aircraft|fuselage|shipbuilding|ship hull|wind blade|rotor blade|large structures?)\b/, pick: "Gantry robot or 6-axis robot on a long track", why: "Very large parts stay put while the robot travels along them." },
  { when: /\b(lab|laboratory|benchtop|bench top|pipett\w*|microplates?)\b/, pick: "Benchtop lab robot or small cobot", why: "Light labware is handled on the bench, next to instruments and people." },
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
  { when: /\b(construction|concrete|building|cement(?! plant| packer| packing| bags?\b)|precast|3d print)\b/, industry: "Construction", notes: ["Printable mortar mix design and open time", "Site-level gantry or robot on track", "Weather protection and levelling"], standards: ["IS 456 structural concrete basis", "Site safety plan"] },
  { when: /\b(aerospace|aircraft|airframe|fuselage|aircraft wings?|helicopter)\b/, industry: "Aerospace", notes: ["Large parts: robots on tracks or gantries, with laser-tracker calibration", "Drilling and fastening accuracy of ±0.1–0.2 mm needs secondary encoders or vision correction", "Full traceability of every hole, fastener and ply"], standards: ["AS9100 quality management", "NADCAP special processes"] },
  { when: /\b(farming|agri\w*|greenhouse|harvest\w*|crop|crops|milking|dairy farms?|orchards?)\b/, industry: "Agriculture", notes: ["Dust-, water- and UV-resistant equipment (IP65 or better)", "Soft handling and vision trained on natural variation", "Plan for seasonal use and simple maintenance"], standards: ["ISO 18497 (safety of highly automated agricultural machines)", "ISO 25119 (agricultural control system safety)"] },
  { when: /\b(sheet metal|fabrication|press brake|structural steel|shipbuild\w*|steel structure|girder)\b/, industry: "Metal fabrication", notes: ["Part fit-up and cutting accuracy decide weld robot success", "Offline programming from CAD for one-off and small batches", "Positioners and tracks for large weldments"], standards: ["ISO 3834 (welding quality requirements)", "EN 1090 / IS 800 for structural steel"] },
  { when: /\b(injection mo\w*|moulding|molding|extrusion line|extruder|blow mo\w*|thermoform\w*|plastic parts|rubber parts)\b/, industry: "Plastics & rubber", notes: ["Robot interface to the moulding machine (Euromap 67 / 79 or SPI)", "Fast, light end-of-arm tooling to fit the mould-open time", "Degating, sprue removal and cooling conveyors in the cell"], standards: ["ISO 20430 (injection moulding machine safety)", "Euromap 67 / 79 robot interface"] },
  { when: /\b(lithium|battery|batteries|battery pack|ev battery|cell stack\w*|gigafactory)\b/, industry: "Battery & EV", notes: ["Insulated tools and live-part protection for modules and packs", "Dry-room and fire-safety design (thermal runaway detection, suppression)", "Cell-level traceability through stacking, welding and testing"], standards: ["IEC 62619 (industrial lithium battery safety)", "UN 38.3 (lithium battery transport tests)"] },
  { when: /\b(wood|timber|furniture|mdf|plywood|particle board|edge band\w*)\b/, industry: "Woodworking & furniture", notes: ["Wood dust extraction and ATEX zoning for fine dust", "Vacuum frames for panels; needles for rough timber", "Batch-size-one production driven by panel barcodes"], standards: ["ISO 19085 (woodworking machine safety)"] },
  { when: /\b(recycling|waste sorting|waste stream|municipal waste|scrap sorting|e-?waste|material recovery)\b/, industry: "Recycling & waste", notes: ["Heavy-duty grippers and robots protected against dirt and impacts", "NIR / AI vision trained on the actual waste stream", "Easy-clean design and frequent gripper maintenance"], standards: ["E-Waste (Management) Rules, 2022", "Solid Waste Management Rules, 2016"] },
  { when: /\b(textile|textiles|garment|garments|apparel|sewing|fabric|fabrics)\b/, industry: "Textile & apparel", notes: ["Limp materials need needle or electro-adhesive grippers", "Ply separation is the hard step: test it first", "Vision for pattern matching and seam guiding"], standards: ["ISO 10821 (industrial sewing machine safety)"] },
  { when: /\b(lab|laboratory|laboratories|pathology|diagnostic|sample tubes?|microplates?|pipett\w*)\b/, industry: "Laboratory automation", notes: ["Standard labware formats (SBS microplates, tube racks)", "LIMS integration and full sample traceability", "Enclosures for biosafety where samples are infectious"], standards: ["ISO 15189 (medical laboratories)", "IEC 61010-1 (laboratory equipment safety)"] },
  { when: /\b(silicon wafers?|wafer handling|semiconductor|foup|solar|photovoltaic|pv module\w*)\b/, industry: "Semiconductor & solar", notes: ["Cleanroom-class robots and low-particle grippers", "Wafer and cell breakage tracking", "Tool interfaces to SEMI standards"], standards: ["ISO 14644-1 (cleanroom classes)", "SEMI S2 (equipment safety)", "SEMI E84 (load port hand-off)"] },
  { when: /\b(kitchen|restaurant|fryer|frying|burger|pizza|noodle|food service|cafeteria)\b/, industry: "Food service", notes: ["Food-safe robot covers and easy-clean tools", "Guarding around hot oil and griddles", "Integration with order systems (POS)"], standards: ["FSSAI food safety for food business operators", "IEC 60335-2-37 (commercial fryer safety)"] },
];

const MORE_INDUSTRY_RULES: IndustryNote[] = [
  { when: /\b(granite|marble|quartz|stone slabs?|natural stone|countertops?)\b/, industry: "Stone & granite", notes: ["Wet processes: IP67 robot, water-fed tools and slurry drainage", "Silica dust: wet cutting and extraction, no dry grinding near people", "Heavy slabs: vacuum lifters with a reserve tank and edge sensors; never stand under a lifted slab"], standards: ["IS 14223 (polished granite slabs) for finish acceptance", "Silica exposure limits under the Factories Act"] },
  { when: /\b(spinning|yarn|bobbins?|cone winding|ring frames?|weaving|looms?|textile mills?)\b/, industry: "Textile mills", notes: ["Lint and fibre fly: covered robots and regular cleaning", "Gentle handling of yarn packages; no snagging edges", "AGVs or AMRs between ring frames, winders and packing"], standards: ["ISO 3691-4 (AGV / AMR safety)"] },
  { when: /\b(cement plant|cement packer|rotary packer|packing plant|clinker|fibc|bulk bags?)\b/, industry: "Cement & bulk materials", notes: ["Very dusty: IP67 robot and a pressurised or cooled cabinet", "One robot keeps pace with one rotary packer (thousands of bags an hour)", "Bag magazines for 20–30 minutes of autonomy"], standards: ["Legal Metrology (Packaged Commodities) Rules for bag weight"] },
  { when: /\b(steel plant|steel melt\w*|eaf|electric arc furnace|converter|tundish|molten steel|blast furnace)\b/, industry: "Steel plants", notes: ["Radiant heat and splash: heat shields and a cooled jacket; park the robot outside the hot zone", "Automatic magazines for probes and consumables", "Interlocks with furnace tilt and crane movements"], standards: ["ISO 10218-2 risk assessment for hot-metal zones"] },
];
export const GENERAL_STANDARDS = ["ISO 10218-1/-2 (industrial robot safety)", "ISO 13849-1 (safety control systems)", "ISO 12100 (risk assessment)", "IEC 60204-1 (machine electrical)"];

export const matchFirst = (rules: Rule[], text: string) => rules.find((r) => r.when.test(text)) ?? null;
export const matchAll = (rules: Rule[], text: string) => rules.filter((r) => r.when.test(text));

// Stone, textile mills, cement and steel plants: industries around RobotVerse's first customers.
INDUSTRY_RULES.push(...MORE_INDUSTRY_RULES);
