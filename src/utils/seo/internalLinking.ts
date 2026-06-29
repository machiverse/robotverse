/**
 * Internal Linking Engine for RobotVerse
 * Generates safer, canonical-focused internal links
 */

import { INDIAN_CITIES, ROBOT_BRANDS, ROBOT_APPLICATIONS } from "./programmaticSEO";

const BASE_URL = "https://www.robotverse.in";

interface InternalLink {
  url: string;
  text: string;
  title?: string;
  category: "related" | "brand" | "category" | "location" | "service" | "blog";
}

interface RouteAvailability {
  brandPages?: boolean;
  brandUsedPages?: boolean;
  applicationPages?: boolean;
  payloadPages?: boolean;
  cityPages?: boolean;
  robobookPages?: boolean;
}

const DEFAULT_ROUTE_AVAILABILITY: RouteAvailability = {
  brandPages: true,
  brandUsedPages: false,
  applicationPages: false,
  payloadPages: false,
  cityPages: false,
  robobookPages: true,
};

const slugify = (value?: string) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const makeAbsoluteUrl = (url: string) => (url.startsWith("http") ? url : `${BASE_URL}${url}`);

const dedupeLinks = (links: InternalLink[]) => {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.url}::${link.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const limitLinks = (links: InternalLink[], max = 10) => dedupeLinks(links).slice(0, max);

const getBrandUrl = (brand: string, routes: RouteAvailability) =>
  routes.brandPages ? `/robots/brand/${slugify(brand)}` : `/robots?brand=${encodeURIComponent(brand)}`;

const getBrandUsedUrl = (brand: string, routes: RouteAvailability) =>
  routes.brandUsedPages
    ? `/robots/${slugify(brand)}/used`
    : `/robots?brand=${encodeURIComponent(brand)}&condition=used`;

const getApplicationUrl = (application: string, routes: RouteAvailability) =>
  routes.applicationPages
    ? `/robots/application/${slugify(application)}`
    : `/robots?application=${encodeURIComponent(application.toLowerCase())}`;

const getCityUrl = (city: string, routes: RouteAvailability) =>
  routes.cityPages ? `/robots/city/${slugify(city)}` : `/robots?location=${encodeURIComponent(city)}`;

const getBlogHubUrl = (routes: RouteAvailability) => (routes.robobookPages ? "/robobook" : "/blogs");

const extractKnownApplications = (applications: string[] = []) => {
  const normalized = applications.map((app) => app.toLowerCase());
  return ROBOT_APPLICATIONS.filter((known) =>
    normalized.some((app) => app.includes(known.toLowerCase()) || known.toLowerCase().includes(app)),
  );
};

/**
 * Generate internal links for robot detail page
 */
export const generateRobotInternalLinks = (
  robot: any,
  relatedData?: any,
  routeAvailability: RouteAvailability = DEFAULT_ROUTE_AVAILABILITY,
): InternalLink[] => {
  const links: InternalLink[] = [];
  const brand = robot.brand;
  const applications = extractKnownApplications(robot.applications || []);
  const location = robot.location || "";

  if (brand) {
    links.push({
      url: getBrandUrl(brand, routeAvailability),
      text: `More ${brand} Robots`,
      title: `Browse ${brand} industrial robots on RobotVerse`,
      category: "brand",
    });

    links.push({
      url: `/parts/brand/${slugify(brand)}`,
      text: `${brand} Spare Parts`,
      title: `Find ${brand} robot spare parts`,
      category: "related",
    });

    if (routeAvailability.brandUsedPages) {
      links.push({
        url: getBrandUsedUrl(brand, routeAvailability),
        text: `Used ${brand} Robots`,
        title: `Browse used ${brand} robots in India`,
        category: "brand",
      });
    }
  } else {
    links.push({
      url: "/parts",
      text: "Robot Spare Parts",
      title: "Browse robot spare parts",
      category: "related",
    });
  }

  applications.slice(0, 2).forEach((app: string) => {
    links.push({
      url: getApplicationUrl(app, routeAvailability),
      text: `${app} Robots`,
      title: `Industrial robots for ${app.toLowerCase()}`,
      category: "category",
    });
  });

  const cityMatch = INDIAN_CITIES.find((city) => location.toLowerCase().includes(city.toLowerCase()));

  if (cityMatch) {
    links.push({
      url: getCityUrl(cityMatch, routeAvailability),
      text: `Robots in ${cityMatch}`,
      title: `Industrial robots available in ${cityMatch}`,
      category: "location",
    });
  }

  links.push(
    {
      url: "/services",
      text: "Maintenance & Repair Services",
      title: "Industrial robot maintenance and repair services",
      category: "service",
    },
    {
      url: "/financing",
      text: "Robot Financing Options",
      title: "Financing options for industrial robots",
      category: "service",
    },
    {
      url: "/logistics",
      text: "Robot Logistics & Delivery",
      title: "Logistics support for industrial robots",
      category: "service",
    },
    {
      url: getBlogHubUrl(routeAvailability),
      text: "RoboBook Articles",
      title: "Read industrial robotics articles and guides",
      category: "blog",
    },
  );

  if (relatedData?.relatedRobots?.length > 0) {
    relatedData.relatedRobots.slice(0, 3).forEach((r: any) => {
      if (!r?.id) return;
      links.push({
        url: `/robots/${r.id}`,
        text: `${r.brand || ""} ${r.model || r.name || "Robot"}`.trim(),
        title: `View ${r.brand || ""} ${r.model || r.name || "robot"} details`.trim(),
        category: "related",
      });
    });
  }

  return limitLinks(links, 10);
};

/**
 * Generate internal links for spare part detail page
 */
export const generateSparePartInternalLinks = (
  part: any,
  relatedData?: any,
  routeAvailability: RouteAvailability = DEFAULT_ROUTE_AVAILABILITY,
): InternalLink[] => {
  const links: InternalLink[] = [];
  const brand = part.brand;
  const category = part.main_category;
  const compatibleRobots = part.compatible_robots || [];

  if (brand) {
    links.push({
      url: `/parts/brand/${slugify(brand)}`,
      text: `More ${brand} Parts`,
      title: `Browse ${brand} spare parts`,
      category: "brand",
    });

    links.push({
      url: getBrandUrl(brand, routeAvailability),
      text: `${brand} Robots`,
      title: `Browse ${brand} industrial robots`,
      category: "related",
    });
  }

  if (category) {
    links.push({
      url: `/parts/category/${slugify(category)}`,
      text: `${category} Parts`,
      title: `Browse ${category.toLowerCase()} robot parts`,
      category: "category",
    });
  }

  compatibleRobots.slice(0, 3).forEach((robotRef: string) => {
    links.push({
      url: `/robots?search=${encodeURIComponent(robotRef)}`,
      text: `${robotRef} Robots`,
      title: `Find robots matching ${robotRef}`,
      category: "related",
    });
  });

  links.push(
    {
      url: "/robots",
      text: "Browse Industrial Robots",
      title: "Explore industrial robots on RobotVerse",
      category: "related",
    },
    {
      url: "/services",
      text: "Installation Services",
      title: "Professional robot and spare-part installation services",
      category: "service",
    },
  );

  if (relatedData?.relatedParts?.length > 0) {
    relatedData.relatedParts.slice(0, 3).forEach((p: any) => {
      if (!p?.id) return;
      links.push({
        url: `/parts/${p.id}`,
        text: `${p.brand || ""} ${p.name || "Part"}`.trim(),
        title: `View ${p.name || "part"} details`,
        category: "related",
      });
    });
  }

  return limitLinks(links, 10);
};

/**
 * Generate internal links for service page
 */
export const generateServiceInternalLinks = (
  service: any,
  routeAvailability: RouteAvailability = DEFAULT_ROUTE_AVAILABILITY,
): InternalLink[] => {
  const links: InternalLink[] = [];
  const serviceType = service.service_type;

  links.push(
    {
      url: "/robots",
      text: "Browse Robots",
      title: "Browse industrial robots on RobotVerse",
      category: "related",
    },
    {
      url: "/parts",
      text: "Order Spare Parts",
      title: "Find robot spare parts",
      category: "related",
    },
  );

  const serviceTypes = ["Maintenance", "Repair", "Installation", "Training"];
  serviceTypes.forEach((type) => {
    if (type.toLowerCase() !== serviceType?.toLowerCase()) {
      links.push({
        url: `/services?type=${encodeURIComponent(type.toLowerCase())}`,
        text: `${type} Services`,
        title: `Robot ${type.toLowerCase()} services`,
        category: "category",
      });
    }
  });

  ROBOT_BRANDS.slice(0, 4).forEach((brand) => {
    links.push({
      url: getBrandUrl(brand, routeAvailability),
      text: `${brand} Robots`,
      title: `Browse ${brand} robots and related support`,
      category: "brand",
    });
  });

  return limitLinks(links, 10);
};

/**
 * Generate internal links for RoboBook article page
 */
export const generateBlogInternalLinks = (
  article: any,
  relatedData?: any,
  routeAvailability: RouteAvailability = DEFAULT_ROUTE_AVAILABILITY,
): InternalLink[] => {
  const links: InternalLink[] = [];
  const tags = article.tags || [];
  const contentText = `${article.title || ""} ${article.content || ""}`.toLowerCase();

  ROBOT_BRANDS.forEach((brand) => {
    if (contentText.includes(brand.toLowerCase())) {
      links.push({
        url: getBrandUrl(brand, routeAvailability),
        text: `${brand} Robots`,
        title: `Browse ${brand} industrial robots`,
        category: "brand",
      });
    }
  });

  ROBOT_APPLICATIONS.forEach((application) => {
    if (contentText.includes(application.toLowerCase())) {
      links.push({
        url: getApplicationUrl(application, routeAvailability),
        text: `${application} Robots`,
        title: `Industrial robots for ${application.toLowerCase()}`,
        category: "category",
      });
    }
  });

  tags.slice(0, 2).forEach((tag: string) => {
    links.push({
      url: `${getBlogHubUrl(routeAvailability)}?tag=${encodeURIComponent(tag)}`,
      text: `${tag} Articles`,
      title: `More articles about ${tag}`,
      category: "blog",
    });
  });

  links.push(
    {
      url: "/robots",
      text: "Browse Industrial Robots",
      title: "Explore industrial robots on RobotVerse",
      category: "related",
    },
    {
      url: "/services",
      text: "Robot Services",
      title: "Professional robot services",
      category: "service",
    },
    {
      url: "/parts",
      text: "Spare Parts",
      title: "Robot spare parts and components",
      category: "related",
    },
    {
      url: getBlogHubUrl(routeAvailability),
      text: "All RoboBook Articles",
      title: "Browse all RoboBook articles",
      category: "blog",
    },
  );

  if (relatedData?.relatedArticles?.length > 0) {
    relatedData.relatedArticles.slice(0, 3).forEach((a: any) => {
      if (!a?.id && !a?.slug) return;
      links.push({
        url: `/robobook/${a.slug || a.id}`,
        text: a.title,
        title: `Read: ${a.title}`,
        category: "blog",
      });
    });
  }

  return limitLinks(links, 10);
};

/**
 * Generate internal links for listing pages
 */
export const generateListingInternalLinks = (
  type: "robots" | "parts" | "services" | "blogs",
  routeAvailability: RouteAvailability = DEFAULT_ROUTE_AVAILABILITY,
): InternalLink[] => {
  const links: InternalLink[] = [];

  const sections = [
    { url: "/robots", text: "Industrial Robots", show: type !== "robots" },
    { url: "/parts", text: "Spare Parts", show: type !== "parts" },
    { url: "/services", text: "Robot Services", show: type !== "services" },
    { url: getBlogHubUrl(routeAvailability), text: "RoboBook Articles", show: type !== "blogs" },
    { url: "/financing", text: "Financing Options", show: true },
    { url: "/logistics", text: "Logistics Services", show: true },
  ];

  sections
    .filter((s) => s.show)
    .forEach((section) => {
      links.push({
        url: section.url,
        text: section.text,
        title: `Browse ${section.text.toLowerCase()}`,
        category: "related",
      });
    });

  if (type === "robots" || type === "parts") {
    ROBOT_BRANDS.slice(0, 5).forEach((brand) => {
      links.push({
        url: type === "robots" ? getBrandUrl(brand, routeAvailability) : `/parts/brand/${slugify(brand)}`,
        text: `${brand} ${type === "robots" ? "Robots" : "Parts"}`,
        title: `${brand} ${type}`,
        category: "brand",
      });
    });
  }

  if (type === "robots") {
    INDIAN_CITIES.slice(0, 5).forEach((city) => {
      links.push({
        url: getCityUrl(city, routeAvailability),
        text: `Robots in ${city}`,
        title: `Industrial robots in ${city}`,
        category: "location",
      });
    });
  }

  return limitLinks(links, 10);
};

/**
 * Generate homepage internal links
 */
export const generateHomepageInternalLinks = (
  routeAvailability: RouteAvailability = DEFAULT_ROUTE_AVAILABILITY,
): InternalLink[] => {
  const links: InternalLink[] = [
    { url: "/robots", text: "Browse Industrial Robots", title: "Explore industrial robots", category: "related" },
    { url: "/parts", text: "Robot Spare Parts", title: "Find spare parts", category: "related" },
    { url: "/services", text: "Robot Services", title: "Professional robot services", category: "service" },
    { url: "/financing", text: "Robot Financing", title: "Flexible financing options", category: "service" },
    { url: "/logistics", text: "Logistics Services", title: "Robot transportation and logistics", category: "service" },
    {
      url: getBlogHubUrl(routeAvailability),
      text: "RoboBook",
      title: "Industrial robotics articles and guides",
      category: "blog",
    },
  ];

  ROBOT_BRANDS.slice(0, 4).forEach((brand) => {
    links.push({
      url: getBrandUrl(brand, routeAvailability),
      text: `${brand} Robots`,
      title: `Browse ${brand} industrial robots`,
      category: "brand",
    });
  });

  return limitLinks(links, 10);
};

/**
 * Render internal links as HTML
 */
export const renderInternalLinksHTML = (links: InternalLink[]): string => {
  const grouped = links.reduce(
    (acc, link) => {
      if (!acc[link.category]) acc[link.category] = [];
      acc[link.category].push(link);
      return acc;
    },
    {} as Record<string, InternalLink[]>,
  );

  let html = '<div class="seo-internal-links">';

  Object.entries(grouped).forEach(([category, categoryLinks]) => {
    html += `<div class="link-category link-category-${escapeHtml(category)}">`;
    categoryLinks.forEach((link) => {
      html += `<a href="${escapeHtml(link.url)}" title="${escapeHtml(link.title || link.text)}">${escapeHtml(link.text)}</a>`;
    });
    html += "</div>";
  });

  html += "</div>";
  return html;
};

export const resolveInternalLinkUrls = (links: InternalLink[]) =>
  links.map((link) => ({
    ...link,
    absoluteUrl: makeAbsoluteUrl(link.url),
  }));
