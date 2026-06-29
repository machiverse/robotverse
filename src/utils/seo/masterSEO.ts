/**
 * RobotVerse Master SEO System
 * Keyword mapping, title/meta helpers, and SEO content support
 * Use for page planning, titles, descriptions, and structured content guidance
 */

type PageKeywordEntry = {
  primary: string;
  secondary: string[];
  longTail: string[];
};

type DynamicData = Record<string, string | undefined>;

const safeReplace = (template: string, dynamicData?: DynamicData): string => {
  if (!dynamicData) return template;
  return Object.entries(dynamicData)
    .reduce((result, [key, value]) => {
      return result.replaceAll(`{${key}}`, value?.trim() || "");
    }, template)
    .replace(/\s+/g, " ")
    .trim();
};

const cleanText = (value: string): string =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s+([|,-])/g, " $1")
    .trim();

const trimAtWord = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}…`;
};

// ============ KEYWORD STRATEGY ============

export const PAGE_KEYWORD_MAP: Record<string, PageKeywordEntry> = {
  home: {
    primary: "industrial robots marketplace India",
    secondary: [
      "used industrial robots India",
      "buy industrial robots India",
      "sell industrial robots India",
      "robot automation marketplace",
    ],
    longTail: [
      "buy used industrial robots online India",
      "industrial robot marketplace for manufacturers",
      "industrial robot sellers in India",
      "FANUC ABB KUKA robots for sale India",
    ],
  },

  robots: {
    primary: "used industrial robots India",
    secondary: [
      "used industrial robots for sale",
      "refurbished industrial robots India",
      "second hand industrial robots",
      "industrial robot marketplace",
    ],
    longTail: [
      "buy used FANUC robots India",
      "used ABB industrial robots for sale",
      "used KUKA robots India",
      "used Yaskawa robots India",
    ],
  },

  robotDetail: {
    primary: "{brand} {model} industrial robot",
    secondary: [
      "{brand} {model} price",
      "{brand} {model} specifications",
      "used {brand} {model}",
      "{brand} robot for sale India",
    ],
    longTail: [
      "buy {brand} {model} robot India",
      "{brand} {model} payload and reach",
      "used {brand} {model} for sale India",
      "{brand} {model} industrial robot specifications",
    ],
  },

  parts: {
    primary: "industrial robot spare parts India",
    secondary: [
      "robot spare parts",
      "industrial robot components",
      "robot replacement parts India",
      "automation spare parts",
    ],
    longTail: [
      "FANUC robot spare parts India",
      "ABB robot spare parts India",
      "KUKA robot components India",
      "Yaskawa robot spare parts supplier",
    ],
  },

  partDetail: {
    primary: "{brand} {partName} robot part",
    secondary: [
      "{brand} spare part",
      "{partNumber} replacement part",
      "{brand} robot component",
      "{category} robot part",
    ],
    longTail: ["buy {brand} {partName} India", "{brand} {partNumber} spare part", "{brand} robot parts supplier India"],
  },

  services: {
    primary: "industrial robot services India",
    secondary: [
      "robot repair services",
      "robot maintenance services",
      "robot installation services",
      "robot programming services",
    ],
    longTail: [
      "FANUC robot repair service India",
      "industrial robot maintenance company India",
      "robot installation and commissioning India",
      "robot programming support India",
    ],
  },

  serviceDetail: {
    primary: "{serviceType} industrial robots",
    secondary: [
      "robot {serviceType} service",
      "{serviceType} service provider",
      "{brand} robot service",
      "industrial robot {serviceType}",
    ],
    longTail: [
      "{serviceType} for {brand} robots India",
      "industrial robot {serviceType} service India",
      "{serviceType} support for used robots",
    ],
  },

  logistics: {
    primary: "industrial robot logistics India",
    secondary: [
      "robot transportation India",
      "robot shipping service",
      "heavy machinery logistics",
      "equipment relocation India",
    ],
    longTail: [
      "industrial robot transportation service India",
      "safe robot shipping India",
      "robot moving and relocation service",
    ],
  },

  financing: {
    primary: "industrial robot financing India",
    secondary: ["robot financing options", "equipment financing India", "used robot financing", "robot leasing India"],
    longTail: [
      "industrial robot loan India",
      "used robot financing options India",
      "equipment finance for manufacturers India",
    ],
  },

  contact: {
    primary: "contact RobotVerse",
    secondary: [
      "industrial robot inquiry",
      "robot marketplace support",
      "buyer support RobotVerse",
      "seller support RobotVerse",
    ],
    longTail: [
      "contact industrial robot marketplace India",
      "robot buying assistance India",
      "get robot quote RobotVerse",
    ],
  },

  about: {
    primary: "about RobotVerse",
    secondary: [
      "industrial robot marketplace India",
      "robot marketplace company",
      "automation marketplace India",
      "RobotVerse company profile",
    ],
    longTail: [
      "about RobotVerse industrial robots",
      "industrial robot marketplace company India",
      "RobotVerse automation marketplace",
    ],
  },

  blog: {
    primary: "industrial robotics articles India",
    secondary: ["robotics news India", "automation blog", "robot buying guide", "industrial robotics insights"],
    longTail: [
      "industrial robot buying guide India",
      "robotics trends in manufacturing India",
      "industrial automation articles",
    ],
  },

  pricing: {
    primary: "RobotVerse seller pricing",
    secondary: ["robot marketplace pricing", "seller plans RobotVerse", "listing plans", "marketplace subscription"],
    longTail: ["RobotVerse seller plans India", "robot listing pricing", "seller subscription RobotVerse"],
  },

  buyerGuide: {
    primary: "industrial robot buying guide",
    secondary: [
      "how to buy industrial robot",
      "used robot buying guide",
      "robot payload selection",
      "robot inspection checklist",
    ],
    longTail: [
      "industrial robot buying guide India",
      "how to choose the right industrial robot",
      "used industrial robot inspection checklist",
    ],
  },

  sellerGuide: {
    primary: "sell industrial robots India",
    secondary: [
      "sell used industrial robots",
      "robot seller guide",
      "list industrial robot for sale",
      "robot marketplace seller tips",
    ],
    longTail: [
      "how to sell industrial robots online India",
      "best way to sell used robots India",
      "industrial robot listing tips",
    ],
  },
};

export const ROBOT_BRANDS_SEO = [
  { name: "FANUC", keywords: ["fanuc robot", "fanuc industrial robot", "fanuc robot price India"] },
  { name: "ABB", keywords: ["abb robot", "abb industrial robot", "abb robot price India"] },
  { name: "KUKA", keywords: ["kuka robot", "kuka industrial robot", "kuka robot price India"] },
  { name: "Yaskawa", keywords: ["yaskawa robot", "motoman robot", "yaskawa industrial robot"] },
  { name: "Kawasaki", keywords: ["kawasaki robot", "kawasaki industrial robot"] },
  { name: "Universal Robots", keywords: ["universal robots", "ur robot", "collaborative robot"] },
  { name: "Mitsubishi", keywords: ["mitsubishi robot", "melfa robot"] },
  { name: "Epson", keywords: ["epson robot", "epson scara robot"] },
  { name: "Staubli", keywords: ["staubli robot", "staubli industrial robot"] },
  { name: "Denso", keywords: ["denso robot", "denso industrial robot"] },
];

export const ROBOT_APPLICATIONS_SEO = [
  { name: "Welding", keywords: ["welding robot", "arc welding robot", "spot welding robot"] },
  {
    name: "Material Handling",
    keywords: ["material handling robot", "pick and place robot", "loading unloading robot"],
  },
  { name: "Palletizing", keywords: ["palletizing robot", "palletizer robot"] },
  { name: "Assembly", keywords: ["assembly robot", "robotic assembly"] },
  { name: "Painting", keywords: ["painting robot", "spray painting robot"] },
  { name: "Machine Tending", keywords: ["machine tending robot", "cnc tending robot"] },
  { name: "Packaging", keywords: ["packaging robot", "robotic packaging"] },
  { name: "Inspection", keywords: ["inspection robot", "vision inspection robot"] },
];

export const INDIAN_CITIES_SEO = [
  {
    city: "Chennai",
    state: "Tamil Nadu",
    keywords: ["industrial robots Chennai", "robot suppliers Chennai", "automation Chennai"],
  },
  { city: "Bangalore", state: "Karnataka", keywords: ["industrial robots Bangalore", "robot suppliers Bangalore"] },
  { city: "Mumbai", state: "Maharashtra", keywords: ["industrial robots Mumbai", "robot suppliers Mumbai"] },
  { city: "Pune", state: "Maharashtra", keywords: ["industrial robots Pune", "robot suppliers Pune"] },
  { city: "Hyderabad", state: "Telangana", keywords: ["industrial robots Hyderabad", "robot suppliers Hyderabad"] },
  { city: "Coimbatore", state: "Tamil Nadu", keywords: ["industrial robots Coimbatore", "robot suppliers Coimbatore"] },
  { city: "Ahmedabad", state: "Gujarat", keywords: ["industrial robots Ahmedabad", "robot suppliers Ahmedabad"] },
  { city: "Noida", state: "Uttar Pradesh", keywords: ["industrial robots Noida", "robot suppliers Noida"] },
];

export const INDUSTRIES_SEO = [
  "Automotive Manufacturing",
  "Electronics Manufacturing",
  "Food & Beverage",
  "Pharmaceutical Manufacturing",
  "Aerospace",
  "Metal Fabrication",
  "Plastics Manufacturing",
  "Warehousing & Logistics",
  "Battery Manufacturing",
  "General Manufacturing",
];

// ============ META GENERATORS ============

export const generateOptimizedTitle = (pageType: keyof typeof PAGE_KEYWORD_MAP, dynamicData?: DynamicData): string => {
  const templates: Record<string, string> = {
    home: "Used Industrial Robots India | RobotVerse",
    robots: "Used Industrial Robots for Sale in India | RobotVerse",
    robotDetail: "{brand} {model} Industrial Robot in India | RobotVerse",
    parts: "Industrial Robot Spare Parts India | RobotVerse",
    partDetail: "{brand} {partName} Robot Part | RobotVerse",
    services: "Industrial Robot Services India | RobotVerse",
    serviceDetail: "{serviceType} for Industrial Robots | RobotVerse",
    logistics: "Industrial Robot Logistics India | RobotVerse",
    financing: "Industrial Robot Financing India | RobotVerse",
    contact: "Contact RobotVerse",
    about: "About RobotVerse | Industrial Robot Marketplace",
    blog: "RoboBook | Industrial Robotics Articles",
    pricing: "RobotVerse Seller Pricing",
    buyerGuide: "Industrial Robot Buying Guide | RobotVerse",
    sellerGuide: "Sell Industrial Robots India | RobotVerse",
  };

  const template = templates[pageType] || "RobotVerse | Industrial Robots India";
  return trimAtWord(cleanText(safeReplace(template, dynamicData)), 65);
};

export const generateOptimizedDescription = (
  pageType: keyof typeof PAGE_KEYWORD_MAP,
  dynamicData?: DynamicData,
): string => {
  const templates: Record<string, string> = {
    home: "Buy and sell industrial robots in India. Explore used robots, spare parts, services, financing, and logistics on RobotVerse.",
    robots:
      "Browse used industrial robots in India by brand, application, and specifications. Compare available listings on RobotVerse.",
    robotDetail:
      "{brand} {model} industrial robot with payload, reach, condition, and listing details. Enquire on RobotVerse.",
    parts:
      "Browse industrial robot spare parts for major brands. Find components, accessories, and replacement parts on RobotVerse.",
    partDetail: "View {brand} {partName} part details, compatibility, and enquiry options on RobotVerse.",
    services:
      "Find industrial robot services in India including maintenance, repair, installation, and programming support.",
    serviceDetail:
      "Explore {serviceType} services for industrial robots with enquiry and support options on RobotVerse.",
    logistics:
      "Explore industrial robot transportation and logistics support for safe movement and delivery across India.",
    financing:
      "Discover financing options for industrial robots in India, including support for equipment purchase enquiries.",
    contact: "Contact RobotVerse for industrial robot buying, selling, parts, or service enquiries.",
    about:
      "Learn about RobotVerse, an industrial robot marketplace focused on robots, parts, services, and automation support in India.",
    blog: "Read RoboBook articles on industrial robots, automation, buying guidance, and manufacturing use cases.",
    pricing: "Explore seller pricing and listing plan details for RobotVerse marketplace participation.",
    buyerGuide: "Learn how to choose, inspect, and evaluate industrial robots before purchase.",
    sellerGuide: "Learn how to list and sell industrial robots effectively on RobotVerse.",
  };

  const template =
    templates[pageType] ||
    "RobotVerse is a marketplace for industrial robots, spare parts, services, and related support in India.";

  return trimAtWord(cleanText(safeReplace(template, dynamicData)), 158);
};

export const getPageKeywords = (pageType: keyof typeof PAGE_KEYWORD_MAP, dynamicData?: DynamicData): string[] => {
  const keywordData = PAGE_KEYWORD_MAP[pageType];
  if (!keywordData) return ["industrial robots India", "robot marketplace", "RobotVerse"];

  return [keywordData.primary, ...keywordData.secondary, ...keywordData.longTail]
    .map((keyword) => safeReplace(keyword, dynamicData))
    .filter((keyword) => keyword && !keyword.includes("{"));
};

export const getLocationKeywords = (location?: string): string[] => {
  if (!location) return [];

  const cityData = INDIAN_CITIES_SEO.find(
    (c) => c.city.toLowerCase() === location.toLowerCase() || c.state.toLowerCase() === location.toLowerCase(),
  );

  if (cityData) return cityData.keywords;

  return [
    `industrial robots ${location}`,
    `robot suppliers ${location}`,
    `automation equipment ${location}`,
    `robot marketplace ${location}`,
  ];
};

export const getBrandKeywords = (brand?: string): string[] => {
  if (!brand) return [];

  const brandData = ROBOT_BRANDS_SEO.find((b) => b.name.toLowerCase() === brand.toLowerCase());

  if (brandData) return brandData.keywords;

  return [`${brand} robot`, `${brand} industrial robot`, `${brand} robot price India`, `used ${brand} robot`];
};

export const getApplicationKeywords = (applications?: string[]): string[] => {
  if (!applications?.length) return [];

  const keywords: string[] = [];

  applications.forEach((app) => {
    const appData = ROBOT_APPLICATIONS_SEO.find((a) => a.name.toLowerCase() === app.toLowerCase());

    if (appData) {
      keywords.push(...appData.keywords);
    } else {
      keywords.push(`${app} robot`, `${app} automation`, `robot for ${app}`);
    }
  });

  return [...new Set(keywords)];
};

export default {
  PAGE_KEYWORD_MAP,
  ROBOT_BRANDS_SEO,
  ROBOT_APPLICATIONS_SEO,
  INDIAN_CITIES_SEO,
  INDUSTRIES_SEO,
  generateOptimizedTitle,
  generateOptimizedDescription,
  getPageKeywords,
  getLocationKeywords,
  getBrandKeywords,
  getApplicationKeywords,
};
