/**
 * Internal Linking Engine for RobotVerse
 * Auto-generates contextual SEO internal links
 */

import { INDIAN_CITIES, ROBOT_BRANDS, ROBOT_APPLICATIONS } from './programmaticSEO';

const BASE_URL = 'https://www.robotverse.in';

interface InternalLink {
  url: string;
  text: string;
  title?: string;
  category: 'related' | 'brand' | 'category' | 'location' | 'service' | 'blog';
}

/**
 * Generate internal links for robot detail page
 */
export const generateRobotInternalLinks = (robot: any, relatedData?: any): InternalLink[] => {
  const links: InternalLink[] = [];
  const brand = robot.brand;
  const model = robot.model || robot.name;
  const applications = robot.applications || [];
  const location = robot.location || '';
  
  // Brand page link
  if (brand) {
    links.push({
      url: `/robots?brand=${encodeURIComponent(brand)}`,
      text: `More ${brand} Robots`,
      title: `Browse all ${brand} industrial robots`,
      category: 'brand'
    });
  }
  
  // Application-based links
  applications.slice(0, 2).forEach((app: string) => {
    links.push({
      url: `/robots?application=${encodeURIComponent(app.toLowerCase())}`,
      text: `${app} Robots`,
      title: `Industrial robots for ${app.toLowerCase()} applications`,
      category: 'category'
    });
  });
  
  // Spare parts link
  links.push({
    url: brand ? `/parts?brand=${encodeURIComponent(brand)}` : '/parts',
    text: brand ? `${brand} Spare Parts` : 'Robot Spare Parts',
    title: `Find spare parts for ${brand || 'industrial'} robots`,
    category: 'related'
  });
  
  // Services link
  links.push({
    url: '/services',
    text: 'Maintenance & Repair Services',
    title: 'Professional robot maintenance and repair services',
    category: 'service'
  });
  
  // Financing link
  links.push({
    url: '/financing',
    text: 'Robot Financing Options',
    title: 'Flexible financing for industrial robots',
    category: 'service'
  });
  
  // Logistics link
  links.push({
    url: '/logistics',
    text: 'Robot Logistics & Delivery',
    title: 'Specialized logistics for industrial robots',
    category: 'service'
  });
  
  // Location-based links
  const cityMatch = INDIAN_CITIES.find(city => 
    location.toLowerCase().includes(city.toLowerCase())
  );
  if (cityMatch) {
    links.push({
      url: `/robots?location=${encodeURIComponent(cityMatch)}`,
      text: `Robots in ${cityMatch}`,
      title: `Industrial robots available in ${cityMatch}`,
      category: 'location'
    });
  }
  
  // Related robots from same brand
  if (relatedData?.relatedRobots?.length > 0) {
    relatedData.relatedRobots.slice(0, 3).forEach((r: any) => {
      links.push({
        url: `/robots/${r.id}`,
        text: `${r.brand || ''} ${r.model || r.name}`,
        title: `View ${r.brand} ${r.model} robot details`,
        category: 'related'
      });
    });
  }
  
  // Blog/article links
  links.push({
    url: '/blogs',
    text: 'Robotics Articles & News',
    title: 'Latest news and articles about industrial robotics',
    category: 'blog'
  });
  
  return links.slice(0, 10); // Limit to 10 links
};

/**
 * Generate internal links for spare part detail page
 */
