/**
 * Enhanced JSON-LD Schema Generators for RobotVerse
 * Safer, cleaner schema output aligned to visible content
 */

const BASE_URL = "https://www.robotverse.in";
const LOGO_URL = `${BASE_URL}/robotverse-logo.jpg`;

type FAQItem = { question: string; answer: string };
type BreadcrumbItem = { name: string; url: string };

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

const toIsoDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return undefined;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `PT${mins}M${secs}S`;
};

const getProductUrl = (robot: any) => absoluteUrl(`/robots/${robot.id}`);
const getArticleUrl = (article: any) => absoluteUrl(`/robobook/${article.slug || article.id}`);
const getServiceUrl = (service: any) => absoluteUrl(`/services/${service.id}`);

/**
 * Generate Organization Schema
 */
export const generateOrganizationSchema = () =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RobotVerse",
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
    },
    description: "Marketplace for industrial robots, spare parts, and automation services in India",
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
    },
    contactPoint: [
      cleanObject({
        "@type": "ContactPoint",
        contactType: "customer service",
        availableLanguage: ["English", "Hindi"],
      }),
    ],
    areaServed: {
      "@type": "Country",
      name: "India",
    },
  });

/**
 * Generate WebSite Schema with SearchAction
 */
export const generateWebSiteSchema = () =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RobotVerse",
    url: BASE_URL,
    description: "Marketplace for industrial robots, spare parts, and automation services in India",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/robots?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "RobotVerse",
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
  });

/**
 * Generate Product Schema for robot detail pages
 */
