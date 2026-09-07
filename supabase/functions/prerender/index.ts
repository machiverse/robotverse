// prerender: server-rendered, crawlable HTML snapshots of public RobotVerse
// pages for bots that don't execute JavaScript (Googlebot first pass, GPTBot,
// PerplexityBot, ClaudeBot, facebookexternalhit, Twitterbot, LinkedInBot,
// WhatsApp — the allow-list in public/robots.txt).
//
// A Cloudflare Worker sits in front, detects bot user-agents, and proxies them
// here instead of the SPA shell. Human traffic is untouched.
//
// Usage:
//   GET /functions/v1/prerender?path=%2Frobots%2F<id>
//
// Metadata source of truth is public.seo_metadata (same table the sitemap and
// aeo-render functions use); the underlying content tables fill in specs and
// body copy. Titles/descriptions mirror the client-side patterns in
// src/pages/RobotDetails.tsx and src/pages/landing/BrandRobots.tsx.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");
const DEFAULT_OG = `${SITE_URL}/robotverse-logo.jpg`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const htmlHeaders = {
  ...corsHeaders,
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=3600",
};

const DEFAULT_TITLE =
  "RobotVerse | Buy & Sell Used Industrial Robots in India - FANUC, ABB, KUKA, Yaskawa";
const DEFAULT_DESCRIPTION =
  "India's marketplace for new, used, and refurbished industrial robots, spare parts, financing, logistics, and automation services. Browse verified FANUC, ABB, KUKA, and Yaskawa robots by brand, payload, reach, and application.";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Faq = { question: string; answer: string };

interface Page {
  title: string;
  description: string;
  canonical: string; // path
  noIndex?: boolean;
  ogImage?: string | null;
  h1: string;
  summary: string;
  specs?: Array<[string, string]>;
  list?: Array<{ name: string; url: string; sub?: string }>;
  faq?: Faq[];
  links: Array<{ href: string; label: string }>;
  jsonLd?: unknown[];
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" }[c]!)
  );
}

function titleCase(s: string): string {
  return decodeURIComponent(s)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function money(price?: number | null, currency?: string | null): string | null {
  if (price == null) return null;
  const cur = currency || "INR";
  const sym = cur === "INR" ? "Rs. " : `${cur} `;
  return `${sym}${Number(price).toLocaleString("en-IN")}`;
}

function absolute(url?: string | null): string {
  if (!url) return DEFAULT_OG;
  return url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function breadcrumb(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE_URL}${t.path}`,
    })),
  };
}

function itemListSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: `${SITE_URL}${it.url}`,
    })),
  };
}

function productSchema(opts: {
  name: string;
  description: string;
  image?: string | null;
  brand?: string | null;
  sku?: string | null;
  price?: number | null;
  currency?: string | null;
  url: string;
  condition?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description,
    image: opts.image ? [absolute(opts.image)] : undefined,
    brand: opts.brand ? { "@type": "Brand", name: opts.brand } : undefined,
    sku: opts.sku || undefined,
    itemCondition:
      opts.condition && opts.condition.toLowerCase() === "new"
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",
    offers: opts.price
      ? {
          "@type": "Offer",
          price: opts.price,
          priceCurrency: opts.currency || "INR",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}${opts.url}`,
        }
      : undefined,
  };
}

