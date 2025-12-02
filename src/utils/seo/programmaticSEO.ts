/**
 * Programmatic SEO Content Generator for RobotVerse
 * Auto-generates keyword-rich content, FAQs, and descriptions
 */

// Indian cities for location-based SEO
export const INDIAN_CITIES = [
  'Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 
  'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad',
  'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi',
  'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Allahabad', 'Ranchi',
  'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur',
  'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Noida',
  'Gurugram', 'Greater Noida', 'Manesar'
];

// Robot brands for SEO targeting
export const ROBOT_BRANDS = [
  'FANUC', 'ABB', 'KUKA', 'Yaskawa', 'Kawasaki', 'Mitsubishi', 'Universal Robots',
  'Epson', 'Staubli', 'Denso', 'Omron', 'Comau', 'Nachi', 'Panasonic', 'Hyundai',
  'Doosan', 'Techman', 'Franka Emika', 'Precise Automation', 'Mecademic'
];

// Robot applications for SEO
export const ROBOT_APPLICATIONS = [
  'Welding', 'Material Handling', 'Palletizing', 'Assembly', 'Painting',
  'Pick and Place', 'Machine Tending', 'Packaging', 'Inspection', 'Cutting',
  'Grinding', 'Polishing', 'Dispensing', 'Deburring', 'Loading/Unloading'
];

// Industries served
export const INDUSTRIES = [
  'Automotive', 'Electronics', 'Food & Beverage', 'Pharmaceuticals', 'Aerospace',
  'Metal Fabrication', 'Plastics', 'Consumer Goods', 'Healthcare', 'Logistics',
  'Chemical', 'Textile', 'Printing', 'Solar', 'Battery Manufacturing'
];

/**
 * Generate programmatic robot description (300-800 words)
 */
export const generateRobotDescription = (robot: any): string => {
  const brand = robot.brand || 'Industrial';
  const model = robot.model || robot.name;
  const year = robot.year_manufactured || 'N/A';
  const payload = robot.payload_capacity;
  const reach = robot.reach;
  const condition = robot.condition || 'Used';
  const applications = robot.applications || [];
  const price = robot.price;
  const currency = robot.currency || 'INR';
  const location = robot.location || 'India';

  const description = `
## ${brand} ${model} Industrial Robot - ${condition} Condition

The ${brand} ${model} is a high-performance industrial robot designed for demanding automation applications. ${year !== 'N/A' ? `Manufactured in ${year}, this robot` : 'This robot'} combines precision, reliability, and versatility to meet the needs of modern manufacturing facilities across India.

### Technical Overview

${payload ? `With a payload capacity of ${payload}kg, the ${brand} ${model} excels in handling medium to heavy workloads with precision and consistency.` : ''} ${reach ? `The ${reach}mm reach provides extensive coverage, making it ideal for a wide range of industrial applications.` : ''} The robot features advanced motion control technology that ensures smooth, accurate movements while maintaining high-speed operation.

### Key Features & Capabilities

- **Precision Engineering**: Built with ${brand}'s renowned quality standards
- **Versatile Applications**: Suitable for ${applications.length > 0 ? applications.slice(0, 3).join(', ') : 'welding, material handling, and assembly'}
- **Energy Efficient**: Optimized power consumption for cost-effective operation
- **Easy Integration**: Compatible with major controller systems and PLCs
- **Low Maintenance**: Designed for reliability with minimal downtime

### Industrial Applications

The ${brand} ${model} is widely used across multiple industries including:

${INDUSTRIES.slice(0, 6).map(ind => `- **${ind}**: Proven track record in ${ind.toLowerCase()} automation`).join('\n')}

### Investment Value

${price ? `Available at ${currency} ${price.toLocaleString()}, this ${condition.toLowerCase()} ${brand} robot represents excellent value for manufacturers looking to enhance their automation capabilities without the premium cost of new equipment.` : `This ${condition.toLowerCase()} ${brand} robot offers excellent value for businesses seeking reliable automation solutions.`}

### Why Choose This Robot?

1. **Proven Technology**: ${brand} robots are trusted by leading manufacturers worldwide
2. **Support & Service**: Access to spare parts, maintenance, and technical support through RobotVerse
3. **Financing Options**: Flexible EMI and leasing options available
4. **Professional Installation**: Expert installation and commissioning services

### Location & Availability

Currently available in ${location}. RobotVerse offers nationwide logistics support for safe delivery and professional installation across all major Indian cities including Delhi, Mumbai, Bangalore, Chennai, and Hyderabad.

### Contact & Inquiry

For detailed specifications, pricing, or to schedule a demonstration, connect with the seller through RobotVerse's secure messaging platform. Our team can also assist with financing applications and logistics arrangements.

*Available from verified sellers on RobotVerse - India's leading marketplace for industrial robots.*
  `.trim();

  return description;
};

