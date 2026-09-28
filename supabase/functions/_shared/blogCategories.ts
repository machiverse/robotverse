// RoboBook blog categories, shared by the website (src/) and the RSS edge function.
//
// Posts keep the category their author chose. Posts without one are sorted
// into a category by reading their title, tags, excerpt and text. Nothing is
// written back to the database: the category is worked out when posts load.
// Pure TypeScript with no runtime imports, so Vite and Deno can both use it.

export interface BlogCategory {
  name: string;
  /** Short line shown in menus and in the RSS channel description. */
  blurb: string;
  /** Lower-case words or phrases; matched at the start of a word. */
  keywords: string[];
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    name: "Buying & Selling Robots",
    blurb: "Used and refurbished robots, prices, resale and auctions",
    keywords: ["used", "used robot", "refurbish", "second hand", "second-hand", "resale", "buy", "buying", "sell", "selling", "price", "pricing", "cost of", "auction", "marketplace", "listing", "valuation", "deal"],
  },
  {
    name: "Welding & Joining",
    blurb: "Arc, MIG, TIG, spot and laser welding with robots",
    keywords: ["weld", "welding", "mig", "tig", "spot weld", "arc", "torch", "seam", "solder", "brazing", "laser weld"],
  },
  {
    name: "Machine Tending & CNC",
    blurb: "Loading CNC machines, presses and moulding machines",
    keywords: ["machine tending", "cnc", "lathe", "milling", "press tending", "injection mould", "injection mold", "moulding", "molding", "die casting", "machining"],
  },
  {
    name: "Palletizing & Packaging",
    blurb: "Palletizing, depalletizing, packing and end-of-line",
    keywords: ["palletiz", "palletis", "depalletiz", "pallet", "packing", "packaging", "case pack", "carton", "end of line", "end-of-line", "bag"],
  },
  {
    name: "Painting & Finishing",
    blurb: "Painting, coating, grinding, polishing and deburring",
    keywords: ["paint", "painting", "coating", "spray", "polish", "grinding", "grind", "deburr", "sanding", "finishing", "dispensing", "sealant", "glue"],
  },
  {
    name: "Assembly & Material Handling",
    blurb: "Pick and place, assembly, screwdriving and handling",
    keywords: ["pick and place", "pick & place", "assembly", "assembling", "screw", "material handling", "handling", "gripper", "end effector", "eoat", "bin picking", "kitting", "conveyor"],
  },
  {
    name: "Cobots",
    blurb: "Collaborative robots working alongside people",
    keywords: ["cobot", "collaborative", "universal robots", "ur5", "ur10", "crx", "gofa", "yumi", "human-robot", "human robot"],
  },
  {
    name: "Robot Programming & Software",
    blurb: "Programming, simulation, PLCs, ROS and offline tools",
    keywords: ["program", "programming", "teach pendant", "offline programming", "simulation", "plc", "ros", "software", "karel", "rapid", "krl", "inform", "python", "code", "digital twin", "hmi"],
  },
  {
    name: "Maintenance & Spare Parts",
    blurb: "Servicing, troubleshooting, alarms and spare parts",
    keywords: ["maintenance", "service", "servicing", "repair", "spare", "spare part", "troubleshoot", "alarm", "error code", "fault", "servo", "reducer", "gearbox", "battery", "encoder", "overhaul", "calibration", "preventive"],
  },
  {
    name: "Vision & AI",
    blurb: "Machine vision, cameras, AI and smart robotics",
    keywords: ["vision", "camera", "machine vision", "3d vision", "ai", "artificial intelligence", "machine learning", "deep learning", "inspection", "barcode", "ocr"],
  },
  {
    name: "Safety & Standards",
    blurb: "Robot safety, risk assessment and standards",
    keywords: ["safety", "risk assessment", "iso 10218", "iso/ts 15066", "fence", "light curtain", "safety scanner", "standard", "compliance", "ce marking"],
  },
  {
    name: "Case Studies & ROI",
    blurb: "Real installations, results and return on investment",
    keywords: ["case study", "success story", "customer story", "roi", "return on investment", "payback", "installed", "implementation", "results", "productivity", "cycle time", "reduced", "saved", "increased output"],
  },
  {
    name: "Careers & Training",
    blurb: "Jobs, courses, certification and robotics skills",
    keywords: ["career", "job", "jobs", "hiring", "training", "course", "workshop", "certification", "skill", "skills", "internship", "student", "learn"],
  },
  {
    name: "Industry News & Trends",
    blurb: "Market news, trends and events in robotics",
    keywords: ["news", "trend", "trends", "market", "industry 4.0", "forecast", "growth", "report", "launch", "announce", "event", "exhibition", "expo", "ifr", "future"],
  },
  {
    name: "Robot Guides & Comparisons",
    blurb: "How to choose, robot types, brands and comparisons",
    keywords: ["guide", "how to", "vs", "versus", "comparison", "compare", "types of", "choose", "choosing", "best", "which robot", "robot arm", "scara", "delta robot", "6-axis", "six axis"],
  },
];

export const GENERAL_CATEGORY = "General";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MATCHERS = BLOG_CATEGORIES.map((c) => ({
  name: c.name,
  // Word start, so "arc" does not count inside "search" and "ai" not inside "maintain".
  res: c.keywords.map((k) => new RegExp(`(^|[^a-z0-9])${escapeRe(k)}${k.length <= 3 ? "(?![a-z])" : ""}`, "g")),
}));

const plain = (html: unknown) =>
  String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .toLowerCase();

export interface CategorisablePost {
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  tags?: string[] | null;
  category?: string | null;
}

/** Best matching category for a post's text; GENERAL_CATEGORY when nothing fits. */
export function detectBlogCategory(post: CategorisablePost): string {
  const title = plain(post.title);
  const tags = (Array.isArray(post.tags) ? post.tags : []).map((t) => String(t).toLowerCase()).join(" , ");
  const excerpt = plain(post.excerpt);
  const body = plain(post.content).slice(0, 6000);
  let best = GENERAL_CATEGORY;
  let bestScore = 0;
  for (const m of MATCHERS) {
    let score = 0;
    for (const re of m.res) {
      const count = (text: string) => (text.match(re) || []).length;
      // A word in the title or tags says more about the topic than one in the body.
      score += count(title) * 4 + count(tags) * 3 + count(excerpt) * 2 + Math.min(count(body), 4);
    }
    if (score > bestScore) {
      best = m.name;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? best : GENERAL_CATEGORY;
}

/**
 * The category a post is shown under: the author's own category (matched to a
 * standard name when it is a variant of one), otherwise the detected one.
 */
export function blogCategoryOf(post: CategorisablePost): string {
  const own = typeof post.category === "string" ? post.category.trim() : "";
  if (own) {
    const lower = own.toLowerCase();
    const standard = BLOG_CATEGORIES.find(
      (c) => c.name.toLowerCase() === lower || c.name.toLowerCase().split(/ & | and /).includes(lower),
    );
    return standard ? standard.name : own.replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return detectBlogCategory(post);
}

export const blogCategorySlug = (name: string) =>
  name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
