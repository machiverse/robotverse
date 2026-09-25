// RobotVerse Directory — reference data for robot types, tools & equipment,
// OEM manufacturers and training programs. Modelled on the RoboDK library
// structure (item type → brand → key specs) so buyers can browse the whole
// automation ecosystem and send an enquiry to support@robotverse.in.

export type DirectorySection = "robot-types" | "tools" | "oems" | "training";

export interface DirectoryItem {
  id: string;
  section: DirectorySection;
  name: string;
  category: string;
  description: string;
  tags: string[];
  // Optional spec hints shown on cards (robot types / tools)
  specs?: { label: string; value: string }[];
  // OEM / training specific
  country?: string;
  brands?: string[];
  mode?: "Online" | "Classroom" | "Online + Classroom";
  location?: string;
}

export const DIRECTORY_SECTIONS: { id: DirectorySection; label: string; description: string }[] = [
  { id: "robot-types", label: "Robot Types", description: "Industrial, collaborative, SCARA, delta, mobile and more" },
  { id: "tools", label: "Tools & Equipment", description: "Grippers, welding torches, spindles, rails, positioners, vision" },
  { id: "oems", label: "OEMs & Brands", description: "Robot manufacturers and their product families" },
  { id: "training", label: "Training Programs", description: "OEM academies and robotics training institutes" },
];

