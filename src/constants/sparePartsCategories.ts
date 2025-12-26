// Spare Parts Category Structure - Robotverse
// 4 Main Sub-Menus: Robot Parts, Devices, Tools, Software

export const SPARE_PARTS_MENU = {
  "Robot Parts": {
    description: "Core robot hardware, motion components, electrical parts, power systems, mechanical spares, cabling, and structural items",
    icon: "Cpu",
    categories: {
      "Controllers & Drives": [
        "Main Robot Controller",
        "Servo Drives and Amplifiers",
        "I/O Modules",
        "Power Supply Units",
        "Communication Modules",
        "CPU Boards and Memory Cards",
        "PLC Modules and Cards",
        "I/O Expansion Modules",
        "Relay Modules and Contactors",
        "Frequency Converters / VFDs",
        "Logic Processors",
        "Safety PLC Modules",
        "Motion Control Processors",
        "Real-Time Control Modules",
        "Distributed Control Components",
      ],
      "Motors & Gearboxes": [
        "Servo Motors",
        "Gearboxes and Reducers",
        "Encoders and Pulse Coders",
        "Brakes and Couplings",
        "Harmonic Drives",
        "Linear and Rotary Actuators",
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
      ],
      "Robot Arms & Motion": [
        "Arm Segments and Links",
        "Wrist Assemblies",
        "Joint Components (Shoulder/Elbow/Wrist)",
        "Arm Covers and Protective Shells",
        "Mounting Flanges and Brackets",
        "Axis Blocks and Bearings",
        "Mechanical Stops and Limiters",
        "Arm Cable Routing Systems",
        "Axis Seals and Bellows",
        "Joint Lubrication Systems",
        "Wheel Assemblies and Wheels",
        "Tracks and Caterpillar Systems",
        "Motor Drives for Mobile Robots",
        "Steering and Direction Control Modules",
        "Motion Encoders and Feedback Sensors",
        "Shock Absorbers and Suspension",
        "Caster and Fixed Wheel Assemblies",
      ],
      "Cabling & Connectivity": [
        "Power Cables",
        "Encoder and Feedback Cables",
        "Teach Pendant Cable",
        "Signal and Communication Harness",
        "Internal Arm Cables",
        "Grounding and Extension Cables",
        "High-Flex Robotic Cables",
        "EtherCAT Communication Modules",
        "Profibus and Profinet Adapters",
        "Modbus Communication Cards",
        "Network Interface Cards",
        "Industrial Ethernet Adapters",
        "Wireless Communication Modules",
        "Gateway and Bridge Modules",
        "Serial Communication Cards (RS-232 / RS-485)",
        "Protocol Conversion Modules",
        "Network Switching Components",
        "IO-Link Masters and Nodes",
      ],
      "Power & Batteries": [
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
      ],
      "Safety & Enclosures": [
        "Safety Enclosure Panels",
        "Protective Covers and Guards",
        "Anti-collision Bumpers and Sensors",
        "Safety Rails and Barriers",
        "Transparent Safety Shields",
        "Robot Bases and Pedestals",
        "Floor Mounts and Fixtures",
        "Safety Fencing and Enclosures",
        "Control Cabinet Stands",
        "Cable Management Systems",
        "Workcell Frames",
        "Anti-Vibration Mounts",
        "Mobile Platforms",
      ],
      "Maintenance Hardware": [
        "Seals and Gaskets",
        "O-Rings and Bearings",
        "Belts and Pulleys",
        "Relays and Contactors",
        "Filters",
        "Cooling Fans",
        "Replacement Covers and Panels",
      ],
    },
  },
  "Devices": {
    description: "Sensors, vision systems, safety electronics, HMIs, operator and interface devices",
    icon: "Monitor",
    categories: {
      "Sensors & Vision": [
        "Proximity Sensors",
        "Limit Sensors",
        "Force and Torque Sensors",
        "Laser Sensors",
        "Light Curtains",
        "Safety Mats",
        "Area Scanners",
        "Emergency Stop Units",
        "Safety Relays",
        "Industrial Vision Cameras",
        "2D / 3D Vision Systems",
        "Lens Assemblies and Focus Mechanisms",
        "Camera Calibration Tools",
        "Image Processing Modules",
        "Vision Lighting Systems (Ring / Coaxial Lights)",
        "Camera Mounts and Brackets",
        "Vision Cable Assemblies",
        "Code Readers and Barcode Scanners",
        "LiDAR Sensors and Scanners",
        "Gyroscopes and Accelerometers",
        "Inertial Measurement Units (IMU)",
        "Odometry Sensors",
      ],
      "HMIs & Teach Devices": [
        "Teach Pendant",
        "Pendant Holder and Protector",
        "Programming Terminal",
        "Backup and Restore Devices",
        "Interface Adapters",
        "Pendant Control Buttons",
        "HMI Displays",
        "Operator Panels",
        "Touchscreen Interfaces",
        "LCD and LED Display Panels",
        "Button and Keypad Modules",
        "Membrane Keypads",
        "Emergency Stop Buttons and Switches",
        "Control Panel Enclosures",
        "Display Mounting Hardware",
        "Industrial Switches and Selectors",
        "Indicator Lights and Beacons",
      ],
      "Safety Devices": [
        "Emergency Stop Devices and Stations",
        "Pressure-Sensitive Safety Mats",
        "Interlocks and Safety Switches",
        "Warning Systems and Beacons",
        "Safety Relay Modules",
      ],
    },
  },
  "Tools": {
    description: "End-of-arm tooling, process tools, consumables, welding, cutting, painting, and maintenance tools",
    icon: "Wrench",
    categories: {
      "Tooling & End Effectors": [
        "Grippers",
        "Vacuum Cups and Ejectors",
        "Drilling Tools",
        "Polishing Tools",
        "Tool Changers",
        "Painting and Spray Guns",
        "Cutting Tools",
        "Laser Heads",
        "Material Handling Attachments",
        "Quick Couplers and Quick-Change Interfaces",
      ],
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
      ],
      "Maintenance Tools": [
        "Maintenance Tool Kits",
        "Grease and Lubricants",
        "Warning Labels",
      ],
    },
  },
  "Software": {
    description: "All digital products, licenses, firmware, configuration tools, and cloud platforms",
    icon: "Code",
    categories: {
      "Programming & Simulation": [
        "Robot Programming Software Licenses",
        "Offline Programming & Simulation Software",
        "Robot Brand-Specific Programming Packages",
        "Robot Simulation and Digital Twin Platforms",
        "Path Planning and Optimization Software",
      ],
      "Monitoring & Diagnostics": [
        "Vision Processing and Image Analysis Software",
        "Robot Fleet Management Software",
        "Robot Monitoring and Diagnostics Tools",
        "Firmware and Controller Software Updates",
      ],
      "Configuration & Safety": [
        "Configuration and Parameterization Tools",
        "Fieldbus and Network Configuration Software",
        "Safety Configuration and Validation Software",
      ],
      "Licenses & Cloud": [
        "Licenses and Activation Keys",
        "Cloud-Based Robot Management Platforms",
      ],
    },
  },
} as const;

