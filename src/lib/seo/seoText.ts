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
];

/** Duplicate listing routes that must canonicalise to the primary index. */
export const DUPLICATE_ROUTES: Record<string, string> = {
  "/marketplace/robots": "/robots",
  "/marketplace/parts": "/parts",
  "/marketplace/services": "/services",
};

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
  if (seg[0] === "robots" && seg.length === 3 && seg[1] === "application")
    return { kind: "robot-application", key: seg[2], path };
  // /robots/:brand/used duplicates the brand page — canonicalise to it.
  if (seg[0] === "robots" && seg.length === 3 && seg[2] === "used")
    return { kind: "robot-brand", key: seg[1], path: `/robots/brand/${seg[1].toLowerCase()}` };
  if (seg[0] === "community" && seg.length === 2)
    return { kind: "robobook-post", key: seg[1], path };

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
