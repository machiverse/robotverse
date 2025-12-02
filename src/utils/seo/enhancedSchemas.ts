/**
 * Enhanced JSON-LD Schema Generators for RobotVerse
 * Follows Google Rich Results best practices
 */

const BASE_URL = 'https://www.robotverse.in';
const LOGO_URL = `${BASE_URL}/robotverse-logo.png`;

/**
 * Generate Organization Schema (Homepage)
 */
export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "RobotVerse",
  "alternateName": "RobotVerse India",
  "url": BASE_URL,
  "logo": LOGO_URL,
  "description": "India's leading marketplace for industrial robots, spare parts, and automation services",
  "foundingDate": "2024",
  "founders": [{
    "@type": "Organization",
    "name": "RobotVerse Team"
  }],
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "IN",
    "addressRegion": "India"
  },
  "contactPoint": [{
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": ["English", "Hindi"]
  }],
  "sameAs": [
    "https://www.linkedin.com/company/robotverse",
    "https://twitter.com/robotverse"
  ],
  "areaServed": {
    "@type": "Country",
    "name": "India"
  }
});

/**
 * Generate WebSite Schema with SearchAction
 */
export const generateWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "RobotVerse",
  "url": BASE_URL,
  "description": "India's largest marketplace for industrial robots, spare parts, and automation services",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${BASE_URL}/robots?search={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  },
  "publisher": {
    "@type": "Organization",
    "name": "RobotVerse",
    "logo": {
      "@type": "ImageObject",
      "url": LOGO_URL
    }
  }
});

/**
 * Generate enhanced Product Schema for robots
 */
export const generateEnhancedProductSchema = (robot: any) => {
  const brand = robot.brand || 'Industrial Robot';
  const model = robot.model || robot.name;
  const price = robot.price;
  const currency = robot.currency || 'INR';
  const condition = robot.condition || 'UsedCondition';
  const images = robot.images || [];
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${brand} ${model} Industrial Robot`,
    "description": robot.description || `${brand} ${model} industrial robot for sale on RobotVerse India`,
    "brand": {
      "@type": "Brand",
      "name": brand
    },
    "model": model,
    "category": "Industrial Robots",
    "image": images.length > 0 ? images : [LOGO_URL],
    "url": `${BASE_URL}/robots/${robot.id}`,
    "sku": robot.id,
    "mpn": model,
    "itemCondition": `https://schema.org/${condition === 'New' ? 'NewCondition' : 'UsedCondition'}`,
    "manufacturer": {
      "@type": "Organization",
      "name": brand
    }
  };

  // Add offers if price available
  if (price) {
    schema.offers = {
      "@type": "AggregateOffer",
      "lowPrice": price,
      "highPrice": price,
      "priceCurrency": currency,
      "offerCount": robot.quantity || 1,
      "availability": robot.availability === 'available' 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "RobotVerse Marketplace"
      },
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "url": `${BASE_URL}/robots/${robot.id}`
    };
  }

  // Add technical specifications
  const additionalProperties = [];
  
  if (robot.payload_capacity) {
    additionalProperties.push({
      "@type": "PropertyValue",
      "name": "Payload Capacity",
      "value": `${robot.payload_capacity} kg`
    });
  }
  
  if (robot.reach) {
    additionalProperties.push({
      "@type": "PropertyValue",
      "name": "Reach",
      "value": `${robot.reach} mm`
    });
  }
  
  if (robot.repeatability) {
    additionalProperties.push({
      "@type": "PropertyValue",
      "name": "Repeatability",
      "value": `${robot.repeatability} mm`
    });
  }
  
  if (robot.year_manufactured) {
    additionalProperties.push({
      "@type": "PropertyValue",
      "name": "Year Manufactured",
      "value": robot.year_manufactured.toString()
    });
  }

  if (robot.controller_type) {
    additionalProperties.push({
      "@type": "PropertyValue",
      "name": "Controller Type",
      "value": robot.controller_type
    });
  }

  if (additionalProperties.length > 0) {
    schema.additionalProperty = additionalProperties;
  }

  return schema;
};

/**
 * Generate FAQPage Schema
 */