export const ROBOT_TYPES: DirectoryItem[] = [
  {
    id: "articulated-6-axis",
    section: "robot-types",
    name: "6-Axis Articulated Robot",
    category: "Industrial",
    description: "The workhorse of factory automation. Six rotary joints give full position and orientation control for welding, handling, painting and machining.",
    tags: ["Welding", "Material Handling", "Machine Tending", "Painting"],
    specs: [
      { label: "Axes", value: "6" },
      { label: "Payload", value: "3 – 2,300 kg" },
      { label: "Reach", value: "0.5 – 4.7 m" },
    ],
    brands: ["FANUC", "ABB", "KUKA", "Yaskawa", "Kawasaki", "Nachi"],
  },
  {
    id: "collaborative",
    section: "robot-types",
    name: "Collaborative Robot (Cobot)",
    category: "Collaborative",
    description: "Force-limited robots designed to work alongside people without fencing. Fast to deploy and easy to program by hand-guiding.",
    tags: ["Assembly", "Screwdriving", "Palletizing", "Inspection"],
    specs: [
      { label: "Axes", value: "6 – 7" },
      { label: "Payload", value: "3 – 35 kg" },
      { label: "Reach", value: "0.5 – 1.8 m" },
    ],
    brands: ["Universal Robots", "FANUC CRX", "ABB GoFa", "Doosan", "Techman", "KUKA LBR"],
  },
  {
    id: "scara",
    section: "robot-types",
    name: "SCARA Robot",
    category: "Industrial",
    description: "Selective Compliance Assembly Robot Arm — very fast, rigid in Z, ideal for pick-and-place, assembly and dispensing on a flat work area.",
    tags: ["Pick & Place", "Assembly", "Dispensing", "Electronics"],
    specs: [
      { label: "Axes", value: "4" },
      { label: "Payload", value: "1 – 50 kg" },
      { label: "Reach", value: "0.2 – 1.2 m" },
    ],
    brands: ["Epson", "Yamaha", "DENSO", "Stäubli", "Omron"],
  },
  {
    id: "delta",
    section: "robot-types",
    name: "Delta / Parallel Robot",
    category: "Industrial",
    description: "Lightweight parallel-link arms for ultra-high-speed picking from conveyors. Common in food, pharma and packaging lines.",
    tags: ["High-Speed Picking", "Packaging", "Food", "Pharma"],
    specs: [
      { label: "Axes", value: "3 – 6" },
      { label: "Payload", value: "0.5 – 15 kg" },
      { label: "Speed", value: "Up to 200+ picks/min" },
    ],
    brands: ["ABB FlexPicker", "FANUC M-series", "Codian", "Omron"],
  },
  {
    id: "palletizing",
    section: "robot-types",
    name: "Palletizing Robot",
    category: "Industrial",
    description: "4- or 5-axis heavy arms optimised for stacking bags, boxes and crates at the end of line.",
    tags: ["Palletizing", "Depalletizing", "Logistics"],
    specs: [
      { label: "Axes", value: "4 – 5" },
      { label: "Payload", value: "40 – 1,500 kg" },
      { label: "Reach", value: "2.0 – 3.5 m" },
    ],
    brands: ["FANUC", "KUKA", "Yaskawa", "ABB", "Kawasaki"],
  },
  {
    id: "cartesian-gantry",
    section: "robot-types",
    name: "Cartesian / Gantry Robot",
    category: "Industrial",
    description: "Linear X-Y-Z axes on a frame. Simple, precise and scalable to very large work envelopes.",
    tags: ["Machine Loading", "Dispensing", "3D Printing", "Large Parts"],
    specs: [
      { label: "Axes", value: "2 – 4" },
      { label: "Payload", value: "Up to several tonnes" },
      { label: "Stroke", value: "Custom" },
    ],
  },
  {
    id: "painting",
    section: "robot-types",
    name: "Painting Robot",
    category: "Industrial",
    description: "Explosion-proof, hollow-wrist robots for spray painting and coating in automotive and general industry.",
    tags: ["Painting", "Coating", "Sealing"],
    specs: [
      { label: "Axes", value: "6 – 7" },
      { label: "Protection", value: "ATEX / Ex rated" },
    ],
    brands: ["ABB", "FANUC", "Yaskawa", "Dürr", "Kawasaki"],
  },
  {
    id: "welding",
    section: "robot-types",
    name: "Arc & Spot Welding Robot",
    category: "Industrial",
    description: "Robots with integrated torch cabling or servo spot guns for MIG/MAG, TIG and resistance spot welding.",
    tags: ["Arc Welding", "Spot Welding", "Automotive"],
    specs: [
      { label: "Axes", value: "6" },
      { label: "Payload", value: "6 – 350 kg" },
    ],
    brands: ["FANUC ARC Mate", "Yaskawa AR", "Panasonic", "OTC Daihen", "KUKA"],
  },
  {
    id: "amr-agv",
    section: "robot-types",
    name: "Mobile Robot (AMR / AGV)",
    category: "Mobile",
    description: "Autonomous mobile robots and guided vehicles for intralogistics, and mobile manipulators combining an AMR with a cobot arm.",
    tags: ["Intralogistics", "Warehouse", "Mobile Manipulation"],
    specs: [
      { label: "Payload", value: "50 – 1,500 kg" },
      { label: "Navigation", value: "LiDAR / QR / Magnetic" },
    ],
    brands: ["MiR", "OMRON", "KUKA", "Addverb", "GreyOrange"],
  },
  {
    id: "dual-arm",
    section: "robot-types",
    name: "Dual-Arm Robot",
    category: "Collaborative",
    description: "Two coordinated arms for human-like assembly of small parts and lab automation.",
    tags: ["Small Parts Assembly", "Lab Automation"],
    specs: [{ label: "Axes", value: "14 – 15" }],
    brands: ["ABB YuMi", "Yaskawa", "Kawasaki duAro"],
  },
];