function faqSchema(faq: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

// Mirrors src/utils/seo/programmaticSEO.ts generateRobotFAQs shape.
function robotFaqs(r: any): Faq[] {
  const label = `${r.brand || ""} ${r.model || r.name || ""}`.trim();
  return [
    {
      question: `What is the price of a used ${label} industrial robot in India?`,
      answer: money(r.price, r.currency)
        ? `This ${label} is listed at ${money(r.price, r.currency)} on RobotVerse${r.location ? `, located in ${r.location}` : ""}. Request a quotation to confirm final pricing, GST, and delivery.`
        : `Pricing for this ${label} is available on request. Send a quotation request on RobotVerse and the verified seller will respond with a final price.`,
    },
    {
      question: `What payload and reach does the ${label} have?`,
      answer: `${r.payload_capacity ? `Payload capacity is ${r.payload_capacity} kg. ` : ""}${r.reach ? `Maximum reach is ${r.reach} mm. ` : ""}${r.repeatability ? `Repeatability is ${r.repeatability} mm. ` : ""}Full technical specifications are listed on the product page.`.trim(),
    },
    {
      question: `Is installation, training, and warranty available?`,
      answer: `${r.installation_service ? "Installation service is offered. " : ""}${r.training_included ? "Operator training is included. " : ""}${r.warranty_info ? `Warranty: ${r.warranty_info}. ` : ""}RobotVerse also arranges inspection, logistics, and financing across India.`.trim(),
    },
  ];
}

async function seoRow(supabase: any, contentType: string, key: string) {
  const { data } = await supabase
    .from("seo_metadata")
    .select("*")
    .eq("content_type", contentType)
    .or(`content_id.eq.${key},slug.eq.${key}`)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function withSeoRow(page: Page, meta: any): Page {
  if (!meta) return page;
  return {
    ...page,
    title: meta.meta_title || meta.title || page.title,
    description: meta.meta_description || meta.summary || page.description,
    canonical: meta.canonical_url || page.canonical,
    ogImage: meta.og_image || meta.twitter_image || page.ogImage,
    summary: meta.summary || page.summary,
    faq: Array.isArray(meta.faq) && meta.faq.length ? meta.faq : page.faq,
  };
}

function homePage(): Page {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonical: "/",
    ogImage: DEFAULT_OG,
    h1: "Buy & Sell Used Industrial Robots in India",
    summary: DEFAULT_DESCRIPTION,
    links: [
      { href: "/robots", label: "Industrial robots for sale" },
      { href: "/parts", label: "Robot spare parts" },
      { href: "/services", label: "Automation services" },
      { href: "/robobook", label: "RoboBook community" },
      { href: "/buyer-guide", label: "Buyer guide" },
      { href: "/seller-guide", label: "Seller guide" },
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "RobotVerse",
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/robots?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

const STATIC_PAGES: Record<string, Page> = {
  "/buyer-guide": {
    title: "Industrial Robot Buyer Guide — How to Buy Used Robots in India | RobotVerse",
    description:
      "Step-by-step guide to buying used and refurbished industrial robots in India: how to check payload and reach, verify condition, inspect controllers, arrange logistics, GST, and financing.",
    canonical: "/buyer-guide",
    ogImage: DEFAULT_OG,
    h1: "Industrial Robot Buyer Guide",
    summary:
      "Everything an Indian manufacturer needs before buying a used industrial robot: choosing payload and reach for the application, verifying controller and cabling condition, inspection, negotiating price, GST and duty, logistics, installation, and financing options available through RobotVerse.",
    links: [
      { href: "/robots", label: "Browse robots" },
      { href: "/parts", label: "Browse spare parts" },
      { href: "/", label: "RobotVerse home" },
    ],
  },
  "/seller-guide": {
    title: "Robot Seller Guide — List & Sell Industrial Robots in India | RobotVerse",
    description:
      "How to list, price, and sell used industrial robots and spare parts on RobotVerse: listing requirements, photos and specs, pricing guidance, verified buyer leads, auctions, and payouts.",
    canonical: "/seller-guide",
    ogImage: DEFAULT_OG,
    h1: "Robot Seller Guide",
    summary:
      "How sellers list industrial robots, spare parts, and services on RobotVerse — required specifications and photos, pricing guidance, how buyer leads and quotation requests work, running auctions, and how contact unlocking and commissions are handled.",
    links: [
      { href: "/robots", label: "Browse robots" },
      { href: "/pricing", label: "Seller pricing" },
      { href: "/", label: "RobotVerse home" },
    ],
  },
};

async function buildPage(supabase: any, path: string): Promise<Page> {
  const clean = path.split("?")[0].split("#")[0] || "/";
  const segs = clean.split("/").filter(Boolean).map((s) => decodeURIComponent(s));

  if (segs.length === 0) return homePage();

  if (STATIC_PAGES[`/${segs.join("/")}`]) {
    const base = STATIC_PAGES[`/${segs.join("/")}`];
    return withSeoRow(base, await seoRow(supabase, "page", segs.join("/")));
  }

  const [a, b, c] = segs;

  // ---- robots ----
  if (a === "robots") {
    if (b === "city" && c) return await cityRobots(supabase, c);
    if (b === "brand" && c) return await brandRobots(supabase, c, `/robots/brand/${c}`);
    if (b === "application" && c) return await applicationRobots(supabase, c);
    if (b && c === "used") return await brandRobots(supabase, b, `/robots/${b}/used`, true);
    if (b && UUID_RE.test(b)) return await robotDetail(supabase, b);
  }

  // ---- parts ----
  if (a === "parts") {
    if (b === "brand" && c) return await partsList(supabase, "brand", c);
    if (b === "category" && c) return await partsList(supabase, "category", c);
    if (b && UUID_RE.test(b)) return await partDetail(supabase, b);
  }

  if (a === "services" && b && UUID_RE.test(b)) return await serviceDetail(supabase, b);
  if (a === "robobook" && b && b !== "create") return await postDetail(supabase, b);
  if ((a === "blog" || a === "blogs") && b && b !== "create") return await postDetail(supabase, b, true);

  console.log(`prerender: unmatched path "${clean}" — serving default homepage meta`);
  return { ...homePage(), canonical: clean };
}

// Moderation: this function uses the service role and bypasses RLS, so it must
// apply the same suppression the database applies to browsers. Content owned by
// an account whose profiles.account_status is not 'active' is served as
// not-found / excluded from lists. Suppression is reversible; nothing is deleted.
let _supCache: { at: number; list: string[] } | null = null;
async function suppressedIds(supabase: any): Promise<string[]> {
  if (_supCache && Date.now() - _supCache.at < 60_000) return _supCache.list;
  try {
    const { data } = await supabase.from("profiles").select("user_id").neq("account_status", "active");
    const list = (data ?? []).map((r: any) => r.user_id).filter(Boolean);
    _supCache = { at: Date.now(), list };
    return list;
  } catch (_e) {
    return [];
  }
}
function supFilter(list: string[]): string {
  return `(${list.join(",") || "00000000-0000-0000-0000-000000000000"})`;
}
async function isSuppressed(supabase: any, ownerId: string | null | undefined): Promise<boolean> {
  if (!ownerId) return false;
  return (await suppressedIds(supabase)).includes(ownerId);
}

async function robotDetail(supabase: any, id: string): Promise<Page> {
  const { data: r } = await supabase.from("robots").select("*").eq("id", id).maybeSingle();
  if (!r || await isSuppressed(supabase, r.seller_id)) {
    console.log(`prerender: robot ${id} not found`);
    return { ...homePage(), canonical: `/robots/${id}`, noIndex: true };
  }

  const used = r.condition && r.condition.toLowerCase() === "new" ? "" : "Used ";
  const label = `${r.brand || ""} ${r.model || r.name || ""}`.trim();
  const title = `${used}${label}${r.payload_capacity ? ` ${r.payload_capacity}kg Payload` : ""} Industrial Robot for Sale in India | RobotVerse`;
  const description = `Buy ${used.toLowerCase()}${label} industrial robot in India.${r.payload_capacity ? ` ${r.payload_capacity} kg payload.` : ""}${r.reach ? ` ${r.reach} mm reach.` : ""}${r.robot_type ? ` ${r.robot_type}.` : ""} Verified seller${r.location ? ` in ${r.location}` : ""}. Get quotation, inspection, financing & logistics on RobotVerse — India's industrial robot marketplace.`;
  const canonical = `/robots/${r.id}`;

  const specs: Array<[string, string]> = [];
  const push = (k: string, v: any, suffix = "") => {
    if (v !== null && v !== undefined && v !== "") specs.push([k, `${v}${suffix}`]);
  };
  push("Brand", r.brand);
  push("Model", r.model);
  push("Type", r.robot_type);
  push("Condition", r.condition);
  push("Year of manufacture", r.year_manufactured);
  push("Payload capacity", r.payload_capacity, " kg");
  push("Reach", r.reach, " mm");
  push("Repeatability", r.repeatability, " mm");
  push("Controller", r.controller_type);
  push("Power consumption", r.power_consumption);
  push("Applications", Array.isArray(r.applications) ? r.applications.join(", ") : r.applications);
  push("Price", money(r.price, r.currency));
  push("Location", [r.location, r.state].filter(Boolean).join(", "));
  push("Availability", r.availability);
  push("Quantity", r.quantity);
  const ts = r.technical_specifications && typeof r.technical_specifications === "object" ? r.technical_specifications : {};
  for (const [k, v] of Object.entries(ts)) {
    if (v !== null && v !== undefined && v !== "" && specs.length < 40) specs.push([titleCase(k), String(v)]);
  }

  const page: Page = {
    title,
    description,
    canonical,
    ogImage: r.images?.[0] || DEFAULT_OG,
    h1: `${used}${label} Industrial Robot`,
    summary:
      (r.description as string) ||
      `${label} industrial robot listed on RobotVerse${r.location ? ` in ${r.location}` : ""}. ${r.payload_capacity ? `${r.payload_capacity} kg payload. ` : ""}${r.reach ? `${r.reach} mm reach. ` : ""}Request a quotation from the verified seller.`,
    specs,
    faq: robotFaqs(r),
    links: [
      { href: "/robots", label: "All industrial robots" },
      ...(r.brand ? [{ href: `/robots/brand/${encodeURIComponent(String(r.brand).toLowerCase())}`, label: `More ${r.brand} robots` }] : []),
      ...(r.location ? [{ href: `/robots/city/${encodeURIComponent(String(r.location).split(",")[0].trim().toLowerCase())}`, label: `Robots in ${String(r.location).split(",")[0]}` }] : []),
      { href: "/", label: "RobotVerse home" },
    ],
    jsonLd: [
      productSchema({
        name: `${used}${label} Industrial Robot`,
        description,
        image: r.images?.[0],
        brand: r.brand,
        sku: r.model,
        price: r.price,
        currency: r.currency,
        url: canonical,
        condition: r.condition,
      }),
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Robots", path: "/robots" },
        { name: label || "Robot", path: canonical },
      ]),
    ],
  };
  return withSeoRow(page, await seoRow(supabase, "robot", r.id));
}

async function listingPage(opts: {
  rows: any[];
  title: string;
  description: string;
  canonical: string;
  h1: string;
  summary: string;
  faq?: Faq[];
  extraLinks?: Array<{ href: string; label: string }>;
}): Promise<Page> {
  const list = opts.rows.map((r: any) => ({
    name: `${r.brand || ""} ${r.model || r.name || ""}`.trim() || "Listing",
    url: `/robots/${r.id}`,
    sub: [money(r.price, r.currency), r.location, r.year_manufactured].filter(Boolean).join(" · "),
  }));
  return {
    title: opts.title,
    description: opts.description,
    canonical: opts.canonical,
    // Thin-content guard, mirroring BrandRobots.tsx (items.length < 3)
    noIndex: opts.rows.length < 3,
    ogImage: opts.rows.find((r: any) => r.images?.[0])?.images?.[0] || DEFAULT_OG,
    h1: opts.h1,
    summary: opts.summary,
    list,
    faq: opts.faq,
    links: [
      { href: "/robots", label: "All industrial robots" },
      { href: "/parts", label: "Robot spare parts" },
      ...(opts.extraLinks ?? []),
      { href: "/", label: "RobotVerse home" },
    ],
    jsonLd: [
      itemListSchema(list),
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Robots", path: "/robots" },
        { name: opts.h1, path: opts.canonical },
      ]),
    ],
  };
}

