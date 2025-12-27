// Spare Parts Category Structure - Robotverse
// Three-Level Taxonomy: Category > Subcategory > Component Type

export interface ComponentTypeData {
  name: string;
  slug: string;
}

export interface SubcategoryData {
  name: string;
  slug: string;
  componentTypes: ComponentTypeData[];
}

export interface CategoryData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  subcategories: SubcategoryData[];
}

// Helper to create slug from name
const toSlug = (name: string): string => 
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Helper to create component type data
const ct = (name: string): ComponentTypeData => ({
  name,
  slug: toSlug(name),
});

export const SPARE_PARTS_TAXONOMY: CategoryData[] = [
  {
    name: "Robot Parts",
    slug: "robot-parts",
    description: "Core robot hardware, motion components, electrical parts, power systems, and structural items",
    icon: "Cpu",
    subcategories: [
      {
        name: "Controllers & Drives",
        slug: "controllers-drives",
        componentTypes: [
          ct("Main Robot Controller"),
          ct("Servo Drives"),
          ct("Amplifiers"),
          ct("PLC Modules"),
          ct("I/O Modules"),
          ct("Power Supply Units"),
          ct("CPU Boards"),
          ct("Memory Cards"),
          ct("Communication Modules"),
          ct("Safety PLC Modules"),
          ct("Motion Controllers"),
          ct("VFDs"),
          ct("Others"),
        ],
      },
      {
        name: "Motors & Gearboxes",
        slug: "motors-gearboxes",
        componentTypes: [
          ct("Servo Motors"),
          ct("Planetary Gearboxes"),
          ct("Cycloidal Reducers"),
          ct("RV Reducers"),
          ct("Harmonic Drives"),
          ct("Encoders"),
          ct("Brakes"),
          ct("Couplings"),
          ct("Gears"),
          ct("Lubrication Systems"),
          ct("Others"),
        ],
      },
      {
        name: "Robot Arms & Motion",
        slug: "robot-arms-motion",
        componentTypes: [
          ct("Arm Segments"),
          ct("Wrist Assemblies"),
          ct("Joint Components"),
          ct("Bearings"),
          ct("Seals & Bellows"),
          ct("Wheels"),
          ct("Tracks"),
          ct("Shock Absorbers"),
          ct("IMU"),
          ct("Odometry Sensors"),
          ct("Others"),
        ],
      },
      {
        name: "Cabling & Connectivity",
        slug: "cabling-connectivity",
        componentTypes: [
          ct("Power Cables"),
          ct("Encoder Cables"),
          ct("Teach Pendant Cables"),
          ct("High-Flex Cables"),
          ct("EtherCAT"),
          ct("Profinet"),
          ct("Modbus"),
          ct("Network Cards"),
          ct("Gateways"),
          ct("Others"),
        ],
      },
      {
        name: "Power & Batteries",
        slug: "power-batteries",
        componentTypes: [
          ct("Li-Ion Batteries"),
          ct("LiPo Batteries"),
          ct("NiMH Batteries"),
          ct("BBU"),
          ct("UPS"),
          ct("Chargers"),
          ct("BMS"),
          ct("Power Distribution Boards"),
          ct("Others"),
        ],
      },
      {
        name: "Safety & Enclosures",
        slug: "safety-enclosures",
        componentTypes: [
          ct("Guards"),
          ct("Covers"),
          ct("Safety Relays"),
          ct("Emergency Stop Units"),
          ct("Safety Fencing"),
          ct("Pedestals"),
          ct("Mounts"),
          ct("Frames"),
          ct("Others"),
        ],
      },
    ],
  },
  {
    name: "Devices",
    slug: "devices",
    description: "Sensors, vision systems, safety electronics, HMIs, and interface devices",
    icon: "Monitor",
    subcategories: [
      {
        name: "Sensors & Vision",
        slug: "sensors-vision",
        componentTypes: [
          ct("Proximity Sensors"),
          ct("Limit Sensors"),
          ct("Force/Torque Sensors"),
          ct("Laser Sensors"),
          ct("Cameras"),
          ct("2D/3D Vision Systems"),
          ct("Barcode Scanners"),
          ct("Lighting Systems"),
          ct("Others"),
        ],
      },
      {
        name: "HMIs & Teach Devices",
        slug: "hmis-teach-devices",
        componentTypes: [
          ct("Teach Pendants"),
          ct("HMI Displays"),
          ct("Operator Panels"),
          ct("Touchscreens"),
          ct("Keypads"),
          ct("Emergency Stop Buttons"),
          ct("Indicators"),
          ct("Others"),
        ],
      },
    ],
  },
  {
    name: "Tools",
    slug: "tools",
    description: "End-of-arm tooling, process tools, welding equipment, and maintenance tools",
    icon: "Wrench",
    subcategories: [
      {
        name: "End Effectors",
        slug: "end-effectors",
        componentTypes: [
          ct("Mechanical Grippers"),
          ct("Vacuum Grippers"),
          ct("Vacuum Cups"),
          ct("Tool Changers"),
          ct("Material Handling Attachments"),
          ct("Others"),
        ],
      },
      {
        name: "Welding Tools",
        slug: "welding-tools",
        componentTypes: [
          ct("Welding Torches"),
          ct("Spot Welding Guns"),
          ct("Wire Feeders"),
          ct("Contact Tips"),
          ct("Nozzles"),
          ct("Arc Monitoring Systems"),
          ct("Others"),
        ],
      },
      {
        name: "Processing Tools",
        slug: "processing-tools",
        componentTypes: [
          ct("Cutting Tools"),
          ct("Laser Heads"),
          ct("Spray Guns"),
          ct("Drilling Tools"),
          ct("Polishing Tools"),
          ct("Others"),
        ],
      },
      {
        name: "Maintenance Tools",
        slug: "maintenance-tools",
        componentTypes: [
          ct("Maintenance Tool Kits"),
          ct("Grease"),
          ct("Lubricants"),
          ct("Warning Labels"),
          ct("Others"),
        ],
      },
    ],
  },
  {
    name: "Software",
    slug: "software",
    description: "Programming software, licenses, firmware, and cloud platforms",
    icon: "Code",
    subcategories: [
      {
        name: "Programming & Simulation",
        slug: "programming-simulation",
        componentTypes: [
          ct("Robot Programming Licenses"),
          ct("Brand-Specific Packages"),
          ct("Offline Programming Software"),
          ct("Simulation Software"),
          ct("Digital Twin Platforms"),
          ct("Others"),
        ],
      },
      {
        name: "Vision & Analytics",
        slug: "vision-analytics",
        componentTypes: [
          ct("Vision Processing Software"),
          ct("Image Analysis Software"),
          ct("Others"),
        ],
      },
      {
        name: "Management & System",
        slug: "management-system",
        componentTypes: [
          ct("Fleet Management Software"),
          ct("Monitoring & Diagnostics Tools"),
          ct("Firmware Updates"),
          ct("Configuration Tools"),
          ct("Licenses"),
          ct("Cloud Platforms"),
          ct("Others"),
        ],
      },
    ],
  },
];

