import { getSuppressedUserIds } from '../_shared/suppressed.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SitemapURL {
  loc: string
  lastmod: string
  changefreq: string
  priority: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🗺️ Generating complete sitemap...')

    const baseUrl = 'https://www.robotverse.in'
    const urls: SitemapURL[] = []

    // Static pages
    const staticPages = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/robots', priority: '1.0', changefreq: 'daily' },
      { path: '/spare-parts', priority: '0.9', changefreq: 'daily' },
      { path: '/services', priority: '0.9', changefreq: 'daily' },
      { path: '/robobook', priority: '0.8', changefreq: 'daily' },
      { path: '/logistics', priority: '0.8', changefreq: 'weekly' },
      { path: '/financing', priority: '0.8', changefreq: 'weekly' },
    ]

    staticPages.forEach(page => {
      urls.push({
        loc: `${baseUrl}${page.path}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: page.changefreq,
        priority: page.priority
      })
    })

    // Moderation: never list content owned by a suppressed account.
    const suppressed = await getSuppressedUserIds(supabase)

    // Robots
    const { data: robots, error: robotsError } = await supabase
      .from('robots')
      .select('id, updated_at')
      .not('seller_id', 'in', `(${suppressed.join(",") || "00000000-0000-0000-0000-000000000000"})`)
      .order('updated_at', { ascending: false })

    if (robotsError) {
      console.error('Error fetching robots:', robotsError)
    } else {
      robots?.forEach(robot => {
        urls.push({
          loc: `${baseUrl}/robot/${robot.id}`,
          lastmod: robot.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.8'
        })
      })
      console.log(`✅ Added ${robots?.length || 0} robots to sitemap`)
    }

    // Spare Parts
    const { data: parts, error: partsError } = await supabase
      .from('spare_parts')
      .select('id, updated_at')
      .not('seller_id', 'in', `(${suppressed.join(",") || "00000000-0000-0000-0000-000000000000"})`)
      .order('updated_at', { ascending: false })

    if (partsError) {
      console.error('Error fetching spare parts:', partsError)
    } else {
      parts?.forEach(part => {
        urls.push({
          loc: `${baseUrl}/parts/${part.id}`,
          lastmod: part.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.7'
        })
      })
      console.log(`✅ Added ${parts?.length || 0} spare parts to sitemap`)
    }

    // Services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, updated_at')
      .not('provider_id', 'in', `(${suppressed.join(",") || "00000000-0000-0000-0000-000000000000"})`)
      .order('updated_at', { ascending: false })

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
    } else {
      services?.forEach(service => {
        urls.push({
          loc: `${baseUrl}/service/${service.id}`,
          lastmod: service.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          changefreq: 'monthly',
          priority: '0.7'
        })
      })
      console.log(`✅ Added ${services?.length || 0} services to sitemap`)
    }

    // RoboBook Community Posts
    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select('id, updated_at')
      .not('author_id', 'in', `(${suppressed.join(",") || "00000000-0000-0000-0000-000000000000"})`)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })

    if (postsError) {
      console.error('Error fetching community posts:', postsError)
    } else {
      posts?.forEach(post => {
        urls.push({
          loc: `${baseUrl}/robobook/${post.id}`,
          lastmod: post.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.6'
        })
      })
      console.log(`✅ Added ${posts?.length || 0} RoboBook posts to sitemap`)
    }

    // Generate XML
    const xml = generateSitemapXML(urls)

    console.log(`✅ Sitemap generated successfully with ${urls.length} URLs`)

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error generating sitemap:', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function generateSitemapXML(urls: SitemapURL[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
</urlset>`
}