export const generateFAQSchema = (faqs: Array<{question: string, answer: string}>) => ({
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

/**
 * Generate BreadcrumbList Schema
 */
export const generateBreadcrumbSchema = (items: Array<{name: string, url: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`
  }))
});

/**
 * Generate Article Schema for blogs
 */
export const generateArticleSchema = (article: any) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": article.title,
  "description": article.excerpt || article.content?.substring(0, 200),
  "image": article.image_url || article.media_url || LOGO_URL,
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
  "datePublished": article.published_at || article.created_at,
  "dateModified": article.updated_at || article.created_at,
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `${BASE_URL}/blogs/${article.id}`
  },
  "articleSection": "Robotics & Automation",
  "keywords": article.tags?.join(', ') || "industrial robots, automation, robotics"
});

/**
 * Generate VideoObject Schema
 */
export const generateVideoSchema = (video: any) => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": video.title,
  "description": video.content || video.excerpt || `Video about ${video.title}`,
  "thumbnailUrl": video.video_thumbnail || video.media_url || LOGO_URL,
  "uploadDate": video.published_at || video.created_at,
  "duration": video.video_duration ? `PT${Math.floor(video.video_duration / 60)}M${video.video_duration % 60}S` : undefined,
  "contentUrl": video.media_url,
  "embedUrl": video.media_url,
  "publisher": {
    "@type": "Organization",
    "name": "RobotVerse",
    "logo": {
      "@type": "ImageObject",
      "url": LOGO_URL
    }
  }
});

/**
 * Generate ItemList Schema for listing pages
 */
export const generateItemListSchema = (
  items: any[], 
  listName: string, 
  listType: 'Product' | 'Article' | 'Service' = 'Product'
) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": listName,
  "numberOfItems": items.length,
  "itemListElement": items.slice(0, 10).map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": listType,
      "name": item.name || item.title,
      "url": `${BASE_URL}/${listType === 'Product' ? 'robots' : listType === 'Article' ? 'blogs' : 'services'}/${item.id}`,
      "image": item.images?.[0] || item.image_url || LOGO_URL,
      ...(item.price && {
        "offers": {
          "@type": "Offer",
          "price": item.price,
          "priceCurrency": item.currency || "INR"
        }
      })
    }
  }))
});

/**
 * Generate Service Schema
 */
export const generateServiceSchema = (service: any) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "name": service.service_name || service.name,
  "description": service.description || `Professional robot service`,
  "provider": {
    "@type": "Organization",
    "name": service.provider_name || "RobotVerse Service Partner"
  },
  "serviceType": service.service_type || "Robot Maintenance",
  "areaServed": {
    "@type": "Country",
    "name": "India"
  },
  "availableChannel": {
    "@type": "ServiceChannel",
    "serviceUrl": `${BASE_URL}/services/${service.id}`
  }
});

/**
 * Generate LocalBusiness Schema for location pages
 */
export const generateLocalBusinessSchema = (city: string, category: string) => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": `RobotVerse ${city}`,
  "description": `Industrial robots, spare parts, and automation services in ${city}, India`,
  "url": `${BASE_URL}/${category}/${city.toLowerCase().replace(/\s+/g, '-')}`,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": city,
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "addressCountry": "IN"
  },
  "areaServed": city,
  "priceRange": "₹₹₹"
});

/**
 * Generate combined schema array for a page
 */
export const generatePageSchemas = (
  pageType: 'home' | 'product' | 'listing' | 'article' | 'video' | 'service' | 'location',
  data?: any
): object[] => {
  const schemas: object[] = [];
  
  switch (pageType) {
    case 'home':
      schemas.push(generateOrganizationSchema());
      schemas.push(generateWebSiteSchema());
      break;
      
    case 'product':
      if (data) {
        schemas.push(generateEnhancedProductSchema(data));
        schemas.push(generateBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: 'Robots', url: '/robots' },
          { name: data.brand || 'Robot', url: `/robots?brand=${data.brand}` },
          { name: data.model || data.name, url: `/robots/${data.id}` }
        ]));
        if (data.faqs) {
          schemas.push(generateFAQSchema(data.faqs));
        }
      }
      break;
      
    case 'listing':
      if (data?.items) {
        schemas.push(generateItemListSchema(data.items, data.listName || 'Products'));
        schemas.push(generateBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: data.listName || 'Products', url: data.url || '/robots' }
        ]));
      }
      break;
      
    case 'article':
      if (data) {
        schemas.push(generateArticleSchema(data));
        schemas.push(generateBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: 'Blog', url: '/blogs' },
          { name: data.title, url: `/blogs/${data.id}` }
        ]));
      }
      break;
      
    case 'video':
      if (data) {
        schemas.push(generateVideoSchema(data));
        schemas.push(generateBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: 'Videos', url: '/robobook?type=video' },
          { name: data.title, url: `/robobook/${data.id}` }
        ]));
      }
      break;
      
    case 'service':
      if (data) {
        schemas.push(generateServiceSchema(data));
        schemas.push(generateBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: 'Services', url: '/services' },
          { name: data.service_name || data.name, url: `/services/${data.id}` }
        ]));
      }
      break;
      
    case 'location':
      if (data?.city) {
        schemas.push(generateLocalBusinessSchema(data.city, data.category || 'robots'));
      }
      break;
  }
  
  return schemas;
};
