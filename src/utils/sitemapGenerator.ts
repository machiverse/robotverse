/**
 * Auto-Sitemap Generator for RobotVerse
 * Automatically generates and updates sitemap.xml
 */

import { supabase } from '@/integrations/supabase/client';
import { generateSlug } from './autoSeo';

interface SitemapURL {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

/**
 * Generate complete sitemap with all content
 */
export const generateCompleteSitemap = async (): Promise<string> => {
  const baseUrl = 'https://www.robotverse.in';
  const urls: SitemapURL[] = [];
  
  // Static pages
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/robots', priority: '1.0', changefreq: 'daily' },
    { path: '/spare-parts', priority: '0.9', changefreq: 'daily' },
    { path: '/services', priority: '0.9', changefreq: 'daily' },
    { path: '/robobook', priority: '0.8', changefreq: 'daily' },
    { path: '/logistics', priority: '0.8', changefreq: 'weekly' },
    { path: '/financing', priority: '0.8', changefreq: 'weekly' },
    { path: '/buyer-guide', priority: '0.7', changefreq: 'weekly' },
    { path: '/seller-guide', priority: '0.7', changefreq: 'weekly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  ];
  
  staticPages.forEach(page => {
    urls.push({
      loc: `${baseUrl}${page.path}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: page.changefreq,
      priority: page.priority
    });
  });
  
  // Robots
  const { data: robots } = await supabase
    .from('robots')
    .select('id, brand, model, controller_type, year_manufactured, updated_at')
    .order('updated_at', { ascending: false });
  
  robots?.forEach(robot => {
    const slug = generateSlug(`${robot.brand}-${robot.model}-${robot.controller_type}-${robot.year_manufactured}`);
    urls.push({
      loc: `${baseUrl}/robot/${robot.id}`,
      lastmod: robot.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    });
  });
  
  // Spare Parts
  const { data: parts } = await supabase
    .from('spare_parts')
    .select('id, brand, name, part_number, updated_at')
    .order('updated_at', { ascending: false });
  
  parts?.forEach(part => {
    urls.push({
      loc: `${baseUrl}/parts/${part.id}`,
      lastmod: part.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.7'
    });
  });
  
  // Services
  const { data: services } = await supabase
    .from('services')
    .select('id, service_type, updated_at')
    .order('updated_at', { ascending: false });
  
  services?.forEach(service => {
    urls.push({
      loc: `${baseUrl}/service/${service.id}`,
      lastmod: service.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.7'
    });
  });
  
  // RoboBook Community Posts
  const { data: posts } = await supabase
    .from('community_posts')
    .select('id, title, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  
  posts?.forEach(post => {
    const slug = generateSlug(post.title);
    urls.push({
      loc: `${baseUrl}/robobook/${post.id}`,
      lastmod: post.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.6'
    });
  });
  
  // Blogs
  const { data: blogs } = await supabase
    .from('blogs')
    .select('id, title, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  
  blogs?.forEach(blog => {
    urls.push({
      loc: `${baseUrl}/blog/${blog.id}`,
      lastmod: blog.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.6'
    });
  });
  
  // Generate XML
  return generateSitemapXML(urls);
};

/**
 * Generate XML sitemap format
 */
const generateSitemapXML = (urls: SitemapURL[]): string => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  return xml;
};

/**
 * Trigger sitemap regeneration
 */
export const regenerateSitemap = async () => {
  try {
    console.log('🗺️ Regenerating sitemap...');
    const sitemap = await generateCompleteSitemap();
    
    // In a real implementation, you would save this to public/sitemap.xml
    // or use an edge function to serve it dynamically
    console.log('✅ Sitemap regenerated successfully');
    
    return sitemap;
  } catch (error) {
    console.error('❌ Error regenerating sitemap:', error);
    throw error;
  }
};

export default generateCompleteSitemap;
