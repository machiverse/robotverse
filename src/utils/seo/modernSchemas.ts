/**
 * Modern Schema.org Structured Data for RobotVerse
 * Cleaner, safer JSON-LD aligned with visible content and canonical URLs
 */

const BASE_URL = "https://www.robotverse.in";
const LOGO_URL = `${BASE_URL}/robotverse-logo.png`;
const OG_IMAGE_URL = `${BASE_URL}/og-image.jpg`;

const absoluteUrl = (url?: string) => {
  if (!url) return BASE_URL;
  return url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

const cleanObject = <T extends Record<string, any>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) =>
        value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0),
    ),
  ) as T;

const normalizeCondition = (condition?: string) => {
  const value = (condition || "").toLowerCase();
  if (value === "new") return "https://schema.org/NewCondition";
  if (value === "refurbished") return "https://schema.org/RefurbishedCondition";
  return "https://schema.org/UsedCondition";
};

// ============ ORGANIZATION SCHEMA ============

export const generateOrganizationSchema = () =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: "RobotVerse",
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
    },
    image: OG_IMAGE_URL,
    description: "Marketplace for industrial robots, spare parts, and automation services in India.",
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    contactPoint: [
      cleanObject({
        "@type": "ContactPoint",
        telephone: "+91-8610925352",
        email: "support@robotverse.in",
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Tamil"],
      }),
    ],
  });

// ============ WEBSITE SCHEMA ============

export const generateWebSiteSchema = () =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: "RobotVerse",
    url: BASE_URL,
    description: "Marketplace for industrial robots, spare parts, and automation services in India.",
    publisher: {
      "@id": `${BASE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/robots?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-IN",
  });

// ============ PRODUCT SCHEMA ============

export const generateProductSchema = (product: {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  description?: string;
  price?: number;
  currency?: string;
  condition?: string;
  availability?: string;
  images?: string[];
  payload_capacity?: number;
  reach?: number;
  year_manufactured?: number;
  controller_type?: string;
  applications?: string[];
  location?: string;
  seller?: {
    full_name?: string;
    company_name?: string;
  };
}) => {
  const productName = `${product.brand || ""} ${product.model || product.name}`.trim();
  const productUrl = absoluteUrl(`/robots/${product.id}`);

  const schema: Record<string, any> = cleanObject({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: productName,
    description: product.description || `${productName} industrial robot listed on RobotVerse.`,
    brand: product.brand
      ? {
          "@type": "Brand",
          name: product.brand,
        }
      : undefined,
    model: product.model,
    sku: product.id,
    mpn: product.model,
    image: product.images?.length ? product.images.map((img) => absoluteUrl(img)) : undefined,
    category: "Industrial Robot",
    additionalProperty: [
      product.payload_capacity && {
        "@type": "PropertyValue",
        name: "Payload Capacity",
        value: product.payload_capacity,
        unitText: "kg",
      },
      product.reach && {
        "@type": "PropertyValue",
        name: "Reach",
        value: product.reach,
        unitText: "mm",
      },
      product.year_manufactured && {
        "@type": "PropertyValue",
        name: "Year of Manufacture",
        value: product.year_manufactured,
      },
      product.controller_type && {
        "@type": "PropertyValue",
        name: "Controller Type",
        value: product.controller_type,
      },
    ].filter(Boolean),
    audience: {
      "@type": "Audience",
      audienceType: "Manufacturing and industrial buyers",
    },
    ...(product.location && {
      availableAtOrFrom: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: product.location,
          addressCountry: "IN",
        },
      },
    }),
  });

  if (product.price) {
    schema.offers = cleanObject({
      "@type": "Offer",
      url: productUrl,
      priceCurrency: product.currency || "INR",
      price: String(product.price),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability:
        product.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: normalizeCondition(product.condition),
      seller: {
        "@type": "Organization",
        name: product.seller?.company_name || product.seller?.full_name || "RobotVerse",
        url: BASE_URL,
      },
    });
  }

  return schema;
};

// ============ FAQ SCHEMA ============

export const generateFAQSchema = (faqs: Array<{ question: string; answer: string }>) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faqs || [])
      .filter((faq) => faq?.question && faq?.answer)
      .map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
  });

// ============ BREADCRUMB SCHEMA ============

export const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  });

// ============ ITEM LIST SCHEMA ============

export const generateItemListSchema = (
  items: any[],
  listName: string,
  listType: "robots" | "parts" | "services" = "robots",
) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    description: `Browse ${listName.toLowerCase()} on RobotVerse.`,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 20).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: cleanObject({
        "@type": listType === "services" ? "Service" : "Product",
        name: `${item.brand || ""} ${item.model || item.name || ""}`.trim(),
        url: absoluteUrl(`/${listType}/${item.id}`),
        image: item.images?.[0] ? absoluteUrl(item.images[0]) : item.image ? absoluteUrl(item.image) : undefined,
        description:
          item.description?.substring(0, 150) || `${item.brand || ""} ${item.model || item.name || ""}`.trim(),
        ...(item.price
          ? {
              offers: {
                "@type": "Offer",
                price: String(item.price),
                priceCurrency: item.currency || "INR",
                availability:
                  item.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              },
            }
          : {}),
      }),
    })),
  });

// ============ SERVICE SCHEMA ============

export const generateServiceSchema = (service: {
  id: string;
  name: string;
  service_type?: string;
  description?: string;
  location?: string;
  provider?: {
    full_name?: string;
    company_name?: string;
  };
}) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${BASE_URL}/services/${service.id}#service`,
    name: service.name || service.service_type,
    description: service.description || `Professional ${service.service_type || "industrial robot"} service.`,
    serviceType: service.service_type || "Robot Service",
    provider: {
      "@type": "Organization",
      name: service.provider?.company_name || service.provider?.full_name || "RobotVerse",
      url: BASE_URL,
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: absoluteUrl(`/services/${service.id}`),
    },
    ...(service.location && {
      serviceLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: service.location,
          addressCountry: "IN",
        },
      },
    }),
  });

