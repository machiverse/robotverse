import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Calendar,
  User,
  Eye,
  ArrowLeft,
  Edit,
  Trash2,
  BookOpen,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, formatDistanceToNow } from "date-fns";
import EnhancedHeader from "@/components/EnhancedHeader";
import BlogComments from "@/components/BlogComments";
import BlogShareBar from "@/components/blog/BlogShareBar";
import {
  buildArticleSchema,
  buildBlogUrl,
  buildBreadcrumbSchema,
  calcReadingTime,
  sanitizeHtml,
  SITE_URL,
} from "@/utils/blogSeo";

interface Blog {
  id: string;
  slug?: string | null;
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  image_url?: string;
  featured_image?: string | null;
  featured_image_alt?: string | null;
  featured_image_caption?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  focus_keywords?: string[] | null;
  canonical_url?: string | null;
  category?: string | null;
  reading_time_minutes?: number | null;
  status: string;
  author_id: string;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  profiles?: {
    full_name: string;
    company_name?: string;
  } | null;
}

const BlogDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBlog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (blog) {
      fetchRelatedBlogs();
      incrementViewCount(blog.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blog?.id]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      // Try slug first, then id (UUID-shaped)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");
      const query = supabase.from("blogs").select("*").eq("status", "published");
      const { data, error } = isUuid
        ? await query.eq("id", id!).maybeSingle()
        : await query.eq("slug", id!).maybeSingle();
      if (error) throw error;
      if (!data) {
        setBlog(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("user_id", data.author_id)
        .maybeSingle();
      setBlog({
        ...(data as any),
        profiles: profile
          ? {
              full_name: profile.full_name || "Anonymous",
              company_name: profile.company_name || "",
            }
          : null,
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load blog post");
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async (blogId: string) => {
    try {
      await (supabase.rpc as any)("increment_blog_view_count", { p_blog_id: blogId });
    } catch (e) {
      // non-critical
    }
  };

  const fetchRelatedBlogs = async () => {
    if (!blog) return;
    try {
      setRelatedLoading(true);
      const { data } = await supabase
        .from("blogs")
        .select("*")
        .eq("status", "published")
        .neq("id", blog.id)
        .limit(3)
        .order("published_at", { ascending: false });
      setRelatedBlogs((data as any[]) || []);
    } finally {
      setRelatedLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("blogs").delete().eq("id", blog!.id);
      if (error) throw error;
      toast.success("Blog deleted");
      navigate("/robobook");
    } catch {
      toast.error("Failed to delete blog");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full mb-6" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">Blog not found</h1>
          <p className="text-muted-foreground mb-6">
            This article doesn't exist or has been removed.
          </p>
          <Link to="/robobook">
            <Button>Back to RoboBook</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === blog.author_id;
  const slugOrId = blog.slug || blog.id;
  const url = buildBlogUrl(slugOrId);
  const heroImage = blog.featured_image || blog.image_url;
  const metaTitle = blog.meta_title || blog.title;
  const metaDesc =
    blog.meta_description ||
    blog.excerpt ||
    (blog.content || "").replace(/<[^>]+>/g, " ").trim().slice(0, 160);
  const readingTime = blog.reading_time_minutes || calcReadingTime(blog.content);
  const authorName =
    blog.profiles?.full_name || blog.profiles?.company_name || "Community member";

  const articleSchema = buildArticleSchema({
    ...blog,
    authorName,
  });
  const breadcrumbSchema = buildBreadcrumbSchema(blog.title, slugOrId);

  // Render content as HTML if it looks like HTML; else fall back to legacy markdown rendering
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(blog.content);
  const renderedHtml = looksLikeHtml
    ? sanitizeHtml(blog.content)
    : sanitizeHtml(
        blog.content
          .replace(/^### (.+)$/gm, "<h3>$1</h3>")
          .replace(/^## (.+)$/gm, "<h2>$1</h2>")
          .replace(/^# (.+)$/gm, "<h1>$1</h1>")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/^\s*[-•]\s+(.+)$/gm, "<li>$1</li>")
          .replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>")
          .replace(/\n{2,}/g, "</p><p>")
          .replace(/^/, "<p>")
          .replace(/$/, "</p>")
      );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        {(blog.focus_keywords?.length || blog.tags?.length) ? (
          <meta
            name="keywords"
            content={[...(blog.focus_keywords || []), ...(blog.tags || [])].join(", ")}
          />
        ) : null}
        <link rel="canonical" href={blog.canonical_url || url} />
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="RobotVerse" />
        {heroImage && <meta property="og:image" content={heroImage} />}
        {heroImage && <meta property="og:image:alt" content={blog.featured_image_alt || blog.title} />}
        <meta property="article:published_time" content={blog.published_at || blog.created_at} />
        <meta property="article:modified_time" content={blog.updated_at} />
        {blog.category && <meta property="article:section" content={blog.category} />}
        {(blog.tags || []).map((t) => (
          <meta key={`atag-${t}`} property="article:tag" content={t} />
        ))}
        {/* Twitter */}
        <meta name="twitter:card" content={heroImage ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        {heroImage && <meta name="twitter:image" content={heroImage} />}
        {/* JSON-LD */}
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <EnhancedHeader />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/robobook" className="hover:text-foreground">RoboBook</Link>
          {blog.category && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{blog.category}</span>
            </>
          )}
        </nav>

        <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <Link to="/robobook">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          {isAuthor && (
            <div className="flex items-center gap-2">
              <Link to={`/robobook/${blog.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="h-4 w-4" /> Edit
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this article?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <article>
          <header className="space-y-5 mb-8">
            {blog.category && (
              <Badge variant="outline" className="uppercase text-xs tracking-wider">
                {blog.category}
              </Badge>
            )}
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
              {blog.title}
            </h1>
            {blog.excerpt && (
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                {blog.excerpt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground border-t border-b py-3">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <User className="h-4 w-4" /> {authorName}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(new Date(blog.published_at || blog.created_at), "MMM d, yyyy")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {readingTime} min read
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4" /> {blog.view_count || 0} views
              </span>
            </div>
          </header>

          {heroImage && (
            <figure className="mb-8">
              <div className="aspect-[1.91/1] overflow-hidden rounded-xl border bg-muted">
                <img
                  src={heroImage}
                  alt={blog.featured_image_alt || blog.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              </div>
              {blog.featured_image_caption && (
                <figcaption className="text-xs text-muted-foreground mt-2 text-center italic">
                  {blog.featured_image_caption}
                </figcaption>
              )}
            </figure>
          )}

          <div
            className="prose prose-lg dark:prose-invert max-w-none prose-img:rounded-lg prose-headings:font-bold prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          {(blog.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t">
              {blog.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-8 pt-6 border-t">
            <BlogShareBar
              url={url}
              title={blog.title}
              excerpt={blog.excerpt}
              postId={blog.id}
              table="blogs"
            />
          </div>

          <footer className="mt-6 text-xs text-muted-foreground">
            Published{" "}
            {formatDistanceToNow(new Date(blog.published_at || blog.created_at), {
              addSuffix: true,
            })}
            {blog.updated_at !== blog.created_at && (
              <>
                {" "}· Updated{" "}
                {formatDistanceToNow(new Date(blog.updated_at), { addSuffix: true })}
              </>
            )}
          </footer>
        </article>

        {/* Related */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Related articles</h2>
          {relatedLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-video w-full rounded-t-lg" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : relatedBlogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No related articles yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedBlogs.map((r: any) => (
                <Card
                  key={r.id}
                  className="overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <Link to={`/blog/${r.slug || r.id}`}>
                    {(r.featured_image || r.image_url) && (
                      <div className="aspect-[1.91/1] overflow-hidden bg-muted">
                        <img
                          src={r.featured_image || r.image_url}
                          alt={r.featured_image_alt || r.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {r.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {r.excerpt}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.published_at || r.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>

        {user && (
          <section className="mt-12">
            <BlogComments blogId={blog.id} />
          </section>
        )}
      </main>
    </div>
  );
};

export default BlogDetails;
