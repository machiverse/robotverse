/**
 * RobotVerse Master SEO System
 * Complete keyword mapping, meta generation, and SEO optimization
 * Designed for maximum search engine ranking in industrial robotics niche
 */

// ============ KEYWORD STRATEGY ============

// Primary keyword mapping - NO DUPLICATE PRIMARY KEYWORDS
export const PAGE_KEYWORD_MAP = {
  // Homepage
  home: {
    primary: 'industrial robots marketplace India',
    secondary: ['buy industrial robots', 'sell industrial robots', 'automation equipment India', 'robot trading platform'],
    longTail: [
      'buy used industrial robots online India',
      'industrial robot marketplace for manufacturers',
      'trusted platform to buy sell robots India',
      'industrial automation equipment marketplace',
      'FANUC ABB KUKA robots for sale India'
    ]
  },
  
  // Robot Listings Page
  robots: {
    primary: 'used industrial robots for sale',
    secondary: ['refurbished robots India', 'second hand robots', 'pre-owned industrial robots', 'robot automation equipment'],
    longTail: [
      'buy used FANUC robots India',
      'refurbished ABB industrial robots for sale',
      'second hand KUKA robots price India',
      'used Yaskawa robots near me',
      'pre-owned welding robots for sale India'
    ]
  },
  
  // Robot Detail Page (dynamic)
  robotDetail: {
    primary: '{brand} {model} industrial robot',
    secondary: ['{brand} robot price', '{brand} {model} specifications', 'used {brand} robot', '{condition} {brand} robot'],
    longTail: [
      'buy {brand} {model} robot India',
      '{brand} {model} payload capacity reach',
      'used {brand} {model} for sale',
      '{brand} {model} vs alternatives',
      '{brand} robot dealer India'
    ]
  },
  
  // Spare Parts Listing
  parts: {
    primary: 'industrial robot spare parts India',
    secondary: ['robot components suppliers', 'genuine robot parts', 'robot replacement parts', 'automation spare parts'],
    longTail: [
      'FANUC robot spare parts supplier India',
      'ABB robot servo motor replacement',
      'KUKA robot cable harness buy online',
      'Yaskawa teach pendant price India',
      'robot controller spare parts'
    ]
  },
  
  // Spare Part Detail (dynamic)
  partDetail: {
    primary: '{brand} {partName} robot part',
    secondary: ['{brand} spare parts', 'robot {category}', '{partNumber} replacement', '{brand} components'],
    longTail: [
      'buy {brand} {partName} online India',
      '{brand} {partName} price specifications',
      'genuine {brand} {partNumber} spare part',
      '{brand} robot parts supplier India'
    ]
  },
  
  // Services Page
  services: {
    primary: 'robot repair maintenance services India',
    secondary: ['robot installation service', 'robot programming services', 'industrial robot technician', 'robot calibration service'],
    longTail: [
      'FANUC robot repair service near me',
      'industrial robot installation commissioning India',
      'robot preventive maintenance service provider',
      'robot programming training India',
      'emergency robot repair service 24x7'
    ]
  },
  
  // Service Detail (dynamic)
  serviceDetail: {
    primary: '{serviceType} for industrial robots',
    secondary: ['{serviceType} service provider', 'robot {serviceType}', 'professional robot {serviceType}', '{brand} robot service'],
    longTail: [
      '{serviceType} for {brand} robots India',
      'certified robot {serviceType} technician',
      'industrial robot {serviceType} cost India',
      'best robot {serviceType} company near me'
    ]
  },
  
  // Logistics Page
  logistics: {
    primary: 'industrial robot transportation India',
    secondary: ['robot shipping service', 'heavy machinery logistics', 'robot freight forwarding', 'equipment relocation'],
    longTail: [
      'industrial robot shipping pan India',
      'safe robot transportation service',
      'heavy machinery moving company India',
      'insured robot logistics provider',
      'international robot freight forwarding'
    ]
  },
  
  // Financing Page
  financing: {
    primary: 'robot financing India EMI options',
    secondary: ['industrial robot loan', 'equipment financing', 'robot leasing', 'automation finance'],
    longTail: [
      'industrial robot loan low interest India',
      'robot equipment financing EMI calculator',
      'robot leasing options for SMEs India',
      'automation equipment finance schemes',
      'used robot financing options'
    ]
  },
  
  // Contact Page
  contact: {
    primary: 'contact RobotVerse industrial robots',
    secondary: ['robot marketplace support', 'industrial robot inquiry', 'robot seller contact', 'automation marketplace help'],
    longTail: [
      'contact industrial robot marketplace India',
      'robot buying assistance inquiry',
      'get robot quotation RobotVerse',
      'industrial automation expert consultation'
    ]
  },
  
  // About/Company Page
  about: {
    primary: 'about RobotVerse robot marketplace',
    secondary: ['industrial robot company India', 'robot trading platform', 'automation marketplace', 'trusted robot seller'],
    longTail: [
      'leading industrial robot marketplace India',
      'trusted platform buy sell robots',
      'verified robot sellers marketplace',
      'about RobotVerse automation company'
    ]
  },
  
  // Blog/RoboBook
  blog: {
    primary: 'industrial robotics news India',
    secondary: ['robot automation articles', 'robotics industry updates', 'automation technology blog', 'robot buying guide'],
    longTail: [
      'latest industrial robot technology news',
      'robot automation trends India 2024',
      'industrial robot buying guide for manufacturers',
      'robotics industry insights articles'
    ]
  },
  
  // Pricing Page
  pricing: {
    primary: 'RobotVerse seller subscription plans',
    secondary: ['robot marketplace pricing', 'seller membership plans', 'listing fees robots', 'marketplace subscription'],
    longTail: [
      'RobotVerse seller pricing plans India',
      'robot marketplace listing fees',
      'best robot selling platform pricing',
      'affordable robot marketplace subscription'
    ]
  },
  
  // Buyer Guide
  buyerGuide: {
    primary: 'industrial robot buying guide',
    secondary: ['how to buy industrial robot', 'robot selection guide', 'robot purchase checklist', 'used robot inspection'],
    longTail: [
      'complete industrial robot buying guide India',
      'how to choose right industrial robot',
      'used robot inspection checklist',
      'robot payload reach selection guide',
      'what to check before buying used robot'
    ]
  },
  
  // Seller Guide
  sellerGuide: {
    primary: 'sell industrial robots online India',
    secondary: ['robot selling tips', 'list robot for sale', 'robot marketplace seller', 'sell used robots'],
    longTail: [
      'how to sell industrial robot online India',
      'best platform to sell used robots',
      'robot listing optimization tips',
      'get best price for used robot'
    ]
  }
};

