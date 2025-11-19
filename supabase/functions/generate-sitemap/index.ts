import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the base URL from request
    const baseUrl = new URL(req.url).origin.replace(/functions\/.*/, "").replace(/\/$/, "");

    // Fetch all robots
    const { data: robots, error: robotsError } = await supabase
      .from("robots")
      .select("id, updated_at, brand, model")
      .order("updated_at", { ascending: false });

    if (robotsError) throw robotsError;

    // Fetch all blog posts
    const { data: blogs, error: blogsError } = await supabase
      .from("blogs")
      .select("id, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false });

    if (blogsError) throw blogsError;

    // Fetch all community posts
    const { data: posts, error: postsError } = await supabase
      .from("community_posts")
      .select("id, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false });

    if (postsError) throw postsError;

    // Fetch all spare parts
    const { data: parts, error: partsError } = await supabase
      .from("spare_parts")
      .select("id, updated_at")
      .order("updated_at", { ascending: false });

    if (partsError) throw partsError;

    // Fetch all services
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, updated_at")
      .order("updated_at", { ascending: false });

    if (servicesError) throw servicesError;

    // Get unique robot brands for category pages
    const uniqueBrands = [...new Set(robots?.map((r: any) => r.brand).filter(Boolean))] as string[];

    // Static pages
    const staticPages = [
      { url: "", priority: "1.0", changefreq: "daily" },
      { url: "/robots", priority: "0.9", changefreq: "daily" },
      { url: "/parts", priority: "0.9", changefreq: "daily" },
      { url: "/services", priority: "0.8", changefreq: "weekly" },
      { url: "/logistics", priority: "0.8", changefreq: "weekly" },
      { url: "/financing", priority: "0.8", changefreq: "weekly" },
      { url: "/robobook", priority: "0.7", changefreq: "daily" },
      { url: "/community", priority: "0.7", changefreq: "daily" },
      { url: "/contact", priority: "0.6", changefreq: "monthly" },
      { url: "/seller-guide", priority: "0.6", changefreq: "monthly" },
      { url: "/buyer-guide", priority: "0.6", changefreq: "monthly" },
      { url: "/terms", priority: "0.5", changefreq: "monthly" },
      { url: "/cookies", priority: "0.5", changefreq: "monthly" },
      { url: "/accessibility", priority: "0.5", changefreq: "monthly" },
    ];

    // Build sitemap XML
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    staticPages.forEach((page) => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
      sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
      sitemap += `    <priority>${page.priority}</priority>\n`;
      sitemap += `    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n`;
      sitemap += `  </url>\n`;
    });

    // Add robot brand category pages
    uniqueBrands.forEach((brand) => {
      const brandSlug = brand.toLowerCase().replace(/\s+/g, "-");
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/robots?brand=${encodeURIComponent(brandSlug)}</loc>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `    <priority>0.8</priority>\n`;
      sitemap += `    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n`;
      sitemap += `  </url>\n`;
    });

    // Add robot detail pages
    robots?.forEach((robot: any) => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/robots/${robot.id}</loc>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `    <priority>0.8</priority>\n`;
      sitemap += `    <lastmod>${new Date(robot.updated_at).toISOString().split("T")[0]}</lastmod>\n`;
      sitemap += `  </url>\n`;
    });

    // Add blog posts
    blogs?.forEach((blog: any) => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/robobook/${blog.id}</loc>\n`;
      sitemap += `    <changefreq>monthly</changefreq>\n`;
      sitemap += `    <priority>0.6</priority>\n`;
      sitemap += `    <lastmod>${new Date(blog.updated_at).toISOString().split("T")[0]}</lastmod>\n`;
      sitemap += `  </url>\n`;
    });

    // Add community posts
    posts?.forEach((post: any) => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/community/${post.id}</loc>\n`;
      sitemap += `    <changefreq>monthly</changefreq>\n`;
      sitemap += `    <priority>0.6</priority>\n`;
      sitemap += `    <lastmod>${new Date(post.updated_at).toISOString().split("T")[0]}</lastmod>\n`;
      sitemap += `  </url>\n`;
    });

    sitemap += "</urlset>";

    return new Response(sitemap, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
