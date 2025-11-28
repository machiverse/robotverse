// SEO utilities for robot and spare parts listings
export interface SEOElements {
  urlSlug: string;
  pageTitle: string;
  metaDescription: string;
  h1Heading: string;
  seoContentBlock: string;
  imageAltText: string;
  structuredData: object;
  breadcrumbSchema: object;
}

export interface RobotSEOData {
  id: string;
  brand?: string;
  model?: string;
  payload_capacity?: number;
  controller_type?: string;
  year_manufactured?: number;
  condition?: string;
  reach?: number;
  location?: string;
  state?: string;
  price?: number;
  currency?: string;
  seller_name?: string;
  company_name?: string;
  applications?: string[];
  images?: string[];
}

export interface SparePartSEOData {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  part_number?: string;
  main_category?: string;
  sub_category?: string;
  condition?: string;
  location?: string;
  state?: string;
  price?: number;
  currency?: string;
  seller_name?: string;
  company_name?: string;
  compatible_robots?: string[];
  images?: string[];
  description?: string;
  quantity?: number;
}

// Generate URL slug
export const generateRobotSlug = (robot: RobotSEOData): string => {
  const brand = (robot.brand || 'robot').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const model = (robot.model || 'model').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const payload = robot.payload_capacity || 0;
  const controller = (robot.controller_type || 'controller').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const id = robot.id.slice(0, 8);
  
  return `/robots/${brand}/${model}-${payload}kg-${controller}-${id}`;
};

// Generate page title
export const generatePageTitle = (robot: RobotSEOData): string => {
  const brand = robot.brand || 'Industrial';
  const model = robot.model || 'Robot';
  const payload = robot.payload_capacity || 0;
  const controller = robot.controller_type || 'Controller';
  const location = robot.location || robot.state || 'India';
  
  return `${brand} ${model} ${payload}kg ${controller} | Used Industrial Robot for Sale in ${location}`;
};

// Generate meta description
export const generateMetaDescription = (robot: RobotSEOData): string => {
  const year = robot.year_manufactured || new Date().getFullYear();
  const brand = robot.brand || 'Industrial';
  const model = robot.model || 'Robot';
  const payload = robot.payload_capacity || 0;
  const controller = robot.controller_type || 'Controller';
  const reach = robot.reach || 0;
  const seller = robot.seller_name || robot.company_name || 'Verified Seller';
  const location = robot.location || robot.state || 'India';
  
  const description = `Buy ${year} ${brand} ${model} ${payload}kg ${controller} with ${reach}mm reach from ${seller} in ${location}. Available now on RobotVerse.`;
  
  // Ensure it's under 160 characters
  return description.length > 160 ? description.substring(0, 157) + '...' : description;
};

// Generate H1 heading
export const generateH1Heading = (robot: RobotSEOData): string => {
  const brand = robot.brand || 'Industrial';
  const model = robot.model || 'Robot';
  const payload = robot.payload_capacity || 0;
  const controller = robot.controller_type || 'Controller';
  
  return `${brand} ${model} ${payload}kg ${controller}`;
};