// Major Robot Brands for SEO
export const ROBOT_BRANDS_SEO = [
  { name: 'FANUC', keywords: ['fanuc robot', 'fanuc industrial robot', 'fanuc robot arm', 'fanuc automation'] },
  { name: 'ABB', keywords: ['abb robot', 'abb industrial robot', 'abb robot arm', 'abb robotics'] },
  { name: 'KUKA', keywords: ['kuka robot', 'kuka industrial robot', 'kuka robot arm', 'kuka automation'] },
  { name: 'Yaskawa', keywords: ['yaskawa robot', 'yaskawa motoman', 'yaskawa industrial robot', 'motoman robot'] },
  { name: 'Kawasaki', keywords: ['kawasaki robot', 'kawasaki industrial robot', 'kawasaki robot arm'] },
  { name: 'Universal Robots', keywords: ['universal robots', 'UR robot', 'cobot', 'collaborative robot'] },
  { name: 'Mitsubishi', keywords: ['mitsubishi robot', 'mitsubishi industrial robot', 'melfa robot'] },
  { name: 'Epson', keywords: ['epson robot', 'epson scara robot', 'epson industrial robot'] },
  { name: 'Staubli', keywords: ['staubli robot', 'staubli industrial robot', 'staubli robot arm'] },
  { name: 'Denso', keywords: ['denso robot', 'denso industrial robot', 'denso robot arm'] },
  { name: 'Omron', keywords: ['omron robot', 'omron industrial robot', 'omron automation'] },
  { name: 'Comau', keywords: ['comau robot', 'comau industrial robot', 'comau automation'] },
  { name: 'Nachi', keywords: ['nachi robot', 'nachi industrial robot', 'nachi robot arm'] },
  { name: 'Doosan', keywords: ['doosan robot', 'doosan cobot', 'doosan collaborative robot'] },
  { name: 'Techman', keywords: ['techman robot', 'tm robot', 'techman cobot'] }
];

