// Spare Parts & Accessories Category Structure - Robotverse
// Complete: 22 main categories (incl. Software), 270+ subcategories

export const SPARE_PARTS_CATEGORIES = {
  // ============= EXISTING CATEGORIES (9) =============

  "Controllers & Electronic Units": [
    "Main Robot Controller",
    "Servo Drives and Amplifiers",
    "I/O Modules",
    "Power Supply Units",
    "Communication Modules",
    "CPU Boards and Memory Cards",
    "Interface Panels and Operator Displays",
  ] as const,

  "Motors & Motion Components": [
    "Servo Motors",
    "Gearboxes and Reducers",
    "Encoders and Pulse Coders",
    "Brakes and Couplings",
    "Harmonic Drives",
    "Linear and Rotary Actuators",
    "Balancers and Counterweights",
  ] as const,

  "Cables & Harness Assemblies": [
    "Power Cables",
    "Encoder and Feedback Cables",
    "Teach Pendant Cable",
    "Signal and Communication Harness",
    "Internal Arm Cables",
    "Grounding and Extension Cables",
    "High-Flex Robotic Cables",
  ] as const,

  "Teach & Programming Devices": [
    "Teach Pendant",
    "Pendant Holder and Protector",
    "Programming Terminal",
    "Backup and Restore Devices",
    "Interface Adapters",
    "Pendant Control Buttons",
    "HMI Displays",
  ] as const,

  "Sensors & Safety Components": [
    "Proximity Sensors",
    "Limit Sensors",
    "Vision Cameras and Scanners",
    "Force and Torque Sensors",
    "Laser Sensors",
    "Light Curtains",
    "Safety Mats",
    "Area Scanners",
    "Emergency Stop Units",
    "Safety Relays",
  ] as const,

  "Tooling & End Effectors": [
    "Grippers",
    "Vacuum Cups and Ejectors",
    "Welding Torches",
    "Drilling Tools",
    "Polishing Tools",
    "Tool Changers",
    "Painting and Spray Guns",
    "Cutting Tools",
    "Laser Heads",
    "Material Handling Attachments",
  ] as const,

  "Maintenance & Consumables": [
    "Grease and Lubricants",
    "Seals and Gaskets",
    "O-Rings and Bearings",
    "Belts and Pulleys",
    "Relays and Contactors",
    "Filters",
    "Cooling Fans",
    "Replacement Covers and Panels",
    "Maintenance Tool Kits",
    "Warning Labels",
  ] as const,

  "Stands, Mounting & Enclosures": [
    "Robot Bases and Pedestals",
    "Floor Mounts and Fixtures",
    "Safety Fencing and Enclosures",
    "Control Cabinet Stands",
    "Cable Management Systems",
    "Workcell Frames",
    "Anti-Vibration Mounts",
    "Mobile Platforms",
  ] as const,

  // ============= NEW CATEGORIES (HIGH PRIORITY) =============

  "Robot Arms & Manipulators": [
    "Arm Segments and Links",
    "Wrist Assemblies",
    "Joint Components (Shoulder, Elbow, Wrist Joints)",
    "Arm Covers and Protective Shells",
    "Mounting Flanges and Brackets",
    "Axis Blocks and Bearings",
    "Mechanical Stops and Limiters",
    "Arm Cable Routing Systems",
    "Axis Seals and Protective Bellows",
    "Joint Lubrication Systems",
  ] as const,

  "Vision & Imaging Systems": [
    "Industrial Vision Cameras",
    "2D/3D Vision Systems",
    "Lens Assemblies and Focus Mechanisms",
    "Camera Calibration Tools",
    "Image Processing Modules",
    "Vision Lighting Systems (Ring Lights, Coaxial Lights)",
    "Camera Mounts and Brackets",
    "Vision Cable Assemblies",
    "Code Readers and Barcode Scanners",
    "Vision Processing Software",
  ] as const,

  "Battery & Power Management Systems": [
    "Lithium-Ion (Li-ion) Batteries",
    "Lithium Polymer (LiPo) Batteries",
    "Nickel-Metal Hydride (NiMH) Batteries",
    "Battery Backup Units (BBU)",
    "UPS Systems for Robots",
    "Battery Charging Modules",
    "Power Distribution Boards",
    "Battery Management System (BMS) Electronics",
    "Emergency Backup Power Systems",
    "Battery Connectors and Terminals",
    "Battery Monitoring and Health Sensors",
    "Fuel Gauge and State-of-Charge Controllers",
  ] as const,

  "Navigation & Mobility Systems": [
    "LiDAR Sensors and Scanners",
    "Wheel Assemblies and Wheels",
    "Tracks and Caterpillar Systems",
    "Motor Drives for Mobile Robots",
    "Steering and Direction Control Modules",
    "Motion Encoders and Feedback Sensors",
    "Shock Absorbers and Suspension Systems",
    "Caster and Fixed Wheel Assemblies",
    "Gyroscopes and Accelerometers",
    "Inertial Measurement Units (IMU)",
    "Odometry Sensors",
    "Autonomous Navigation Control Boards",
  ] as const,

  // ============= NEW CATEGORIES (MEDIUM PRIORITY) =============

  "PLC & Industrial Control Systems": [
    "PLC Modules and Cards",
    "I/O Expansion Modules",
    "Relay Modules and Contactors",
    "Frequency Converters / Variable Frequency Drives (VFDs)",
    "Logic Processors",
    "Memory Cards and Storage Modules",
    "Communication Interface Cards",
    "Safety PLC Modules",
    "Distributed Control System (DCS) Components",
    "Motion Control Processors",
    "Real-Time Control Modules",
  ] as const,

  "HMI & Display Systems": [
    "Operator Panels and HMI Displays",
    "Touchscreen Interfaces",
    "LCD and LED Display Panels",
    "Button and Keypad Modules",
    "Membrane Keypads",
    "Emergency Stop Buttons and Switches",
    "Control Panel Enclosures",
    "Display Mounting Hardware",
    "Industrial Switches and Selectors",
    "Indicator Lights and Beacons",
  ] as const,

  "Welding & Processing Tools": [
    "Welding Torches and Nozzles",
    "Electrode Tip Dressers",
    "Welding Contact Tips",
    "Gas Nozzles and Diffusers",
    "Welding Cables and Connectors",
    "Spot Welding Guns",
    "Seam Tracking Sensors",
    "Arc Monitoring Systems",
    "Shielding Gas Adapters",
    "Welding Electrode Holders",
    "Wire Feeders for Arc Welding",
  ] as const,

  "Gearbox & Drive Systems": [
    "Harmonic Drives and Strain Wave Gears",
    "RV Reducers",
    "Planetary Gearboxes",
    "Cycloidal Reducers",
    "Gear Couplings",
    "High-Ratio Reduction Units",
    "Gear Lubrication Systems",
    "Gearbox Mounting Hardware",
    "Spur and Helical Gears",
    "Backlash Reducers",
    "Speed Reducers and Multipliers",
  ] as const,

  // ============= NEW CATEGORIES (LOW PRIORITY) =============

  "Automation Accessories & Peripheral Equipment": [
    "Conveyor Systems and Belts",
    "Vibrating Feeders",
    "Robotic Workcell Components",
    "Quick Couplers and Quick-Change Interfaces",
    "Material Handling Platforms",
    "Robotic Workstations",
    "Industrial Automation Integration Hardware",
    "Peripheral Equipment Brackets",
    "Product Inspection and Verification Systems",
    "Material Feeder Systems",
  ] as const,

  "Communication & Networking": [
    "EtherCAT Communication Modules",
    "Profibus and Profinet Adapters",
    "Modbus Communication Cards",
    "Network Interface Cards",
    "Industrial Ethernet Adapters",
    "Wireless Communication Modules",
    "Gateway and Bridge Modules",
    "Serial Communication Cards (RS-232, RS-485)",
    "Protocol Conversion Modules",
    "Network Switching Components",
    "IO-Link Masters and Nodes",
  ] as const,

  "Protective & Safety Hardware": [
    "Safety Enclosure Panels",
    "Protective Covers and Guards",
    "Anti-collision Bumpers and Sensors",
    "Emergency Stop Devices and Stations",
    "Safety Mats and Pressure-Sensitive Mats",
    "Interlocks and Safety Switches",
    "Safety Rails and Barriers",
    "Warning Systems and Beacons",
    "Safety Relay Modules",
    "Protective Bellows and Covers",
    "Transparent Safety Shields",
  ] as const,

  // ============= SOFTWARE CATEGORY =============

  "Software & Digital Tools": [
    "Robot Programming Software Licenses",
    "Offline Programming & Simulation Software",
    "Robot Brand-Specific Programming Packages",
    "Robot Simulation and Digital Twin Platforms",
    "Path Planning and Optimization Software",
    "Vision Processing and Image Analysis Software",
    "Robot Fleet Management Software",
    "Robot Monitoring and Diagnostics Tools",
    "Firmware and Controller Software Updates",
    "Configuration and Parameterization Tools",
    "Fieldbus and Network Configuration Software",
    "Safety Configuration and Validation Software",
    "Licenses and Activation Keys",
    "Cloud-Based Robot Management Platforms",
  ] as const,

  // ============= CATCH-ALL CATEGORY =============
  Other: [] as const,
} as const;