// Generate SEO content block
export const generateSEOContentBlock = (robot: RobotSEOData): string => {
  const brand = robot.brand || 'Industrial';
  const model = robot.model || 'Robot';
  const payload = robot.payload_capacity || 0;
  const controller = robot.controller_type || 'Controller';
  const year = robot.year_manufactured || new Date().getFullYear();
  const condition = robot.condition || 'used';
  const reach = robot.reach || 0;
  const seller = robot.seller_name || robot.company_name || 'verified seller';
  const location = robot.location || robot.state || 'India';
  const applications = robot.applications?.slice(0, 3) || ['material handling', 'assembly', 'pick and place'];
  
  // Generate comparable robots based on brand
  const getComparableRobots = (robotBrand: string) => {
    const alternatives = {
      'fanuc': 'ABB IRB series, KUKA KR series, Yaskawa Motoman',
      'abb': 'Fanuc R-2000iA, KUKA KR Quantec, Yaskawa Motoman GP',
      'kuka': 'ABB IRB 6700, Fanuc M-710iC, Yaskawa Motoman HP',
      'yaskawa': 'ABB IRB series, Fanuc R-2000iA, KUKA KR series',
      'kawasaki': 'ABB IRB series, Fanuc M-710iC, KUKA KR Quantec',
      'mitsubishi': 'Fanuc R-2000iA, ABB IRB 6700, Yaskawa Motoman'
    };
    return alternatives[robotBrand.toLowerCase()] || 'ABB, KUKA, Fanuc, Yaskawa models';
  };
  
  const comparableRobots = getComparableRobots(brand);
  
  return `This ${year} ${brand} ${model} ${payload}kg ${controller} industrial robot offers exceptional performance for ${applications.join(', ')} applications. 
  
  With a ${reach}mm reach and ${condition} condition, this robot provides reliable automation solutions for manufacturing operations. The ${controller} controller ensures precise motion control and easy programming.
  
  Available from ${seller} in ${location}, this ${brand} robot is ideal for businesses seeking proven automation technology. The ${payload}kg payload capacity makes it suitable for handling a wide range of parts and materials.
  
  Compare with similar models from leading manufacturers including ${comparableRobots}. All robots listed on RobotVerse are verified by our team to ensure quality and authenticity.
  
  Contact the seller today to discuss specifications, warranty options, and installation services. Professional refurbishment and technical support available for all industrial robot purchases.`;
};

// Generate image ALT text
export const generateImageAltText = (robot: RobotSEOData, imageIndex: number = 0): string => {
  const brand = robot.brand || 'Industrial';
  const model = robot.model || 'Robot';
  const payload = robot.payload_capacity || 0;
  const controller = robot.controller_type || 'Controller';
  
  const suffix = imageIndex > 0 ? ` - View ${imageIndex + 1}` : '';
  return `${brand} ${model} ${payload}kg ${controller} industrial robot for sale${suffix}`;
};

// Generate structured data (JSON-LD Product Schema)
export const generateStructuredData = (robot: RobotSEOData): object => {
  const brand = robot.brand || 'Industrial Robot';
  const model = robot.model || 'Robot';
  const payload = robot.payload_capacity || 0;
  const controller = robot.controller_type || 'Controller';
  const condition = robot.condition || 'used';
  const seller = robot.seller_name || robot.company_name || 'RobotVerse Seller';
  const year = robot.year_manufactured || new Date().getFullYear();
  const price = robot.price || 0;
  const currency = robot.currency || 'INR';
  const images = robot.images || [];
  
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": `${brand} ${model} ${payload}kg ${controller}`,
    "brand": {
      "@type": "Brand",
      "name": brand
    },
    "model": model,
    "description": generateSEOContentBlock(robot),
    "category": "Industrial Robot",
    "condition": condition,
    "manufacturerPartNumber": model,
    "productionDate": year.toString(),
    "offers": {
      "@type": "Offer",
      "price": price,
      "priceCurrency": currency,
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": seller
      },
      "itemCondition": `https://schema.org/${condition === 'new' ? 'NewCondition' : 'UsedCondition'}`
    },
    "image": images.map(img => img),
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Payload Capacity",
        "value": `${payload}kg`
      },
      {
        "@type": "PropertyValue", 
        "name": "Controller Type",
        "value": controller
      },
      {
        "@type": "PropertyValue",
        "name": "Reach",
        "value": `${robot.reach || 0}mm`
      }
    ]
  };
};

// Generate breadcrumb schema
export const generateBreadcrumbSchema = (robot: RobotSEOData): object => {
  const brand = robot.brand || 'Industrial';
  const model = robot.model || 'Robot';
  const controller = robot.controller_type || 'Controller';
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Robots",
        "item": "https://robotverse.com/robots"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": brand,
        "item": `https://robotverse.com/robots?brand=${brand.toLowerCase()}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": model,
        "item": `https://robotverse.com/robots?model=${model.toLowerCase()}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": controller,
        "item": `https://robotverse.com/robots/${generateRobotSlug(robot)}`
      }
    ]
  };
};