export const generateEnhancedProductSchema = (robot: any) => {
  const brand = robot.brand || "Industrial Robot";
  const model = robot.model || robot.name || "Robot";
  const images = Array.isArray(robot.images) ? robot.images.filter(Boolean) : [];
  const productUrl = getProductUrl(robot);

  const additionalProperties = [
    robot.payload_capacity && {
      "@type": "PropertyValue",
      name: "Payload Capacity",
      value: `${robot.payload_capacity} kg`,
    },
    robot.reach && {
      "@type": "PropertyValue",
      name: "Reach",
      value: `${robot.reach} mm`,
    },
    robot.repeatability && {
      "@type": "PropertyValue",
      name: "Repeatability",
      value: `${robot.repeatability} mm`,
    },
    robot.year_manufactured && {
      "@type": "PropertyValue",
      name: "Year Manufactured",
      value: String(robot.year_manufactured),
    },
    robot.controller_type && {
      "@type": "PropertyValue",
      name: "Controller Type",
      value: robot.controller_type,
    },
    robot.robot_type && {
      "@type": "PropertyValue",
      name: "Robot Type",
      value: robot.robot_type,
    },
  ].filter(Boolean);

  const schema: any = cleanObject({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${brand} ${model} Industrial Robot`,
    description: robot.description || `${brand} ${model} industrial robot available on RobotVerse India.`,
    brand: {
      "@type": "Brand",
      name: brand,
    },
    model,
    category: "Industrial Robot",
    image: images.length > 0 ? images : undefined,
    url: productUrl,
    sku: robot.id || undefined,
    mpn: model,
    itemCondition: normalizeCondition(robot.condition),
    manufacturer: {
      "@type": "Organization",
      name: brand,
    },
    additionalProperty: additionalProperties.length > 0 ? additionalProperties : undefined,
  });

  if (robot.price) {
    schema.offers = cleanObject({
      "@type": "Offer",
      price: String(robot.price),
      priceCurrency: robot.currency || "INR",
      availability: robot.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: normalizeCondition(robot.condition),
      url: productUrl,
      seller: {
        "@type": "Organization",
        name: "RobotVerse",
      },
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
  }

  return schema;
};

/**
 * Generate FAQPage Schema
 * Use only when FAQ is fully visible on the page
 */
export const generateFAQSchema = (faqs: FAQItem[]) =>
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

/**
 * Generate BreadcrumbList Schema
 */
export const generateBreadcrumbSchema = (items: BreadcrumbItem[]) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
      .filter((item) => item?.name && item?.url)
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.url),
      })),
  });

/**
 * Generate Article Schema for RoboBook posts
 */
export const generateArticleSchema = (article: any) => {
  const articleUrl = getArticleUrl(article);

  return cleanObject({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt || article.content?.substring(0, 180),
    image: article.image_url || article.media_url || undefined,
    author: {
      "@type": "Person",
      name: article.author_name || "RobotVerse Team",
    },
    publisher: {
      "@type": "Organization",
      name: "RobotVerse",
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at || article.created_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    articleSection: article.category || "Robotics & Automation",
    keywords: Array.isArray(article.tags) ? article.tags.join(", ") : undefined,
  });
};

/**
 * Generate VideoObject Schema
 */
export const generateVideoSchema = (video: any) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.content || video.excerpt || `Video about ${video.title}`,
    thumbnailUrl: video.video_thumbnail || video.thumbnail_url || undefined,
    uploadDate: video.published_at || video.created_at,
    duration: toIsoDuration(video.video_duration),
    contentUrl: video.media_url || undefined,
    embedUrl: video.embed_url || video.media_url || undefined,
    publisher: {
      "@type": "Organization",
      name: "RobotVerse",
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
  });

/**
 * Generate ItemList Schema for listing pages
 */
export const generateItemListSchema = (
  items: any[],
  listName: string,
  listType: "Product" | "Article" | "Service" = "Product",
) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 10).map((item, index) => {
      const itemUrl =
        listType === "Product"
          ? absoluteUrl(`/robots/${item.id}`)
          : listType === "Article"
            ? absoluteUrl(`/robobook/${item.slug || item.id}`)
            : absoluteUrl(`/services/${item.id}`);

      return cleanObject({
        "@type": "ListItem",
        position: index + 1,
        item: cleanObject({
          "@type": listType,
          name: item.name || item.title,
          url: itemUrl,
          image: item.images?.[0] || item.image_url || undefined,
          ...(item.price
            ? {
                offers: {
                  "@type": "Offer",
                  price: String(item.price),
                  priceCurrency: item.currency || "INR",
                },
              }
            : {}),
        }),
      });
    }),
  });

/**
 * Generate Service Schema
 */
export const generateServiceSchema = (service: any) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.service_name || service.name,
    description: service.description || "Professional industrial robot service",
    provider: {
      "@type": "Organization",
      name: service.provider_name || "RobotVerse Service Partner",
    },
    serviceType: service.service_type || "Robot Maintenance",
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: getServiceUrl(service),
    },
  });

/**
 * Generate LocalBusiness Schema for city landing pages
 * Use only when the page represents a genuine local business/service presence
 */
export const generateLocalBusinessSchema = (city: string, category: string) =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `RobotVerse ${city}`,
    description: `Industrial robots, spare parts, and automation services in ${city}, India`,
    url: absoluteUrl(`/${category}/${city.toLowerCase().replace(/\s+/g, "-")}`),
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressCountry: "IN",
    },
    areaServed: {
      "@type": "City",
      name: city,
    },
    priceRange: "₹₹₹",
  });

/**
 * Generate combined schema array for a page
 */
export const generatePageSchemas = (
  pageType: "home" | "product" | "listing" | "article" | "video" | "service" | "location",
  data?: any,
): object[] => {
  const schemas: object[] = [];

  switch (pageType) {
    case "home":
      schemas.push(generateOrganizationSchema());
      schemas.push(generateWebSiteSchema());
      break;

    case "product":
      if (data) {
        schemas.push(generateEnhancedProductSchema(data));
        schemas.push(
          generateBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Robots", url: "/robots" },
            ...(data.brand ? [{ name: data.brand, url: `/robots/brand/${String(data.brand).toLowerCase()}` }] : []),
            { name: data.model || data.name || "Robot", url: `/robots/${data.id}` },
          ]),
        );
        if (Array.isArray(data.faqs) && data.faqs.length > 0) {
          schemas.push(generateFAQSchema(data.faqs));
        }
      }
      break;

    case "listing":
      if (data?.items) {
        schemas.push(generateItemListSchema(data.items, data.listName || "Products"));
        schemas.push(
          generateBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: data.listName || "Products", url: data.url || "/robots" },
          ]),
        );
      }
      break;

    case "article":
      if (data) {
        schemas.push(generateArticleSchema(data));
        schemas.push(
          generateBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "RoboBook", url: "/robobook" },
            { name: data.title, url: `/robobook/${data.slug || data.id}` },
          ]),
        );
        if (Array.isArray(data.faqs) && data.faqs.length > 0) {
          schemas.push(generateFAQSchema(data.faqs));
        }
      }
      break;

    case "video":
      if (data) {
        schemas.push(generateVideoSchema(data));
        schemas.push(
          generateBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "RoboBook", url: "/robobook" },
            { name: data.title, url: `/robobook/${data.slug || data.id}` },
          ]),
        );
      }
      break;

    case "service":
      if (data) {
        schemas.push(generateServiceSchema(data));
        schemas.push(
          generateBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Services", url: "/services" },
            { name: data.service_name || data.name, url: `/services/${data.id}` },
          ]),
        );
      }
      break;

    case "location":
      if (data?.city) {
        schemas.push(generateLocalBusinessSchema(data.city, data.category || "robots"));
      }
      break;
  }

  return schemas;
};
