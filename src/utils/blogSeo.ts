import DOMPurify from "dompurify";

export const SITE_URL = "https://robotverse.in";

export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function calcReadingTime(content: string): number {
  const text = (content || "").replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function buildBlogUrl(slugOrId: string): string {
  return `${SITE_URL}/blog/${slugOrId}`;
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: [
      "allow",
      "allowfullscreen",
      "frameborder",
      "scrolling",
      "src",
      "target",
      "rel",
      "loading",
      "decoding",
    ],
  });
}

export function buildArticleSchema(blog: {
  title: string;
  slug?: string | null;
  id: string;
  excerpt?: string | null;
  meta_description?: string | null;
  featured_image?: string | null;
  image_url?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  authorName?: string;
  focus_keywords?: string[] | null;
  tags?: string[] | null;
}) {
  const url = buildBlogUrl(blog.slug || blog.id);
  const image = blog.featured_image || blog.image_url || undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    description: blog.meta_description || blog.excerpt || undefined,
    image: image ? [image] : undefined,
    author: {
      "@type": "Person",
      name: blog.authorName || "RobotVerse",
    },
    publisher: {
      "@type": "Organization",
      name: "RobotVerse",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/robotverse-logo.png`,
      },
    },
    datePublished: blog.published_at || blog.created_at || undefined,
    dateModified: blog.updated_at || blog.published_at || blog.created_at || undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: [...(blog.focus_keywords || []), ...(blog.tags || [])].join(", ") || undefined,
  };
}

export function buildBreadcrumbSchema(title: string, slugOrId: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "RoboBook", item: `${SITE_URL}/robobook` },
      { "@type": "ListItem", position: 3, name: title, item: buildBlogUrl(slugOrId) },
    ],
  };
}