// Flatten for backward compatibility
export const SPARE_PARTS_CATEGORIES = (() => {
  const flat: Record<string, readonly string[]> = {};
  
  Object.entries(SPARE_PARTS_MENU).forEach(([_menuName, menuData]) => {
    Object.entries(menuData.categories).forEach(([categoryName, subcategories]) => {
      flat[categoryName] = subcategories;
    });
  });
  
  flat["Other"] = [];
  return flat;
})();

// Types
export type MainMenu = keyof typeof SPARE_PARTS_MENU;
export type MainCategory = keyof typeof SPARE_PARTS_CATEGORIES;
export type SubCategory = string;

// Helper: get all main menus
export const getMainMenus = (): MainMenu[] => {
  return Object.keys(SPARE_PARTS_MENU) as MainMenu[];
};

// Helper: get categories for a main menu
export const getCategoriesForMenu = (menuName: MainMenu): string[] => {
  return Object.keys(SPARE_PARTS_MENU[menuName].categories);
};

// Helper: get sub-categories for a category
export const getSubCategories = (categoryName: string): readonly string[] => {
  return SPARE_PARTS_CATEGORIES[categoryName] || [];
};

// Helper: get menu info
export const getMenuInfo = (menuName: MainMenu) => {
  return SPARE_PARTS_MENU[menuName];
};

// Helper: find which menu a category belongs to
export const findMenuForCategory = (categoryName: string): MainMenu | null => {
  for (const [menuName, menuData] of Object.entries(SPARE_PARTS_MENU)) {
    if (categoryName in menuData.categories) {
      return menuName as MainMenu;
    }
  }
  return null;
};

// Helper: get all main categories
export const getMainCategories = (): string[] => {
  return Object.keys(SPARE_PARTS_CATEGORIES);
};

// Helper: flat list of all subcategories
export const getAllSubCategories = (): string[] => {
  const all: string[] = [];
  Object.values(SPARE_PARTS_CATEGORIES).forEach((subs) => {
    all.push(...subs);
  });
  return all;
};

// Stats helper
export const getCategoryStats = () => {
  const menus = getMainMenus();
  const categories = getMainCategories();
  const subcategories = getAllSubCategories();

  return {
    totalMenus: menus.length,
    totalCategories: categories.length,
    totalSubCategories: subcategories.length,
    menuBreakdown: menus.map(menu => ({
      name: menu,
      categories: getCategoriesForMenu(menu).length,
      subcategories: getCategoriesForMenu(menu).reduce(
        (sum, cat) => sum + getSubCategories(cat).length, 0
      ),
    })),
  };
};