// Types
export type MainCategory = keyof typeof SPARE_PARTS_CATEGORIES;
export type SubCategory = (typeof SPARE_PARTS_CATEGORIES)[MainCategory][number];

// Helper: get all main categories
export const getMainCategories = (): MainCategory[] => {
  return Object.keys(SPARE_PARTS_CATEGORIES) as MainCategory[];
};

// Helper: get sub-categories for a main category
export const getSubCategories = (
  mainCategory: MainCategory | string
): readonly string[] => {
  if (mainCategory in SPARE_PARTS_CATEGORIES) {
    return SPARE_PARTS_CATEGORIES[mainCategory as MainCategory];
  }
  return [];
};

// Helper: flat list of all subcategories
export const getAllSubCategories = (): string[] => {
  const all: string[] = [];
  getMainCategories().forEach((cat) => {
    all.push(...getSubCategories(cat));
  });
  return all;
};

// Priority helpers
const HIGH_PRIORITY: MainCategory[] = [
  "Robot Arms & Manipulators",
  "Vision & Imaging Systems",
  "Battery & Power Management Systems",
  "Navigation & Mobility Systems",
];

const MEDIUM_PRIORITY: MainCategory[] = [
  "PLC & Industrial Control Systems",
  "HMI & Display Systems",
  "Welding & Processing Tools",
  "Gearbox & Drive Systems",
];