/**
 * Generate FAQ section for robot pages
 */
export const generateRobotFAQs = (robot: any): Array<{question: string, answer: string}> => {
  const brand = robot.brand || 'Industrial';
  const model = robot.model || robot.name;
  const price = robot.price;
  const currency = robot.currency || 'INR';
  const condition = robot.condition || 'Used';

  return [
    {
      question: `What is the price of ${brand} ${model} robot in India?`,
      answer: price 
        ? `The ${brand} ${model} is currently listed at ${currency} ${price.toLocaleString()} on RobotVerse. Prices may vary based on condition, accessories included, and market demand.`
        : `Contact the seller through RobotVerse for the latest pricing on the ${brand} ${model}. Prices vary based on configuration and condition.`
    },
    {
      question: `Is the ${brand} ${model} suitable for ${ROBOT_APPLICATIONS[0].toLowerCase()} applications?`,
      answer: `Yes, the ${brand} ${model} is capable of handling various industrial applications including ${ROBOT_APPLICATIONS.slice(0, 4).join(', ').toLowerCase()}. Specific application suitability depends on payload, reach, and other technical specifications.`
    },
    {
      question: `What warranty or support is available for this ${condition.toLowerCase()} robot?`,
      answer: `RobotVerse connects you with verified sellers who may offer limited warranties on ${condition.toLowerCase()} equipment. Additionally, you can find maintenance services, spare parts, and technical support through our platform.`
    },
    {
      question: `Can I get financing for the ${brand} ${model}?`,
      answer: `Yes, RobotVerse offers multiple financing options including equipment loans, EMI plans, and leasing arrangements. Apply through our platform to get competitive rates from verified finance providers.`
    },
    {
      question: `How is the robot delivered to my location?`,
      answer: `RobotVerse partners with specialized logistics providers experienced in handling industrial robots. Safe packaging, insured transport, and professional unloading services are available for deliveries across India.`
    },
    {
      question: `What spare parts are available for ${brand} robots?`,
      answer: `Browse our extensive catalog of ${brand} spare parts including servo motors, cables, teach pendants, and more. All parts are sourced from verified suppliers on RobotVerse.`
    }
  ];
};

/**
 * Generate spare part description
 */
export const generateSparePartDescription = (part: any): string => {
  const brand = part.brand || 'Industrial';
  const name = part.name || 'Spare Part';
  const partNumber = part.part_number || '';
  const category = part.main_category || 'Components';
  const condition = part.condition || 'New';
  const compatibleRobots = part.compatible_robots || [];

  return `
## ${brand} ${name} ${partNumber ? `(${partNumber})` : ''} - Robot Spare Part

The ${brand} ${name} is a high-quality ${condition.toLowerCase()} spare part designed for industrial robot maintenance and repair. Available on RobotVerse, India's leading marketplace for robot components and automation parts.

### Product Overview

This ${category.toLowerCase()} component is essential for maintaining optimal robot performance. ${condition === 'New' ? 'Brand new, original equipment manufacturer (OEM) quality.' : `Tested and certified ${condition.toLowerCase()} condition with verified functionality.`}

### Compatibility

${compatibleRobots.length > 0 
  ? `Compatible with: ${compatibleRobots.join(', ')}. Please verify exact model compatibility before ordering.`
  : 'Universal compatibility with multiple robot brands and models. Contact seller for specific compatibility verification.'}

### Features

- **Quality Assured**: ${condition === 'New' ? 'OEM or equivalent quality' : 'Professionally inspected and tested'}
- **Fast Delivery**: Nationwide shipping with tracking
- **Technical Support**: Expert assistance available
- **Warranty**: Standard warranty applicable

### Why Choose RobotVerse for Spare Parts?

- Verified sellers with quality guarantees
- Competitive pricing compared to direct OEM
- Wide selection of parts for all major robot brands
- Fast shipping across India

*Order with confidence from RobotVerse - Your trusted source for robot spare parts in India.*
  `.trim();
};