// ============ ARTICLE SCHEMA ============

export const generateArticleSchema = (article: {
  id: string;
  slug?: string;
  title: string;
  content?: string;
  excerpt?: string;
  author_name?: string;
  created_at: string;
  updated_at?: string;
  image_url?: string;
  tags?: string[];
}) => {
  const articleUrl = absoluteUrl(`/robobook/${article.slug || article.id}`);

  return cleanObject({
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${articleUrl}#article`,
    headline: article.title,
    description: article.excerpt || article.content?.substring(0, 160) || article.title,
    image: article.image_url ? absoluteUrl(article.image_url) : undefined,
    author: {
      "@type": "Person",
      name: article.author_name || "RobotVerse Team",
    },
    publisher: {
      "@id": `${BASE_URL}/#organization`,
    },
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    keywords: article.tags?.length ? article.tags.join(", ") : undefined,
    articleSection: "Industrial Robotics",
    inLanguage: "en-IN",
  });
};

// ============ LOCAL BUSINESS SCHEMA ============

export const generateLocalBusinessSchema = () =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/#localbusiness`,
    name: "RobotVerse",
    url: BASE_URL,
    image: LOGO_URL,
    telephone: "+91-8610925352",
    email: "support@robotverse.in",
    address: {
      "@type": "PostalAddress",
      streetAddress: "No. 309A, ECR, Near PEC & PU,Pillaichavady, Vanur Taluk,Villupuram District,",
      addressLocality: "Pillaichavady",
      addressRegion: "Tamil Nadu",
      postalCode: "605014",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 12.8342,
      longitude: 80.2134,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    priceRange: "₹₹₹",
    currenciesAccepted: "INR",
  });

// ============ HOW-TO SCHEMA ============

export const generateHowToSchema = (howTo: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; image?: string }>;
  totalTime?: string;
}) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howTo.name,
    description: howTo.description,
    totalTime: howTo.totalTime || "PT30M",
    step: howTo.steps.map((step, index) =>
      cleanObject({
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
        image: step.image ? absoluteUrl(step.image) : undefined,
      }),
    ),
  });

// ============ AGGREGATE OFFER SCHEMA ============

export const generateAggregateOfferSchema = (stats: {
  totalProducts: number;
  lowPrice: number;
  highPrice: number;
  currency?: string;
}) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "AggregateOffer",
    offerCount: stats.totalProducts,
    lowPrice: stats.lowPrice,
    highPrice: stats.highPrice,
    priceCurrency: stats.currency || "INR",
  });

// ============ COMBINED PAGE SCHEMAS ============

export const generatePageSchemas = (
  pageType: "home" | "listing" | "product" | "service" | "article",
  data?: any,
): object[] => {
  const schemas: object[] = [generateOrganizationSchema(), generateWebSiteSchema()];

  switch (pageType) {
    case "home":
      schemas.push(generateLocalBusinessSchema());
      break;

    case "listing":
      if (data?.items) {
        schemas.push(generateItemListSchema(data.items, data.listName || "Products", data.listType));
      }
      if (data?.breadcrumbs) {
        schemas.push(generateBreadcrumbSchema(data.breadcrumbs));
      }
      break;

    case "product":
      if (data) {
        schemas.push(generateProductSchema(data));
        if (Array.isArray(data.faqs) && data.faqs.length > 0) {
          schemas.push(generateFAQSchema(data.faqs));
        }
        if (data.breadcrumbs) {
          schemas.push(generateBreadcrumbSchema(data.breadcrumbs));
        }
      }
      break;

    case "service":
      if (data) {
        schemas.push(generateServiceSchema(data));
        if (data.breadcrumbs) {
          schemas.push(generateBreadcrumbSchema(data.breadcrumbs));
        }
      }
      break;

    case "article":
      if (data) {
        schemas.push(generateArticleSchema(data));
        if (data.breadcrumbs) {
          schemas.push(generateBreadcrumbSchema(data.breadcrumbs));
        }
      }
      break;
  }

  return schemas;
};

export default {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateProductSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
  generateItemListSchema,
  generateServiceSchema,
  generateArticleSchema,
  generateLocalBusinessSchema,
  generateHowToSchema,
  generateAggregateOfferSchema,
  generatePageSchemas,
};