async function brandRobots(supabase: any, brand: string, canonical: string, usedOnly = false): Promise<Page> {
  const label = titleCase(brand);
  let q = supabase
    .from("robots")
    .select("id, brand, model, name, year_manufactured, price, currency, location, images")
    .ilike("brand", label)
    .not("seller_id", "in", supFilter(await suppressedIds(supabase)))
    .order("updated_at", { ascending: false })
    .limit(60);
  if (usedOnly) q = q.neq("condition", "new");
  const { data } = await q;
  const rows = data ?? [];
  const prefix = usedOnly ? "Used " : "";
  return await listingPage({
    rows,
    title: `${prefix}${label} Industrial Robots for Sale in India | RobotVerse`,
    description: `Buy ${usedOnly ? "used" : "used and refurbished"} ${label} industrial robots in India. Compare ${rows.length}+ verified ${label} listings with full specs, photos, and seller details.`,
    canonical,
    h1: `${prefix}${label} Industrial Robots in India`,
    summary: `Browse every verified ${label} industrial robot listed on RobotVerse. Each listing includes payload, reach, controller, condition, and a direct quote-request channel to the seller.`,
    faq: [
      {
        question: `Are ${label} robots good for Indian manufacturing?`,
        answer: `${label} robots are widely deployed in Indian auto, electronics, and metal-fabrication plants. Spare parts, controllers, and trained integrators are available from partners listed on RobotVerse.`,
      },
      {
        question: `What is the typical price of a used ${label} robot?`,
        answer: `Prices depend on payload, reach, year, and controller generation. Listings on RobotVerse show the seller's asking price, and you can request a quotation for the final delivered cost including GST and logistics.`,
      },
    ],
    extraLinks: [{ href: `/parts/brand/${encodeURIComponent(brand.toLowerCase())}`, label: `${label} spare parts` }],
  });
}

