// Spare Parts & Accessories Category Structure
export const SPARE_PARTS_CATEGORIES = {
  "Controllers & Electronic Units": [
    "Main Robot Controller",
    "Servo Drives and Amplifiers",
    "I/O Modules",
    "Power Supply Units",
    "Communication Modules",
    "CPU Boards and Memory Cards",
    "Interface Panels and Operator Displays",
  ],
  "Motors & Motion Components": [
    "Servo Motors",
    "Gearboxes and Reducers",
    "Encoders and Pulse Coders",
    "Brakes and Couplings",
    "Harmonic Drives",
    "Linear and Rotary Actuators",
    "Balancers and Counterweights",
  ],
  "Cables & Harness Assemblies": [
    "Power Cables",
    "Encoder and Feedback Cables",
    "Teach Pendant Cable",
    "Signal and Communication Harness",
    "Internal Arm Cables",
    "Grounding and Extension Cables",
    "High-Flex Robotic Cables",
  ],
  "Teach & Programming Devices": [
    "Teach Pendant",
    "Pendant Holder and Protector",
    "Programming Terminal",
    "Backup and Restore Devices",
    "Interface Adapters",
    "Pendant Control Buttons",
    "HMI Displays",
  ],
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
  ],
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
  ],
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
  ],
  "Stands, Mounting & Enclosures": [
    "Robot Bases and Pedestals",
    "Floor Mounts and Fixtures",
    "Safety Fencing and Enclosures",
    "Control Cabinet Stands",
    "Cable Management Systems",
    "Workcell Frames",
    "Anti-Vibration Mounts",
    "Mobile Platforms",
  ],
  "Other": [],
} as const;

export type MainCategory = keyof typeof SPARE_PARTS_CATEGORIES;
export type SubCategory = typeof SPARE_PARTS_CATEGORIES[MainCategory][number];

// Helper function to get all main categories
export const getMainCategories = (): string[] => {
  return Object.keys(SPARE_PARTS_CATEGORIES);
};

// Helper function to get sub-categories for a main category
export const getSubCategories = (mainCategory: string): readonly string[] => {
  return SPARE_PARTS_CATEGORIES[mainCategory as MainCategory] || [];
};