export const TOOLS: DirectoryItem[] = [
  {
    id: "vacuum-gripper",
    section: "tools",
    name: "Vacuum Gripper",
    category: "Gripper",
    description: "Suction cups or foam pads with ejectors/pumps for boxes, sheet metal, glass and bags.",
    tags: ["Palletizing", "Packaging", "Sheet Handling"],
    brands: ["Schmalz", "Piab", "SMC", "Festo"],
  },
  {
    id: "pneumatic-gripper",
    section: "tools",
    name: "Pneumatic Parallel / Angular Gripper",
    category: "Gripper",
    description: "Robust, low-cost jaw grippers driven by compressed air for machine tending and part handling.",
    tags: ["Machine Tending", "Assembly"],
    brands: ["SCHUNK", "Festo", "SMC", "Zimmer"],
  },
  {
    id: "electric-gripper",
    section: "tools",
    name: "Electric / Servo Gripper",
    category: "Gripper",
    description: "Programmable stroke and force, plug-and-play with most cobots.",
    tags: ["Cobots", "Precision Handling"],
    brands: ["Robotiq", "OnRobot", "SCHUNK", "Zimmer"],
  },
  {
    id: "magnetic-gripper",
    section: "tools",
    name: "Magnetic Gripper",
    category: "Gripper",
    description: "Electro- or permanent magnet grippers for ferrous sheet and plate handling.",
    tags: ["Sheet Metal", "Press Line"],
  },
  {
    id: "tool-changer",
    section: "tools",
    name: "Automatic Tool Changer",
    category: "End-of-Arm Tooling",
    description: "Quick-change master/tool plates with pneumatic and electrical pass-through for multi-process cells.",
    tags: ["Flexible Cells", "Multi-Tool"],
    brands: ["ATI", "Stäubli", "SCHUNK"],
  },
  {
    id: "welding-torch",
    section: "tools",
    name: "Welding Torch & Power Source",
    category: "Welding",
    description: "MIG/MAG and TIG torches, wire feeders, torch cleaning stations and robot-interfaced welding power sources.",
    tags: ["Arc Welding"],
    brands: ["Fronius", "Lincoln Electric", "ESAB", "Binzel"],
  },
  {
    id: "spot-gun",
    section: "tools",
    name: "Spot Welding Gun",
    category: "Welding",
    description: "Servo or pneumatic C- and X-type resistance welding guns for body-in-white.",
    tags: ["Spot Welding", "Automotive"],
  },
  {
    id: "spindle",
    section: "tools",
    name: "Milling / Deburring Spindle",
    category: "Machining",
    description: "High-speed spindles and compliant deburring tools for robotic machining, trimming and finishing.",
    tags: ["Machining", "Deburring", "Polishing"],
  },
  {
    id: "dispensing",
    section: "tools",
    name: "Dispensing & Sealing System",
    category: "Process",
    description: "Glue, sealant and bead dispensing guns with metering units.",
    tags: ["Dispensing", "Sealing", "Bonding"],
  },
  {
    id: "spray-gun",
    section: "tools",
    name: "Paint Spray Gun / Rotary Bell",
    category: "Process",
    description: "Air, airless and electrostatic rotary bell atomisers for robotic painting.",
    tags: ["Painting", "Coating"],
  },
  {
    id: "linear-rail",
    section: "tools",
    name: "Linear Track (7th Axis)",
    category: "External Axis",
    description: "Floor or overhead rails that extend robot reach across multiple machines.",
    tags: ["Machine Tending", "Large Workpieces"],
    specs: [{ label: "Length", value: "2 – 30+ m" }],
  },
  {
    id: "positioner",
    section: "tools",
    name: "Turntable / Welding Positioner",
    category: "External Axis",
    description: "1-, 2- and 3-axis servo positioners coordinated with the robot controller.",
    tags: ["Welding", "Coordinated Motion"],
  },
  {
    id: "vision",
    section: "tools",
    name: "2D / 3D Vision System",
    category: "Sensors",
    description: "Cameras and 3D scanners for part location, bin picking, inspection and seam tracking.",
    tags: ["Bin Picking", "Inspection", "Guidance"],
    brands: ["Cognex", "Keyence", "SICK", "Photoneo", "Zivid"],
  },
  {
    id: "force-torque",
    section: "tools",
    name: "Force / Torque Sensor",
    category: "Sensors",
    description: "6-axis F/T sensors for polishing, assembly insertion and hand-guiding.",
    tags: ["Assembly", "Finishing"],
    brands: ["ATI", "Robotiq", "OnRobot"],
  },
  {
    id: "safety",
    section: "tools",
    name: "Safety Scanner, Light Curtain & Fencing",
    category: "Safety",
    description: "Area scanners, light curtains, interlocks and guarding to build a compliant robot cell.",
    tags: ["Cell Safety", "ISO 10218"],
    brands: ["SICK", "Pilz", "Keyence", "Omron"],
  },
  {
    id: "olp-software",
    section: "tools",
    name: "Simulation & Offline Programming Software",
    category: "Software",
    description: "Simulate cells and generate robot programs offline for any brand.",
    tags: ["OLP", "Simulation", "Digital Twin"],
    brands: ["RoboDK", "FANUC ROBOGUIDE", "ABB RobotStudio", "KUKA.Sim"],
  },
];