/**
 * Generate spare part FAQs
 */
export const generateSparePartFAQs = (part: any): Array<{question: string, answer: string}> => {
  const brand = part.brand || 'Industrial';
  const name = part.name || 'spare part';
  
  return [
    {
      question: `Is this ${brand} ${name} an original OEM part?`,
      answer: `Part authenticity varies by seller. Check the product listing for OEM certification. RobotVerse hosts both OEM and high-quality compatible alternatives.`
    },
    {
      question: `What is the delivery time for spare parts?`,
      answer: `Standard delivery is 3-7 business days within India. Express shipping options are available for urgent requirements. Check with the seller for exact timelines.`
    },
    {
      question: `Can I return the part if it's not compatible?`,
      answer: `Return policies vary by seller. Most sellers on RobotVerse offer returns within 7-15 days if the part is unused and in original packaging. Always verify compatibility before ordering.`
    },
    {
      question: `Do you offer bulk discounts on spare parts?`,
      answer: `Yes, many sellers offer discounts on bulk orders. Use the RobotVerse chat feature to negotiate pricing for larger quantities.`
    }
  ];
};

/**
 * Generate service description
 */
export const generateServiceDescription = (service: any): string => {
  const serviceType = service.service_type || 'Robot Service';
  const location = service.location || 'India';
  
  return `
## ${serviceType} - Professional Robot Services

Expert ${serviceType.toLowerCase()} for industrial robots. Available through verified service providers on RobotVerse across ${location}.

### Service Overview

Our network of certified technicians provides comprehensive ${serviceType.toLowerCase()} including preventive maintenance, emergency repairs, and performance optimization for all major robot brands.

### Industries We Serve

${INDUSTRIES.slice(0, 8).map(ind => `- ${ind}`).join('\n')}

### Why Choose RobotVerse Services?

- **Certified Technicians**: Factory-trained professionals
- **Quick Response**: Minimize downtime with fast service
- **Genuine Parts**: Access to authentic spare parts
- **Nationwide Coverage**: Services available across India

### Contact

Request a service quote through RobotVerse to get competitive pricing from multiple verified providers.
  `.trim();
};

/**
 * Generate blog/article SEO summary
 */
export const generateArticleSummary = (article: any): string => {
  const title = article.title || 'Article';
  const content = article.content || '';
  const tags = article.tags || [];
  
  // Extract first 200 words for summary
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).slice(0, 50).join(' ');
  
  return `
${title}

${words}...

**Tags**: ${tags.length > 0 ? tags.join(', ') : 'Industrial Robots, Automation, RoboBook'}

*Read more on RobotVerse RoboBook - Your source for robotics and automation insights.*
  `.trim();
};

/**
 * Generate location-specific SEO content
 */
export const generateLocationSEOContent = (
  productType: 'robot' | 'spare-part' | 'service',
  product: any,
  city: string
): string => {
  const brand = product.brand || 'Industrial';
  const name = product.model || product.name;
  
  const templates = {
    robot: `
## ${brand} ${name} in ${city}

Looking for ${brand} ${name} industrial robot in ${city}? RobotVerse offers the best selection of ${brand.toLowerCase()} robots available in ${city} and nearby areas.

### Why Buy from RobotVerse ${city}?

- **Local Availability**: Robots available in and around ${city}
- **Quick Delivery**: Faster logistics for ${city} area
- **Local Support**: Installation and service support in ${city}
- **Competitive Pricing**: Compare prices from multiple sellers

### ${city} Industrial Robot Market

${city} is a major hub for industrial automation in India. Manufacturing units in ${city} rely on robots for:
${ROBOT_APPLICATIONS.slice(0, 5).map(app => `- ${app}`).join('\n')}

### Contact Sellers in ${city}

Browse our listings to find ${brand} robots available in ${city}. Connect with sellers through RobotVerse's secure platform.

*RobotVerse - Industrial Robots in ${city}, India*
    `,
    'spare-part': `
## ${brand} Spare Parts in ${city}

Find genuine ${brand} spare parts in ${city}. RobotVerse connects you with verified spare parts suppliers serving ${city} and surrounding areas.

### ${city} Spare Parts Delivery

- Fast delivery to ${city}
- Multiple sellers with local stock
- Both OEM and compatible parts available

*Shop ${brand} spare parts for ${city} on RobotVerse*
    `,
    service: `
## Robot Services in ${city}

Professional robot maintenance, repair, and installation services in ${city}. Connect with certified service providers through RobotVerse.

### Services Available in ${city}

- Preventive Maintenance
- Emergency Repairs
- Robot Installation
- Technical Training
- Remote Support

*Find robot service providers in ${city} on RobotVerse*
    `
  };
  
  return templates[productType].trim();
};

