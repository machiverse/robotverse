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

// Service Types
export const SERVICE_TYPES = [
  "Robot Installation",
  "Robot Maintenance",
  "Robot Programming",
  "Robot Integration",
  "Robot Training",
  "Robot Repair",
  "Preventive Maintenance",
  "Emergency Support",
  "System Upgrades",
  "Safety Audits",
] as const;

// Logistics Types
export const LOGISTICS_TYPES = [
  "Domestic Shipping",
  "International Shipping",
  "Heavy Equipment Transport",
  "Express Delivery",
  "Warehouse Services",
  "Customs Clearance",
  "Door-to-Door Delivery",
  "Last Mile Delivery",
] as const;

// Finance Types
export const FINANCE_TYPES = [
  "Equipment Leasing",
  "Robot Financing",
  "Working Capital Loans",
  "Asset-Based Lending",
  "Government Schemes",
  "MSME Loans",
  "Trade Finance",
  "Project Finance",
] as const;

// RoboBook Categories
export const ROBOBOOK_CATEGORIES = [
  "Industry News",
  "Robot Reviews",
  "How-To Guides",
  "Case Studies",
  "Technology Trends",
  "Expert Insights",
  "Product Launches",
  "Events & Exhibitions",
] as const;

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
      label: cat,
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