// Generate all SEO elements at once
export const generateAllSEOElements = (robot: RobotSEOData): SEOElements => {
  return {
    urlSlug: generateRobotSlug(robot),
    pageTitle: generatePageTitle(robot),
    metaDescription: generateMetaDescription(robot),
    h1Heading: generateH1Heading(robot),
    seoContentBlock: generateSEOContentBlock(robot),
    imageAltText: generateImageAltText(robot),
    structuredData: generateStructuredData(robot),
    breadcrumbSchema: generateBreadcrumbSchema(robot)
  };
};

// ==================== SPARE PARTS SEO FUNCTIONS ====================

// Generate spare part URL slug
export const generateSparePartSlug = (part: SparePartSEOData): string => {
  const brand = (part.brand || 'part').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const name = (part.name || 'spare-part').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const partNumber = (part.part_number || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const id = part.id.slice(0, 8);
  
  return `/parts/${brand}/${name}-${partNumber}-${id}`;
};

// Generate spare part page title
export const generateSparePartPageTitle = (part: SparePartSEOData): string => {
  const brand = part.brand || 'Robot';
  const name = part.name || 'Spare Part';
  const partNumber = part.part_number || '';
  const location = part.location || part.state || 'India';
  
  const partNumberText = partNumber ? ` (${partNumber})` : '';
  return `${brand} ${name}${partNumberText} | Genuine Robot Spare Parts for Sale in ${location}`;
};

// Generate spare part meta description
export const generateSparePartMetaDescription = (part: SparePartSEOData): string => {
  const brand = part.brand || 'Robot';
  const name = part.name || 'spare part';
  const category = part.main_category || 'robot component';
  const condition = part.condition || 'used';
  const seller = part.seller_name || part.company_name || 'Verified Seller';
  const location = part.location || part.state || 'India';
  const compatibility = part.compatible_robots?.slice(0, 2).join(', ') || 'industrial robots';
  
  const description = `Buy genuine ${brand} ${name} (${category}) in ${condition} condition from ${seller} in ${location}. Compatible with ${compatibility}. Available on RobotVerse.`;
  
  // Ensure it's under 160 characters
  return description.length > 160 ? description.substring(0, 157) + '...' : description;
};

// Generate spare part H1 heading
export const generateSparePartH1Heading = (part: SparePartSEOData): string => {
  const brand = part.brand || 'Robot';
  const name = part.name || 'Spare Part';
  const model = part.model ? ` ${part.model}` : '';
  
  return `${brand}${model} ${name}`;
};

// Generate spare part SEO content block
export const generateSparePartSEOContentBlock = (part: SparePartSEOData): string => {
  const brand = part.brand || 'Robot';
  const name = part.name || 'spare part';
  const category = part.main_category || 'robot component';
  const subCategory = part.sub_category || '';
  const condition = part.condition || 'used';
  const seller = part.seller_name || part.company_name || 'verified seller';
  const location = part.location || part.state || 'India';
  const partNumber = part.part_number || 'contact seller for details';
  const compatibility = part.compatible_robots?.slice(0, 3).join(', ') || 'various industrial robots';
  const price = part.price ? `${part.currency || 'INR'} ${part.price.toLocaleString()}` : 'competitive prices';
  
  // Generate comparable parts based on brand
  const getComparableParts = (partBrand: string, partCategory: string) => {
    const mainBrands = ['FANUC', 'ABB', 'KUKA', 'Yaskawa', 'Kawasaki', 'Mitsubishi'];
    const otherBrands = mainBrands.filter(b => b.toLowerCase() !== partBrand.toLowerCase()).slice(0, 3);
    return `${otherBrands.join(', ')} ${partCategory}`;
  };
  
  const comparableParts = getComparableParts(brand, category);
  const categoryText = subCategory ? `${category} - ${subCategory}` : category;
  
  return `This genuine ${brand} ${name} (Part #: ${partNumber}) is a high-quality ${categoryText} in ${condition} condition, perfect for maintaining and repairing ${compatibility}.

Available from ${seller} in ${location} at ${price}, this ${brand} spare part ensures optimal performance and reliability for your industrial automation equipment. The ${category} component is essential for maintaining production uptime and robot efficiency.

Compatible with ${compatibility}, this spare part meets OEM specifications and quality standards. Professional installation and technical support available upon request.

Compare with similar components from leading manufacturers including ${comparableParts}. All spare parts listed on RobotVerse are verified by our team to ensure authenticity and quality.

Contact ${seller} today to check availability, warranty options, and bulk pricing. Fast shipping available across India with proper packaging to ensure safe delivery of your critical robot components.`;
};

// Generate spare part image ALT text
export const generateSparePartImageAltText = (part: SparePartSEOData, imageIndex: number = 0): string => {
  const brand = part.brand || 'Robot';
  const name = part.name || 'Spare Part';
  const partNumber = part.part_number || '';
  
  const suffix = imageIndex > 0 ? ` - View ${imageIndex + 1}` : '';
  const partNumberText = partNumber ? ` (${partNumber})` : '';
  return `${brand} ${name}${partNumberText} spare part for sale${suffix}`;
};

// Generate spare part structured data (JSON-LD Product Schema)
export const generateSparePartStructuredData = (part: SparePartSEOData): object => {
  const brand = part.brand || 'Robot Part';
  const name = part.name || 'Spare Part';
  const category = part.main_category || 'Robot Component';
  const condition = part.condition || 'used';
  const seller = part.seller_name || part.company_name || 'RobotVerse Seller';
  const price = part.price || 0;
  const currency = part.currency || 'INR';
  const images = part.images || [];
  const partNumber = part.part_number || 'N/A';
  
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": `${brand} ${name}`,
    "brand": {
      "@type": "Brand",
      "name": brand
    },
    "mpn": partNumber,
    "description": generateSparePartSEOContentBlock(part),
    "category": category,
    "condition": condition,
    "offers": {
      "@type": "Offer",
      "price": price,
      "priceCurrency": currency,
      "availability": part.quantity && part.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": seller
      },
      "itemCondition": `https://schema.org/${condition === 'new' ? 'NewCondition' : 'UsedCondition'}`
    },
    "image": images.map(img => img),
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Part Number",
        "value": partNumber
      },
      {
        "@type": "PropertyValue", 
        "name": "Category",
        "value": category
      },
      {
        "@type": "PropertyValue",
        "name": "Compatible Robots",
        "value": part.compatible_robots?.join(', ') || 'Universal'
      }
    ]
  };
};

