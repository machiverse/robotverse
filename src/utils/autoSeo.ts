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
 * Auto-generate SEO for Logistics Page
 */
export const generateLogisticsSEO = (service?: any): SEOMetadata => {
  if (service) {
    // Individual logistics service
    const title = `${service.service_name} – Robot Logistics & Transportation | RobotVerse`;
    const description = `${service.service_name} for industrial robots. ${service.description?.substring(0, 100) || 'Professional robot transportation and logistics'}. Coverage: ${service.coverage_areas?.join(', ') || 'India'}.`;
    
    const keywords = [
      'robot logistics',
      'industrial robot transportation',
      'robot shipping India',
      'heavy machinery transport',
      service.service_type,
      ...(service.transport_modes || []),
      ...(service.coverage_areas || []),
      'RobotVerse logistics'
    ];
    
    const slug = generateSlug(service.service_name);
    
    const schemaMarkup = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": service.service_name,
      "description": description,
      "provider": {
        "@type": "Organization",
        "name": service.provider_name || "RobotVerse"
      },
      "areaServed": service.coverage_areas || ["India"],
      "serviceType": "Logistics"
    };
    
    return {
      title,
      description: description.substring(0, 160),
      keywords,
      ogTitle: title,
      ogDescription: description,
      twitterCard: 'summary',
      canonicalUrl: `https://www.robotverse.in/logistics/${slug}`,
      slug,
      schemaMarkup
    };
  }
  
  // Logistics listing page
  const title = 'Robot Logistics & Transportation Services | RobotVerse';
  const description = 'Specialized logistics and transportation for industrial robots. Safe handling, insured shipping, tracking available. Nationwide coverage across India.';
  
  const keywords = [
    'robot logistics India',
    'industrial robot transportation',
    'robot shipping',
    'heavy equipment logistics',
    'robot freight',
    'machinery transport',
    'specialized logistics',
    'robot delivery services'
  ];
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": title,
    "description": description,
    "url": "https://www.robotverse.in/logistics"
  };
  
  return {
    title,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
    twitterCard: 'summary',
    canonicalUrl: 'https://www.robotverse.in/logistics',
    slug: 'logistics',
    schemaMarkup
  };
};

/**
 * Auto-generate SEO for Financing Page
 */
export const generateFinancingSEO = (product?: any): SEOMetadata => {
  if (product) {
    // Individual financing product
    const title = `${product.product_name} – Robot Financing Solutions | RobotVerse`;
    const description = `${product.product_name}. ${product.description?.substring(0, 100) || 'Flexible financing for industrial robots'}. Interest rates from ${product.min_interest_rate}%. Loan amount: ${product.min_amount?.toLocaleString('en-IN')} - ${product.max_amount?.toLocaleString('en-IN')} INR.`;
    
    const keywords = [
      'robot financing India',
      'industrial robot loans',
      'automation equipment finance',
      'robot leasing',
      product.product_name,
      ...(product.loan_type || []),
      'business equipment financing',
      'RobotVerse financing'
    ];
    
    const slug = generateSlug(product.product_name);
    
    const schemaMarkup = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": product.product_name,
      "description": description,
      "interestRate": `${product.min_interest_rate}%-${product.max_interest_rate}%`,
      "amount": {
        "@type": "MonetaryAmount",
        "currency": "INR",
        "minValue": product.min_amount,
        "maxValue": product.max_amount
      }
    };
    
    return {
      title,
      description: description.substring(0, 160),
      keywords,
      ogTitle: title,
      ogDescription: description,
      twitterCard: 'summary',
      canonicalUrl: `https://www.robotverse.in/financing/${slug}`,
      slug,
      schemaMarkup
    };
  }
  
  // Financing listing page
  const title = 'Robot Financing & Loan Solutions | RobotVerse';
  const description = 'Flexible financing options for industrial robots. Easy EMI, quick approval, competitive interest rates. Make automation affordable for your business.';
  
  const keywords = [
    'robot financing India',
    'industrial robot loans',
    'automation equipment finance',
    'robot EMI',
    'business equipment loans',
    'robot leasing India',
    'manufacturing equipment finance',
    'robot purchase financing'
  ];
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": title,
    "description": description,
    "url": "https://www.robotverse.in/financing"
  };
  
  return {
    title,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
    twitterCard: 'summary',
    canonicalUrl: 'https://www.robotverse.in/financing',
    slug: 'financing',
    schemaMarkup
  };
};