export const OEMS: DirectoryItem[] = [
  { id: "fanuc", section: "oems", name: "FANUC", category: "Industrial & Collaborative", country: "Japan", description: "One of the largest industrial robot makers. LR Mate, M-series, R-2000, ARC Mate and CRX cobots.", tags: ["Articulated", "Cobots", "Delta", "Palletizing", "Welding"] },
  { id: "abb", section: "oems", name: "ABB Robotics", category: "Industrial & Collaborative", country: "Switzerland / Sweden", description: "IRB articulated range, FlexPicker delta, YuMi and GoFa/SWIFTI cobots, RobotStudio.", tags: ["Articulated", "Cobots", "Delta", "Painting"] },
  { id: "kuka", section: "oems", name: "KUKA", category: "Industrial & Collaborative", country: "Germany", description: "KR AGILUS, KR QUANTEC, KR FORTEC heavy payload robots and LBR iiwa sensitive cobot.", tags: ["Articulated", "Heavy Payload", "Cobots", "Mobile"] },
  { id: "yaskawa", section: "oems", name: "Yaskawa Motoman", category: "Industrial & Collaborative", country: "Japan", description: "GP handling, AR arc welding, MPL palletizing and HC/HC-DT cobots.", tags: ["Articulated", "Welding", "Palletizing", "Cobots"] },
  { id: "kawasaki", section: "oems", name: "Kawasaki Robotics", category: "Industrial", country: "Japan", description: "RS, BX, CX and MX series, duAro dual-arm SCARA.", tags: ["Articulated", "Heavy Payload", "Dual-Arm"] },
  { id: "nachi", section: "oems", name: "Nachi", category: "Industrial", country: "Japan", description: "MZ high-speed and SRA series articulated robots.", tags: ["Articulated", "Spot Welding"] },
  { id: "universal-robots", section: "oems", name: "Universal Robots", category: "Collaborative", country: "Denmark", description: "UR3e, UR5e, UR10e, UR16e, UR20 and UR30 cobots with a large UR+ accessory ecosystem.", tags: ["Cobots"] },
  { id: "staubli", section: "oems", name: "Stäubli", category: "Industrial & Collaborative", country: "Switzerland", description: "TX2 6-axis, TS2 SCARA and cleanroom/stericlean robots.", tags: ["Articulated", "SCARA", "Cleanroom"] },
  { id: "epson", section: "oems", name: "Epson Robots", category: "Industrial", country: "Japan", description: "Market leader in SCARA robots; also compact 6-axis C and VT series.", tags: ["SCARA", "Articulated"] },
  { id: "denso", section: "oems", name: "DENSO Robotics", category: "Industrial", country: "Japan", description: "Compact 4- and 6-axis robots for small-parts assembly.", tags: ["SCARA", "Articulated"] },
  { id: "mitsubishi", section: "oems", name: "Mitsubishi Electric", category: "Industrial", country: "Japan", description: "MELFA RV articulated and RH SCARA robots.", tags: ["SCARA", "Articulated"] },
  { id: "omron", section: "oems", name: "OMRON", category: "Industrial & Mobile", country: "Japan", description: "SCARA, delta, TM cobots and LD/HD mobile robots.", tags: ["SCARA", "Delta", "Cobots", "Mobile"] },
  { id: "doosan", section: "oems", name: "Doosan Robotics", category: "Collaborative", country: "South Korea", description: "M, H, A and E-series cobots.", tags: ["Cobots"] },
  { id: "techman", section: "oems", name: "Techman Robot", category: "Collaborative", country: "Taiwan", description: "TM cobots with built-in vision.", tags: ["Cobots", "Vision"] },
  { id: "estun", section: "oems", name: "Estun", category: "Industrial", country: "China", description: "Cost-competitive articulated, SCARA and palletizing robots.", tags: ["Articulated", "Palletizing"] },
  { id: "panasonic", section: "oems", name: "Panasonic", category: "Welding", country: "Japan", description: "TAWERS integrated arc welding robots.", tags: ["Welding"] },
  { id: "comau", section: "oems", name: "Comau", category: "Industrial", country: "Italy", description: "NJ, Smart5 and Racer articulated robots, automotive body lines.", tags: ["Articulated", "Automotive"] },
  { id: "hyundai", section: "oems", name: "HD Hyundai Robotics", category: "Industrial", country: "South Korea", description: "HS/HX articulated robots and cobots.", tags: ["Articulated", "Cobots"] },
];