async function cityRobots(supabase: any, city: string): Promise<Page> {
  const label = titleCase(city);
  const { data } = await supabase
    .from("robots")
    .select("id, brand, model, name, year_manufactured, price, currency, location, images")
    .ilike("location", `%${label}%`)
    .not("seller_id", "in", supFilter(await suppressedIds(supabase)))
    .order("updated_at", { ascending: false })
    .limit(60);
  const rows = data ?? [];
  return await listingPage({
    rows,
    title: `Industrial Robots for Sale in ${label} | RobotVerse India`,
    description: `Buy used and refurbished industrial robots in ${label}. ${rows.length}+ verified FANUC, ABB, KUKA, and Yaskawa listings with specs, photos, and local inspection.`,
    canonical: `/robots/city/${encodeURIComponent(city.toLowerCase())}`,
    h1: `Industrial Robots in ${label}`,
    summary: `Verified industrial robot listings available in and around ${label}. Each listing shows payload, reach, condition, year, and price, with inspection and logistics arranged through RobotVerse.`,
    faq: [
      {
        question: `Can I inspect a robot in ${label} before buying?`,
        answer: `Yes. RobotVerse arranges on-site inspection with the seller in ${label} before you commit, and can organise transport once the deal is agreed.`,
      },
    ],
  });
}

