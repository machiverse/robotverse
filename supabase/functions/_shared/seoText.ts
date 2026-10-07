// Single source of truth for SEO titles, descriptions, canonicals and robots
// values. The `seo-render` edge function uses a byte-identical copy at
// supabase/functions/_shared/seoText.ts — keep the two files in sync so the
// server snapshot and the client head never disagree.

export const SITE_URL = "https://www.robotverse.in";

export const DEFAULT_TITLE =
  "RobotVerse | Buy & Sell Used Industrial Robots in India";
export const DEFAULT_DESCRIPTION =
  "India's marketplace for new, used and refurbished industrial robots, spare parts, services, logistics and financing from verified sellers.";

export const TITLE_MAX = 60;
export const DESC_MAX = 155;

/** Trim to `max` chars by dropping whole words from the end — never mid-word. */
export function clampWords(text: string, max: number): string {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const words = clean.split(" ");
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > max) break;
    out = next;
  }
  if (!out) out = clean.slice(0, max).trimEnd();
  out = out.replace(/[\s|,\-–—:]+$/, "");
  // never end on a dangling preposition/conjunction
  while (/\s(in|for|of|with|and|to|on|at|by|the|a|an)$/i.test(out)) {
    out = out.replace(/\s\S+$/, "").replace(/[\s|,\-–—:]+$/, "");
  }
  return out;
}

export const clampTitle = (t: string) => clampWords(t, TITLE_MAX);
export const clampDescription = (d: string) => clampWords(d, DESC_MAX);

/** Canonical URL: absolute, no query string, no trailing slash except home. */
export function canonicalFor(path: string): string {
  let p = String(path ?? "/").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return `${SITE_URL}${p || "/"}`;
}

export const titleCaseSlug = (s: string) =>
  decodeURIComponent(String(s ?? ""))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