// Training programs. Details change often — the enquiry form lets RobotVerse
// confirm current batches, fees and locations with the provider.
export const TRAINING: DirectoryItem[] = [
  { id: "fanuc-academy", section: "training", name: "FANUC Robot Training", category: "OEM Academy", description: "Operator, programming (TP), maintenance and ROBOGUIDE courses on FANUC controllers.", tags: ["Programming", "Maintenance", "Certification"], brands: ["FANUC"], mode: "Online + Classroom", location: "India & global" },
  { id: "abb-university", section: "training", name: "ABB Robotics Training", category: "OEM Academy", description: "IRC5 / OmniCore programming, RobotStudio and service courses.", tags: ["Programming", "RobotStudio", "Service"], brands: ["ABB"], mode: "Online + Classroom", location: "India & global" },
  { id: "kuka-college", section: "training", name: "KUKA College", category: "OEM Academy", description: "KRC4/KRC5 operating, programming, electrical maintenance and KUKA.Sim.", tags: ["Programming", "Maintenance"], brands: ["KUKA"], mode: "Online + Classroom", location: "India & global" },
  { id: "yaskawa-academy", section: "training", name: "Yaskawa Robotics Training", category: "OEM Academy", description: "Motoman programming, welding applications and maintenance.", tags: ["Programming", "Welding"], brands: ["Yaskawa"], mode: "Classroom", location: "India & global" },
  { id: "ur-academy", section: "training", name: "Universal Robots Academy", category: "OEM Academy", description: "Free online e-learning modules plus certified in-person cobot training.", tags: ["Cobots", "Free Online"], brands: ["Universal Robots"], mode: "Online + Classroom", location: "Global" },
  { id: "robodk-training", section: "training", name: "Offline Programming & Simulation", category: "Software Training", description: "Simulation, offline programming and post-processor training for multi-brand cells.", tags: ["OLP", "Simulation", "RoboDK"], mode: "Online", location: "Global" },
  { id: "welding-robotics", section: "training", name: "Robotic Welding Program", category: "Application Training", description: "Hands-on arc and spot welding robot programming, torch setup and weld quality.", tags: ["Welding", "Hands-on"], mode: "Classroom", location: "India" },
  { id: "plc-robotics", section: "training", name: "PLC + Robot Integration", category: "Application Training", description: "Robot–PLC communication, I/O, fieldbus and cell safety for integrators.", tags: ["PLC", "Integration", "Safety"], mode: "Online + Classroom", location: "India" },
  { id: "maintenance-program", section: "training", name: "Robot Maintenance & Troubleshooting", category: "Service Training", description: "Preventive maintenance, mastering/calibration, alarms and spare replacement for used robots.", tags: ["Maintenance", "Used Robots"], mode: "Classroom", location: "India" },
  { id: "institute-partner", section: "training", name: "Institute & College Programs", category: "Institute", description: "Engineering colleges, polytechnics and skill centres offering robotics & automation certificates.", tags: ["Students", "Certification", "Skill Development"], mode: "Classroom", location: "India" },
];

export const DIRECTORY_ITEMS: Record<DirectorySection, DirectoryItem[]> = {
  "robot-types": ROBOT_TYPES,
  tools: TOOLS,
  oems: OEMS,
  training: TRAINING,
};

export const ENQUIRY_INTERESTS = [
  "Buying a robot",
  "Selling a robot",
  "Tools & equipment",
  "OEM / brand partnership",
  "Training program",
  "List my company / institute",
  "Service & support",
  "Other",
] as const;