async function applicationRobots(supabase: any, app: string): Promise<Page> {
  const label = titleCase(app);
  const { data } = await supabase
    .from("robots")
    .select("id, brand, model, name, year_manufactured, price, currency, location, images, applications, robot_type")
    .or(`robot_type.ilike.%${label}%,applications.cs.{${label}}`)
    .not("seller_id", "in", supFilter(await suppressedIds(supabase)))
    .order("updated_at", { ascending: false })
    .limit(60);
  const rows = data ?? [];
  return await listingPage({
    rows,
    title: `${label} Robots for Sale in India — Used & Refurbished | RobotVerse`,
    description: `Buy ${label.toLowerCase()} robots in India. ${rows.length}+ verified listings from FANUC, ABB, KUKA, and Yaskawa with payload, reach, and controller details.`,
    canonical: `/robots/application/${encodeURIComponent(app.toLowerCase())}`,
    h1: `${label} Robots in India`,
    summary: `Industrial robots listed on RobotVerse for ${label.toLowerCase()} applications, with payload, reach, controller, and condition documented on every listing.`,
    faq: [
      {
        question: `Which robot is best for ${label.toLowerCase()}?`,
        answer: `The right robot for ${label.toLowerCase()} depends on part weight, cycle time, and required reach. Filter listings on RobotVerse by payload and reach, or request a recommendation from our team.`,
      },
    ],
  });
}