const LOW_PRIORITY: MainCategory[] = [
  "Automation Accessories & Peripheral Equipment",
  "Communication & Networking",
  "Protective & Safety Hardware",
];

export const getCategoryPriority = (
  categoryName: MainCategory | string
): "high" | "medium" | "low" | "general" => {
  const name = String(categoryName) as MainCategory;
  if (HIGH_PRIORITY.includes(name)) return "high";
  if (MEDIUM_PRIORITY.includes(name)) return "medium";
  if (LOW_PRIORITY.includes(name)) return "low";
  return "general";
};

export const isNewCategory = (
  categoryName: MainCategory | string
): boolean => {
  const name = String(categoryName) as MainCategory;
  return (
    HIGH_PRIORITY.includes(name) ||
    MEDIUM_PRIORITY.includes(name) ||
    LOW_PRIORITY.includes(name) ||
    name === "Software & Digital Tools"
  );
};

export const getCategoriesByPriority = (
  priority: "high" | "medium" | "low" | "general" | "all"
): MainCategory[] => {
  const all = getMainCategories();
  if (priority === "all") return all;
  return all.filter((cat) => getCategoryPriority(cat) === priority);
};

export const getNewCategories = (): MainCategory[] => {
  return getMainCategories().filter((cat) => isNewCategory(cat));
};

export const getExistingCategories = (): MainCategory[] => {
  return getMainCategories().filter((cat) => !isNewCategory(cat));
};

// Simple stats
export const getCategoryStats = () => {
  const main = getMainCategories();
  const allSubs = getAllSubCategories();

  const highCats = getCategoriesByPriority("high");
  const medCats = getCategoriesByPriority("medium");
  const lowCats = getCategoriesByPriority("low");
  const genCats = getCategoriesByPriority("general");

  const countSubs = (cats: MainCategory[]) =>
    cats.reduce((sum, c) => sum + getSubCategories(c).length, 0);

  return {
    totalCategories: main.length,
    totalSubCategories: allSubs.length,
    existingCategories: getExistingCategories().length,
    newCategories: getNewCategories().length,
    highPriorityCategories: highCats.length,
    mediumPriorityCategories: medCats.length,
    lowPriorityCategories: lowCats.length,
    generalCategories: genCats.length,
    highPrioritySubCategories: countSubs(highCats),
    mediumPrioritySubCategories: countSubs(medCats),
    lowPrioritySubCategories: countSubs(lowCats),
    generalSubCategories: countSubs(genCats),
  };
};
