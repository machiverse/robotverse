// JSON-LD Schema generators for different types of pages

export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "RobotVerse",
  "url": window.location.origin,
  "logo": `${window.location.origin}/robotverse-logo.jpg`,
  "description": "India's largest marketplace for industrial robots and automation equipment",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "IN"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "support@robotverse.com"
  },
  "sameAs": [
    "https://twitter.com/RobotVerse",
    "https://linkedin.com/company/robotverse"
  ]
});

export const generateWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "RobotVerse",
  "url": window.location.origin,
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${window.location.origin}/robots?search={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
});

export const generateProductSchema = (robot: {
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
  seller_id?: string;
  payload_capacity?: number;
  reach?: number;
  year_manufactured?: number;
  controller_type?: string;
  applications?: string[];
  warranty_info?: string;
  location?: string;
  seller?: {
    full_name?: string;
    company_name?: string;
  };
}) => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${robot.brand || ''} ${robot.model || robot.name}`.trim(),
    "description": robot.description || `Industrial robot for sale: ${robot.brand} ${robot.model}`,
    "brand": {
      "@type": "Brand",
      "name": robot.brand || "Generic"
    },
    "model": robot.model,
    "sku": robot.id,
    "image": robot.images && robot.images.length > 0 
      ? robot.images.map(img => img.startsWith('http') ? img : `${baseUrl}${img}`)
      : [`${baseUrl}/placeholder.svg`],
    "offers": {
      "@type": "Offer",
      "url": `${baseUrl}/robots/${robot.id}`,
      "priceCurrency": robot.currency || "INR",
      "price": robot.price || 0,
      "availability": robot.availability === 'available' 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "itemCondition": robot.condition === 'new' 
        ? "https://schema.org/NewCondition" 
        : robot.condition === 'refurbished'
        ? "https://schema.org/RefurbishedCondition"
        : "https://schema.org/UsedCondition",
      "seller": {
        "@type": "Organization",
        "name": robot.seller?.company_name || robot.seller?.full_name || "RobotVerse Seller"
      }
    },
    "additionalProperty": [
      robot.payload_capacity && {
        "@type": "PropertyValue",
        "name": "Payload Capacity",
        "value": `${robot.payload_capacity} kg`
      },
      robot.reach && {
        "@type": "PropertyValue",
        "name": "Reach",
        "value": `${robot.reach} mm`
      },
      robot.year_manufactured && {
        "@type": "PropertyValue",
        "name": "Year Manufactured",
        "value": robot.year_manufactured
      },
      robot.controller_type && {
        "@type": "PropertyValue",
        "name": "Controller Type",
        "value": robot.controller_type
      }
    ].filter(Boolean),
    "category": "Industrial Robot",
    "applicationCategory": robot.applications?.join(", "),
    ...(robot.location && { "availableAtOrFrom": { "@type": "Place", "address": robot.location } }),
    ...(robot.warranty_info && { "warranty": robot.warranty_info })
  };
};

export const generateItemListSchema = (items: any[], listName: string, category?: string) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": listName,
  "description": category ? `${category} robots available for sale` : "Industrial robots marketplace",
  "numberOfItems": items.length,
  "itemListElement": items.slice(0, 20).map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "Product",
      "name": `${item.brand || ''} ${item.model || item.name}`.trim(),
      "url": `${window.location.origin}/robots/${item.id}`,
      "image": item.images?.[0] || `${window.location.origin}/placeholder.svg`,
      "offers": {
        "@type": "Offer",
        "price": item.price || 0,
        "priceCurrency": item.currency || "INR"
      }
    }
  }))
});

export const generateBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

export const generateLocalBusinessSchema = (business: {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": business.name,
  "description": business.description,
  "address": business.address,
  "telephone": business.phone,
  "email": business.email,
  "priceRange": "$$$$"
});

export const generateFAQSchema = (faqs: { question: string; answer: string }[]) => ({
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

export const generateArticleSchema = (article: {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": article.title,
  "description": article.description,
  "author": {
    "@type": "Person",
    "name": article.author
  },
  "datePublished": article.datePublished,
  "dateModified": article.dateModified || article.datePublished,
  "image": article.image || `${window.location.origin}/robotverse-logo.jpg`,
  "publisher": {
    "@type": "Organization",
    "name": "RobotVerse",
    "logo": {
      "@type": "ImageObject",
      "url": `${window.location.origin}/robotverse-logo.jpg`
    }
  }
});
