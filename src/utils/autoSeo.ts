/**
 * Automatic SEO Generation System for RobotVerse
 * Generates complete SEO metadata for all content types
 */

interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  twitterCard: string;
  canonicalUrl: string;
  slug: string;
  schemaMarkup: object;
}

/**
 * Generate SEO-friendly slug from text
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

/**
 * Extract keywords from text content
 */
export const extractKeywords = (text: string, additionalKeywords: string[] = []): string[] => {
  const commonWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this']);
  
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));
  
  const wordFrequency = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return [...new Set([...additionalKeywords, ...topWords])];
};

/**
 * Auto-generate SEO for Robot Detail Page
 */
export const generateRobotSEO = (robot: any): SEOMetadata => {
  const brand = robot.brand || 'Industrial';
  const model = robot.model || robot.name;
  const controller = robot.controller_type || '';
  const year = robot.year_manufactured || '';
  
  const title = `${brand} ${model} ${controller} – Used Industrial Robot | RobotVerse`.trim();
  const description = `${brand} ${model} ${controller ? `with ${controller} controller` : ''} for sale. ${robot.payload_capacity ? `Payload: ${robot.payload_capacity}kg` : ''} ${robot.reach ? `Reach: ${robot.reach}mm` : ''}. ${robot.description?.substring(0, 100) || 'Industrial automation robot'}.`;
  
  const keywords = [
    `${brand} robot`,
    `${model} robot`,
    'used industrial robot',
    'robot automation',
    'industrial robot for sale',
    brand.toLowerCase(),
    model.toLowerCase(),
    ...(robot.applications || []),
    'RobotVerse',
    'robot marketplace India'
  ];
  
  const slug = generateSlug(`${brand}-${model}-${controller}-${year}`);
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${brand} ${model}`,
    "brand": {
      "@type": "Brand",
      "name": brand
    },
    "model": model,
    "description": description,
    "offers": {
      "@type": "Offer",
      "price": robot.price || 0,
      "priceCurrency": robot.currency || "INR",
      "availability": robot.availability === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "RobotVerse"
      }
    },
    "image": robot.images?.[0] || "",
    "aggregateRating": robot.rating ? {
      "@type": "AggregateRating",
      "ratingValue": robot.rating,
      "reviewCount": robot.reviewCount || 1
    } : undefined
  };
  
  return {
    title,
    description: description.substring(0, 160),
    keywords,
    ogTitle: title,
    ogDescription: description.substring(0, 200),
    ogImage: robot.images?.[0],
    twitterCard: 'summary_large_image',
    canonicalUrl: `https://www.robotverse.in/robots/${slug}`,
    slug,
    schemaMarkup
  };
};

/**
 * Auto-generate SEO for Robot Listing/Brand Page
 */
export const generateRobotListingSEO = (brand?: string, category?: string): SEOMetadata => {
  const title = brand 
    ? `Used ${brand} Industrial Robots for Sale | RobotVerse`
    : `Used Industrial Robots & Robot Automation | RobotVerse`;
  
  const description = brand
    ? `Buy used ${brand} industrial robots. Wide selection of ${brand} robot models for welding, material handling, palletizing & more. Expert support in India.`
    : `India's leading marketplace for used industrial robots. Fanuc, ABB, KUKA, Yaskawa robots for sale. Automation solutions for manufacturing.`;
  
  const keywords = [
    'fanuc robot',
    'kuka robot',
    'abb robot',
    'yaskawa robot',
    'used industrial robots',
    'robot automation',
    'industrial robot marketplace',
    'robot for sale India',
    ...(brand ? [`${brand} robot`, `used ${brand} robots`] : []),
    ...(category ? [category, `${category} robots`] : [])
  ];
  
  const slug = brand ? generateSlug(brand) : 'all';
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": title,
    "description": description,
    "url": `https://www.robotverse.in/robots/${slug}`
  };
  
  return {
    title,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
    twitterCard: 'summary',
    canonicalUrl: `https://www.robotverse.in/robots/${slug}`,
    slug,
    schemaMarkup
  };
};

/**
 * Auto-generate SEO for Spare Part Page
 */
export const generateSparePartSEO = (part: any): SEOMetadata => {
  const brand = part.brand || part.compatible_robots?.[0] || 'Industrial';
  const partName = part.name || part.part_name;
  const partNumber = part.part_number || '';
  
  const title = `${brand} ${partName} ${partNumber ? `(${partNumber})` : ''} – Robot Spare Part | RobotVerse`;
  const description = `${brand} ${partName} spare part for industrial robots. ${part.description?.substring(0, 100) || 'High-quality replacement part'}. Compatible with ${part.compatible_robots?.join(', ') || 'multiple models'}.`;
  
  const keywords = [
    `${brand} robot spare parts`,
    `${partName}`,
    'robot replacement parts',
    'industrial robot parts',
    ...(part.compatible_robots || []),
    ...(part.category ? [part.category] : []),
    brand.toLowerCase(),
    'RobotVerse parts'
  ];
  
  const slug = generateSlug(`${brand}-${partName}-${partNumber}`);
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${brand} ${partName}`,
    "brand": {
      "@type": "Brand",
      "name": brand
    },
    "mpn": partNumber,
    "description": description,
    "offers": {
      "@type": "Offer",
      "price": part.price || 0,
      "priceCurrency": part.currency || "INR",
      "availability": part.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };
  
  return {
    title,
    description: description.substring(0, 160),
    keywords,
    ogTitle: title,
    ogDescription: description,
    ogImage: part.image_url,
    twitterCard: 'summary',
    canonicalUrl: `https://www.robotverse.in/spare-parts/${slug}`,
    slug,
    schemaMarkup
  };
};