export const inr = (price?: number | null) =>
  price == null ? null : `Rs. ${Number(price).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ routes */

export const PRIVATE_PREFIXES = [
  "/dashboard",
  "/auth",
  "/crm",
  "/chat",
  "/profile-settings",
  "/ai-assistant",
  "/reset-password",
  "/account-status",
  "/settings",
  "/watchlist",
  "/spare-parts-dashboard",
  "/whatsapp-bot",
  "/robobook/create",
  "/auctions/create",
  "/robot-talent/post-job",
  "/robot-talent/post-training",
  "/robot-talent/employer-dashboard",
  "/robot-talent/seeker-profile",
  "/preview",
  "/test-image-migration",
  "/admin",
];

/** Duplicate listing routes that must canonicalise to the primary index. */
export const DUPLICATE_ROUTES: Record<string, string> = {
  "/marketplace/robots": "/robots",
  "/marketplace/parts": "/parts",
  "/marketplace/services": "/services",
  "/robot-talent/talent": "/robot-talent",
  "/robot-talent/training": "/robot-talent",
};

/** Directory model page types and their catalogue files under /directory/*.json. */
export const DIRECTORY_TYPES = ["robot", "tool", "axis"] as const;
export type DirectoryType = (typeof DIRECTORY_TYPES)[number];
export const DIRECTORY_FILE: Record<DirectoryType, "robots" | "tools" | "axes"> = { robot: "robots", tool: "tools", axis: "axes" };

/** URL slug of a directory model, e.g. "ABB CRB 1300-10/1.15" → "abb-crb-1300-10-1-15" (unique across the catalogue). */
export const directorySlug = (name: string) =>
  String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RouteKind =
  | "home"
  | "robots"
  | "robot"
  | "robot-brand"
  | "robot-city"
  | "parts"
  | "part"
  | "part-brand"
  | "part-category"
  | "services"
  | "service"
  | "service-city"
  | "logistics"
  | "financing"
  | "blogs"
  | "blog"
  | "robobook-post"
  | "buyer-guide"
  | "seller-guide"
  | "contact"
  | "about"
  | "auction"
  | "auction-detail"
  | "automation-studio"
  | "automation-studio-3d"
  | "automation-studio-build"
  | "financing-detail"
  | "directory-item"
  | "logistics-detail"
  | "training-poster"
  | "robot-news"
  | "automation-studio-playbook"
  | "directory"
  | "robot-talent"
  | "job"
  | "compare"
  | "robot-compare"
  | "robot-application"
  | "spares"
  | "seller-robots"
  | "pricing"
  | "api-docs"
  | "sitemap-page"
  | "terms"
  | "privacy"
  | "cookies"
  | "accessibility"
  | "private"
  | "gone"
  | "unknown";

export interface RouteMatch {
  kind: RouteKind;
  /** entity id / slug or landing-page slug */
  key?: string;
  path: string;
}

const STATIC_ROUTES: Record<string, RouteKind> = {
  "/": "home",
  "/robots": "robots",
  "/parts": "parts",
  "/services": "services",
  "/logistics": "logistics",
  "/financing": "financing",
  "/blogs": "blogs",
  "/robobook": "blogs",
  "/buyer-guide": "buyer-guide",
  "/seller-guide": "seller-guide",
  "/contact": "contact",
  "/about": "about",
  "/auction": "auction",
  "/auctions": "auction",
  "/community": "blogs",
  "/automation-studio": "automation-studio",
  "/automation-studio/3d": "automation-studio-3d",
  "/automation-studio/build": "automation-studio-build",
  "/automation-studio/playbook": "automation-studio-playbook",
  "/directory": "directory",
  "/robot-talent": "robot-talent",
  "/robots/compare": "robot-compare",
  "/pricing": "pricing",
  "/api-docs": "api-docs",
  "/sitemap": "sitemap-page",
  "/terms": "terms",
  "/privacy": "privacy",
  "/cookies": "cookies",
  "/accessibility": "accessibility",
};

export function classifyPath(rawPath: string): RouteMatch {
  let path = String(rawPath ?? "/").split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  const lower = path.toLowerCase();

  if (
    PRIVATE_PREFIXES.some((p) => lower === p || lower.startsWith(`${p}/`)) ||
    lower.endsWith("/edit")
  )
    return { kind: "private", path };

  const s = STATIC_ROUTES[DUPLICATE_ROUTES[lower] ?? lower];
  if (s) return { kind: s, path: DUPLICATE_ROUTES[lower] ?? path };

  const seg = path.split("/").filter(Boolean);

  if (seg[0] === "auctions" && seg.length === 2 && UUID_RE.test(seg[1]))
    return { kind: "auction-detail", key: seg[1], path };
  if (seg[0] === "robot-talent" && seg.length === 3 && seg[1] === "jobs" && UUID_RE.test(seg[2]))
    return { kind: "job", key: seg[2], path };
  if (seg[0] === "compare" && seg.length === 2) return { kind: "compare", key: seg[1], path };
  if (seg[0] === "spares" && seg.length >= 2 && seg.length <= 4)
    return { kind: "spares", key: seg.slice(1).join("/"), path };
  if (seg[0] === "seller" && seg.length === 3 && seg[2] === "robots" && UUID_RE.test(seg[1]))
    return { kind: "seller-robots", key: seg[1], path };
  if (seg[0] === "robots" && seg.length === 3 && seg[1] === "application") {
    const k = seg[2].toLowerCase().replace(/_/g, "-");
    return { kind: "robot-application", key: k, path: `/robots/application/${k}` };
  }
  // /robots/:brand/used duplicates the brand page — canonicalise to it.
  if (seg[0] === "robots" && seg.length === 3 && seg[2] === "used")
    return { kind: "robot-brand", key: seg[1], path: `/robots/brand/${seg[1].toLowerCase()}` };
  if (seg[0] === "community" && seg.length === 2)
    return { kind: "robobook-post", key: seg[1], path };
  if (seg[0] === "robobook" && seg.length === 2 && seg[1] === "news") return { kind: "robot-news", path };
  if (seg[0] === "financing" && seg.length === 2 && UUID_RE.test(seg[1]))
    return { kind: "financing-detail", key: seg[1], path };
  if (seg[0] === "logistics" && seg.length === 2 && UUID_RE.test(seg[1]))
    return { kind: "logistics-detail", key: seg[1], path };
  // Directory model pages: /directory/robot|tool|axis/{slug}
  if (seg[0] === "directory" && seg.length === 3 && DIRECTORY_TYPES.includes(seg[1] as DirectoryType))
    return { kind: "directory-item", key: `${seg[1]}/${seg[2].toLowerCase()}`, path: `/directory/${seg[1]}/${seg[2].toLowerCase()}` };
  if (seg[0] === "directory" && seg.length === 4 && seg[1] === "training" && seg[2] === "poster")
    return { kind: "training-poster", key: seg[3], path };

  // Retired doorway pages: /services/{city}/{service-combo}
  if (seg[0] === "services" && seg.length >= 3) return { kind: "gone", path };

  if (seg[0] === "robots" && seg.length === 3 && seg[1] === "brand")
    return { kind: "robot-brand", key: seg[2], path };
  if (seg[0] === "robots" && seg.length === 3 && seg[1] === "city")
    return { kind: "robot-city", key: seg[2], path };
  if (seg[0] === "robots" && seg.length === 2 && UUID_RE.test(seg[1]))
    return { kind: "robot", key: seg[1], path };

  if (seg[0] === "parts" && seg.length === 3 && seg[1] === "brand")
    return { kind: "part-brand", key: seg[2], path };
  if (seg[0] === "parts" && seg.length === 3 && seg[1] === "category")
    return { kind: "part-category", key: seg[2], path };
  if (seg[0] === "parts" && seg.length === 2 && UUID_RE.test(seg[1]))
    return { kind: "part", key: seg[1], path };

  if (seg[0] === "services" && seg.length === 2)
    return UUID_RE.test(seg[1])
      ? { kind: "service", key: seg[1], path }
      : { kind: "service-city", key: seg[1], path };

  if (seg[0] === "blog" && seg.length === 2) return { kind: "blog", key: seg[1], path };
  if (seg[0] === "blogs" && seg.length === 2) return { kind: "blog", key: seg[1], path };
  if (seg[0] === "robobook" && seg.length === 2 && seg[1] !== "create")
    return { kind: "robobook-post", key: seg[1], path };

  return { kind: "unknown", path };
}

/* ------------------------------------------------------- entity meta text */

export interface RobotLike {
  brand?: string | null;
  model?: string | null;
  name?: string | null;
  robot_type?: string | null;
  location?: string | null;
  payload_capacity?: number | null;
  reach?: number | null;
  year_manufactured?: number | null;
  condition?: string | null;
  price?: number | null;
}

export function robotTitle(r: RobotLike): string {
  const city = (r.location || "").split(",")[0].trim();
  const parts = [
    "Used",
    r.brand || "",
    r.model || r.name || "",
    r.robot_type || "",
    city ? `for Sale in ${city}` : "for Sale",
  ]
    .filter(Boolean)
    .join(" ");
  const full = `${parts} | RobotVerse`;
  return full.length <= TITLE_MAX ? full : clampTitle(parts);
}

export function robotDescription(r: RobotLike): string {
  const label = [r.brand, r.model || r.name].filter(Boolean).join(" ") || "industrial robot";
  const bits: string[] = [];
  if (r.payload_capacity != null) bits.push(`${r.payload_capacity} kg payload`);
  if (r.reach != null) bits.push(`${r.reach} mm reach`);
  if (r.year_manufactured) bits.push(`year ${r.year_manufactured}`);
  if (r.condition) bits.push(String(r.condition).replace(/[-_]+/g, " ").toLowerCase());
  const price = inr(r.price) ? `Price ${inr(r.price)}.` : "Price on request.";
  return clampDescription(`${label}: ${bits.join(", ")}. ${price} Buy verified industrial robots on RobotVerse.`);
}

export interface PartLike {
  brand?: string | null;
  name?: string | null;
  part_number?: string | null;
  category?: string | null;
  condition?: string | null;
  location?: string | null;
  price?: number | null;
  compatible_robots?: string[] | null;
}

export function partTitle(p: PartLike): string {
  const city = (p.location || "").split(",")[0].trim();
  const base = [
    p.brand || "",
    p.name || p.part_number || "Robot Spare Part",
    city ? `in ${city}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const full = `${base} | RobotVerse`;
  return full.length <= TITLE_MAX ? full : clampTitle(base);
}

export function partDescription(p: PartLike): string {
  const label = [p.brand, p.name || p.part_number].filter(Boolean).join(" ") || "robot spare part";
  const bits: string[] = [];
  if (p.part_number) bits.push(`part no. ${p.part_number}`);
  if (p.category) bits.push(String(p.category).toLowerCase());
  if (p.condition) bits.push(String(p.condition).replace(/[-_]+/g, " ").toLowerCase());
  if (p.compatible_robots?.length) bits.push(`fits ${p.compatible_robots.slice(0, 2).join(", ")}`);
  const price = inr(p.price) ? `Price ${inr(p.price)}.` : "Price on request.";
  return clampDescription(`${label}: ${bits.join(", ")}. ${price} Genuine robot spare parts on RobotVerse.`);
}

export function collectionTitle(
  kind: "robot-brand" | "robot-city" | "part-brand" | "part-category" | "service-city",
  label: string,
  count: number
): string {
  const n = `(${count} listing${count === 1 ? "" : "s"})`;
  const base =
    kind === "robot-brand"
      ? `Used ${label} Robots for Sale in India ${n}`
      : kind === "robot-city"
      ? `Used Industrial Robots in ${label} ${n}`
      : kind === "part-brand"
      ? `${label} Robot Spare Parts ${n}`
      : kind === "part-category"
      ? `${label} Robot Spare Parts ${n}`
      : `Industrial Robot Services in ${label} ${n}`;
  const full = `${base} | RobotVerse`;
  return full.length <= TITLE_MAX ? full : clampTitle(base);
}