// Generate spare part breadcrumb schema
export const generateSparePartBreadcrumbSchema = (part: SparePartSEOData): object => {
  const brand = part.brand || 'Robot Parts';
  const category = part.main_category || 'Components';
  const name = part.name || 'Spare Part';
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Spare Parts",
        "item": "https://robotverse.in/parts"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": brand,
        "item": `https://robotverse.in/parts?brand=${brand.toLowerCase()}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": category,
        "item": `https://robotverse.in/parts?category=${category.toLowerCase()}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": name,
        "item": `https://robotverse.in/parts/${part.id}`
      }
    ]
  };
};

// Generate all spare part SEO elements at once
export const generateAllSparePartSEOElements = (part: SparePartSEOData): SEOElements => {
  return {
    urlSlug: generateSparePartSlug(part),
    pageTitle: generateSparePartPageTitle(part),
    metaDescription: generateSparePartMetaDescription(part),
    h1Heading: generateSparePartH1Heading(part),
    seoContentBlock: generateSparePartSEOContentBlock(part),
    imageAltText: generateSparePartImageAltText(part),
    structuredData: generateSparePartStructuredData(part),
    breadcrumbSchema: generateSparePartBreadcrumbSchema(part)
  };
};

// Helper function to update document head with SEO elements
export const updateDocumentSEO = (seoElements: SEOElements) => {
  // Update page title
  document.title = seoElements.pageTitle;
  
  // Update or create meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', seoElements.metaDescription);
  
  // Update or create structured data
  let structuredDataScript = document.querySelector('script[type="application/ld+json"]');
  if (!structuredDataScript) {
    structuredDataScript = document.createElement('script');
    structuredDataScript.setAttribute('type', 'application/ld+json');
    document.head.appendChild(structuredDataScript);
  }
  structuredDataScript.textContent = JSON.stringify([
    seoElements.structuredData,
    seoElements.breadcrumbSchema
  ]);
};