// Types
export type CategoryName = typeof SPARE_PARTS_TAXONOMY[number]["name"];
export type SubcategoryName = string;
export type ComponentTypeName = string;

// ============ HELPER FUNCTIONS ============

// Get all categories
export const getCategories = (): CategoryData[] => {
  return SPARE_PARTS_TAXONOMY;
};

// Get category by name
export const getCategoryByName = (categoryName: string): CategoryData | undefined => {
  return SPARE_PARTS_TAXONOMY.find((cat) => cat.name === categoryName);
};

// Get category by slug
export const getCategoryBySlug = (slug: string): CategoryData | undefined => {
  return SPARE_PARTS_TAXONOMY.find((cat) => cat.slug === slug);
};

// Get subcategories for a category
export const getSubcategoriesForCategory = (categoryName: string): SubcategoryData[] => {
  const category = getCategoryByName(categoryName);
  return category?.subcategories || [];
};

// Get subcategory by name within a category
export const getSubcategoryByName = (
  categoryName: string,
  subcategoryName: string
): SubcategoryData | undefined => {
  const category = getCategoryByName(categoryName);
  return category?.subcategories.find((sub) => sub.name === subcategoryName);
};

// Get subcategory by slug within a category
export const getSubcategoryBySlug = (
  categorySlug: string,
  subcategorySlug: string
): SubcategoryData | undefined => {
  const category = getCategoryBySlug(categorySlug);
  return category?.subcategories.find((sub) => sub.slug === subcategorySlug);
};

// Get component types for a subcategory
export const getComponentTypesForSubcategory = (
  categoryName: string,
  subcategoryName: string
): ComponentTypeData[] => {
  const subcategory = getSubcategoryByName(categoryName, subcategoryName);
  return subcategory?.componentTypes || [];
};

// Get component type by name
export const getComponentTypeByName = (
  categoryName: string,
  subcategoryName: string,
  componentTypeName: string
): ComponentTypeData | undefined => {
  const componentTypes = getComponentTypesForSubcategory(categoryName, subcategoryName);
  return componentTypes.find((ct) => ct.name === componentTypeName);
};

// Get component type by slug
export const getComponentTypeBySlug = (
  categorySlug: string,
  subcategorySlug: string,
  componentTypeSlug: string
): ComponentTypeData | undefined => {
  const subcategory = getSubcategoryBySlug(categorySlug, subcategorySlug);
  return subcategory?.componentTypes.find((ct) => ct.slug === componentTypeSlug);
};

// Find category by subcategory name
export const findCategoryBySubcategory = (subcategoryName: string): CategoryData | undefined => {
  return SPARE_PARTS_TAXONOMY.find((cat) =>
    cat.subcategories.some((sub) => sub.name === subcategoryName)
  );
};

// Find subcategory by component type name
export const findSubcategoryByComponentType = (
  categoryName: string,
  componentTypeName: string
): SubcategoryData | undefined => {
  const category = getCategoryByName(categoryName);
  return category?.subcategories.find((sub) =>
    sub.componentTypes.some((ct) => ct.name === componentTypeName)
  );
};

