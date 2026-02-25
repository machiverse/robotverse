/**
 * Modern Schema.org Structured Data for RobotVerse
 * Comprehensive JSON-LD schemas for maximum search visibility
 */

const BASE_URL = 'https://www.robotverse.in';
const LOGO_URL = `${BASE_URL}/robotverse-logo.png`;
const OG_IMAGE_URL = `${BASE_URL}/og-image.jpg`;

// ============ ORGANIZATION SCHEMA ============

export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  "name": "RobotVerse",
  "alternateName": "RobotVerse India",
  "url": BASE_URL,
  "logo": {
    "@type": "ImageObject",
    "url": LOGO_URL,
    "width": 512,
    "height": 512
  },
  "image": OG_IMAGE_URL,
  "description": "India's leading B2B marketplace for industrial robots, automation equipment, spare parts, and services. Connecting verified sellers with buyers across India and globally.",
  "foundingDate": "2020",
  "foundingLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Chennai",
      "addressRegion": "Tamil Nadu",
      "addressCountry": "IN"
    }
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "SIPCOT IT Park, 5-B/9, 6th Cross St, Siruseri",
    "addressLocality": "Chennai",
    "addressRegion": "Tamil Nadu",
    "postalCode": "603103",
    "addressCountry": "IN"
  },
  "contactPoint": [
    {
      "@type": "ContactPoint",
      "telephone": "+91-8610925352",
      "contactType": "customer service",
      "areaServed": "IN",
      "availableLanguage": ["English", "Hindi", "Tamil"]
    },
    {
      "@type": "ContactPoint",
      "email": "support@robotverse.in",
      "contactType": "customer support"
    }
  ],
  "sameAs": [
    "https://www.linkedin.com/company/robotverse",
    "https://twitter.com/RobotVerseIndia",
    "https://www.facebook.com/RobotVerseIndia",
    "https://www.youtube.com/@RobotVerse"
  ],
  "slogan": "India's Trusted Industrial Robot Marketplace",
  "knowsAbout": [
    "Industrial Robots",
    "Automation Equipment",
    "Robot Spare Parts",
    "Robot Services",
    "FANUC Robots",
    "ABB Robots",
    "KUKA Robots",
    "Yaskawa Robots"
  ],
  "areaServed": {
    "@type": "Country",
    "name": "India"
  }
});

// ============ WEBSITE SCHEMA ============

export const generateWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  "name": "RobotVerse",
  "url": BASE_URL,
  "description": "Buy and sell industrial robots, spare parts, and automation equipment on India's largest robot marketplace",
  "publisher": {
    "@id": `${BASE_URL}/#organization`
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${BASE_URL}/robots?search={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  },
  "inLanguage": "en-IN"
});

// ============ PRODUCT SCHEMA (Robot/Part) ============

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
  const productName = `${product.brand || ''} ${product.model || product.name}`.trim();
  const productUrl = `${BASE_URL}/robots/${product.id}`;
  
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    "name": productName,
    "description": product.description || `${productName} industrial robot available on RobotVerse marketplace`,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "Generic"
    },
    "model": product.model,
    "sku": product.id,
    "mpn": product.model,
    "image": product.images?.length ? product.images.map(img => 
      img.startsWith('http') ? img : `${BASE_URL}${img}`
    ) : [OG_IMAGE_URL],
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": product.currency || "INR",
      "price": product.price || 0,
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "availability": product.availability === 'available' 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "itemCondition": product.condition === 'new' 
        ? "https://schema.org/NewCondition" 
        : product.condition === 'refurbished'
        ? "https://schema.org/RefurbishedCondition"
        : "https://schema.org/UsedCondition",
      "seller": {
        "@type": "Organization",
        "name": product.seller?.company_name || product.seller?.full_name || "RobotVerse Seller",
        "url": BASE_URL
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "IN"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 1,
            "maxValue": 3,
            "unitCode": "d"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 3,
            "maxValue": 10,
            "unitCode": "d"
          }
        }
      }
    },
    "additionalProperty": [
      product.payload_capacity && {
        "@type": "PropertyValue",
        "name": "Payload Capacity",
        "value": product.payload_capacity,
        "unitCode": "KGM",
        "unitText": "kg"
      },
      product.reach && {
        "@type": "PropertyValue",
        "name": "Reach",
        "value": product.reach,
        "unitCode": "MMT",
        "unitText": "mm"
      },
      product.year_manufactured && {
        "@type": "PropertyValue",
        "name": "Year of Manufacture",
        "value": product.year_manufactured
      },
      product.controller_type && {
        "@type": "PropertyValue",
        "name": "Controller Type",
        "value": product.controller_type
      }
    ].filter(Boolean),
    "category": "Industrial Robot",
    "audience": {
      "@type": "Audience",
      "audienceType": "Manufacturers, Factory Owners, System Integrators"
    },
    ...(product.location && {
      "availableAtOrFrom": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": product.location,
          "addressCountry": "IN"
        }
      }
    })
  };
};

// ============ FAQ SCHEMA ============