export function collectionDescription(
  kind: "robot-brand" | "robot-city" | "part-brand" | "part-category" | "service-city",
  label: string,
  count: number
): string {
  const text =
    kind === "robot-brand"
      ? `Browse ${count} used and refurbished ${label} industrial robots for sale in India with payload, reach, year and price details.`
      : kind === "robot-city"
      ? `Browse ${count} used industrial robots for sale in ${label}. Compare payload, reach, brand and price, and request quotes from verified sellers.`
      : kind === "part-brand"
      ? `Browse ${count} ${label} robot spare parts — controllers, motors, cables, teach pendants and drives from verified Indian sellers.`
      : kind === "part-category"
      ? `Browse ${count} ${label.toLowerCase()} robot spare parts from verified Indian sellers with compatibility and pricing details.`
      : `${count} verified industrial robot service providers in ${label} for maintenance, repair, installation and programming.`;
  return clampDescription(text);
}

export interface PostLike {
  title?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  excerpt?: string | null;
  content?: string | null;
}

export function postTitle(p: PostLike): string {
  const base = p.meta_title || p.title || "RobotVerse Article";
  const full = `${base} | RobotVerse`;
  return full.length <= TITLE_MAX ? full : clampTitle(base);
}

export function postDescription(p: PostLike): string {
  const raw =
    p.meta_description ||
    p.excerpt ||
    String(p.content ?? "").replace(/<[^>]*>/g, " ").replace(/[#*_>`]/g, " ");
  return clampDescription(raw || DEFAULT_DESCRIPTION);
}

/** Meta for routes with no database entity. */
export function staticMeta(kind: RouteKind): { title: string; description: string } {
  switch (kind) {
    case "home":
      return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
    case "robots":
      return {
        title: clampTitle("Used Industrial Robots for Sale in India | RobotVerse"),
        description: clampDescription(
          "Buy used and refurbished FANUC, ABB, KUKA, Yaskawa and Universal Robots in India. Filter by brand, payload, reach, application and price."
        ),
      };
    case "parts":
      return {
        title: clampTitle("Industrial Robot Spare Parts in India | RobotVerse"),
        description: clampDescription(
          "Buy robot spare parts in India — controllers, servo motors, teach pendants, cables and drives for FANUC, ABB, KUKA and Yaskawa robots."
        ),
      };
    case "services":
      return {
        title: clampTitle("Industrial Robot Services in India | RobotVerse"),
        description: clampDescription(
          "Find verified robot maintenance, repair, installation, programming and AMC service providers across India."
        ),
      };
    case "logistics":
      return {
        title: clampTitle("Industrial Robot Logistics & Transport | RobotVerse"),
        description: clampDescription(
          "Rigging, packing, customs clearance and heavy-machinery transport partners for industrial robots across India."
        ),
      };
    case "financing":
      return {
        title: clampTitle("Industrial Robot Financing & Leasing | RobotVerse"),
        description: clampDescription(
          "Compare loans, leasing and EMI options for industrial robots and automation equipment from verified finance partners."
        ),
      };
    case "blogs":
      return {
        title: clampTitle("RoboBook — Industrial Robotics Insights | RobotVerse"),
        description: clampDescription(
          "Guides, buying advice, case studies and community posts on industrial robotics and factory automation in India."
        ),
      };
    case "buyer-guide":
      return {
        title: clampTitle("Used Robot Buyer Guide | RobotVerse"),
        description: clampDescription(
          "How to buy a used industrial robot in India: inspection checklist, payload and reach sizing, pricing, financing and installation."
        ),
      };
    case "seller-guide":
      return {
        title: clampTitle("Sell Industrial Robots Online | RobotVerse Seller Guide"),
        description: clampDescription(
          "List your used robots and spare parts on RobotVerse: pricing tips, photos, verification, credits and quotation workflow."
        ),
      };
    case "contact":
      return {
        title: clampTitle("Contact RobotVerse"),
        description: clampDescription(
          "Talk to the RobotVerse team about buying, selling, servicing or financing industrial robots in India."
        ),
      };
    case "about":
      return {
        title: clampTitle("About RobotVerse — India's Industrial Robotics Marketplace"),
        description: clampDescription(
          "RobotVerse connects Indian manufacturers with verified sellers of industrial robots, spare parts, services, logistics and finance."
        ),
      };
    case "auction":
      return {
        title: clampTitle("Industrial Robot Auctions | RobotVerse"),
        description: clampDescription(
          "Bid on used industrial robots and automation equipment in live and sealed-bid auctions on RobotVerse."
        ),
      };
    case "automation-studio":
      return {
        title: clampTitle("Automation Studio: Plan Your Robot Cell | RobotVerse"),
        description: clampDescription(
          "Describe or upload your production process and get robot, gripper and cell-layout recommendations with cycle time and ROI estimates."
        ),
      };
    case "automation-studio-3d":
      return {
        title: "Automation Studio 3D: Simulate Your Robot Cell | RobotVerse",
        description: clampDescription(
          "Describe your production process and watch an industrial robot cell run it in 3D: machine tending, palletizing, pick and place and welding."
        ),
      };
    case "directory-item":
      return {
        title: clampTitle("Robot Specifications | RobotVerse Directory"),
        description: clampDescription(
          "Specifications of industrial robot models, end-of-arm tools and external axes: payload, reach, repeatability, weight, axes and applications."
        ),
      };
    case "robot-application":
      return {
        title: clampTitle("Industrial Robot Applications in India | RobotVerse"),
        description: clampDescription(
          "Robots for welding, palletizing, machine tending, pick and place, painting, dispensing, grinding and assembly: how to choose them and used robots for sale."
        ),
      };
    case "financing-detail":
      return {
        title: clampTitle("Industrial Robot & Machinery Loan | RobotVerse Financing"),
        description: clampDescription("Loan and leasing product for industrial robots and automation equipment in India: amount, interest rate, tenure and eligibility."),
      };
    case "logistics-detail":
      return {
        title: clampTitle("Industrial Robot Transport Service | RobotVerse Logistics"),
        description: clampDescription("Transport service for industrial robots and heavy machinery in India: coverage, weight limits, insurance and tracking."),
      };
    case "robot-news":
      return {
        title: clampTitle("Industrial Robot & Automation News | RobotVerse"),
        description: clampDescription(
          "Latest industrial robot, cobot and factory automation news: new robot launches, Indian manufacturing automation, OEM updates and market trends."
        ),
      };
    case "training-poster":
      return {
        title: clampTitle("Robotics Training Programme | RobotVerse Directory"),
        description: clampDescription(
          "Robot programming and automation training programme listed in the RobotVerse directory: course details, dates, location, fees and enquiry."
        ),
      };
    case "automation-studio-build":
      return {
        title: clampTitle("Build a Robot Cell in 3D: Robot, Gripper & Safety | RobotVerse"),
        description: clampDescription(
          "Drag real industrial robots, grippers, welding torches and safety fencing into a 3D cell. See reach, payload and cycle time, then get a budget and payback."
        ),
      };
    case "automation-studio-playbook":
      return {
        title: clampTitle("Robot Automation Engineer's Playbook & Calculators | RobotVerse"),
        description: clampDescription(
          "How engineers plan robot cells: project stages, welding, machine tending and palletizing rules, robot payload, vacuum gripper, takt time and safety distance calculators."
        ),
      };
    case "directory":
      return {
        title: clampTitle("Robotics Directory: Robots, Tools & Training | RobotVerse"),
        description: clampDescription(
          "Directory of industrial robot models, end-of-arm tools, external axes and robotics training programmes available in India."
        ),
      };
    case "robot-talent":
      return {
        title: clampTitle("Robotics Jobs & Training in India | RobotVerse Talent"),
        description: clampDescription(
          "Find robot programming, maintenance and automation engineering jobs and training programmes across India on RobotVerse Talent."
        ),
      };
    case "robot-compare":
      return {
        title: clampTitle("Compare Industrial Robots Side by Side | RobotVerse"),
        description: clampDescription(
          "Compare payload, reach, axes, repeatability, controller and price of industrial robots listed on RobotVerse side by side."
        ),
      };
    case "pricing":
      return {
        title: clampTitle("Seller Plans & Credit Packs | RobotVerse Pricing"),
        description: clampDescription(
          "Subscription plans and credit packs for selling industrial robots, spare parts and services on RobotVerse, with monthly and annual billing."
        ),
      };
    case "api-docs":
      return {
        title: clampTitle("RobotVerse API Documentation"),
        description: clampDescription(
          "REST API documentation for partners reading RobotVerse robot, spare part and service catalogue data with API keys."
        ),
      };
    case "sitemap-page":
      return {
        title: clampTitle("Sitemap: All RobotVerse Pages"),
        description: clampDescription(
          "Human-readable index of every RobotVerse section: robots, brands, cities, spare parts, services, auctions, RoboBook and guides."
        ),
      };
    case "terms":
      return { title: "Terms of Service | RobotVerse", description: clampDescription("Terms of service for buying, selling and bidding on industrial robots, spare parts and services on RobotVerse.") };
    case "privacy":
      return { title: "Privacy Policy | RobotVerse", description: clampDescription("How RobotVerse collects, uses and protects personal data of buyers, sellers and visitors.") };
    case "cookies":
      return { title: "Cookie Policy | RobotVerse", description: clampDescription("Which cookies RobotVerse uses for sign-in, analytics and preferences, and how to control them.") };
    case "accessibility":
      return { title: "Accessibility Statement | RobotVerse", description: clampDescription("RobotVerse's commitment to an accessible marketplace, supported standards and how to report accessibility issues.") };
    case "private":
      return { title: "RobotVerse", description: DEFAULT_DESCRIPTION };
    case "gone":
      return { title: "Page No Longer Available | RobotVerse", description: DEFAULT_DESCRIPTION };
    default:
      return { title: "Page Not Found | RobotVerse", description: DEFAULT_DESCRIPTION };
  }
}

export const INDEXABLE_ROBOTS = "index,follow";
export const NOINDEX_ROBOTS = "noindex,nofollow";

/* ------------------------------------------------------------------ FAQ */

export interface FaqItem {
  question: string;
  answer: string;
}

const conditionWord = (c?: string | null) => {
  const v = String(c ?? "").toLowerCase();
  if (!v) return null;
  if (v.includes("refurb")) return "refurbished";
  if (v === "new" || v.startsWith("new")) return "new";
  return "used";
};

/** Robot-detail FAQ built only from real listing fields; empty fields are skipped. */
export function robotFaq(
  r: RobotLike & { controller_type?: string | null }
): FaqItem[] {
  const label = [r.brand, r.model || r.name].filter(Boolean).join(" ") || "this robot";
  const out: FaqItem[] = [];
  if (r.payload_capacity != null) {
    out.push({
      question: `What is the payload of this ${label}?`,
      answer: `This ${label} has a rated payload of ${r.payload_capacity} kg${r.reach != null ? ` and a reach of ${r.reach} mm` : ""}.`,
    });
  }
  const loc = String(r.location ?? "").trim();
  if (loc) {
    out.push({ question: `Where is this ${label} located?`, answer: `The robot is located in ${loc}.` });
  }
  const cond = conditionWord(r.condition);
  if (cond) {
    out.push({
      question: `Is this ${label} new, used or refurbished?`,
      answer: `The seller lists it as ${cond}${r.condition && cond === "used" && !/used/i.test(r.condition) ? ` (${String(r.condition).replace(/[-_]+/g, " ")})` : ""}.`,
    });
  }
  if (r.year_manufactured) {
    out.push({
      question: `What year was this ${label} manufactured?`,
      answer: `It was manufactured in ${r.year_manufactured}${r.controller_type ? ` and uses a ${r.controller_type} controller` : ""}.`,
    });
  }
  return out.slice(0, 4);
}

/** Brand-page FAQ built only from the brand's active listings. */
export function brandFaq(
  brandLabel: string,
  rows: Array<{ model?: string | null; location?: string | null; payload_capacity?: number | null; condition?: string | null }>
): FaqItem[] {
  if (!rows.length) return [];
  const out: FaqItem[] = [];
  const used = rows.filter((r) => conditionWord(r.condition) !== "new").length;
  out.push({
    question: `How many used ${brandLabel} robots are listed on RobotVerse?`,
    answer: `${used} used or refurbished ${brandLabel} robot${used === 1 ? " is" : "s are"} listed right now, out of ${rows.length} active ${brandLabel} listing${rows.length === 1 ? "" : "s"}.`,
  });
  const cities = new Map<string, number>();
  rows.forEach((r) => {
    const c = String(r.location ?? "").split(",")[0].trim();
    if (c) cities.set(c, (cities.get(c) ?? 0) + 1);
  });
  if (cities.size) {
    const top = [...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
    out.push({
      question: `Where are the ${brandLabel} robots located?`,
      answer: `Listed ${brandLabel} robots are located in ${top.join(", ")}.`,
    });
  }
  const payloads = rows.map((r) => r.payload_capacity).filter((p): p is number => p != null && !isNaN(Number(p))).map(Number);
  if (payloads.length) {
    const min = Math.min(...payloads);
    const max = Math.max(...payloads);
    out.push({
      question: `What payload range do the listed ${brandLabel} robots cover?`,
      answer: min === max ? `The listed ${brandLabel} robots have a payload of ${min} kg.` : `Payloads range from ${min} kg to ${max} kg.`,
    });
  }
  const models = [...new Set(rows.map((r) => String(r.model ?? "").trim()).filter(Boolean))].slice(0, 6);
  if (models.length) {
    out.push({
      question: `Which ${brandLabel} robot models are available?`,
      answer: `Available models include ${models.join(", ")}.`,
    });
  }
  return out.slice(0, 4);
}

/* -------------------------------------------------- directory model pages */

/** One model in /directory/{robots,tools,axes}.json (short keys keep the files small). */
export interface DirectoryItem {
  id: string;
  b: string;
  m: string;
  n: string;
  t?: string;
  c?: string;
  a?: number;
  p?: number;
  r?: number;
  e?: number;
  w?: number;
  ap?: string[];
  img?: string;
  th?: string;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
const fmt = (v: number) => v.toLocaleString("en-IN");

/** Title, description, spec rows and factual Q&A for a directory model — shared by the page and seo-render. */
export function directoryItemSeo(type: DirectoryType, it: DirectoryItem) {
  const p = num(it.p), r = num(it.r), e = num(it.e), w = num(it.w), a = num(it.a);
  const kindWord = type === "robot" ? (it.t ? `${it.t} robot` : "industrial robot") : type === "tool" ? (it.c || "end-of-arm tool") : (it.c || "robot external axis");
  const apps = (it.ap ?? []).filter((x) => x && x !== "Remote TCP").slice(0, 6);
  const cobot = (it.ap ?? []).includes("Collaborative");
  const specsShort = [p ? `${fmt(p)} kg payload` : "", r ? `${fmt(r)} mm ${type === "axis" ? "stroke" : "reach"}` : ""].filter(Boolean).join(", ");
  // Longest title that fits: name + key specs + brand suffix, dropping parts until it fits.
  const compact = [p ? `${fmt(p)} kg` : "", r ? `${fmt(r)} mm` : ""].filter(Boolean).join(", ");
  const title =
    [
      `${it.n} Specs: ${compact} | RobotVerse`,
      `${it.n} Specifications: ${compact}`,
      `${it.n} Specs: ${compact}`,
      `${it.n} Specifications | RobotVerse`,
      `${it.n} Specifications`,
    ]
      .map((t) => t.replace(/: \s*(\||$)/, " $1").replace(/\s+\|/, " |").trim())
      .find((t) => t.length <= TITLE_MAX) ?? clampTitle(`${it.n} Specifications`);
  const description = clampDescription(
    `${it.n} ${kindWord} by ${it.b}${specsShort ? ` — ${specsShort}` : ""}${e ? `, ±${e} mm repeatability` : ""}${a ? `, ${a} ${a === 1 ? "axis" : "axes"}` : ""}${apps.length ? `. Used for ${apps.slice(0, 3).join(", ").toLowerCase()}` : ""}. Full specs, used units and spare parts in India.`
  );
  const specs: Array<[string, string | null]> = [
    ["Manufacturer", it.b],
    ["Model", it.m],
    [type === "robot" ? "Robot type" : "Category", it.t || it.c || null],
    [type === "tool" ? "Moving axes" : "Axes", a ? String(a) : null],
    ["Payload", p ? `${fmt(p)} kg` : null],
    [type === "axis" ? "Stroke / reach" : "Reach", r ? `${fmt(r)} mm` : null],
    ["Repeatability", e ? `±${e} mm` : null],
    ["Weight", w ? `${fmt(w)} kg` : null],
    ["Collaborative", type === "robot" ? (cobot ? "Yes" : "No") : null],
    ["Applications", apps.length ? apps.join(", ") : null],
    ["RobotVerse ID", it.id],
  ];
  const faq: FaqItem[] = [];
  if (p) faq.push({ question: `What is the payload of the ${it.n}?`, answer: `The ${it.n} has a rated payload of ${fmt(p)} kg. Size it with about 25% margin over the part plus gripper weight.` });
  if (r) faq.push({ question: `What is the ${type === "axis" ? "stroke" : "reach"} of the ${it.n}?`, answer: `The ${it.n} has a ${type === "axis" ? "stroke" : "maximum reach"} of ${fmt(r)} mm.` });
  if (e) faq.push({ question: `How accurate is the ${it.n}?`, answer: `Its position repeatability is ±${e} mm.` });
  if (w) faq.push({ question: `How much does the ${it.n} weigh?`, answer: `The ${type === "robot" ? "manipulator" : "unit"} weighs about ${fmt(w)} kg.` });
  if (apps.length) faq.push({ question: `What is the ${it.n} used for?`, answer: `Typical applications: ${apps.join(", ").toLowerCase()}.` });
  if (type === "robot") faq.push({ question: `Is the ${it.n} a collaborative robot (cobot)?`, answer: cobot ? `Yes. The ${it.n} is a collaborative robot designed to work near people after a risk assessment.` : `No. The ${it.n} is an industrial robot and needs guarding such as a fence or light curtain (ISO 10218-2).` });
  faq.push({ question: `Where can I buy a used ${it.b} robot or spare parts in India?`, answer: `RobotVerse lists used and refurbished ${it.b} robots and spare parts from sellers across India; request a quotation on the listing.` });
  return { title, description, specs, faq, kindWord };
}

/* ------------------------------------------------- robot application guides */

export interface ApplicationGuide {
  slug: string;
  label: string;
  /** Words used to find matching listings. */
  terms: string[];
  /** Matching application name in the Directory catalogue. */
  ap?: string;
  /** Other names people search for. */
  aliases: string[];
  does: string;
  key: string;
  choose: string[];
  around: string[];
  cycle: string;
  faq: FaqItem[];
}

const G = (g: ApplicationGuide) => g;

/**
 * What each robot application involves, how engineers choose the robot and what goes around it.
 * Shared by the application pages (/robots/application/{slug}) and seo-render. Standard engineering
 * facts only — no prices.
 */
export const APPLICATION_GUIDES: ApplicationGuide[] = [
  G({ slug: "welding", label: "Welding", terms: ["welding", "weld", "arc", "mig", "tig"], ap: "Welding",
    aliases: ["robotic welding", "arc welding robot", "MIG welding robot", "MAG welding robot", "TIG welding robot", "welding automation", "robotic welding cell"],
    does: "A welding robot positions the torch along the seam with constant speed, angle and stick-out, so every weld is the same.",
    key: "Weld quality depends on part fit-up and fixture repeatability more than on the robot.",
    choose: ["6-axis arc welding robot with hollow wrist, 6–12 kg payload and 1.4–2 m reach for most parts", "Fixture that locates parts to about ±0.5 mm, or touch sensing and seam tracking", "Positioner or two-station turntable so the operator loads while the robot welds"],
    around: ["Welding power source and wire feeder", "Weld fixture with clamps", "Positioner", "Torch cleaning and wire-cut station", "Fume extraction", "Arc screens and fencing"],
    cycle: "20–120 s per part, depending on weld length",
    faq: [
      { question: "What payload does a welding robot need?", answer: "Torch, cable and wire feeder weigh only a few kilograms, so arc welding robots are usually 6–12 kg payload with 1.4–2 m reach; the reach to every seam matters more than payload." },
      { question: "Why do welding robots need positioners?", answer: "A positioner turns the part so the robot welds flat or horizontal, which gives the best bead and fewest defects, and lets one side be loaded while the other is welded." },
      { question: "What is seam tracking?", answer: "Touch sensing finds where the joint really is and through-arc or laser seam tracking follows it during welding, compensating for part variation and heat distortion." },
    ] }),
  G({ slug: "spot-welding", label: "Spot Welding", terms: ["spot weld", "spot welding", "spot gun"], ap: "Welding",
    aliases: ["spot welding robot", "resistance spot welding robot", "body in white robot", "servo gun robot"],
    does: "A spot welding robot carries a servo welding gun and joins sheet-metal panels with resistance spot welds, typically in automotive body shops.",
    key: "The gun is heavy — 60–150 kg — so spot welding needs high-payload robots.",
    choose: ["165–270 kg payload robot with 2.5–3 m reach", "Servo gun sized for sheet thickness and throat depth", "Dress pack routed along the arm for cables, water and air"],
    around: ["Weld controller (MFDC)", "Tip dresser", "Cooling water circuit", "Fixtures and part clamps", "Fencing and light curtains"],
    cycle: "2–4 s per spot, many spots per panel",
    faq: [
      { question: "What payload does a spot welding robot need?", answer: "Servo spot guns weigh about 60–150 kg, so spot welding robots are usually rated 165–270 kg." },
      { question: "How often are spot welding tips dressed?", answer: "Electrode tips are typically dressed every 200–300 welds to keep the contact face clean and the weld quality consistent." },
    ] }),
  G({ slug: "palletizing", label: "Palletizing", terms: ["palletizing", "palletiser", "palletizer", "pallet"], ap: "Palletizing",
    aliases: ["palletizing robot", "robotic palletizer", "end of line palletizing", "bag palletizing robot", "case palletizing robot", "depalletizing robot"],
    does: "A palletizing robot picks cases, bags or crates from the end of the line and stacks them on pallets in a set pattern.",
    key: "Payload including the gripper, and reach to the far corner at full stack height, decide the robot.",
    choose: ["4-axis palletizing robot of 100–700 kg payload, or a 6-axis robot for mixed tasks", "Payload = product + gripper (often 12–25 kg) plus 15–20% margin", "Reach to the far corner of a 1200 × 1000 mm pallet at up to 2 m stack height"],
    around: ["Vacuum, fork or bag gripper", "Infeed conveyor with stop", "Two pallet stations", "Pallet and slip-sheet dispenser", "Light curtains with muting"],
    cycle: "5–10 s per pick (about 6–12 picks per minute)",
    faq: [
      { question: "What is the best robot for palletizing?", answer: "A 4-axis palletizing robot is faster and cheaper for straight stacking; choose payload above product plus gripper weight with 15–20% margin, and reach to the far pallet corner at full height." },
      { question: "Why use two pallet stations?", answer: "With two stations the robot keeps stacking on one pallet while the full one is removed, so the line does not stop." },
      { question: "Can one robot palletize bags and cartons?", answer: "Yes, with a gripper that handles both or an automatic tool changer; bags usually need fork or claw grippers, cartons vacuum grippers." },
    ] }),
  G({ slug: "machine-tending", label: "Machine Tending", terms: ["machine tending", "tending", "cnc", "lathe", "vmc"], ap: "Material Handling",
    aliases: ["CNC machine tending robot", "CNC loading unloading robot", "lathe loading robot", "VMC robot automation", "machine tending cobot"],
    does: "A machine tending robot loads raw blanks into a CNC lathe, machining centre or other machine and unloads finished parts, keeping the machine cutting.",
    key: "Keep the machine running: the robot should be ready with the next blank when the door opens.",
    choose: ["6-axis robot or cobot sized for blank plus dual gripper weight", "Dual gripper so finished and raw parts are swapped in one visit", "Interface to the CNC: door, chuck/vice, cycle start and done signals"],
    around: ["Dual gripper with soft jaws", "Blank and finished-part trays or drawers", "Air blow-off for chips", "Automatic machine door", "Fence or area scanner"],
    cycle: "10–25 s per load/unload",
    faq: [
      { question: "Why use a dual gripper for CNC machine tending?", answer: "A dual gripper takes out the finished part and puts in the next blank in one visit; published cases show load/unload time cut by around 40%." },
      { question: "Can one robot tend two CNC machines?", answer: "Yes, when each machining cycle is longer than two load/unload cycles; the robot serves both machines in turn." },
      { question: "Is a cobot good for machine tending?", answer: "Cobots suit small parts and small batches and can work next to operators after a risk assessment; heavy parts or high speed need an industrial robot with guarding." },
    ] }),
  G({ slug: "injection-moulding", label: "Injection Moulding", terms: ["injection", "moulding", "molding", "imm"],
    aliases: ["injection moulding robot", "sprue picker", "plastic moulding automation", "insert loading robot"],
    does: "An injection moulding robot takes parts and runners out of the open mould, and can load inserts, degate and place parts on a conveyor.",
    key: "The robot must get in and out inside the mould-open time, often 1–3 seconds.",
    choose: ["Top-entry (sprue picker or 3-axis) or side-entry robot", "Euromap 67/73 interface to the moulding machine", "End-of-arm tool with vacuum cups and grippers matched to the part"],
    around: ["Degating station", "Cooling conveyor", "Insert feeder", "Safety guarding interlocked with the machine"],
    cycle: "Matches the moulding cycle, typically 10–60 s",
    faq: [
      { question: "What robot is used for injection moulding?", answer: "Top-entry linear robots (sprue pickers or 3-axis) are most common; 6-axis robots are used for insert loading and post-processing." },
    ] }),
  G({ slug: "press-tending", label: "Press Tending", terms: ["press", "stamping", "sheet metal"],
    aliases: ["press tending robot", "stamping press automation", "sheet metal press robot", "tandem press line robot"],
    does: "A press tending robot loads sheet-metal blanks into a press and unloads the stamped part, often linking several presses in a tandem line.",
    key: "Detect double blanks and interlock every move with the press position.",
    choose: ["Robot sized for blank plus vacuum or magnetic crossbar tooling", "Double-blank detection before loading", "Part-in-die and press-position signals"],
    around: ["Destacker", "Blank washer/oiler", "Crossbar tooling", "Light curtains and guarding"],
    cycle: "Tandem lines run about 8–15 strokes per minute",
    faq: [
      { question: "Why is double-blank detection needed?", answer: "Oiled sheets stick together; loading two blanks can damage the die, so a sensor checks that only one blank is picked." },
    ] }),
  G({ slug: "pick-and-place", label: "Pick & Place", terms: ["pick", "place", "pick-and-place", "pick and place"], ap: "Material Handling",
    aliases: ["pick and place robot", "delta robot", "SCARA robot", "high speed picking robot", "sorting robot"],
    does: "A pick-and-place robot moves products from one place to another — from a conveyor into trays, between machines, or into packaging.",
    key: "Speed and part size decide between a delta, SCARA or 6-axis robot.",
    choose: ["Delta robot for light products at more than about 60 picks per minute", "SCARA for fast, precise vertical picks of small parts", "6-axis robot or cobot for heavier parts or orientation changes"],
    around: ["Vacuum or finger gripper", "Camera with conveyor tracking for random positions", "Infeed and outfeed conveyors"],
    cycle: "0.5–6 s per pick depending on robot type",
    faq: [
      { question: "What is the fastest pick and place robot?", answer: "Delta (parallel) robots are the fastest for light products, often well above 100 picks per minute; SCARA robots are next for small parts." },
      { question: "Can a robot pick from a moving conveyor?", answer: "Yes. A camera finds each part and an encoder tracks the belt so the robot picks on the move without stopping the line." },
    ] }),
  G({ slug: "material-handling", label: "Material Handling", terms: ["material handling", "handling", "loading", "unloading"], ap: "Material Handling",
    aliases: ["material handling robot", "loading unloading robot", "industrial robot arm handling", "part transfer robot"],
    does: "A material handling robot loads, unloads and transfers parts between conveyors, machines, fixtures and racks.",
    key: "Parts must arrive in a known place and orientation, or the robot needs vision.",
    choose: ["Payload = part + gripper + fingers, plus 25% margin", "Reach to every station with margin", "Part-present sensing in the gripper"],
    around: ["Grippers or vacuum tooling", "Conveyors, trays or racks", "Vision for loose parts", "Fence or light curtains"],
    cycle: "4–10 s per transfer",
    faq: [
      { question: "How do I choose a robot for material handling?", answer: "Add part, gripper and finger weights, add about 25% margin, check the robot reaches every station with margin, and add vision only if parts arrive in random positions." },
    ] }),
  G({ slug: "bin-picking", label: "Bin Picking", terms: ["bin picking", "bin-picking", "random"],
    aliases: ["bin picking robot", "3D vision bin picking", "random bin picking"],
    does: "A bin picking robot uses a 3D camera to find parts lying jumbled in a bin, plans a collision-free grasp and picks them one by one.",
    key: "3D vision and collision-aware path planning make or break bin picking.",
    choose: ["3D camera above the bin", "Gripper that reaches into corners without hitting the bin walls", "Re-grip or drop-back routine for failed picks"],
    around: ["3D vision system", "Re-grip station", "Part bins and outfeed"],
    cycle: "6–12 s per part including vision",
    faq: [
      { question: "How reliable is robotic bin picking?", answer: "Well-set-up systems pick about 90–98% of parts first time; the rest are handled by a re-grip or drop-back routine." },
    ] }),
  G({ slug: "packaging", label: "Packaging", terms: ["packaging", "packing", "carton", "box"],
    aliases: ["packaging robot", "packing robot", "case packing robot", "carton packing automation", "food packaging robot"],
    does: "A packaging robot places products into cartons, trays or bags, and can form, fill and close cases at the end of the line.",
    key: "Gentle, fast handling — and the carton erector and sealer set the line pace.",
    choose: ["Delta robot for fast light products, 6-axis for heavier cases", "Washdown-rated robot and food-grade grippers for food", "Camera and conveyor tracking for random product positions"],
    around: ["Carton erector and sealer", "Vacuum or soft gripper", "Checkweigher", "Label printer"],
    cycle: "1–6 s per product",
    faq: [
      { question: "Which robot is best for food packaging?", answer: "Delta robots with washdown (IP67/IP69K) rating and food-grade grippers handle light food at high speed; 6-axis robots pack heavier cases." },
    ] }),
  G({ slug: "painting", label: "Painting", terms: ["painting", "paint", "spray", "coating"], ap: "Painting",
    aliases: ["painting robot", "spray painting robot", "powder coating robot", "coating automation"],
    does: "A painting robot sprays paint or powder over the part with constant gun distance, speed and overlap for an even film.",
    key: "Even film thickness comes from constant gun distance, speed and 50% pass overlap.",
    choose: ["Explosion-proof (ATEX) painting robot for solvent paint", "Electrostatic bells transfer 80–90% of paint vs 30–60% for air spray", "Offline programming with film-thickness simulation"],
    around: ["Paint booth with airflow and filters", "Colour change valves", "Gun cleaning", "Conveyor or turntable"],
    cycle: "20–90 s per part",
    faq: [
      { question: "Why do painting robots need explosion protection?", answer: "Solvent paint creates a hazardous zone; robots and devices inside must be ATEX/IECEx rated or purged so they cannot ignite the vapour." },
    ] }),
  G({ slug: "dispensing", label: "Dispensing", terms: ["dispens", "glue", "adhesive", "sealant", "sealing"], ap: "Dispensing",
    aliases: ["glue dispensing robot", "sealant robot", "adhesive dispensing automation", "bead dispensing robot", "windscreen gluing robot"],
    does: "A dispensing robot lays a bead of glue, sealant or gasket along a path at a controlled flow and speed.",
    key: "Flow must follow robot speed so the bead stays even in corners.",
    choose: ["6-axis robot or SCARA with smooth path control", "Metered pump with speed-dependent flow", "Temperature-controlled material and purge before pot life ends"],
    around: ["Dosing pump and valve", "Bead inspection camera", "Fixture", "Nozzle cleaning"],
    cycle: "10–60 s per part",
    faq: [
      { question: "How is bead quality checked?", answer: "A vision system follows the bead to check width, position and gaps on every part." },
    ] }),
  G({ slug: "grinding", label: "Grinding", terms: ["grind", "grinding", "fettling"], ap: "Finishing",
    aliases: ["grinding robot", "robotic grinding", "fettling robot", "weld grinding robot", "casting grinding robot"],
    does: "A grinding robot removes weld spatter, flash or stock with a spindle or belt, holding constant contact force.",
    key: "Grinding needs constant contact force, not just an accurate path.",
    choose: ["Stiff robot of 20 kg+ payload for spindle and reaction forces", "Force/torque sensor or active compliance flange", "Automatic abrasive change"],
    around: ["Grinding spindle or belt grinder", "Force control", "Dust extraction (ATEX for aluminium)", "Fencing"],
    cycle: "30–180 s per part",
    faq: [
      { question: "Why does robotic grinding need force control?", answer: "Parts and abrasives vary; holding constant force removes the right amount of material, while a position-only path gouges or leaves marks." },
    ] }),
  G({ slug: "polishing", label: "Polishing", terms: ["polish", "buffing", "sanding"], ap: "Finishing",
    aliases: ["polishing robot", "buffing robot", "sanding robot", "surface finishing robot"],
    does: "A polishing robot brings a surface to the required finish with a polishing wheel, belt or sander, in several grit steps.",
    key: "Decide whether the robot holds the tool or holds the part against a fixed wheel.",
    choose: ["Robot holds the part for small parts, the tool for large ones", "Force control for even finish", "Compound application and wheel-wear compensation"],
    around: ["Polishing wheels or belts", "Compound dispenser", "Dust extraction"],
    cycle: "30–180 s per part",
    faq: [
      { question: "Can robots polish curved parts?", answer: "Yes. With force control and a path from CAD, robots polish curved parts such as faucets, cutlery and turbine blades consistently." },
    ] }),
  G({ slug: "deburring", label: "Deburring", terms: ["deburr", "deburring", "chamfer"], ap: "Finishing",
    aliases: ["deburring robot", "robotic deburring", "edge finishing robot"],
    does: "A deburring robot removes sharp edges and burrs left by machining or casting with a compliant spindle or brush.",
    key: "Compliance absorbs part variation so the tool follows the real edge.",
    choose: ["Radially compliant deburring spindle", "Path from CAD with vision or touch offset", "Robot stiff enough for the cutting force"],
    around: ["Compliant spindle", "Tool change", "Chip and dust extraction"],
    cycle: "20–120 s per part",
    faq: [
      { question: "What tool does a deburring robot use?", answer: "A compliant spindle or brush that floats a few millimetres, so it follows edges that vary from part to part." },
    ] }),
  G({ slug: "assembly", label: "Assembly", terms: ["assembly", "assemble", "insert"], ap: "Assembly",
    aliases: ["assembly robot", "robotic assembly", "SCARA assembly", "press fit robot"],
    does: "An assembly robot picks components, aligns them and inserts, presses or fastens them together.",
    key: "Tolerances: chamfers, compliance or force sensing let parts find each other.",
    choose: ["SCARA for fast vertical insertion of small parts", "6-axis robot or cobot for angled work", "Force sensing for tight fits and press-fits"],
    around: ["Part feeders or trays", "Fixtures with locating pins", "Screwdriver or press", "Vision alignment"],
    cycle: "5–20 s per operation",
    faq: [
      { question: "Which robot is best for small-part assembly?", answer: "SCARA robots are fast and rigid for vertical insertion and screwing of small parts; 6-axis robots handle angled insertion." },
    ] }),
  G({ slug: "screw-driving", label: "Screw Driving", terms: ["screw", "fasten", "nutrunner"], ap: "Assembly",
    aliases: ["screw driving robot", "automatic screwdriver robot", "fastening robot", "nutrunner robot"],
    does: "A screw driving robot feeds and tightens screws with a controlled torque and angle.",
    key: "Monitor torque and angle on every screw to catch cross-threads and missing screws.",
    choose: ["Blow-feed or pick-from-presenter screw feeding", "Servo screwdriver with torque/angle record", "Vision to locate holes on variable parts"],
    around: ["Screw feeder", "Servo screwdriver", "Fixture", "Traceability logging"],
    cycle: "2–5 s per screw",
    faq: [
      { question: "How do screw driving robots ensure quality?", answer: "Each screw's torque and angle curve is recorded and checked, flagging cross-threads, stripped holes and missing screws." },
    ] }),
  G({ slug: "inspection", label: "Inspection", terms: ["inspection", "vision", "quality", "measurement"], ap: "Inspection",
    aliases: ["inspection robot", "robot vision inspection", "quality inspection automation", "robotic measurement"],
    does: "An inspection robot presents parts to cameras or sensors — or carries them — to find defects and measure dimensions.",
    key: "Lighting matters more than the camera: control it and the check becomes repeatable.",
    choose: ["About 3–4 pixels across the smallest defect", "Backlight for outlines, dome light for shiny parts, low-angle light for scratches", "Calibrated 3D sensor for measurements"],
    around: ["Camera and lighting", "Reject bin", "Code reader for traceability"],
    cycle: "3–10 s per part",
    faq: [
      { question: "What camera resolution is needed for inspection?", answer: "Plan about 3–4 pixels across the smallest defect: pixels across = field of view ÷ defect size × 4." },
    ] }),
  G({ slug: "cutting", label: "Cutting", terms: ["cutting", "laser cut", "plasma", "waterjet", "trimming"], ap: "Cutting",
    aliases: ["laser cutting robot", "plasma cutting robot", "waterjet cutting robot", "robotic trimming"],
    does: "A cutting robot guides a laser, plasma, waterjet or router head along 3D contours to trim and cut parts.",
    key: "Path accuracy and constant speed decide cut quality.",
    choose: ["Robot with good path accuracy at process speed", "Height sensing for plasma and laser", "Enclosure and fume or water handling"],
    around: ["Cutting head and source", "Fixture", "Fume extraction or water catcher", "Light-tight enclosure for lasers"],
    cycle: "Depends on cut length and material",
    faq: [
      { question: "Can a standard industrial robot do laser cutting?", answer: "Yes for 3D trimming of formed parts; very fine cuts need robots with high path accuracy and a laser-safe enclosure." },
    ] }),
];

const APP_ALIAS: Record<string, string> = { machine_tending: "machine-tending", "cnc-machine-tending": "machine-tending", "injection-molding": "injection-moulding", "pick-place": "pick-and-place", packing: "packaging", gluing: "dispensing", sealing: "dispensing" };

export const applicationGuide = (slugKey: string): ApplicationGuide | null => {
  const k = String(slugKey ?? "").toLowerCase().replace(/_/g, "-");
  const s = APP_ALIAS[k] ?? k;
  return APPLICATION_GUIDES.find((g) => g.slug === s) ?? null;
};

export function applicationMeta(g: ApplicationGuide) {
  return {
    title:
      [`${g.label} Robots in India: Automation Guide & Used Robots`, `${g.label} Robots in India: Guide & Used Robots`, `${g.label} Robots: Automation Guide & Used Robots`]
        .find((t) => t.length <= TITLE_MAX) ?? clampTitle(`${g.label} Robots in India`),
    description: clampDescription(
      `${g.label} robot automation in India: how to choose payload, reach and tooling, safety, cycle time and used ${g.label.toLowerCase()} robots for sale. ${g.aliases.slice(0, 2).join(", ")}.`
    ),
  };
}
