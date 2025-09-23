// SEO utilities for robot listings
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