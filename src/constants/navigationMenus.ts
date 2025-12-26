// Navigation Menu Structure for RobotVerse
import { SPARE_PARTS_MENU } from './sparePartsCategories';

// Robot Types for Robots Menu
export const ROBOT_TYPES = [
  "Articulated Robots",
  "SCARA Robots",
  "Delta Robots",
  "Cartesian Robots",
  "Collaborative Robots (Cobots)",
  "Mobile Robots (AGV/AMR)",
  "Humanoid Robots",
  "Welding Robots",
  "Painting Robots",
  "Palletizing Robots",
  "Pick and Place Robots",
  "Assembly Robots",
  "Inspection Robots",
  "Material Handling Robots",
  "Packaging Robots",
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

// Build Spare Parts Sub-menu from categories
export const getSparePartsSubMenus = () => {
  return Object.entries(SPARE_PARTS_MENU).map(([menuName, menuData]) => ({
    name: menuName,
    description: menuData.description,
    categories: Object.keys(menuData.categories),
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
    subMenus: getSparePartsSubMenus().map(menu => ({
      label: menu.name,
      href: `/parts?menu=${encodeURIComponent(menu.name)}`,
      categories: menu.categories.map(cat => ({
        label: cat,
        href: `/parts?category=${encodeURIComponent(cat)}`,
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