/**
 * Auto-generate SEO for Service Page
 */
export const generateServiceSEO = (service: any): SEOMetadata => {
  const serviceType = service.service_type || 'Robot Service';
  const brand = service.brand || 'Industrial Robot';
  
  const title = `${serviceType} for ${brand} Robots – Expert Support | RobotVerse`;
  const description = `Professional ${serviceType.toLowerCase()} for ${brand} industrial robots. ${service.description?.substring(0, 100) || 'Expert maintenance, repair, and support services'}. Available in ${service.location || 'India'}.`;
  
  const keywords = [
    'robot repair',
    'robot maintenance',
    'robot diagnostics',
    'robot service',
    `${brand} service`,
    `${serviceType}`,
    'industrial robot support',
    'robot automation service India',
    ...(service.specializations || [])
  ];
  
  const slug = generateSlug(`${serviceType}-${brand}`);
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${serviceType} for ${brand}`,
    "description": description,
    "provider": {
      "@type": "Organization",
      "name": service.provider_name || "RobotVerse"
    },
    "areaServed": service.location || "India",
    "serviceType": serviceType
  };
  
  return {
    title,
    description: description.substring(0, 160),
    keywords,
    ogTitle: title,
    ogDescription: description,
    twitterCard: 'summary',
    canonicalUrl: `https://www.robotverse.in/services/${slug}`,
    slug,
    schemaMarkup
  };
};

/**
 * Auto-generate SEO for RoboBook Post
 */
export const generateRoboBookSEO = (post: any): SEOMetadata => {
  const title = post.title || 'RoboBook Article';
  const description = post.excerpt || post.content?.substring(0, 160) || 'Latest robotics and automation news';
  
  const keywords = [
    'robotics news',
    'industrial automation',
    'robot technology',
    'automation updates',
    'RoboBook',
    'robot trends',
    ...extractKeywords(post.content || '', post.tags || [])
  ];
  
  const slug = post.slug || generateSlug(title);
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "author": {
      "@type": "Person",
      "name": post.author_name || "RobotVerse Team"
    },
    "datePublished": post.published_at || post.created_at,
    "dateModified": post.updated_at,
    "image": post.media_url || post.image_url,
    "articleBody": post.content,
    "publisher": {
      "@type": "Organization",
      "name": "RobotVerse",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.robotverse.in/robotverse-logo.png"
      }
    }
  };
  
  return {
    title: `${title} | RoboBook - RobotVerse`,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
    ogImage: post.media_url || post.image_url,
    twitterCard: 'summary_large_image',
    canonicalUrl: `https://www.robotverse.in/robobook/${slug}`,
    slug,
    schemaMarkup
  };
};

/**
 * Generate comprehensive keyword block for a page
 */
export const generateKeywordBlock = (type: string, data: any): string => {
  const keywords: string[] = [];
  
  switch (type) {
    case 'robot':
      keywords.push(
        `${data.brand} industrial robot`,
        `${data.model} robot for sale`,
        'used robot automation',
        'industrial robotics India',
        ...(data.applications || []).map((app: string) => `${app} robot`)
      );
      break;
    case 'spare-part':
      keywords.push(
        `${data.brand} robot spare parts`,
        `${data.name} replacement`,
        'robot parts India',
        'industrial robot components'
      );
      break;
    case 'service':
      keywords.push(
        'robot repair service',
        'robot maintenance India',
        `${data.service_type} support`,
        'industrial automation service'
      );
      break;
    case 'robobook':
      keywords.push(
        'robotics news',
        'automation articles',
        'industrial robot updates',
        'robot technology trends'
      );
      break;
  }
  
  return keywords.join(', ');
};

/**
 * Generate alt text for images
 */
export const generateImageAlt = (type: string, data: any, index: number = 0): string => {
  switch (type) {
    case 'robot':
      return `${data.brand} ${data.model} industrial robot - image ${index + 1}`;
    case 'spare-part':
      return `${data.brand} ${data.name} spare part for industrial robots`;
    case 'service':
      return `${data.service_type} for industrial robots`;
    case 'robobook':
      return data.title || 'RoboBook article image';
    default:
      return 'RobotVerse - Industrial Robot Marketplace';
  }
};