async function partsList(supabase: any, field: "brand" | "category", value: string): Promise<Page> {
  const label = titleCase(value);
  const { data } = await supabase
    .from("spare_parts")
    .select("id, name, brand, model, part_number, price, currency, location, images, category, main_category")
    .or(field === "brand" ? `brand.ilike.%${label}%` : `category.ilike.%${label}%,main_category.ilike.%${label}%`)
    .not("seller_id", "in", supFilter(await suppressedIds(supabase)))
    .order("updated_at", { ascending: false })
    .limit(60);
  const rows = data ?? [];
  const list = rows.map((p: any) => ({
    name: `${p.brand || ""} ${p.name || ""}`.trim(),
    url: `/parts/${p.id}`,
    sub: [p.part_number, money(p.price, p.currency), p.location].filter(Boolean).join(" · "),
  }));
  const canonical = `/parts/${field}/${encodeURIComponent(value.toLowerCase())}`;
  return {
    title: `${label} Robot Spare Parts for Sale in India | RobotVerse`,
    description: `Buy ${label} robot spare parts in India — servo motors, controllers, teach pendants, cables, and gearboxes. ${rows.length}+ verified listings with part numbers and prices.`,
    canonical,
    noIndex: rows.length < 3,
    ogImage: rows.find((p: any) => p.images?.[0])?.images?.[0] || DEFAULT_OG,
    h1: `${label} Robot Spare Parts`,
    summary: `Verified ${label} robot spare parts listed on RobotVerse, each with part number, compatible robots, condition, and seller location across India.`,
    list,
    links: [
      { href: "/parts", label: "All spare parts" },
      { href: "/robots", label: "Industrial robots" },
      { href: "/", label: "RobotVerse home" },
    ],
    jsonLd: [
      itemListSchema(list),
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Spare Parts", path: "/parts" },
        { name: label, path: canonical },
      ]),
    ],
  };
}

async function partDetail(supabase: any, id: string): Promise<Page> {
  const { data: p } = await supabase.from("spare_parts").select("*").eq("id", id).maybeSingle();
  if (!p || await isSuppressed(supabase, p.seller_id)) {
    console.log(`prerender: spare part ${id} not found`);
    return { ...homePage(), canonical: `/parts/${id}`, noIndex: true };
  }
  const label = `${p.brand || ""} ${p.name || ""}`.trim();
  const canonical = `/parts/${p.id}`;
  const title = `${label}${p.part_number ? ` (${p.part_number})` : ""} — Robot Spare Part for Sale in India | RobotVerse`;
  const description = `Buy ${label} robot spare part in India.${p.part_number ? ` Part number ${p.part_number}.` : ""}${p.condition ? ` Condition: ${p.condition}.` : ""} Verified seller${p.location ? ` in ${p.location}` : ""}. Request a quotation on RobotVerse.`;

  const specs: Array<[string, string]> = [];
  const push = (k: string, v: any) => {
    if (v !== null && v !== undefined && v !== "") specs.push([k, String(v)]);
  };
  push("Brand", p.brand);
  push("Model", p.model);
  push("Part number", p.part_number);
  push("Category", p.main_category || p.category);
  push("Sub category", p.sub_category);
  push("Component type", p.component_type);
  push("Condition", p.condition);
  push("Compatible robots", Array.isArray(p.compatible_robots) ? p.compatible_robots.join(", ") : p.compatible_robots);
  push("Price", money(p.price, p.currency));
  push("Location", [p.location, p.state].filter(Boolean).join(", "));
  push("Quantity", p.quantity);
  const sp = p.specifications && typeof p.specifications === "object" ? p.specifications : {};
  for (const [k, v] of Object.entries(sp)) {
    if (v !== null && v !== undefined && v !== "" && specs.length < 40) specs.push([titleCase(k), String(v)]);
  }

  const page: Page = {
    title,
    description,
    canonical,
    ogImage: p.images?.[0] || DEFAULT_OG,
    h1: `${label} Robot Spare Part`,
    summary:
      (p.description as string) ||
      `${label} spare part listed on RobotVerse${p.location ? ` in ${p.location}` : ""}. Verified seller, quotation available on request.`,
    specs,
    faq: [
      {
        question: `Is this ${label} part genuine and compatible with my robot?`,
        answer: `The listing shows the part number${p.part_number ? ` (${p.part_number})` : ""} and compatible robot models. Send a quotation request with your robot model and the seller will confirm compatibility before dispatch.`,
      },
      {
        question: `How fast can this part be delivered in India?`,
        answer: `Delivery depends on the seller's location${p.location ? ` (${p.location})` : ""}. Most domestic shipments reach major industrial hubs within 2-5 working days; RobotVerse can arrange logistics.`,
      },
    ],
    links: [
      { href: "/parts", label: "All spare parts" },
      ...(p.brand ? [{ href: `/parts/brand/${encodeURIComponent(String(p.brand).toLowerCase())}`, label: `More ${p.brand} parts` }] : []),
      { href: "/robots", label: "Industrial robots" },
      { href: "/", label: "RobotVerse home" },
    ],
    jsonLd: [
      productSchema({
        name: label,
        description,
        image: p.images?.[0],
        brand: p.brand,
        sku: p.part_number,
        price: p.price,
        currency: p.currency,
        url: canonical,
        condition: p.condition,
      }),
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Spare Parts", path: "/parts" },
        { name: label || "Part", path: canonical },
      ]),
    ],
  };
  return withSeoRow(page, await seoRow(supabase, "spare_part", p.id));
}