export const generateSparePartInternalLinks = (part: any, relatedData?: any): InternalLink[] => {
  const links: InternalLink[] = [];
  const brand = part.brand;
  const category = part.main_category;
  const compatibleRobots = part.compatible_robots || [];
  
  // Brand parts link
  if (brand) {
    links.push({
      url: `/parts?brand=${encodeURIComponent(brand)}`,
      text: `More ${brand} Parts`,
      title: `Browse all ${brand} spare parts`,
      category: 'brand'
    });
  }
  
  // Category link
  if (category) {
    links.push({
      url: `/parts?category=${encodeURIComponent(category)}`,
      text: `${category} Parts`,
      title: `Browse ${category.toLowerCase()} parts`,
      category: 'category'
    });
  }
  
  // Compatible robots links
  compatibleRobots.slice(0, 3).forEach((robotRef: string) => {
    links.push({
      url: `/robots?search=${encodeURIComponent(robotRef)}`,
      text: `${robotRef} Robots`,
      title: `Find ${robotRef} robots compatible with this part`,
      category: 'related'
    });
  });
  
  // Robots listing
  links.push({
    url: '/robots',
    text: 'Browse Industrial Robots',
    title: 'Explore our selection of industrial robots',
    category: 'related'
  });
  
  // Services link
  links.push({
    url: '/services',
    text: 'Installation Services',
    title: 'Professional spare part installation services',
    category: 'service'
  });
  
  // Related parts
  if (relatedData?.relatedParts?.length > 0) {
    relatedData.relatedParts.slice(0, 3).forEach((p: any) => {
      links.push({
        url: `/parts/${p.id}`,
        text: `${p.brand || ''} ${p.name}`,
        title: `View ${p.name} spare part details`,
        category: 'related'
      });
    });
  }
  
  return links.slice(0, 10);
};

/**
 * Generate internal links for service page
 */
export const generateServiceInternalLinks = (service: any): InternalLink[] => {
  const links: InternalLink[] = [];
  const serviceType = service.service_type;
  
  // Robots link
  links.push({
    url: '/robots',
    text: 'Browse Robots',
    title: 'Find robots that need servicing',
    category: 'related'
  });
  
  // Spare parts link
  links.push({
    url: '/parts',
    text: 'Order Spare Parts',
    title: 'Find spare parts for your robots',
    category: 'related'
  });
  
  // Other service types
  const serviceTypes = ['Maintenance', 'Repair', 'Installation', 'Training'];
  serviceTypes.forEach(type => {
    if (type.toLowerCase() !== serviceType?.toLowerCase()) {
      links.push({
        url: `/services?type=${encodeURIComponent(type.toLowerCase())}`,
        text: `${type} Services`,
        title: `Robot ${type.toLowerCase()} services`,
        category: 'category'
      });
    }
  });
  
  // Brand-specific service links
  ROBOT_BRANDS.slice(0, 4).forEach(brand => {
    links.push({
      url: `/services?brand=${encodeURIComponent(brand)}`,
      text: `${brand} Service`,
      title: `${brand} robot service and support`,
      category: 'brand'
    });
  });
  
  return links.slice(0, 10);
};

/**
 * Generate internal links for blog/article page
 */
export const generateBlogInternalLinks = (article: any, relatedData?: any): InternalLink[] => {
  const links: InternalLink[] = [];
  const tags = article.tags || [];
  
  // Category links based on tags
  tags.slice(0, 3).forEach((tag: string) => {
    links.push({
      url: `/blogs?tag=${encodeURIComponent(tag)}`,
      text: `${tag} Articles`,
      title: `More articles about ${tag}`,
      category: 'category'
    });
  });
  
  // Related robots
  links.push({
    url: '/robots',
    text: 'Browse Industrial Robots',
    title: 'Explore industrial robots on RobotVerse',
    category: 'related'
  });
  
  // Related services
  links.push({
    url: '/services',
    text: 'Robot Services',
    title: 'Professional robot services',
    category: 'service'
  });
  
  // Related spare parts
  links.push({
    url: '/parts',
    text: 'Spare Parts',
    title: 'Robot spare parts and components',
    category: 'related'
  });
  
  // More blogs
  links.push({
    url: '/blogs',
    text: 'All Articles',
    title: 'Browse all robotics articles',
    category: 'blog'
  });
  
  // Related articles
  if (relatedData?.relatedArticles?.length > 0) {
    relatedData.relatedArticles.slice(0, 3).forEach((a: any) => {
      links.push({
        url: `/blogs/${a.id}`,
        text: a.title,
        title: `Read: ${a.title}`,
        category: 'blog'
      });
    });
  }
  
  return links.slice(0, 10);
};

