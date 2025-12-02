/**
 * Sitemap Generation Utilities for RobotVerse
 * Handles multiple sitemap types for different content
 */

import { supabase } from '@/integrations/supabase/client';

const BASE_URL = 'https://www.robotverse.in';

interface SitemapURL {
  loc: string;
  lastmod?: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

interface SitemapIndex {
  loc: string;
  lastmod?: string;
}

/**
 * Generate static pages sitemap
 */
export const generateStaticPagesSitemap = (): SitemapURL[] => {
  const now = new Date().toISOString();
  
  return [
    { loc: '/', lastmod: now, changefreq: 'daily', priority: 1.0 },
    { loc: '/robots', lastmod: now, changefreq: 'daily', priority: 0.9 },
    { loc: '/parts', lastmod: now, changefreq: 'daily', priority: 0.9 },
    { loc: '/services', lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: '/logistics', lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: '/financing', lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: '/blogs', lastmod: now, changefreq: 'daily', priority: 0.8 },
    { loc: '/contact', lastmod: now, changefreq: 'monthly', priority: 0.5 },
    { loc: '/terms', lastmod: now, changefreq: 'yearly', priority: 0.3 },
    { loc: '/buyer-guide', lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: '/seller-guide', lastmod: now, changefreq: 'monthly', priority: 0.6 }
  ];
};

/**
 * Fetch and generate robots sitemap URLs
 */
export const generateRobotsSitemapURLs = async (): Promise<SitemapURL[]> => {
  try {
    const { data: robots, error } = await supabase
      .from('robots')
      .select('id, updated_at, brand, model')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return (robots || []).map(robot => ({
      loc: `/robots/${robot.id}`,
      lastmod: robot.updated_at,
      changefreq: 'weekly' as const,
      priority: 0.8
    }));
  } catch (error) {
    console.error('Error generating robots sitemap:', error);
    return [];
  }
};

/**
 * Fetch and generate spare parts sitemap URLs
 */
export const generatePartsSitemapURLs = async (): Promise<SitemapURL[]> => {
  try {
    const { data: parts, error } = await supabase
      .from('spare_parts')
      .select('id, updated_at, brand, name')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return (parts || []).map(part => ({
      loc: `/parts/${part.id}`,
      lastmod: part.updated_at,
      changefreq: 'weekly' as const,
      priority: 0.7
    }));
  } catch (error) {
    console.error('Error generating parts sitemap:', error);
    return [];
  }
};

/**
 * Fetch and generate services sitemap URLs
 */
export const generateServicesSitemapURLs = async (): Promise<SitemapURL[]> => {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('id, updated_at, name')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return (services || []).map(service => ({
      loc: `/services/${service.id}`,
      lastmod: service.updated_at,
      changefreq: 'weekly' as const,
      priority: 0.7
    }));
  } catch (error) {
    console.error('Error generating services sitemap:', error);
    return [];
  }
};

/**
 * Fetch and generate blogs sitemap URLs
 */
export const generateBlogsSitemapURLs = async (): Promise<SitemapURL[]> => {
  try {
    const { data: blogs, error } = await supabase
      .from('blogs')
      .select('id, updated_at, title')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return (blogs || []).map(blog => ({
      loc: `/blogs/${blog.id}`,
      lastmod: blog.updated_at,
      changefreq: 'weekly' as const,
      priority: 0.6
    }));
  } catch (error) {
    console.error('Error generating blogs sitemap:', error);
    return [];
  }
};

/**
 * Fetch and generate community posts/videos sitemap URLs
 */
export const generateVideosSitemapURLs = async (): Promise<SitemapURL[]> => {
  try {
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select('id, updated_at, title, post_type')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return (posts || []).map(post => ({
      loc: `/robobook/${post.id}`,
      lastmod: post.updated_at,
      changefreq: 'weekly' as const,
      priority: post.post_type === 'video' ? 0.7 : 0.6
    }));
  } catch (error) {
    console.error('Error generating videos sitemap:', error);
    return [];
  }
};

/**
 * Generate location-based sitemap URLs
 */
export const generateLocationsSitemapURLs = (): SitemapURL[] => {
  const cities = [
    'Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune',
    'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Nagpur', 'Indore', 'Noida', 'Gurugram'
  ];
  
  const now = new Date().toISOString();
  const urls: SitemapURL[] = [];
  
  // Robot location pages
  cities.forEach(city => {
    urls.push({
      loc: `/robots/${city.toLowerCase().replace(/\s+/g, '-')}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: 0.6
    });
  });
  
  // Parts location pages
  cities.forEach(city => {
    urls.push({
      loc: `/parts/${city.toLowerCase().replace(/\s+/g, '-')}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: 0.5
    });
  });
  
  // Services location pages
  cities.forEach(city => {
    urls.push({
      loc: `/services/${city.toLowerCase().replace(/\s+/g, '-')}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: 0.5
    });
  });
  
  return urls;
};

/**
 * Generate complete sitemap XML content
 */
export const generateSitemapXML = (urls: SitemapURL[]): string => {
  const urlEntries = urls.map(url => `
  <url>
    <loc>${BASE_URL}${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
};

/**
 * Generate sitemap index XML content
 */
export const generateSitemapIndexXML = (sitemaps: SitemapIndex[]): string => {
  const sitemapEntries = sitemaps.map(sitemap => `
  <sitemap>
    <loc>${BASE_URL}${sitemap.loc}</loc>
    ${sitemap.lastmod ? `<lastmod>${sitemap.lastmod}</lastmod>` : ''}
  </sitemap>`).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
};

/**
 * Get all sitemap index entries
 */
export const getSitemapIndexEntries = (): SitemapIndex[] => {
  const now = new Date().toISOString();
  
  return [
    { loc: '/sitemaps/static.xml', lastmod: now },
    { loc: '/sitemaps/products.xml', lastmod: now },
    { loc: '/sitemaps/parts.xml', lastmod: now },
    { loc: '/sitemaps/services.xml', lastmod: now },
    { loc: '/sitemaps/blog.xml', lastmod: now },
    { loc: '/sitemaps/videos.xml', lastmod: now },
    { loc: '/sitemaps/locations.xml', lastmod: now }
  ];
};

/**
 * Generate complete sitemap for edge function
 */
export const generateCompleteSitemap = async (): Promise<string> => {
  try {
    // Gather all URLs
    const [staticURLs, robotURLs, partURLs, serviceURLs, blogURLs, videoURLs, locationURLs] = await Promise.all([
      Promise.resolve(generateStaticPagesSitemap()),
      generateRobotsSitemapURLs(),
      generatePartsSitemapURLs(),
      generateServicesSitemapURLs(),
      generateBlogsSitemapURLs(),
      generateVideosSitemapURLs(),
      Promise.resolve(generateLocationsSitemapURLs())
    ]);
    
    // Combine all URLs
    const allURLs = [
      ...staticURLs,
      ...robotURLs,
      ...partURLs,
      ...serviceURLs,
      ...blogURLs,
      ...videoURLs,
      ...locationURLs
    ];
    
    return generateSitemapXML(allURLs);
  } catch (error) {
    console.error('Error generating complete sitemap:', error);
    // Return minimal sitemap on error
    return generateSitemapXML(generateStaticPagesSitemap());
  }
};