async function serviceDetail(supabase: any, id: string): Promise<Page> {
  const { data: s } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (!s || await isSuppressed(supabase, s.provider_id)) {
    console.log(`prerender: service ${id} not found`);
    return { ...homePage(), canonical: `/services/${id}`, noIndex: true };
  }
  const canonical = `/services/${s.id}`;
  const title = `${s.name} — ${s.service_type || "Robot Automation Service"}${s.location ? ` in ${s.location}` : ""} | RobotVerse`;
  const description = `${s.name}: ${s.service_type || "industrial robot service"}${s.location ? ` available in ${s.location}` : ""}. ${s.price_range ? `Indicative pricing ${s.price_range}. ` : ""}Verified provider on RobotVerse — India's industrial robot marketplace.`;

  const specs: Array<[string, string]> = [];
  if (s.service_type) specs.push(["Service type", s.service_type]);
  if (s.location) specs.push(["Location", s.location]);
  if (s.coverage) specs.push(["Coverage", Array.isArray(s.coverage) ? s.coverage.join(", ") : String(s.coverage)]);
  if (s.price_range) specs.push(["Price range", String(s.price_range)]);
  if (s.specializations) specs.push(["Specializations", Array.isArray(s.specializations) ? s.specializations.join(", ") : String(s.specializations)]);
  if (s.completed_jobs) specs.push(["Completed jobs", String(s.completed_jobs)]);
  if (s.rating) specs.push(["Rating", String(s.rating)]);

  const page: Page = {
    title,
    description,
    canonical,
    ogImage: DEFAULT_OG,
    h1: s.name,
    summary: (s.description as string) || description,
    specs,
    links: [
      { href: "/services", label: "All automation services" },
      { href: "/robots", label: "Industrial robots" },
      { href: "/", label: "RobotVerse home" },
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: s.name,
        description: s.description || description,
        serviceType: s.service_type || undefined,
        areaServed: s.location || "India",
        provider: { "@type": "Organization", name: "RobotVerse" },
        url: `${SITE_URL}${canonical}`,
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Services", path: "/services" },
        { name: s.name, path: canonical },
      ]),
    ],
  };
  return withSeoRow(page, await seoRow(supabase, "service", s.id));
}

