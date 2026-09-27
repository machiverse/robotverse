// seo-render: public, read-only JSON snapshot of any public RobotVerse route so
// crawlers (and the Cloudflare bot worker) can read the real page metadata,
// JSON-LD and body copy without executing JavaScript.
//
//   GET /functions/v1/seo-render?path=%2Frobots%2F<uuid>
//   -> { status, title, description, canonical, image, ogType, robots, jsonld, bodyHtml }
//
// Titles/descriptions/canonicals come from ../_shared/seoText.ts, which is a
// byte-identical copy of src/lib/seo/seoText.ts used by the client head, so the
// server snapshot and the SPA can never disagree.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  SITE_URL,
  DEFAULT_DESCRIPTION,
  canonicalFor,
  classifyPath,
  clampDescription,
  clampTitle,
  collectionDescription,
  collectionTitle,
  inr,
  INDEXABLE_ROBOTS,
  NOINDEX_ROBOTS,
  partDescription,
  partTitle,
  postDescription,
  postTitle,
  robotDescription,
  robotTitle,
  staticMeta,
  titleCaseSlug,
  robotFaq,
  brandFaq,
  type FaqItem,
  type RouteKind,
} from "../_shared/seoText.ts";

const DEFAULT_OG = `${SITE_URL}/robotverse-logo.jpg`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const jsonHeaders = () =>
  new Headers({
    ...corsHeaders,
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=600",
  });

type Client = ReturnType<typeof createClient>;

interface Snapshot {
  status: number;
  title: string;
  description: string;
  canonical: string;
  image: string | null;
  ogType: string;
  robots: string;
  jsonld: unknown;
  bodyHtml: string;
}

/* ------------------------------------------------------------- html helpers */

const esc = (s: unknown) =>
  String(s ?? "").replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" }[c]!)
  );

const stripTags = (s: unknown) =>
  String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const abs = (u?: string | null) =>
  !u ? null : u.startsWith("http") ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;

const firstImage = (images: unknown): string | null => {
  if (Array.isArray(images) && images.length) return abs(String(images[0]));
  if (typeof images === "string" && images) return abs(images);
  return null;
};

const navHtml = () =>
  `<header><nav aria-label="Primary"><ul>` +
  `<li><a href="/robots">Industrial Robots</a></li>` +
  `<li><a href="/parts">Spare Parts</a></li>` +
  `<li><a href="/services">Services</a></li>` +
  `<li><a href="/blogs">RoboBook</a></li>` +
  `</ul></nav></header>`;

const footerHtml = () =>
  `<footer><nav aria-label="Footer"><ul>` +
  `<li><a href="/about">About RobotVerse</a></li>` +
  `<li><a href="/contact">Contact</a></li>` +
  `<li><a href="/buyer-guide">Buyer Guide</a></li>` +
  `<li><a href="/seller-guide">Seller Guide</a></li>` +
  `<li><a href="/logistics">Logistics</a></li>` +
  `<li><a href="/financing">Financing</a></li>` +
  `</ul></nav></footer>`;

const crumbHtml = (trail: Array<{ name: string; path: string }>) =>
  `<nav aria-label="Breadcrumb"><ol>` +
  trail
    .map((t, i) =>
      i === trail.length - 1
        ? `<li>${esc(t.name)}</li>`
        : `<li><a href="${esc(t.path)}">${esc(t.name)}</a></li>`
    )
    .join("") +
  `</ol></nav>`;

const specTable = (rows: Array<[string, string | number | null | undefined]>) => {
  const body = rows
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join("");
  return body ? `<table><caption>Specifications</caption><tbody>${body}</tbody></table>` : "";
};

const linkList = (items: Array<{ url: string; label: string }>, heading: string) =>
  items.length
    ? `<section><h2>${esc(heading)}</h2><ul>` +
      items.map((i) => `<li><a href="${esc(i.url)}">${esc(i.label)}</a></li>`).join("") +
      `</ul></section>`
    : "";

const page = (inner: string) => `${navHtml()}<main>${inner}</main>${footerHtml()}`;

/* --------------------------------------------------------------- json-ld */

const graph = (nodes: unknown[]) => ({
  "@context": "https://schema.org",
  "@graph": nodes.filter(Boolean),
});

const breadcrumbNode = (trail: Array<{ name: string; path: string }>) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: t.name,
    item: `${SITE_URL}${t.path}`,
  })),
});

const itemListNode = (items: Array<{ name: string; url: string }>) => ({
  "@type": "ItemList",
  numberOfItems: items.length,
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    url: `${SITE_URL}${it.url}`,
  })),
});

const faqNode = (faq: FaqItem[]) =>
  faq.length
    ? {
        "@type": "FAQPage",
        mainEntity: faq.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: q.answer },
        })),
      }
    : null;

const faqHtml = (faq: FaqItem[]) =>
  faq.length
    ? `<section><h2>Frequently asked questions</h2>` +
      faq.map((q) => `<h3>${esc(q.question)}</h3><p>${esc(q.answer)}</p>`).join("") +
      `</section>`
    : "";

const conditionUrl = (condition?: string | null) => {
  const c = String(condition ?? "").toLowerCase();
  if (c.includes("new")) return "https://schema.org/NewCondition";
  if (c.includes("refurb")) return "https://schema.org/RefurbishedCondition";
  return "https://schema.org/UsedCondition";
};

const sellerNode = {
  "@type": "Organization",
  name: "RobotVerse",
  url: SITE_URL,
};

const organizationNode = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "RobotVerse",
  url: SITE_URL,
  logo: `${SITE_URL}/robotverse-logo.png`,
  description: DEFAULT_DESCRIPTION,
};

