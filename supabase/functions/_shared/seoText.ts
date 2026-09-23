// Single source of truth for SEO titles, descriptions, canonicals and robots
// values. The `seo-render` edge function uses a byte-identical copy at
// supabase/functions/_shared/seoText.ts — keep the two files in sync so the
// server snapshot and the client head never disagree.

export const SITE_URL = "https://www.robotverse.in";

export const DEFAULT_TITLE =
  "RobotVerse | Buy & Sell Used Industrial Robots in India";
export const DEFAULT_DESCRIPTION =
  "India's marketplace for new, used and refurbished industrial robots, spare parts, services, logistics and financing. Verified FANUC, ABB, KUKA and Yaskawa listings.";

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
  return out.replace(/[\s|,\-–—:]+$/, "");
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
  "/automation-studio",
  "/ai-assistant",
  "/reset-password",
  "/settings",
  "/watchlist",
];

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
};

export function classifyPath(rawPath: string): RouteMatch {
  let path = String(rawPath ?? "/").split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  const lower = path.toLowerCase();

  if (PRIVATE_PREFIXES.some((p) => lower === p || lower.startsWith(`${p}/`)))
    return { kind: "private", path };

  const s = STATIC_ROUTES[lower];
  if (s) return { kind: s, path };

  const seg = path.split("/").filter(Boolean);

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
  if (r.condition) bits.push(String(r.condition).toLowerCase());
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
  if (p.condition) bits.push(String(p.condition).toLowerCase());
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