/**
 * Auto-generate SEO for Home Page
 */
export const generateHomeSEO = (): SEOMetadata => {
  const title = 'RobotVerse – Buy & Sell Industrial Robots | India\'s Leading Automation Marketplace';
  const description = 'India\'s #1 marketplace for industrial robots. Buy FANUC, ABB, KUKA, Yaskawa robots with warranty. Spare parts, automation services, financing & logistics support available.';
  
  const keywords = [
    'industrial robots India',
    'buy robots online',
    'FANUC robots',
    'ABB robots',
    'KUKA robots',
    'Yaskawa robots',
    'robot marketplace',
    'automation equipment',
    'robot spare parts',
    'robot services',
    'used industrial robots',
    'robot automation India'
  ];
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "RobotVerse",
    "description": description,
    "url": "https://www.robotverse.in",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.robotverse.in/robots?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
  
  return {
    title,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
    ogImage: '/og-image.jpg',
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.robotverse.in',
    slug: '',
    schemaMarkup
  };
};

/**
 * Auto-generate SEO for Brand Page
 */
export const generateBrandSEO = (brand: string, robotCount?: number): SEOMetadata => {
  const title = `${brand} Industrial Robots for Sale in India | RobotVerse`;
  const description = `Buy used ${brand} industrial robots in India. ${robotCount ? `${robotCount}+ ${brand} robots` : 'Wide selection'} available. Welding, material handling, palletizing robots with warranty & support.`;
  
  const keywords = [
    `${brand} robot`,
    `${brand} industrial robot`,
    `buy ${brand} robots`,
    `used ${brand} robots India`,
    `${brand} robot for sale`,
    'industrial automation',
    'robot marketplace',
    brand.toLowerCase()
  ];
  
  const slug = generateSlug(brand);
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${brand} Industrial Robots`,
    "description": description,
    "url": `https://www.robotverse.in/robots/brand/${slug}`,
    "about": {
      "@type": "Brand",
      "name": brand
    }
  };
  
  return {
    title,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
    twitterCard: 'summary',
    canonicalUrl: `https://www.robotverse.in/robots/brand/${slug}`,
    slug,
    schemaMarkup
  };
};

/**
 * Generate internal linking suggestions
 */
export const generateInternalLinks = (type: string, data: any): Array<{url: string, text: string}> => {
  const links: Array<{url: string, text: string}> = [];
  
  switch (type) {
    case 'robot':
      // Link to brand page
      if (data.brand) {
        links.push({
          url: `/robots/brand/${generateSlug(data.brand)}`,
          text: `More ${data.brand} Robots`
        });
      }
      // Link to services
      links.push({
        url: '/services',
        text: 'Robot Maintenance & Repair Services'
      });
      // Link to spare parts
      links.push({
        url: '/parts',
        text: 'Robot Spare Parts'
      });
      // Link to financing
      links.push({
        url: '/financing',
        text: 'Robot Financing Options'
      });
      break;
      
    case 'spare-part':
      // Link to robots
      links.push({
        url: '/robots',
        text: 'Browse Industrial Robots'
      });
      // Link to services
      links.push({
        url: '/services',
        text: 'Professional Installation Services'
      });
      break;
      
    case 'service':
      // Link to robots
      links.push({
        url: '/robots',
        text: 'Browse Robots for Service'
      });
      // Link to spare parts
      links.push({
        url: '/parts',
        text: 'Order Spare Parts'
      });
      break;
      
    case 'robobook':
      // Link to main sections
      links.push(
        { url: '/robots', text: 'Explore Industrial Robots' },
        { url: '/services', text: 'Robot Services' },
        { url: '/parts', text: 'Spare Parts' }
      );
      break;
  }
  
  return links;
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
    case 'logistics':
      return `${data.service_name} robot logistics service`;
    case 'financing':
      return `${data.product_name} robot financing option`;
    default:
      return 'RobotVerse - Industrial Robot Marketplace';
  }
};