// Robot Applications for SEO
export const ROBOT_APPLICATIONS_SEO = [
  { name: 'Welding', keywords: ['welding robot', 'arc welding robot', 'spot welding robot', 'mig tig welding robot'] },
  { name: 'Material Handling', keywords: ['material handling robot', 'pick and place robot', 'loading unloading robot'] },
  { name: 'Palletizing', keywords: ['palletizing robot', 'palletizer robot', 'pallet stacking robot'] },
  { name: 'Assembly', keywords: ['assembly robot', 'robotic assembly', 'automated assembly robot'] },
  { name: 'Painting', keywords: ['painting robot', 'spray painting robot', 'coating robot'] },
  { name: 'Machine Tending', keywords: ['machine tending robot', 'cnc tending robot', 'press tending robot'] },
  { name: 'Packaging', keywords: ['packaging robot', 'robotic packaging', 'automated packaging robot'] },
  { name: 'Inspection', keywords: ['inspection robot', 'quality inspection robot', 'vision inspection robot'] },
  { name: 'Grinding', keywords: ['grinding robot', 'polishing robot', 'finishing robot'] },
  { name: 'Dispensing', keywords: ['dispensing robot', 'adhesive dispensing robot', 'sealant application robot'] }
];

// Indian Cities for Local SEO
export const INDIAN_CITIES_SEO = [
  { city: 'Chennai', state: 'Tamil Nadu', keywords: ['industrial robots Chennai', 'robot suppliers Chennai', 'automation Chennai'] },
  { city: 'Bangalore', state: 'Karnataka', keywords: ['industrial robots Bangalore', 'robot suppliers Bangalore', 'automation Bangalore'] },
  { city: 'Mumbai', state: 'Maharashtra', keywords: ['industrial robots Mumbai', 'robot suppliers Mumbai', 'automation Mumbai'] },
  { city: 'Pune', state: 'Maharashtra', keywords: ['industrial robots Pune', 'robot suppliers Pune', 'automation Pune'] },
  { city: 'Delhi NCR', state: 'Delhi', keywords: ['industrial robots Delhi', 'robot suppliers Delhi NCR', 'automation Delhi'] },
  { city: 'Hyderabad', state: 'Telangana', keywords: ['industrial robots Hyderabad', 'robot suppliers Hyderabad', 'automation Hyderabad'] },
  { city: 'Ahmedabad', state: 'Gujarat', keywords: ['industrial robots Ahmedabad', 'robot suppliers Gujarat', 'automation Ahmedabad'] },
  { city: 'Coimbatore', state: 'Tamil Nadu', keywords: ['industrial robots Coimbatore', 'robot suppliers Coimbatore', 'automation Coimbatore'] },
  { city: 'Gurugram', state: 'Haryana', keywords: ['industrial robots Gurugram', 'robot suppliers Gurgaon', 'automation Gurugram'] },
  { city: 'Noida', state: 'Uttar Pradesh', keywords: ['industrial robots Noida', 'robot suppliers Noida', 'automation Noida'] }
];

// Industries for SEO
export const INDUSTRIES_SEO = [
  'Automotive Manufacturing',
  'Electronics & Semiconductor',
  'Food & Beverage Processing',
  'Pharmaceutical Manufacturing',
  'Aerospace & Defense',
  'Metal Fabrication',
  'Plastics & Injection Molding',
  'Consumer Goods',
  'Healthcare & Medical Devices',
  'Logistics & Warehousing',
  'Chemical Processing',
  'Textile Manufacturing',
  'Solar & Renewable Energy',
  'Battery Manufacturing',
  'General Manufacturing'
];

// ============ META GENERATORS ============

/**
 * Generate optimized page title (max 60 chars)
 */
