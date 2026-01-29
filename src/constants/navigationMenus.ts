// Navigation Menu Structure for RobotVerse
import { SPARE_PARTS_TAXONOMY, getCategories } from './sparePartsCategories';

// Robot Types for Robots Menu - Must match database robot_type values exactly
export const ROBOT_TYPES = [
  "Articulated Robot",
  "SCARA Robot",
  "Collaborative Robot (Cobot)",
  "Cobot",
  "AGV / AMR",
  "AMR (Autonomous Mobile Robot)",
  "Mobile Robot",
  "Palletizing Robot",
  "Industrial Robot",
  "Heavy Handling Robot",
  "Medium Handling Robot",
  "Small Handling Robot",
  "Linear Robot",
  "Laser Cutting Robot",
  "Laser Welding Robot",
  "Mig Welding Robot",
] as const;

// Service Types - Must match database service_type values
export const SERVICE_TYPES = [
  "Installation",
  "Maintenance",
  "Repair",
  "Calibration",
  "Training",
  "Consulting",
  "Inspection",
  "Upgrades",
] as const;

// Logistics Types - Must match database service_type values
export const LOGISTICS_TYPES = [
  "Local Delivery",
  "Inter-city Transport",
  "International Shipping",
  "Heavy Equipment Transport",
  "Express Delivery",
  "Warehousing & Storage",
  "Last Mile Delivery",
  "Temperature Controlled Transport",
] as const;

// Finance Types - Must match database loan_type values
export const FINANCE_TYPES = [
  "Business Loan",
  "Equipment Finance",
  "Working Capital",
  "Invoice Financing",
  "Term Loan",
  "MSME Loan",
  "Startup Funding",
] as const;

// RoboBook Categories - Post types for filtering
export const ROBOBOOK_CATEGORIES = [
  "blog",
  "video",
  "short_post",
  "media",
] as const;

// RoboBook display labels
export const ROBOBOOK_CATEGORY_LABELS: Record<string, string> = {
  "blog": "Articles",
  "video": "Videos", 
  "short_post": "Quick Posts",
  "media": "Media",
};

// Build Spare Parts Sub-menu from three-level taxonomy
export const getSparePartsSubMenus = () => {
  return SPARE_PARTS_TAXONOMY.map((category) => ({
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    subcategories: category.subcategories.map((sub) => ({
      name: sub.name,
      slug: sub.slug,
      componentTypes: sub.componentTypes.map((ct) => ({
        name: ct.name,
        slug: ct.slug,
      })),
    })),
  }));
};

// Navigation structure
export const NAVIGATION_CONFIG = {
  robots: {
    label: "Robots",
    href: "/robots",
    subItems: ROBOT_TYPES.map(type => ({
      label: type,
      href: `/robots?type=${encodeURIComponent(type)}`,
    })),
  },
  spares: {
    label: "Spare Parts",
    href: "/parts",
    // Three-level menu structure
    categories: getSparePartsSubMenus().map(category => ({
      label: category.name,
      slug: category.slug,
      description: category.description,
      href: `/spares/${category.slug}`,
      subcategories: category.subcategories.map(sub => ({
        label: sub.name,
        slug: sub.slug,
        href: `/spares/${category.slug}/${sub.slug}`,
        componentTypes: sub.componentTypes.map(ct => ({
          label: ct.name,
          slug: ct.slug,
          href: `/spares/${category.slug}/${sub.slug}/${ct.slug}`,
        })),
      })),
    })),
  },
  services: {
    label: "Services",
    href: "/services",
    subItems: SERVICE_TYPES.map(type => ({
      label: type,
      href: `/services?type=${encodeURIComponent(type)}`,
    })),
  },
  logistics: {
    label: "Logistics",
    href: "/logistics",
    subItems: LOGISTICS_TYPES.map(type => ({
      label: type,
      href: `/logistics?type=${encodeURIComponent(type)}`,
    })),
  },
  financing: {
    label: "Financing",
    href: "/financing",
    subItems: FINANCE_TYPES.map(type => ({
      label: type,
      href: `/financing?type=${encodeURIComponent(type)}`,
    })),
  },
  robobook: {
    label: "RoboBook",
    href: "/robobook",
    subItems: ROBOBOOK_CATEGORIES.map(cat => ({
      label: ROBOBOOK_CATEGORY_LABELS[cat] || cat,
      href: `/robobook?category=${encodeURIComponent(cat)}`,
    })),
  },
} as const;

// Legacy compatibility - SPARE_PARTS_MENU export
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