/**
 * Generate internal links for listing pages
 */
export const generateListingInternalLinks = (
  type: 'robots' | 'parts' | 'services' | 'blogs',
  filters?: { brand?: string; category?: string; location?: string }
): InternalLink[] => {
  const links: InternalLink[] = [];
  
  // Cross-section links
  const sections = [
    { url: '/robots', text: 'Industrial Robots', show: type !== 'robots' },
    { url: '/parts', text: 'Spare Parts', show: type !== 'parts' },
    { url: '/services', text: 'Robot Services', show: type !== 'services' },
    { url: '/blogs', text: 'Robotics Articles', show: type !== 'blogs' },
    { url: '/financing', text: 'Financing Options', show: true },
    { url: '/logistics', text: 'Logistics Services', show: true }
  ];
  
  sections.filter(s => s.show).forEach(section => {
    links.push({
      url: section.url,
      text: section.text,
      title: `Browse ${section.text.toLowerCase()}`,
      category: 'related'
    });
  });
  
  // Brand links
  if (type === 'robots' || type === 'parts') {
    ROBOT_BRANDS.slice(0, 5).forEach(brand => {
      links.push({
        url: `/${type}?brand=${encodeURIComponent(brand)}`,
        text: `${brand} ${type === 'robots' ? 'Robots' : 'Parts'}`,
        title: `${brand} ${type}`,
        category: 'brand'
      });
    });
  }
  
  // Location links for robots
  if (type === 'robots') {
    INDIAN_CITIES.slice(0, 5).forEach(city => {
      links.push({
        url: `/robots?location=${encodeURIComponent(city)}`,
        text: `Robots in ${city}`,
        title: `Industrial robots in ${city}`,
        category: 'location'
      });
    });
  }
  
  return links.slice(0, 10);
};

/**
 * Generate homepage internal links
 */
export const generateHomepageInternalLinks = (): InternalLink[] => {
  const links: InternalLink[] = [];
  
  // Main sections
  links.push(
    { url: '/robots', text: 'Browse Industrial Robots', title: 'Explore our robot marketplace', category: 'related' },
    { url: '/parts', text: 'Robot Spare Parts', title: 'Find spare parts', category: 'related' },
    { url: '/services', text: 'Robot Services', title: 'Professional robot services', category: 'service' },
    { url: '/financing', text: 'Robot Financing', title: 'Flexible financing options', category: 'service' },
    { url: '/logistics', text: 'Logistics Services', title: 'Robot transportation', category: 'service' },
    { url: '/blogs', text: 'Robotics Blog', title: 'Latest industry news', category: 'blog' }
  );
  
  // Top brands
  ROBOT_BRANDS.slice(0, 4).forEach(brand => {
    links.push({
      url: `/robots?brand=${encodeURIComponent(brand)}`,
      text: `${brand} Robots`,
      title: `Browse ${brand} industrial robots`,
      category: 'brand'
    });
  });
  
  return links;
};

/**
 * Render internal links as HTML (for SEO content blocks)
 */
export const renderInternalLinksHTML = (links: InternalLink[]): string => {
  const grouped = links.reduce((acc, link) => {
    if (!acc[link.category]) acc[link.category] = [];
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, InternalLink[]>);
  
  let html = '<div class=\\\"seo-internal-links\\\">';
  
  Object.entries(grouped).forEach(([category, categoryLinks]) => {
    html += `<div class=\\\"link-category link-category-${category}\\\">`;
    categoryLinks.forEach(link => {
      html += `<a href=\\\"${link.url}\\\" title=\\\"${link.title || link.text}\\\">${link.text}</a>`;
    });
    html += '</div>';
  });
  
  html += '</div>';
  return html;
};