export const generateOptimizedTitle = (
  pageType: keyof typeof PAGE_KEYWORD_MAP,
  dynamicData?: Record<string, string>
): string => {
  const keywordData = PAGE_KEYWORD_MAP[pageType];
  if (!keywordData) return 'RobotVerse - Industrial Robots Marketplace India';
  
  let primary = keywordData.primary;
  
  // Replace dynamic placeholders
  if (dynamicData) {
    Object.entries(dynamicData).forEach(([key, value]) => {
      primary = primary.replace(`{${key}}`, value);
    });
  }
  
  const titleTemplates: Record<string, string> = {
    home: 'Buy & Sell Industrial Robots India | RobotVerse Marketplace',
    robots: 'Used Industrial Robots for Sale India | Verified Sellers | RobotVerse',
    robotDetail: `${dynamicData?.brand || ''} ${dynamicData?.model || ''} Robot | Price & Specs | RobotVerse`,
    parts: 'Robot Spare Parts & Components India | Genuine Parts | RobotVerse',
    partDetail: `${dynamicData?.brand || ''} ${dynamicData?.partName || ''} | Robot Parts | RobotVerse`,
    services: 'Robot Repair & Maintenance Services India | Expert Technicians',
    serviceDetail: `${dynamicData?.serviceType || ''} Services | Industrial Robots | RobotVerse`,
    logistics: 'Robot Logistics & Transportation India | Safe Shipping | RobotVerse',
    financing: 'Robot Financing & EMI Options India | Equipment Loans | RobotVerse',
    contact: 'Contact RobotVerse | Industrial Robot Marketplace Support',
    about: 'About RobotVerse | India\'s Trusted Robot Marketplace',
    blog: 'RoboBook | Industrial Robotics News & Insights India',
    pricing: 'Seller Plans & Pricing | RobotVerse Marketplace',
    buyerGuide: 'Industrial Robot Buying Guide | Expert Tips | RobotVerse',
    sellerGuide: 'Sell Robots Online India | Seller Guide | RobotVerse'
  };
  
  let title = titleTemplates[pageType] || `${primary} | RobotVerse`;
  
  // Ensure title is under 60 chars
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  
  return title;
};

/**
 * Generate high-CTR meta description (max 160 chars)
 */
export const generateOptimizedDescription = (
  pageType: keyof typeof PAGE_KEYWORD_MAP,
  dynamicData?: Record<string, string>
): string => {
  const descriptions: Record<string, string> = {
    home: 'Buy & sell industrial robots on India\'s trusted marketplace. Verified FANUC, ABB, KUKA, Yaskawa sellers. Get spare parts, services, financing & logistics. Start today!',
    robots: 'Browse 500+ used industrial robots from verified sellers. FANUC, ABB, KUKA, Yaskawa robots with warranty. Compare prices, get quotes. Free buyer support.',
    robotDetail: `${dynamicData?.brand || ''} ${dynamicData?.model || ''} industrial robot - ${dynamicData?.payload || ''} payload, ${dynamicData?.reach || ''} reach. ${dynamicData?.condition || 'Used'} condition. Get quote & financing options.`,
    parts: 'Shop genuine robot spare parts from verified suppliers. Servo motors, cables, controllers, teach pendants for FANUC, ABB, KUKA. Fast delivery across India.',
    partDetail: `Buy ${dynamicData?.brand || ''} ${dynamicData?.partName || ''} - ${dynamicData?.partNumber || ''}. Genuine/compatible part. Fast shipping. Compatible with ${dynamicData?.compatibility || 'multiple models'}.`,
    services: 'Find certified robot service providers for repair, maintenance, installation & programming. FANUC, ABB, KUKA experts. 24x7 emergency support across India.',
    serviceDetail: `Professional ${dynamicData?.serviceType || ''} services for industrial robots. Certified technicians. ${dynamicData?.location || 'Pan India'} coverage. Get free quote today.`,
    logistics: 'Safe industrial robot transportation across India. Insured shipping, professional handling, real-time tracking. Get instant freight quotes.',
    financing: 'Flexible robot financing with low EMI options. Equipment loans from ₹5 lakhs. Quick approval for used & new robots. Apply online now.',
    contact: 'Contact RobotVerse team for industrial robot inquiries, seller support, or buyer assistance. Quick response guaranteed. Call or email today.',
    about: 'RobotVerse is India\'s leading industrial robot marketplace connecting verified sellers with buyers. Trusted by 500+ manufacturers since 2020.',
    blog: 'Stay updated with latest industrial robotics news, automation trends, buying guides & industry insights. Expert articles for manufacturers.',
    pricing: 'Choose RobotVerse seller plans starting ₹999/month. Get unlimited listings, priority support, buyer leads. No hidden fees. Start selling today.',
    buyerGuide: 'Complete guide to buying industrial robots. Learn payload, reach, applications, inspection tips. Make informed decisions. Free PDF download.',
    sellerGuide: 'Sell your industrial robots on India\'s largest marketplace. Reach 10,000+ buyers. Free listing. Get best prices. Start selling in 5 minutes.'
  };
  
  let desc = descriptions[pageType] || 'RobotVerse - India\'s trusted marketplace for industrial robots, spare parts, services and automation solutions.';
  
  // Ensure description is under 160 chars
  if (desc.length > 160) {
    desc = desc.substring(0, 157) + '...';
  }
  
  return desc;
};

