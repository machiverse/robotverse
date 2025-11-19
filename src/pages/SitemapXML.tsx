import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SitemapXML = () => {
  const [xmlContent, setXmlContent] = useState<string>("");

  useEffect(() => {
    const generateSitemap = async () => {
      try {
        // Fetch robots
        const { data: robots } = await supabase
          .from("robots")
          .select("id, updated_at, brand")
          .order("updated_at", { ascending: false });

        // Fetch blogs
        const { data: blogs } = await supabase
          .from("blogs")
          .select("id, updated_at")
          .eq("status", "published")
          .order("updated_at", { ascending: false });

        const baseUrl = window.location.origin;
        
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Static pages
        const staticPages = [
          { url: "", priority: "1.0", changefreq: "daily" },
          { url: "/robots", priority: "0.9", changefreq: "daily" },
          { url: "/parts", priority: "0.9", changefreq: "daily" },
          { url: "/services", priority: "0.8", changefreq: "weekly" },
          { url: "/logistics", priority: "0.8", changefreq: "weekly" },
          { url: "/financing", priority: "0.8", changefreq: "weekly" },
          { url: "/robobook", priority: "0.7", changefreq: "daily" },
        ];

        staticPages.forEach((page) => {
          sitemap += `  <url>\n    <loc>${baseUrl}${page.url}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
        });

        // Robot pages
        robots?.forEach((robot) => {
          sitemap += `  <url>\n    <loc>${baseUrl}/robots/${robot.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n    <lastmod>${new Date(robot.updated_at).toISOString().split("T")[0]}</lastmod>\n  </url>\n`;
        });

        // Blog pages
        blogs?.forEach((blog) => {
          sitemap += `  <url>\n    <loc>${baseUrl}/robobook/${blog.id}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n    <lastmod>${new Date(blog.updated_at).toISOString().split("T")[0]}</lastmod>\n  </url>\n`;
        });

        sitemap += "</urlset>";
        setXmlContent(sitemap);

        // Set response headers for XML
        document.title = "Sitemap";
      } catch (error) {
        console.error("Error generating sitemap:", error);
      }
    };

    generateSitemap();
  }, []);

  // Render XML as pre-formatted text
  return (
    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", padding: "20px" }}>
      {xmlContent || "Generating sitemap..."}
    </pre>
  );
};

export default SitemapXML;