// Get all category names
export const getCategoryNames = (): string[] => {
  return SPARE_PARTS_TAXONOMY.map((cat) => cat.name);
};

// Get all subcategory names for a category
export const getSubcategoryNames = (categoryName: string): string[] => {
  const category = getCategoryByName(categoryName);
  return category?.subcategories.map((sub) => sub.name) || [];
};

// Get all component type names for a subcategory
export const getComponentTypeNames = (
  categoryName: string,
  subcategoryName: string
): string[] => {
  const componentTypes = getComponentTypesForSubcategory(categoryName, subcategoryName);
  return componentTypes.map((ct) => ct.name);
};

// Generate breadcrumb from slugs
export const generateBreadcrumb = (
  categorySlug?: string,
  subcategorySlug?: string,
  componentTypeSlug?: string
): { label: string; href: string }[] => {
  const breadcrumb = [
    { label: "Home", href: "/" },
    { label: "Spare Parts", href: "/parts" },
  ];

  if (categorySlug) {
    const category = getCategoryBySlug(categorySlug);
    if (category) {
      breadcrumb.push({
        label: category.name,
        href: `/spares/${categorySlug}`,
      });

      if (subcategorySlug) {
        const subcategory = getSubcategoryBySlug(categorySlug, subcategorySlug);
        if (subcategory) {
          breadcrumb.push({
            label: subcategory.name,
            href: `/spares/${categorySlug}/${subcategorySlug}`,
          });

          if (componentTypeSlug) {
            const componentType = getComponentTypeBySlug(
              categorySlug,
              subcategorySlug,
              componentTypeSlug
            );
            if (componentType) {
              breadcrumb.push({
                label: componentType.name,
                href: `/spares/${categorySlug}/${subcategorySlug}/${componentTypeSlug}`,
              });
            }
          }
        }
      }
    }
  }

  return breadcrumb;
};

// Get stats
export const getCategoryStats = () => {
  const categories = SPARE_PARTS_TAXONOMY.length;
  let subcategories = 0;
  let componentTypes = 0;

  SPARE_PARTS_TAXONOMY.forEach((cat) => {
    subcategories += cat.subcategories.length;
    cat.subcategories.forEach((sub) => {
      componentTypes += sub.componentTypes.length;
    });
  });

  return {
    totalCategories: categories,
    totalSubcategories: subcategories,
    totalComponentTypes: componentTypes,
    breakdown: SPARE_PARTS_TAXONOMY.map((cat) => ({
      name: cat.name,
      subcategories: cat.subcategories.length,
      componentTypes: cat.subcategories.reduce(
        (sum, sub) => sum + sub.componentTypes.length,
        0
      ),
    })),
  };
};

// ============ BACKWARD COMPATIBILITY ============

// Flatten for backward compatibility with old code
export const SPARE_PARTS_CATEGORIES = (() => {
  const flat: Record<string, readonly string[]> = {};

  SPARE_PARTS_TAXONOMY.forEach((category) => {
    category.subcategories.forEach((subcategory) => {
      flat[subcategory.name] = subcategory.componentTypes.map((ct) => ct.name);
    });
  });

  flat["Other"] = [];
  return flat;
})();

export const SPARE_PARTS_MENU = (() => {
  const menu: Record<string, { description: string; icon: string; categories: Record<string, readonly string[]> }> = {};

  SPARE_PARTS_TAXONOMY.forEach((category) => {
    const categories: Record<string, readonly string[]> = {};
    category.subcategories.forEach((sub) => {
      categories[sub.name] = sub.componentTypes.map((ct) => ct.name);
    });

    menu[category.name] = {
      description: category.description,
      icon: category.icon,
      categories,
    };
  });

  return menu;
})();

export type MainMenu = keyof typeof SPARE_PARTS_MENU;
export type MainCategory = keyof typeof SPARE_PARTS_CATEGORIES;
export type SubCategory = string;

export const getMainMenus = (): MainMenu[] => {
  return Object.keys(SPARE_PARTS_MENU) as MainMenu[];
};

export const getCategoriesForMenu = (menuName: MainMenu): string[] => {
  return Object.keys(SPARE_PARTS_MENU[menuName]?.categories || {});
};

export const getSubCategories = (categoryName: string): readonly string[] => {
  return SPARE_PARTS_CATEGORIES[categoryName] || [];
};

export const getMenuInfo = (menuName: MainMenu) => {
  return SPARE_PARTS_MENU[menuName];
};

export const findMenuForCategory = (categoryName: string): MainMenu | null => {
  for (const [menuName, menuData] of Object.entries(SPARE_PARTS_MENU)) {
    if (categoryName in menuData.categories) {
      return menuName as MainMenu;
    }
  }
  return null;
};

export const getMainCategories = (): string[] => {
  return Object.keys(SPARE_PARTS_CATEGORIES);
};

export const getAllSubCategories = (): string[] => {
  const all: string[] = [];
  Object.values(SPARE_PARTS_CATEGORIES).forEach((subs) => {
    all.push(...subs);
  });
  return all;
};