/**
 * Get all keywords for a page type
 */
export const getPageKeywords = (
  pageType: keyof typeof PAGE_KEYWORD_MAP,
  dynamicData?: Record<string, string>
): string[] => {
  const keywordData = PAGE_KEYWORD_MAP[pageType];
  if (!keywordData) return ['industrial robots', 'RobotVerse', 'robot marketplace India'];
  
  const allKeywords = [
    keywordData.primary,
    ...keywordData.secondary,
    ...keywordData.longTail
  ];
  
  // Replace dynamic placeholders
  if (dynamicData) {
    return allKeywords.map(keyword => {
      let processedKeyword = keyword;
      Object.entries(dynamicData).forEach(([key, value]) => {
        processedKeyword = processedKeyword.replace(`{${key}}`, value);
      });
      return processedKeyword;
    }).filter(k => !k.includes('{')); // Remove any unprocessed placeholders
  }
  
  return allKeywords;
};

/**
 * Generate location-specific keywords
 */
export const getLocationKeywords = (location?: string): string[] => {
  if (!location) return [];
  
  const cityData = INDIAN_CITIES_SEO.find(
    c => c.city.toLowerCase() === location.toLowerCase() ||
         c.state.toLowerCase() === location.toLowerCase()
  );
  
  if (cityData) {
    return cityData.keywords;
  }
  
  // Generic location keywords
  return [
    `industrial robots ${location}`,
    `robot suppliers ${location}`,
    `automation equipment ${location}`,
    `robot marketplace ${location}`
  ];
};

/**
 * Generate brand-specific keywords
 */
export const getBrandKeywords = (brand?: string): string[] => {
  if (!brand) return [];
  
  const brandData = ROBOT_BRANDS_SEO.find(
    b => b.name.toLowerCase() === brand.toLowerCase()
  );
  
  if (brandData) {
    return brandData.keywords;
  }
  
  // Generic brand keywords
  return [
    `${brand} robot`,
    `${brand} industrial robot`,
    `${brand} robot price India`,
    `used ${brand} robot`,
    `${brand} robot for sale`
  ];
};

/**
 * Generate application-specific keywords
 */
export const getApplicationKeywords = (applications?: string[]): string[] => {
  if (!applications || applications.length === 0) return [];
  
  const keywords: string[] = [];
  
  applications.forEach(app => {
    const appData = ROBOT_APPLICATIONS_SEO.find(
      a => a.name.toLowerCase() === app.toLowerCase()
    );
    
    if (appData) {
      keywords.push(...appData.keywords);
    } else {
      keywords.push(`${app} robot`, `${app} automation`, `robot for ${app}`);
    }
  });
  
  return keywords;
};

export default {
  PAGE_KEYWORD_MAP,
  ROBOT_BRANDS_SEO,
  ROBOT_APPLICATIONS_SEO,
  INDIAN_CITIES_SEO,
  INDUSTRIES_SEO,
  generateOptimizedTitle,
  generateOptimizedDescription,
  getPageKeywords,
  getLocationKeywords,
  getBrandKeywords,
  getApplicationKeywords
};