async function postDetail(supabase: any, key: string, isBlog = false): Promise<Page> {
  const table = isBlog ? "blogs" : "community_posts";
  const imgCol = isBlog ? "image_url" : "media_url";
  const { data: post } = await supabase
    .from(table)
    .select("*")
    .or(`${UUID_RE.test(key) ? `id.eq.${key},` : ""}slug.eq.${key}`)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();

  if (!post) {
    console.log(`prerender: ${table} "${key}" not found or unpublished`);
    return { ...homePage(), canonical: `/${isBlog ? "blog" : "robobook"}/${key}`, noIndex: true };
  }

  const slug = post.slug || post.id;
  const canonical = `/${isBlog ? "blog" : "robobook"}/${slug}`;
  const plain = String(post.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const description = post.meta_description || post.excerpt || plain.slice(0, 160);
  const image = post.featured_image || post[imgCol] || DEFAULT_OG;

  const page: Page = {
    title: post.meta_title || `${post.title} | RobotVerse RoboBook`,
    description,
    canonical: post.canonical_url || canonical,
    ogImage: image,
    h1: post.title,
    summary: plain.slice(0, 1200) || description,
    faq: [],
    links: [
      { href: "/robobook", label: "RoboBook — robotics insights" },
      { href: "/robots", label: "Industrial robots for sale" },
      { href: "/", label: "RobotVerse home" },
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description,
        image: [absolute(image)],
        datePublished: post.published_at || post.created_at,
        dateModified: post.updated_at || post.published_at || post.created_at,
        keywords: Array.isArray(post.focus_keywords) ? post.focus_keywords.join(", ") : undefined,
        publisher: { "@type": "Organization", name: "RobotVerse" },
        mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${canonical}` },
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "RoboBook", path: "/robobook" },
        { name: post.title, path: canonical },
      ]),
    ],
  };
  return withSeoRow(page, await seoRow(supabase, isBlog ? "blog" : "community_post", slug));
}

function render(page: Page): string {
  const canonical = page.canonical.startsWith("http") ? page.canonical : `${SITE_URL}${page.canonical}`;
  const og = absolute(page.ogImage);
  const robotsMeta = page.noIndex ? "noindex, follow" : "index, follow";
  const jsonLd = [...(page.jsonLd ?? [])];
  if (page.faq?.length) jsonLd.push(faqSchema(page.faq));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}" />
<meta name="robots" content="${robotsMeta}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta property="og:site_name" content="RobotVerse" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(page.title)}" />
<meta property="og:description" content="${esc(page.description)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:image" content="${esc(og)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(page.title)}" />
<meta name="twitter:description" content="${esc(page.description)}" />
<meta name="twitter:image" content="${esc(og)}" />
${jsonLd.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n")}
</head>
<body>
<header><a href="${SITE_URL}/">RobotVerse</a></header>
<main>
<h1>${esc(page.h1)}</h1>
<p>${esc(page.summary)}</p>
${
  page.specs?.length
    ? `<section><h2>Specifications</h2><dl>${page.specs
        .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
        .join("")}</dl></section>`
    : ""
}
${
  page.list?.length
    ? `<section><h2>Listings</h2><ul>${page.list
        .map((i) => `<li><a href="${SITE_URL}${esc(i.url)}">${esc(i.name)}</a>${i.sub ? ` — ${esc(i.sub)}` : ""}</li>`)
        .join("")}</ul></section>`
    : ""
}
${
  page.faq?.length
    ? `<section><h2>Frequently asked questions</h2>${page.faq
        .map((f) => `<article><h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p></article>`)
        .join("")}</section>`
    : ""
}
<nav><h2>Explore RobotVerse</h2><ul>${page.links
    .map((l) => `<li><a href="${SITE_URL}${esc(l.href)}">${esc(l.label)}</a></li>`)
    .join("")}</ul></nav>
<p><a href="${esc(canonical)}">View this page on RobotVerse</a></p>
</main>
<footer><p>RobotVerse — India's industrial robot marketplace.</p></footer>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "/";

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const page = await buildPage(supabase, path);
    return new Response(render(page), {
      headers: { ...htmlHeaders, "X-Robots-Tag": page.noIndex ? "noindex, follow" : "index, follow" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error(`prerender error for "${path}":`, msg);
    // Never serve a blank or error page to a crawler — fall back to home meta.
    return new Response(render({ ...homePage(), canonical: path.startsWith("/") ? path : "/" }), {
      headers: htmlHeaders,
    });
  }
});