export const generateFAQSchema = (faqs: Array<{question: string; answer: string}>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

// ============ BREADCRUMB SCHEMA ============

export const generateBreadcrumbSchema = (items: Array<{name: string; url: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`
  }))
});

// ============ ITEM LIST SCHEMA (Listings) ============

export const generateItemListSchema = (
  items: any[],
  listName: string,
  listType: 'robots' | 'parts' | 'services' = 'robots'
) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": listName,
  "description": `Browse ${listName.toLowerCase()} on RobotVerse - India's leading industrial robot marketplace`,
  "numberOfItems": items.length,
  "itemListElement": items.slice(0, 20).map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "Product",
      "name": `${item.brand || ''} ${item.model || item.name}`.trim(),
      "url": `${BASE_URL}/${listType}/${item.id}`,
      "image": item.images?.[0] || item.image || OG_IMAGE_URL,
      "description": item.description?.substring(0, 150) || `${item.brand || ''} ${item.model || item.name} available on RobotVerse`,
      "offers": {
        "@type": "Offer",
        "price": item.price || 0,
        "priceCurrency": item.currency || "INR",
        "availability": item.availability === 'available' 
          ? "https://schema.org/InStock" 
          : "https://schema.org/OutOfStock"
      }
    }
  }))
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
}) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${BASE_URL}/services/${service.id}#service`,
  "name": service.name || service.service_type,
  "description": service.description || `Professional ${service.service_type} for industrial robots`,
  "serviceType": service.service_type || "Robot Service",
  "provider": {
    "@type": "Organization",
    "name": service.provider?.company_name || service.provider?.full_name || "RobotVerse Service Provider",
    "url": BASE_URL
  },
  "areaServed": {
    "@type": "Country",
    "name": "India"
  },
  "availableChannel": {
    "@type": "ServiceChannel",
    "serviceUrl": `${BASE_URL}/services/${service.id}`,
    "servicePhone": "+91-8610925352"
  },
  ...(service.location && {
    "serviceLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": service.location,
        "addressCountry": "IN"
      }
    }
  })
});

// ============ ARTICLE SCHEMA (Blog) ============

export const generateArticleSchema = (article: {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  author_name?: string;
  created_at: string;
  updated_at?: string;
  image_url?: string;
  tags?: string[];
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": `${BASE_URL}/blogs/${article.id}#article`,
  "headline": article.title,
  "description": article.excerpt || article.content?.substring(0, 160) || article.title,
  "image": article.image_url || OG_IMAGE_URL,
  "author": {
    "@type": "Person",
    "name": article.author_name || "RobotVerse Team"
  },
  "publisher": {
    "@type": "Organization",
    "name": "RobotVerse",
    "logo": {
      "@type": "ImageObject",
      "url": LOGO_URL
    }
  },
  "datePublished": article.created_at,
  "dateModified": article.updated_at || article.created_at,
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `${BASE_URL}/blogs/${article.id}`
  },
  "keywords": article.tags?.join(', ') || "industrial robots, automation, robotics",
  "articleSection": "Industrial Robotics",
  "inLanguage": "en-IN"
});

// ============ LOCAL BUSINESS SCHEMA ============

export const generateLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${BASE_URL}/#localbusiness`,
  "name": "RobotVerse",
  "image": LOGO_URL,
  "description": "India's leading industrial robot marketplace - Buy, sell robots, spare parts, and services",
  "url": BASE_URL,
  "telephone": "+91-8610925352",
  "email": "support@robotverse.in",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "SIPCOT IT Park, 5-B/9, 6th Cross St, Siruseri",
    "addressLocality": "Chennai",
    "addressRegion": "Tamil Nadu",
    "postalCode": "603103",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 12.8342,
    "longitude": 80.2134
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "10:00",
      "closes": "16:00"
    }
  ],
  "priceRange": "₹₹₹",
  "currenciesAccepted": "INR",
  "paymentAccepted": "Bank Transfer, UPI, Credit Card"
});

// ============ HOW-TO SCHEMA (Guides) ============

export const generateHowToSchema = (howTo: {
  name: string;
  description: string;
  steps: Array<{name: string; text: string; image?: string}>;
  totalTime?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": howTo.name,
  "description": howTo.description,
  "totalTime": howTo.totalTime || "PT30M",
  "step": howTo.steps.map((step, index) => ({
    "@type": "HowToStep",
    "position": index + 1,
    "name": step.name,
    "text": step.text,
    ...(step.image && { "image": step.image })
  }))
});

// ============ AGGREGATE OFFER SCHEMA ============

export const generateAggregateOfferSchema = (stats: {
  totalProducts: number;
  lowPrice: number;
  highPrice: number;
  currency?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "AggregateOffer",
  "offerCount": stats.totalProducts,
  "lowPrice": stats.lowPrice,
  "highPrice": stats.highPrice,
  "priceCurrency": stats.currency || "INR"
});

// ============ COMBINED PAGE SCHEMAS ============

export const generatePageSchemas = (
  pageType: 'home' | 'listing' | 'product' | 'service' | 'article',
  data?: any
): object[] => {
  const schemas: object[] = [
    generateOrganizationSchema(),
    generateWebSiteSchema()
  ];
  
  switch (pageType) {
    case 'home':
      schemas.push(generateLocalBusinessSchema());
      break;
    case 'listing':
      if (data?.items) {
        schemas.push(generateItemListSchema(data.items, data.listName || 'Products', data.listType));
      }
      if (data?.breadcrumbs) {
        schemas.push(generateBreadcrumbSchema(data.breadcrumbs));
      }
      break;
    case 'product':
      if (data) {
        schemas.push(generateProductSchema(data));
        if (data.faqs) {
          schemas.push(generateFAQSchema(data.faqs));
        }
        if (data.breadcrumbs) {
          schemas.push(generateBreadcrumbSchema(data.breadcrumbs));
        }
      }
      break;
    case 'service':
      if (data) {
        schemas.push(generateServiceSchema(data));
        if (data.breadcrumbs) {
          schemas.push(generateBreadcrumbSchema(data.breadcrumbs));
        }
      }
      break;
    case 'article':
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
  generatePageSchemas
};
