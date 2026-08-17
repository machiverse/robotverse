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
    // Single-word keywords
    brand.toLowerCase(), model.toLowerCase(), 'robot', 'automation', 'industrial',
    // Core phrases
    `${brand} robot`, `${model} robot`, 'used industrial robot', 'robot automation',
    'industrial robot for sale', brand.toLowerCase(), model.toLowerCase(),
    // Long-tail keywords
    `${brand} ${model} price india`, `${brand} robot for sale`, `used ${brand} robot`,
    `${brand} ${model} specifications`, `buy ${brand} ${model}`, `${brand} industrial robot`,
    // Application keywords
    ...(robot.applications || []).map((app: string) => `${app} robot`),
    ...(robot.applications || []).map((app: string) => `${brand} ${app} robot`),
    // Category keywords
    'RobotVerse', 'robot marketplace India', 'industrial automation india',
    // Controller/year specific
    controller ? `${controller} controller` : '',
    year ? `${brand} robot ${year}` : '',
    // Payload/reach if available
    robot.payload_capacity ? `${robot.payload_capacity}kg payload robot` : '',
    robot.reach ? `${robot.reach}mm reach robot` : ''
  ].filter(Boolean);
  
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
    // Single-word keywords
    'robots', 'fanuc', 'kuka', 'abb', 'yaskawa', 'kawasaki', 'automation',
    // Core brand phrases
    'fanuc robot', 'kuka robot', 'abb robot', 'yaskawa robot',
    // Condition-based
    'used industrial robots', 'refurbished robots', 'second hand robots',
    // Long-tail keywords
    'industrial robot marketplace', 'robot for sale India', 'buy industrial robot online',
    'used robot arm price india', 'second hand welding robot', 'refurbished pick and place robot',
    // Brand-specific if provided
    ...(brand ? [`${brand} robot`, `used ${brand} robots`, `buy ${brand} robot india`] : []),
    // Category-specific if provided
    ...(category ? [category, `${category} robots`, `${category} robot for sale`] : []),
    // Application keywords
    'welding robot india', 'palletizing robot india', 'assembly robot india', 'material handling robot',
    // Location keywords
    'industrial robot delhi', 'robot mumbai', 'automation bangalore', 'robot chennai', 'robot pune'
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
    // Single-word keywords  
    'parts', 'spares', 'components', brand.toLowerCase(), 'replacement',
    // Core phrases
    `${brand} robot spare parts`, partName, 'robot replacement parts', 'industrial robot parts',
    // Long-tail keywords
    `${brand} ${partName} price india`, `buy ${brand} spare parts`, `${brand} parts supplier`,
    `robot ${partName}`, `industrial robot ${partName}`, `${brand} original parts`,
    // Compatible robots
    ...(part.compatible_robots || []).map((r: string) => `${r} spare parts`),
    // Category
    ...(part.category ? [part.category, `${part.category} parts`, `robot ${part.category}`] : []),
    // Location keywords
    'robot parts india', 'robot spares delhi', 'robot components mumbai',
    brand.toLowerCase(), 'RobotVerse parts'
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
    // Single-word keywords
    'repair', 'maintenance', 'service', 'installation', 'programming', 'calibration', 'training',
    // Core phrases
    'robot repair', 'robot maintenance', 'robot diagnostics', 'robot service',
    `${brand} service`, serviceType, 'industrial robot support', 'robot automation service India',
    // Long-tail keywords
    `${serviceType} for ${brand}`, `${brand} robot repair india`, `robot ${serviceType.toLowerCase()} near me`,
    `industrial robot ${serviceType.toLowerCase()} service`, `robot technician india`,
    // Brand-specific
    `${brand} authorized service`, `${brand} robot expert`,
    // Specializations
    ...(service.specializations || []).map((s: string) => `robot ${s}`),
    // Location keywords
    'robot service delhi', 'robot repair mumbai', 'robot maintenance bangalore', 'robot service chennai'
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
    // Single-word keywords
    'robotics', 'automation', 'news', 'technology', 'trends', 'innovation', 'industry',
    // Core phrases
    'robotics news', 'industrial automation', 'robot technology', 'automation updates', 'RoboBook',
    'robot trends', 'automation industry news', 'robotics articles',
    // Long-tail keywords
    'industrial robot technology news india', 'automation industry updates', 'robotics blog india',
    'robot technology trends', 'industrial automation news', 'manufacturing automation articles',
    // Extracted from content
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
        "url": "https://www.robotverse.in/robotverse-logo.jpg"
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
      // Single-word keywords
      'logistics', 'shipping', 'transport', 'delivery', 'freight', 'cargo', 'handling',
      // Core phrases
      'robot logistics', 'industrial robot transportation', 'robot shipping India',
      'heavy machinery transport', service.service_type, 'robot delivery', 'equipment transport',
      // Long-tail keywords
      'industrial robot shipping india', 'heavy equipment transport service', 'robot relocation service',
      'machinery moving service india', 'robot freight forwarding', 'automation equipment logistics',
      // Transport modes
      ...(service.transport_modes || []).map((m: string) => `${m} transport`),
      // Coverage areas
      ...(service.coverage_areas || []).map((a: string) => `robot logistics ${a}`),
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
    // Single-word keywords
    'logistics', 'transport', 'shipping', 'freight', 'delivery', 'moving', 'relocation',
    // Core phrases
    'robot logistics India', 'industrial robot transportation', 'robot shipping',
    'heavy equipment logistics', 'robot freight', 'machinery transport', 'specialized logistics',
    // Long-tail keywords
    'industrial robot shipping service india', 'heavy machinery transport company', 
    'robot moving service', 'automation equipment logistics', 'robot relocation india',
    'robot delivery services', 'industrial equipment shipping', 'factory equipment transport'
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
      // Single-word keywords
      'financing', 'loan', 'EMI', 'leasing', 'credit', 'funding', 'capital',
      // Core phrases
      'robot financing India', 'industrial robot loans', 'automation equipment finance',
      'robot leasing', product.product_name, 'equipment financing india',
      // Long-tail keywords
      'industrial robot loan india', 'robot EMI options', 'automation financing india',
      'machinery loan for robots', 'robot purchase financing', 'equipment lease india',
      // Loan types
      ...(product.loan_type || []).map((t: string) => `${t} for robots`),
      'business equipment financing', 'RobotVerse financing', 'robot finance company india'
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
    // Single-word keywords
    'financing', 'loans', 'EMI', 'leasing', 'credit', 'funding', 'capital',
    // Core phrases
    'robot financing India', 'industrial robot loans', 'automation equipment finance',
    'robot EMI', 'business equipment loans', 'robot leasing India',
    // Long-tail keywords
    'industrial robot loan india', 'robot purchase EMI options', 'automation equipment financing',
    'machinery loan for manufacturing', 'robot finance company india', 'equipment leasing india',
    'manufacturing equipment finance', 'robot purchase financing', 'easy robot loans india'
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
  
  // Comprehensive single-word and long-tail keywords for maximum search visibility
  const keywords = [
    // Single-word keywords
    'robots', 'automation', 'FANUC', 'ABB', 'KUKA', 'Yaskawa', 'Kawasaki', 'Epson', 'Mitsubishi', 'Nachi', 'Staubli', 'Denso', 'Comau', 'Motoman',
    // Core phrases
    'industrial robots India', 'buy robots online', 'robot marketplace', 'automation equipment',
    // Brand-specific
    'FANUC robots', 'ABB robots', 'KUKA robots', 'Yaskawa robots', 'Kawasaki robots',
    // Long-tail keywords
    'used industrial robots for sale India', 'second hand robot arm price', 'refurbished welding robot', 
    'palletizing robot for sale', 'pick and place robot', 'articulated robot arm', '6 axis robot',
    // Application-specific
    'welding robot', 'painting robot', 'assembly robot', 'material handling robot', 'packaging robot',
    'arc welding robot', 'spot welding robot', 'laser cutting robot', 'deburring robot', 'grinding robot',
    // Location-specific
    'industrial robot delhi', 'robot supplier mumbai', 'automation chennai', 'robot bangalore', 'robot pune',
    'robot hyderabad', 'robot ahmedabad', 'robot kolkata', 'robot noida', 'robot gurgaon',
    // Intent-based
    'buy industrial robot', 'sell robot', 'robot quotation', 'robot price india', 'robot dealer',
    'robot importer india', 'robot supplier india', 'robot trading india', 'used robot market india'
  ];
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "RobotVerse",
    "alternateName": ["Robot Verse", "RobotVerse India", "RobotVerse Marketplace"],
    "description": description,
    "url": "https://www.robotverse.in",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.robotverse.in/robots?search={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "sameAs": [
      "https://twitter.com/robotverse",
      "https://linkedin.com/company/robotverse"
    ]
  };
  
  return {
    title,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
    ogImage: '/robotverse-logo.jpg',
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
    // Single-word keywords
    brand.toLowerCase(), 'robot', 'automation', 'industrial', 'used', 'refurbished',
    // Core phrases
    `${brand} robot`, `${brand} industrial robot`, `buy ${brand} robots`,
    `used ${brand} robots India`, `${brand} robot for sale`, 'industrial automation', 'robot marketplace',
    // Long-tail keywords
    `${brand} robot price india`, `buy used ${brand} robot`, `${brand} robot dealer india`,
    `second hand ${brand} robot`, `refurbished ${brand} robot`, `${brand} robot supplier`,
    // Application-specific
    `${brand} welding robot`, `${brand} palletizing robot`, `${brand} material handling robot`,
    `${brand} assembly robot`, `${brand} pick and place robot`, `${brand} arc welding robot`,
    // Location keywords
    `${brand} robot delhi`, `${brand} robot mumbai`, `${brand} robot bangalore`, `${brand} robot chennai`
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