const webSiteNode = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "RobotVerse",
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/robots?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const productNode = (opts: {
  name: string;
  brand?: string | null;
  model?: string | null;
  sku?: string | null;
  images: string[];
  description: string;
  price?: number | null;
  currency?: string | null;
  condition?: string | null;
  url: string;
}) => {
  const node: Record<string, unknown> = {
    "@type": "Product",
    name: opts.name,
    description: opts.description,
  };
  if (opts.brand) node.brand = { "@type": "Brand", name: opts.brand };
  if (opts.model) node.model = opts.model;
  if (opts.sku) node.sku = opts.sku;
  if (opts.images.length) node.image = opts.images;
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    itemCondition: conditionUrl(opts.condition),
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}${opts.url}`,
    seller: sellerNode,
  };
  if (opts.price != null) {
    offer.price = Number(opts.price);
    offer.priceCurrency = opts.currency || "INR";
  }
  node.offers = offer;
  return node;
};

/* ----------------------------------------------------------- suppression */

async function suppressedUsers(supabase: Client): Promise<string[]> {
  try {
    const { data } = await supabase.from("profiles").select("user_id").neq("account_status", "active");
    return (data ?? []).map((r: any) => r.user_id).filter(Boolean);
  } catch {
    return [];
  }
}

const notIn = (list: string[]) => `(${list.join(",") || "00000000-0000-0000-0000-000000000000"})`;

/* ----------------------------------------------------------- builders */

const notFound = (path: string): Snapshot => ({
  status: 404,
  title: "Page Not Found | RobotVerse",
  description: DEFAULT_DESCRIPTION,
  canonical: canonicalFor(path),
  image: DEFAULT_OG,
  ogType: "website",
  robots: "noindex",
  jsonld: null,
  bodyHtml: "",
});

const gone = (path: string): Snapshot => ({
  status: 410,
  title: "Page No Longer Available | RobotVerse",
  description: DEFAULT_DESCRIPTION,
  canonical: canonicalFor(path),
  image: DEFAULT_OG,
  ogType: "website",
  robots: "noindex",
  jsonld: null,
  bodyHtml: "",
});

const privatePage = (path: string): Snapshot => ({
  status: 200,
  title: "RobotVerse",
  description: DEFAULT_DESCRIPTION,
  canonical: canonicalFor(path),
  image: DEFAULT_OG,
  ogType: "website",
  robots: NOINDEX_ROBOTS,
  jsonld: null,
  bodyHtml: "",
});

async function buildRobotDetail(supabase: Client, id: string, path: string): Promise<Snapshot> {
  const sup = await suppressedUsers(supabase);
  const { data: r } = await supabase
    .from("robots")
    .select("*")
    .eq("id", id)
    .eq("availability", "available")
    .not("seller_id", "in", notIn(sup))
    .maybeSingle();
  if (!r) return notFound(path);

  const robot: any = r;
  const label = [robot.brand, robot.model || robot.name].filter(Boolean).join(" ") || "Industrial Robot";
  const city = String(robot.location ?? "").split(",")[0].trim();
  const title = robotTitle(robot);
  const description = robotDescription(robot);
  const images = (Array.isArray(robot.images) ? robot.images : []).map((i: string) => abs(i)).filter(Boolean) as string[];
  const priceText = inr(robot.price) ?? "Price on request";
  const faq = robotFaq(robot);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Industrial Robots", path: "/robots" },
    ...(robot.brand ? [{ name: String(robot.brand), path: `/robots/brand/${slug(robot.brand)}` }] : []),
    { name: label, path },
  ];

  const bodyHtml = page(
    crumbHtml(trail) +
      `<h1>${esc(`Used ${label}${city ? ` for Sale in ${city}` : " for Sale"}`)}</h1>` +
      `<p>${esc(description)}</p>` +
      (robot.description ? `<p>${esc(stripTags(robot.description).slice(0, 1200))}</p>` : "") +
      `<p>Price: ${esc(priceText)}${robot.lead_time ? ` &middot; Lead time: ${esc(robot.lead_time)}` : ""}</p>` +
      specTable([
        ["Brand", robot.brand],
        ["Model", robot.model],
        ["Robot type", robot.robot_type],
        ["Condition", robot.condition],
        ["Payload capacity", robot.payload_capacity != null ? `${robot.payload_capacity} kg` : null],
        ["Reach", robot.reach != null ? `${robot.reach} mm` : null],
        ["Repeatability", robot.repeatability != null ? `${robot.repeatability} mm` : null],
        ["Year of manufacture", robot.year_manufactured],
        ["Controller", robot.controller_type],
        ["Location", robot.location],
        ["Availability", robot.availability],
        ["Price", priceText],
      ]) +
      faqHtml(faq) +
      linkList(
        [
          ...(robot.brand
            ? [{ url: `/robots/brand/${slug(robot.brand)}`, label: `More ${robot.brand} robots` }]
            : []),
          ...(city ? [{ url: `/robots/city/${slug(city)}`, label: `Robots in ${city}` }] : []),
          { url: "/robots", label: "All industrial robots" },
          { url: "/parts", label: "Robot spare parts" },
        ],
        "Related pages"
      )
  );

  return {
    status: 200,
    title,
    description,
    canonical: canonicalFor(path),
    image: images[0] ?? DEFAULT_OG,
    ogType: "product",
    robots: INDEXABLE_ROBOTS,
    jsonld: graph([
      productNode({
        name: label,
        brand: robot.brand,
        model: robot.model,
        sku: robot.id,
        images,
        description,
        price: robot.price,
        currency: robot.currency,
        condition: robot.condition,
        url: path,
      }),
      breadcrumbNode(trail),
      faqNode(faq),
    ]),
    bodyHtml,
  };
}

async function buildPartDetail(supabase: Client, id: string, path: string): Promise<Snapshot> {
  const sup = await suppressedUsers(supabase);
  const { data: p } = await supabase
    .from("spare_parts")
    .select("*")
    .eq("id", id)
    .not("seller_id", "in", notIn(sup))
    .maybeSingle();
  if (!p) return notFound(path);

  const part: any = p;
  if (part.quantity != null && Number(part.quantity) <= 0) return notFound(path);

  const label = [part.brand, part.name || part.part_number].filter(Boolean).join(" ") || "Robot Spare Part";
  const title = partTitle(part);
  const description = partDescription(part);
  const images = (Array.isArray(part.images) ? part.images : []).map((i: string) => abs(i)).filter(Boolean) as string[];
  const priceText = inr(part.price) ?? "Price on request";

  const trail = [
    { name: "Home", path: "/" },
    { name: "Spare Parts", path: "/parts" },
    ...(part.brand ? [{ name: String(part.brand), path: `/parts/brand/${slug(part.brand)}` }] : []),
    { name: label, path },
  ];

  const bodyHtml = page(
    crumbHtml(trail) +
      `<h1>${esc(label)}</h1>` +
      `<p>${esc(description)}</p>` +
      (part.description ? `<p>${esc(stripTags(part.description).slice(0, 1200))}</p>` : "") +
      `<p>Price: ${esc(priceText)}</p>` +
      specTable([
        ["Brand", part.brand],
        ["Part number", part.part_number],
        ["Model", part.model],
        ["Category", part.category || part.main_category],
        ["Component type", part.component_type],
        ["Condition", part.condition],
        ["Compatible robots", Array.isArray(part.compatible_robots) ? part.compatible_robots.join(", ") : part.compatible_robots],
        ["Quantity available", part.quantity],
        ["Location", part.location],
        ["Price", priceText],
      ]) +
      linkList(
        [
          ...(part.brand ? [{ url: `/parts/brand/${slug(part.brand)}`, label: `More ${part.brand} parts` }] : []),
          ...(part.category ? [{ url: `/parts/category/${slug(part.category)}`, label: `${part.category} parts` }] : []),
          { url: "/parts", label: "All spare parts" },
          { url: "/robots", label: "Industrial robots for sale" },
        ],
        "Related pages"
      )
  );

  return {
    status: 200,
    title,
    description,
    canonical: canonicalFor(path),
    image: images[0] ?? DEFAULT_OG,
    ogType: "product",
    robots: INDEXABLE_ROBOTS,
    jsonld: graph([
      productNode({
        name: label,
        brand: part.brand,
        model: part.model,
        sku: part.part_number || part.id,
        images,
        description,
        price: part.price,
        currency: part.currency,
        condition: part.condition,
        url: path,
      }),
      breadcrumbNode(trail),
    ]),
    bodyHtml,
  };
}

const slug = (s: unknown) =>
  String(s ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const CITY_ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bombay: "mumbai",
  madras: "chennai",
  calcutta: "kolkata",
  gurgaon: "gurugram",
};

async function buildCollection(
  supabase: Client,
  kind: "robot-brand" | "robot-city" | "part-brand" | "part-category" | "service-city",
  key: string,
  path: string
): Promise<Snapshot> {
  const sup = await suppressedUsers(supabase);
  const wanted = CITY_ALIASES[slug(key)] ?? slug(key);
  const label = titleCaseSlug(wanted);

  let rows: any[] = [];
  let itemPath = (r: any) => `/robots/${r.id}`;
  let itemName = (r: any) => [r.brand, r.model || r.name].filter(Boolean).join(" ") || "Listing";
  let crumbRoot = { name: "Industrial Robots", path: "/robots" };

  if (kind === "robot-brand" || kind === "robot-city") {
    const { data } = await supabase
      .from("robots")
      .select("id, name, brand, model, location, price, payload_capacity, reach, condition, updated_at")
      .eq("availability", "available")
      .not("seller_id", "in", notIn(sup))
      .order("updated_at", { ascending: false })
      .limit(500);
    rows = (data ?? []).filter((r: any) =>
      kind === "robot-brand"
        ? slug(r.brand) === wanted
        : (CITY_ALIASES[slug(String(r.location ?? "").split(",")[0])] ??
            slug(String(r.location ?? "").split(",")[0])) === wanted
    );
  } else if (kind === "part-brand" || kind === "part-category") {
    const { data } = await supabase
      .from("spare_parts")
      .select("id, name, brand, part_number, category, condition, price, location, updated_at")
      .not("seller_id", "in", notIn(sup))
      .order("updated_at", { ascending: false })
      .limit(500);
    rows = (data ?? []).filter((r: any) =>
      kind === "part-brand" ? slug(r.brand) === wanted : slug(r.category) === wanted
    );
    itemPath = (r: any) => `/parts/${r.id}`;
    itemName = (r: any) => [r.brand, r.name || r.part_number].filter(Boolean).join(" ") || "Spare part";
    crumbRoot = { name: "Spare Parts", path: "/parts" };
  } else {
    const { data } = await supabase
      .from("services")
      .select("id, name, service_type, location, description, updated_at")
      .not("provider_id", "in", notIn(sup))
      .order("updated_at", { ascending: false })
      .limit(500);
    rows = (data ?? []).filter((r: any) => {
      const c = slug(String(r.location ?? "").split(",")[0]);
      return (CITY_ALIASES[c] ?? c) === wanted;
    });
    itemPath = (r: any) => `/services/${r.id}`;
    itemName = (r: any) => r.name || r.service_type || "Service";
    crumbRoot = { name: "Services", path: "/services" };
  }

  if (rows.length === 0) return notFound(path);

  const count = rows.length;
  const title = collectionTitle(kind, label, count);
  const description = collectionDescription(kind, label, count);
  const items = rows.slice(0, 50).map((r) => ({ name: itemName(r), url: itemPath(r) }));
  const trail = [{ name: "Home", path: "/" }, crumbRoot, { name: label, path }];
  const faq = kind === "robot-brand" ? brandFaq(String(rows[0]?.brand || label), rows) : [];

  const bodyHtml = page(
    crumbHtml(trail) +
      `<h1>${esc(clampWordsSafe(title))}</h1>` +
      `<p>${esc(description)}</p>` +
      linkList(items, `${count} listing${count === 1 ? "" : "s"}`) +
      faqHtml(faq)
  );

  return {
    status: 200,
    title,
    description,
    canonical: canonicalFor(path),
    image: DEFAULT_OG,
    ogType: "website",
    robots: INDEXABLE_ROBOTS,
    jsonld: graph([
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: canonicalFor(path),
      },
      itemListNode(items),
      breadcrumbNode(trail),
      faqNode(faq),
    ]),
    bodyHtml,
  };
}

// h1 shouldn't carry the " | RobotVerse" suffix.
const clampWordsSafe = (t: string) => t.replace(/\s*\|\s*RobotVerse\s*$/, "");

async function buildPost(
  supabase: Client,
  table: "blogs" | "community_posts",
  key: string,
  path: string
): Promise<Snapshot> {
  const sup = await suppressedUsers(supabase);
  const authorCol = "author_id";
  const { data } = await supabase
    .from(table)
    .select("*")
    .eq("status", "published")
    .or(`slug.eq.${key},id.eq.${isUuid(key) ? key : "00000000-0000-0000-0000-000000000000"}`)
    .limit(1);
  const post: any = (data ?? [])[0];
  if (!post || sup.includes(post[authorCol])) return notFound(path);

  const title = postTitle(post);
  const description = postDescription(post);
  const image = abs(post.image_url || post.featured_image || post.media_url || post.video_thumbnail) ?? DEFAULT_OG;

  let authorName = "RobotVerse";
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, company_name")
      .eq("user_id", post.author_id)
      .maybeSingle();
    authorName = (prof as any)?.full_name || (prof as any)?.company_name || "RobotVerse";
  } catch {
    // author stays generic
  }

  const trail = [
    { name: "Home", path: "/" },
    { name: "RoboBook", path: "/blogs" },
    { name: post.title || "Article", path },
  ];

  const published = post.published_at || post.created_at;
  const bodyHtml = page(
    crumbHtml(trail) +
      `<article>` +
      `<h1>${esc(post.title || "RobotVerse Article")}</h1>` +
      `<p>By ${esc(authorName)}${published ? ` &middot; ${esc(String(published).slice(0, 10))}` : ""}</p>` +
      (post.excerpt ? `<p>${esc(post.excerpt)}</p>` : "") +
      stripTags(post.content)
        .slice(0, 5000)
        .split(/(?<=\.)\s+(?=[A-Z])/)
        .reduce<string[]>((acc, sentence) => {
          if (!acc.length || acc[acc.length - 1].length > 400) acc.push(sentence);
          else acc[acc.length - 1] += ` ${sentence}`;
          return acc;
        }, [])
        .map((p) => `<p>${esc(p)}</p>`)
        .join("") +
      `</article>` +
      linkList(
        [
          { url: "/blogs", label: "More RoboBook articles" },
          { url: "/robots", label: "Industrial robots for sale" },
        ],
        "Read next"
      )
  );

  return {
    status: 200,
    title,
    description,
    canonical: canonicalFor(path),
    image,
    ogType: "article",
    robots: INDEXABLE_ROBOTS,
    jsonld: graph([
      {
        "@type": "BlogPosting",
        headline: clampTitle(post.title || "RobotVerse Article"),
        description,
        image: [image],
        datePublished: published,
        dateModified: post.updated_at || published,
        author: { "@type": "Person", name: authorName },
        publisher: organizationNode,
        mainEntityOfPage: canonicalFor(path),
      },
      breadcrumbNode(trail),
    ]),
    bodyHtml,
  };
}

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

async function buildServiceDetail(supabase: Client, id: string, path: string): Promise<Snapshot> {
  const sup = await suppressedUsers(supabase);
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .not("provider_id", "in", notIn(sup))
    .maybeSingle();
  const svc: any = data;
  if (!svc) return notFound(path);

  const city = String(svc.location ?? "").split(",")[0].trim();
  const name = svc.name || svc.service_type || "Robot Service";
  const title = clampTitle(`${name}${city ? ` in ${city}` : ""} | RobotVerse`);
  const description = clampDescription(
    `${name}${svc.service_type ? ` — ${svc.service_type}` : ""}${city ? ` in ${city}` : ""}. ${stripTags(svc.description)}`
  );
  const trail = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    ...(city ? [{ name: city, path: `/services/${slug(city)}` }] : []),
    { name: name, path },
  ];

  const bodyHtml = page(
    crumbHtml(trail) +
      `<h1>${esc(name)}</h1>` +
      `<p>${esc(description)}</p>` +
      specTable([
        ["Service type", svc.service_type],
        ["Location", svc.location],
        ["Coverage", Array.isArray(svc.coverage) ? svc.coverage.join(", ") : svc.coverage],
        ["Price range", svc.price_range],
        ["Completed jobs", svc.completed_jobs],
      ]) +
      linkList(
        [
          ...(city ? [{ url: `/services/${slug(city)}`, label: `Robot services in ${city}` }] : []),
          { url: "/services", label: "All robot services" },
        ],
        "Related pages"
      )
  );

  return {
    status: 200,
    title,
    description,
    canonical: canonicalFor(path),
    image: DEFAULT_OG,
    ogType: "website",
    robots: INDEXABLE_ROBOTS,
    jsonld: graph([
      {
        "@type": "Service",
        name,
        description,
        serviceType: svc.service_type || undefined,
        areaServed: svc.location || undefined,
        provider: sellerNode,
        url: canonicalFor(path),
      },
      breadcrumbNode(trail),
    ]),
    bodyHtml,
  };
}

async function buildHome(supabase: Client): Promise<Snapshot> {
  const sup = await suppressedUsers(supabase);
  const { data } = await supabase
    .from("robots")
    .select("id, name, brand, model, location, price")
    .eq("availability", "available")
    .not("seller_id", "in", notIn(sup))
    .order("created_at", { ascending: false })
    .limit(20);
  const items = (data ?? []).map((r: any) => ({
    name: [r.brand, r.model || r.name].filter(Boolean).join(" ") || "Industrial robot",
    url: `/robots/${r.id}`,
  }));
  const meta = staticMeta("home");

  const bodyHtml = page(
    `<h1>Buy &amp; Sell Used Industrial Robots in India</h1>` +
      `<p>${esc(meta.description)}</p>` +
      `<p>RobotVerse lists verified industrial robots, spare parts, service providers, logistics partners and finance options for Indian manufacturers.</p>` +
      linkList(items, "Latest robot listings") +
      linkList(
        [
          { url: "/robots", label: "Browse all industrial robots" },
          { url: "/parts", label: "Browse robot spare parts" },
          { url: "/services", label: "Find robot service providers" },
          { url: "/blogs", label: "RoboBook insights" },
        ],
        "Explore RobotVerse"
      )
  );

  return {
    status: 200,
    title: meta.title,
    description: meta.description,
    canonical: canonicalFor("/"),
    image: DEFAULT_OG,
    ogType: "website",
    robots: INDEXABLE_ROBOTS,
    jsonld: graph([organizationNode, webSiteNode, itemListNode(items)]),
    bodyHtml,
  };
}

async function buildStaticIndex(supabase: Client, kind: RouteKind, path: string): Promise<Snapshot> {
  const meta = staticMeta(kind);
  const sup = await suppressedUsers(supabase);
  let items: Array<{ name: string; url: string }> = [];

  if (kind === "robots") {
    const { data } = await supabase
      .from("robots")
      .select("id, name, brand, model")
      .eq("availability", "available")
      .not("seller_id", "in", notIn(sup))
      .order("updated_at", { ascending: false })
      .limit(50);
    items = (data ?? []).map((r: any) => ({
      name: [r.brand, r.model || r.name].filter(Boolean).join(" ") || "Industrial robot",
      url: `/robots/${r.id}`,
    }));
  } else if (kind === "parts") {
    const { data } = await supabase
      .from("spare_parts")
      .select("id, name, brand, part_number")
      .not("seller_id", "in", notIn(sup))
      .order("updated_at", { ascending: false })
      .limit(50);
    items = (data ?? []).map((r: any) => ({
      name: [r.brand, r.name || r.part_number].filter(Boolean).join(" ") || "Spare part",
      url: `/parts/${r.id}`,
    }));
  } else if (kind === "services") {
    const { data } = await supabase
      .from("services")
      .select("id, name, service_type")
      .not("provider_id", "in", notIn(sup))
      .order("updated_at", { ascending: false })
      .limit(50);
    items = (data ?? []).map((r: any) => ({ name: r.name || r.service_type || "Service", url: `/services/${r.id}` }));
  } else if (kind === "blogs") {
    const [{ data: blogs }, { data: posts }] = await Promise.all([
      supabase.from("blogs").select("id, slug, title").eq("status", "published").order("published_at", { ascending: false }).limit(25),
      supabase.from("community_posts").select("id, slug, title").eq("status", "published").order("published_at", { ascending: false }).limit(25),
    ]);
    items = [
      ...(blogs ?? []).map((b: any) => ({ name: b.title || "Article", url: `/blog/${b.slug || b.id}` })),
      ...(posts ?? []).map((p: any) => ({ name: p.title || "Post", url: `/robobook/${p.slug || p.id}` })),
    ];
  }

  const trail = [{ name: "Home", path: "/" }, { name: clampWordsSafe(meta.title), path }];
  const bodyHtml = page(
    crumbHtml(trail) +
      `<h1>${esc(clampWordsSafe(meta.title))}</h1>` +
      `<p>${esc(meta.description)}</p>` +
      linkList(items, items.length ? "Listings" : "")
  );

  return {
    status: 200,
    title: meta.title,
    description: meta.description,
    canonical: canonicalFor(path),
    image: DEFAULT_OG,
    ogType: "website",
    robots: INDEXABLE_ROBOTS,
    jsonld: graph([
      { "@type": "CollectionPage", name: meta.title, description: meta.description, url: canonicalFor(path) },
      items.length ? itemListNode(items) : null,
      breadcrumbNode(trail),
    ]),
    bodyHtml,
  };
}

const DEFAULT_LINKS = [
  { url: "/robots", label: "Industrial robots for sale" },
  { url: "/parts", label: "Robot spare parts" },
  { url: "/services", label: "Robot service providers" },
  { url: "/contact", label: "Contact RobotVerse" },
];

const PAGE_LINKS: Partial<Record<RouteKind, Array<{ url: string; label: string }>>> = {
  "automation-studio": [
    { url: "/automation-studio/3d", label: "Open the 3D robot cell simulation" },
    { url: "/robots", label: "Industrial robots for sale" },
    { url: "/directory", label: "Robotics directory" },
    { url: "/services", label: "Robot integrators and service providers" },
  ],
  "automation-studio-3d": [
    { url: "/automation-studio", label: "Automation Studio process planner" },
    { url: "/robots", label: "Industrial robots for sale" },
    { url: "/robots/compare", label: "Compare robots" },
    { url: "/services", label: "Robot integrators and service providers" },
  ],
  directory: [
    { url: "/directory?tab=robots", label: "Industrial robot models" },
    { url: "/directory?tab=tools", label: "End-of-arm tools" },
    { url: "/directory?tab=axes", label: "External axes" },
    { url: "/directory?tab=training", label: "Training and workshops" },
    { url: "/robots", label: "Industrial robots for sale" },
  ],
  "robot-compare": [
    { url: "/robots", label: "Industrial robots for sale" },
    { url: "/robots/brand/fanuc", label: "FANUC robots" },
    { url: "/robots/brand/abb", label: "ABB robots" },
    { url: "/robots/brand/kuka", label: "KUKA robots" },
  ],
  pricing: [
    { url: "/seller-guide", label: "Seller guide" },
    { url: "/robots", label: "Industrial robots for sale" },
    { url: "/contact", label: "Contact RobotVerse" },
  ],
  "api-docs": [
    { url: "/robots", label: "Robot catalogue" },
    { url: "/parts", label: "Spare parts catalogue" },
    { url: "/contact", label: "Request partner access" },
  ],
  "sitemap-page": [
    { url: "/robots", label: "Industrial robots" },
    { url: "/parts", label: "Spare parts" },
    { url: "/services", label: "Services" },
    { url: "/auctions", label: "Auctions" },
    { url: "/robobook", label: "RoboBook" },
    { url: "/directory", label: "Robotics directory" },
    { url: "/automation-studio/3d", label: "Automation Studio 3D" },
    { url: "/robot-talent", label: "Robot talent" },
    { url: "/buyer-guide", label: "Buyer guide" },
    { url: "/seller-guide", label: "Seller guide" },
  ],
};

function buildInfoPage(kind: RouteKind, path: string, extraNode?: Record<string, unknown>): Snapshot {
  const meta = staticMeta(kind);
  const trail = [{ name: "Home", path: "/" }, { name: clampWordsSafe(meta.title), path }];
  const bodyHtml = page(
    crumbHtml(trail) +
      `<h1>${esc(clampWordsSafe(meta.title))}</h1>` +
      `<p>${esc(meta.description)}</p>` +
      linkList(PAGE_LINKS[kind] ?? DEFAULT_LINKS, "Related pages")
  );
  return {
    status: 200,
    title: meta.title,
    description: meta.description,
    canonical: canonicalFor(path),
    image: DEFAULT_OG,
    ogType: "website",
    robots: INDEXABLE_ROBOTS,
    jsonld: graph([
      extraNode
        ? { name: meta.title, description: meta.description, url: canonicalFor(path), ...extraNode }
        : { "@type": "WebPage", name: meta.title, description: meta.description, url: canonicalFor(path) },
      breadcrumbNode(trail),
    ]),
    bodyHtml,
  };
}


/* ----------------------------------------------------- additional routes */

const webAppNode = {
  "@type": "WebApplication",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: 0, priceCurrency: "INR" },
  publisher: sellerNode,
};

const simplePage = (opts: {
  path: string;
  title: string;
  description: string;
  h1: string;
  trail: Array<{ name: string; path: string }>;
  nodes: unknown[];
  sections: string;
  robots?: string;
  image?: string | null;
  ogType?: string;
}): Snapshot => ({
  status: 200,
  title: opts.title,
  description: opts.description,
  canonical: canonicalFor(opts.path),
  image: opts.image ?? DEFAULT_OG,
  ogType: opts.ogType ?? "website",
  robots: opts.robots ?? INDEXABLE_ROBOTS,
  jsonld: graph([...opts.nodes, breadcrumbNode(opts.trail)]),
  bodyHtml: page(crumbHtml(opts.trail) + `<h1>${esc(opts.h1)}</h1>` + `<p>${esc(opts.description)}</p>` + opts.sections),
});

async function buildAuctions(supabase: Client, path: string): Promise<Snapshot> {
  const sup = await suppressedUsers(supabase);
  const meta = staticMeta("auction");
  const { data } = await supabase
    .from("auctions")
    .select("id, auction_title, status")
    .in("status", ["live", "upcoming"])
    .not("seller_id", "in", notIn(sup))
    .order("end_time", { ascending: true })
    .limit(50);
  const items = (data ?? []).map((a: any) => ({ name: a.auction_title || "Robot auction", url: `/auctions/${a.id}` }));
  const trail = [{ name: "Home", path: "/" }, { name: "Auctions", path }];
  return simplePage({
    path, title: meta.title, description: meta.description, h1: "Industrial Robot Auctions", trail,
    nodes: [
      { "@type": "CollectionPage", name: meta.title, description: meta.description, url: canonicalFor(path) },
      items.length ? itemListNode(items) : null,
    ],
    sections: linkList(items, "Live and upcoming auctions") +
      linkList([{ url: "/robots", label: "Industrial robots for sale" }, { url: "/buyer-guide", label: "Buyer guide" }], "Related pages"),
  });
}

async function buildAuctionDetail(supabase: Client, id: string, path: string): Promise<Snapshot> {
  const sup = await suppressedUsers(supabase);
  const { data } = await supabase
    .from("auctions")
    .select("*")
    .eq("id", id)
    .not("seller_id", "in", notIn(sup))
    .maybeSingle();
  const a: any = data;
  if (!a || a.status === "cancelled") return notFound(path);
  const name = String(a.auction_title || "Industrial robot auction");
  const ended = !["live", "upcoming"].includes(String(a.status));
  const price = a.current_highest_bid ?? a.starting_price;
  const images = (Array.isArray(a.images) ? a.images : []).map((i: string) => abs(i)).filter(Boolean) as string[];
  const title = clampTitle(`${name} Auction | RobotVerse`).includes("RobotVerse")
    ? clampTitle(`${name} Auction | RobotVerse`)
    : clampTitle(`${name} Auction`);
  const description = clampDescription(
    `${name}${a.item_location ? ` in ${a.item_location}` : ""}. ${String(a.status).replace(/^\w/, (c: string) => c.toUpperCase())} auction, ${a.current_highest_bid ? "current bid" : "starting price"} ${inr(price) ?? "on request"}. ${stripTags(a.description)}`
  );
  const trail = [{ name: "Home", path: "/" }, { name: "Auctions", path: "/auctions" }, { name, path }];
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: canonicalFor(path),
    availability: ended ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    seller: sellerNode,
    validFrom: a.start_time,
    priceValidUntil: String(a.end_time ?? "").slice(0, 10) || undefined,
  };
  if (price != null) { offer.price = Number(price); offer.priceCurrency = a.currency || "INR"; }
  return simplePage({
    path, title, description, h1: name, trail, image: images[0] ?? DEFAULT_OG, ogType: "product",
    robots: ended ? NOINDEX_ROBOTS : INDEXABLE_ROBOTS,
    nodes: [{ "@type": "Product", name, description, ...(images.length ? { image: images } : {}), offers: offer }],
    sections:
      specTable([
        ["Status", a.status],
        ["Auction type", a.auction_type],
        ["Starting price", inr(a.starting_price)],
        ["Current highest bid", inr(a.current_highest_bid)],
        ["Starts", String(a.start_time ?? "").slice(0, 16).replace("T", " ")],
        ["Ends", String(a.end_time ?? "").slice(0, 16).replace("T", " ")],
        ["Location", a.item_location],
        ["Total bids", a.total_bids],
        ["Warranty", a.warranty_period],
      ]) +
      (a.description ? `<p>${esc(stripTags(a.description).slice(0, 1500))}</p>` : "") +
      linkList([{ url: "/auctions", label: "All robot auctions" }, { url: "/robots", label: "Industrial robots for sale" }], "Related pages"),
  });
}

async function buildTalent(supabase: Client, path: string): Promise<Snapshot> {
  const meta = staticMeta("robot-talent");
  const { data } = await supabase
    .from("talent_jobs")
    .select("id, title, city")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []).map((j: any) => ({ name: `${j.title}${j.city ? ` — ${j.city}` : ""}`, url: `/robot-talent/jobs/${j.id}` }));
  const trail = [{ name: "Home", path: "/" }, { name: "Robot Talent", path }];
  return simplePage({
    path, title: meta.title, description: meta.description, h1: "Robotics Jobs and Training in India", trail,
    nodes: [
      { "@type": "CollectionPage", name: meta.title, description: meta.description, url: canonicalFor(path) },
      items.length ? itemListNode(items) : null,
    ],
    sections: linkList(items, "Open robotics jobs") +
      linkList([{ url: "/services", label: "Robot service providers" }, { url: "/directory?tab=training", label: "Robotics training directory" }], "Related pages"),
  });
}

const EMPLOYMENT: Record<string, string> = {
  "full-time": "FULL_TIME", full_time: "FULL_TIME", fulltime: "FULL_TIME",
  "part-time": "PART_TIME", part_time: "PART_TIME",
  contract: "CONTRACTOR", contractor: "CONTRACTOR", freelance: "CONTRACTOR",
  internship: "INTERN", intern: "INTERN", temporary: "TEMPORARY",
};

async function buildJob(supabase: Client, id: string, path: string): Promise<Snapshot> {
  const sup = await suppressedUsers(supabase);
  const { data } = await supabase.from("talent_jobs").select("*").eq("id", id).maybeSingle();
  const j: any = data;
  if (!j || j.status !== "open" || sup.includes(j.employer_id)) return notFound(path);
  let company: string | null = null;
  try {
    const { data: prof } = await supabase.from("profiles").select("company_name").eq("user_id", j.employer_id).maybeSingle();
    company = (prof as any)?.company_name || null;
  } catch { /* optional */ }
  const city = j.city || String(j.location ?? "").split(",")[0].trim() || null;
  const title = clampTitle(`${j.title}${city ? ` Job in ${city}` : " Job"} | RobotVerse`);
  const description = clampDescription(
    `${j.title}${company ? ` at ${company}` : ""}${city ? ` in ${city}` : ""}. ${j.experience_min != null ? `${j.experience_min}${j.experience_max != null ? `–${j.experience_max}` : "+"} years experience. ` : ""}${stripTags(j.description)}`
  );
  const node: Record<string, unknown> = {
    "@type": "JobPosting",
    title: j.title,
    description: stripTags(j.description) || j.title,
    datePosted: String(j.created_at).slice(0, 10),
    hiringOrganization: { "@type": "Organization", name: company || "RobotVerse employer" },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", ...(city ? { addressLocality: city } : {}), addressCountry: "IN" },
    },
    directApply: false,
  };
  const et = EMPLOYMENT[String(j.job_type ?? "").toLowerCase()];
  if (et) node.employmentType = et;
  if (Array.isArray(j.skills_required) && j.skills_required.length) node.skills = j.skills_required.join(", ");
  if (j.salary_min != null || j.salary_max != null) {
    node.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "INR",
      value: {
        "@type": "QuantitativeValue",
        ...(j.salary_min != null ? { minValue: Number(j.salary_min) } : {}),
        ...(j.salary_max != null ? { maxValue: Number(j.salary_max) } : {}),
        unitText: "YEAR",
      },
    };
  }
  const trail = [{ name: "Home", path: "/" }, { name: "Robot Talent", path: "/robot-talent" }, { name: j.title, path }];
  return simplePage({
    path, title, description, h1: j.title, trail, nodes: [node],
    sections:
      specTable([
        ["Company", company],
        ["Location", j.location || city],
        ["Job type", j.job_type],
        ["Category", j.category],
        ["Robot brand", j.robot_brand],
        ["Experience", j.experience_min != null ? `${j.experience_min}${j.experience_max != null ? `–${j.experience_max}` : "+"} years` : null],
        ["Skills", Array.isArray(j.skills_required) ? j.skills_required.join(", ") : null],
      ]) +
      (j.description ? `<p>${esc(stripTags(j.description).slice(0, 2000))}</p>` : "") +
      linkList([{ url: "/robot-talent", label: "All robotics jobs" }], "Related pages"),
  });
}

async function buildCompare(key: string, path: string): Promise<Snapshot> {
  const sides = key.toLowerCase().split("-vs-").map((s) => s.trim()).filter(Boolean);
  if (sides.length !== 2) return notFound(path);
  const [a, b] = sides.map(titleCaseSlug);
  const title = clampTitle(`${a} vs ${b} Industrial Robots Compared | RobotVerse`);
  const description = clampDescription(
    `${a} vs ${b}: compare payload, reach, controllers, service support and used prices of ${a} and ${b} industrial robots listed in India.`
  );
  const trail = [{ name: "Home", path: "/" }, { name: "Compare", path: "/robots/compare" }, { name: `${a} vs ${b}`, path }];
  return simplePage({
    path, title, description, h1: `${a} vs ${b} Industrial Robots`, trail,
    nodes: [{ "@type": "WebPage", name: title, description, url: canonicalFor(path) }],
    sections: linkList(
      [
        { url: `/robots/brand/${sides[0]}`, label: `${a} robots for sale` },
        { url: `/robots/brand/${sides[1]}`, label: `${b} robots for sale` },
        { url: "/robots/compare", label: "Compare specific robots side by side" },
      ],
      "Related pages"
    ),
  });
}

async function buildSpares(supabase: Client, key: string, path: string): Promise<Snapshot> {
  const segs = key.split("/").map(titleCaseSlug);
  const label = segs[segs.length - 1];
  const sup = await suppressedUsers(supabase);
  const { data } = await supabase
    .from("spare_parts")
    .select("id, name, brand, part_number, category, main_category, subcategory, component_type")
    .not("seller_id", "in", notIn(sup))
    .limit(1000);
  const wanted = key.split("/").map((s) => slug(s));
  const rows = (data ?? []).filter((r: any) => {
    const vals = [r.main_category, r.category, r.subcategory, r.component_type].map((v) => slug(v));
    return wanted.every((w) => vals.includes(w));
  });
  const count = rows.length;
  const title = clampTitle(`${segs.join(" ")} Robot Spare Parts${count ? ` (${count} listings)` : ""} | RobotVerse`);
  const description = clampDescription(
    `Buy ${label.toLowerCase()} robot spare parts in India${count ? ` — ${count} listing${count === 1 ? "" : "s"}` : ""} from verified sellers, with compatibility, condition and pricing details.`
  );
  const items = rows.slice(0, 50).map((r: any) => ({
    name: [r.brand, r.name || r.part_number].filter(Boolean).join(" ") || "Spare part",
    url: `/parts/${r.id}`,
  }));
  const trail = [
    { name: "Home", path: "/" },
    { name: "Spare Parts", path: "/parts" },
    ...segs.map((s, i) => ({ name: s, path: `/spares/${key.split("/").slice(0, i + 1).join("/")}` })),
  ];
  return simplePage({
    path, title, description, h1: `${label} Robot Spare Parts`, trail,
    robots: count ? INDEXABLE_ROBOTS : "noindex,follow",
    nodes: [
      { "@type": "CollectionPage", name: title, description, url: canonicalFor(path) },
      items.length ? itemListNode(items) : null,
    ],
    sections: linkList(items, `${count} listing${count === 1 ? "" : "s"}`) +
      linkList([{ url: "/parts", label: "All spare parts" }, { url: "/robots", label: "Industrial robots for sale" }], "Related pages"),
  });
}

async function buildSellerRobots(supabase: Client, sellerId: string, path: string): Promise<Snapshot> {
  const { data: prof } = await supabase
    .from("profiles")
    .select("company_name, full_name, account_status")
    .eq("user_id", sellerId)
    .maybeSingle();
  if (!prof || (prof as any).account_status !== "active") return notFound(path);
  const { data } = await supabase
    .from("robots")
    .select("id, name, brand, model")
    .eq("seller_id", sellerId)
    .eq("availability", "available")
    .order("updated_at", { ascending: false })
    .limit(200);
  const rows = data ?? [];
  const seller = (prof as any).company_name || "RobotVerse Seller";
  const count = rows.length;
  const title = clampTitle(`${seller} Industrial Robots for Sale (${count} listings) | RobotVerse`);
  const description = clampDescription(
    `Browse ${count} industrial robot${count === 1 ? "" : "s"} listed by ${seller} on RobotVerse, with specifications, condition and price details.`
  );
  const items = rows.slice(0, 50).map((r: any) => ({
    name: [r.brand, r.model || r.name].filter(Boolean).join(" ") || "Industrial robot",
    url: `/robots/${r.id}`,
  }));
  const trail = [{ name: "Home", path: "/" }, { name: "Industrial Robots", path: "/robots" }, { name: seller, path }];
  return simplePage({
    path, title, description, h1: `Industrial Robots from ${seller}`, trail,
    robots: count > 0 ? INDEXABLE_ROBOTS : NOINDEX_ROBOTS,
    nodes: [
      { "@type": "CollectionPage", name: title, description, url: canonicalFor(path) },
      items.length ? itemListNode(items) : null,
    ],
    sections: linkList(items, `${count} listing${count === 1 ? "" : "s"}`) +
      linkList([{ url: "/robots", label: "All industrial robots" }], "Related pages"),
  });
}

async function buildApplication(key: string, path: string): Promise<Snapshot> {
  const label = titleCaseSlug(key);
  const title = clampTitle(`${label} Robots for Sale in India | RobotVerse`);
  const description = clampDescription(
    `Used and refurbished industrial robots for ${label.toLowerCase()} in India. Compare payload, reach, brand and price, and request quotes from verified sellers.`
  );
  const trail = [{ name: "Home", path: "/" }, { name: "Industrial Robots", path: "/robots" }, { name: `${label} robots`, path }];
  return simplePage({
    path, title, description, h1: `${label} Robots`, trail,
    nodes: [{ "@type": "CollectionPage", name: title, description, url: canonicalFor(path) }],
    sections: linkList(
      [
        { url: "/robots", label: "All industrial robots" },
        { url: "/automation-studio/3d", label: `Simulate a ${label.toLowerCase()} cell in 3D` },
        { url: "/services", label: "Robot integrators" },
      ],
      "Related pages"
    ),
  });
}

/* ----------------------------------------------------------------- handler */

async function render(supabase: Client, rawPath: string): Promise<Snapshot> {
  const match = classifyPath(rawPath);
  const path = match.path;

  switch (match.kind) {
    case "private":
      return privatePage(path);
    case "gone":
      return gone(path);
    case "home":
      return await buildHome(supabase);
    case "robots":
    case "parts":
    case "services":
    case "blogs":
      return await buildStaticIndex(supabase, match.kind, path);
    case "logistics":
    case "financing":
    case "buyer-guide":
    case "seller-guide":
    case "contact":
    case "about":
    case "robot-compare":
    case "pricing":
    case "api-docs":
    case "sitemap-page":
    case "terms":
    case "privacy":
    case "cookies":
    case "accessibility":
      return buildInfoPage(match.kind, path);
    case "automation-studio":
    case "automation-studio-3d":
      return buildInfoPage(match.kind, path, {
        ...webAppNode,
        ...(match.kind === "automation-studio-3d" ? { name: "Automation Studio 3D" } : { name: "Automation Studio" }),
      });
    case "directory":
      return buildInfoPage(match.kind, path, { "@type": "CollectionPage" });
    case "auction":
      return await buildAuctions(supabase, path);
    case "auction-detail":
      return await buildAuctionDetail(supabase, match.key!, path);
    case "robot-talent":
      return await buildTalent(supabase, path);
    case "job":
      return await buildJob(supabase, match.key!, path);
    case "compare":
      return await buildCompare(match.key!, path);
    case "spares":
      return await buildSpares(supabase, match.key!, path);
    case "seller-robots":
      return await buildSellerRobots(supabase, match.key!, path);
    case "robot-application":
      return await buildApplication(match.key!, path);
    case "robot":
      return await buildRobotDetail(supabase, match.key!, path);
    case "part":
      return await buildPartDetail(supabase, match.key!, path);
    case "service":
      return await buildServiceDetail(supabase, match.key!, path);
    case "robot-brand":
    case "robot-city":
    case "part-brand":
    case "part-category":
    case "service-city":
      return await buildCollection(supabase, match.kind, match.key!, path);
    case "blog":
      return await buildPost(supabase, "blogs", match.key!, path);
    case "robobook-post":
      return await buildPost(supabase, "community_posts", match.key!, path);
    default:
      return notFound(path);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path") ?? "/";
    const snapshot = await render(supabase, rawPath);
    return new Response(JSON.stringify(snapshot), { headers: jsonHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("seo-render error:", message);
    return new Response(JSON.stringify({ error: "render_failed", details: message }), {
      status: 500,
      headers: jsonHeaders(),
    });
  }
});