/**
 * Generate comparison content for related products
 */
export const generateComparisonContent = (mainProduct: any, relatedProducts: any[]): string => {
  if (relatedProducts.length === 0) return '';
  
  const main = mainProduct;
  const related = relatedProducts.slice(0, 3);
  
  return `
### Compare Similar Robots

| Feature | ${main.brand} ${main.model} | ${related.map(r => `${r.brand} ${r.model}`).join(' | ')} |
|---------|${'-'.repeat(20)}|${related.map(() => '-'.repeat(20)).join('|')}|
| Payload | ${main.payload_capacity || 'N/A'} kg | ${related.map(r => `${r.payload_capacity || 'N/A'} kg`).join(' | ')} |
| Reach | ${main.reach || 'N/A'} mm | ${related.map(r => `${r.reach || 'N/A'} mm`).join(' | ')} |
| Condition | ${main.condition || 'N/A'} | ${related.map(r => r.condition || 'N/A').join(' | ')} |
| Price | ${main.currency || 'INR'} ${main.price?.toLocaleString() || 'Contact'} | ${related.map(r => `${r.currency || 'INR'} ${r.price?.toLocaleString() || 'Contact'}`).join(' | ')} |

*Explore all options to find the best robot for your application.*
  `.trim();
};

/**
 * Generate price range content for SEO
 */
export const generatePriceRangeContent = (product: any, marketData?: any): string => {
  const brand = product.brand || 'Industrial';
  const model = product.model || product.name;
  const price = product.price;
  const currency = product.currency || 'INR';
  
  if (!price) {
    return `Contact sellers for ${brand} ${model} pricing. Prices vary based on condition, configuration, and market availability.`;
  }
  
  const lowRange = Math.round(price * 0.8);
  const highRange = Math.round(price * 1.3);
  
  return `
### ${brand} ${model} Price Range in India

- **Listed Price**: ${currency} ${price.toLocaleString()}
- **Market Range**: ${currency} ${lowRange.toLocaleString()} - ${currency} ${highRange.toLocaleString()}
- **Condition**: ${product.condition || 'Used'}

*Prices are indicative and may vary based on specifications, accessories, and market conditions.*
  `.trim();
};

/**
 * Extract long-tail keywords from content
 */
export const extractLongTailKeywords = (product: any, type: string): string[] => {
  const brand = product.brand || '';
  const model = product.model || product.name || '';
  const location = product.location || '';
  const applications = product.applications || [];
  
  const keywords: string[] = [];
  
  // Brand + model combinations
  if (brand && model) {
    keywords.push(
      `${brand} ${model} price India`,
      `${brand} ${model} specifications`,
      `${brand} ${model} for sale`,
      `buy ${brand} ${model} online`,
      `used ${brand} ${model}`,
      `${brand} ${model} spare parts`
    );
  }
  
  // Location-based
  INDIAN_CITIES.slice(0, 10).forEach(city => {
    if (brand) {
      keywords.push(`${brand} robot ${city.toLowerCase()}`);
    }
    if (type === 'robot') {
      keywords.push(`industrial robot ${city.toLowerCase()}`);
    }
  });
  
  // Application-based
  applications.forEach((app: string) => {
    if (brand) {
      keywords.push(`${brand} ${app.toLowerCase()} robot`);
    }
    keywords.push(`${app.toLowerCase()} robot India`);
  });
  
  // Industry-specific
  INDUSTRIES.slice(0, 5).forEach(ind => {
    keywords.push(`robot for ${ind.toLowerCase()} industry`);
  });
  
  return [...new Set(keywords)];
};
