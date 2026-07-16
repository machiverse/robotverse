import { useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import EnhancedHeader from "@/components/EnhancedHeader";
import FormattedContent from "@/components/FormattedContent";
import ResponsiveMedia from "@/components/ResponsiveMedia";
import BlogSocialPreview from "@/components/blog/BlogSocialPreview";
import PreviewLinkCard from "@/components/blog/PreviewLinkCard";
import { buildRoboBookPostUrl, SITE_URL } from "@/utils/blogSeo";
import { Calendar, Clock, User, Eye, ArrowLeft, BookOpen } from "lucide-react";

interface PreviewData {
  source: "community_posts" | "blogs";
  post: any;
  profile?: { full_name?: string; company_name?: string; avatar_url?: string } | null;
}

const PostPreview = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: res, error } = await supabase.rpc(
          "get_post_by_preview_token" as any,
          { p_token: token }
        );
        if (error) throw error;
        if (cancelled) return;
        if (!res) {
          setNotFound(true);
        } else {
          setData(res as PreviewData);
          // Fire-and-forget analytics
          supabase.rpc("increment_preview_view" as any, { p_token: token });
        }
      } catch (e) {
        console.error("Preview fetch failed:", e);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl mb-6" />
          <Skeleton className="h-10 w-3/4 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </main>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <main className="container max-w-md mx-auto px-4 py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">Preview link invalid</h1>
          <p className="text-muted-foreground mb-6">
            This preview link is broken or the post was removed.
          </p>
          <Button onClick={() => navigate("/robobook")}>Back to RoboBook</Button>
        </main>
      </div>
    );
  }

  const post = data.post;
  const slugOrId = post.slug || post.id;
  const liveUrl = buildRoboBookPostUrl(slugOrId);

  // Auto-redirect to canonical live post once published.
  if (post.status === "published") {
    return <Navigate to={`/robobook/${slugOrId}`} replace />;
  }

  const authorName =
    data.profile?.full_name || data.profile?.company_name || "RobotVerse member";
  const publishDate = post.scheduled_publish_at || post.published_at || post.created_at;
  const featuredImage =
    post.featured_image || post.image_url || post.media_url || undefined;
  const description =
    post.meta_description ||
    post.excerpt ||
    (post.content ? String(post.content).replace(/<[^>]+>/g, " ").slice(0, 160) : "");
  const previewUrl = `${SITE_URL}/preview/${token}`;
  const statusLabel = post.status === "scheduled" ? "Scheduled" : "Draft";
  const isVideo = post.post_type === "video";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Preview: ${post.title || "Untitled post"} — RobotVerse`}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={previewUrl} />
        <meta property="og:title" content={post.title || "Post preview"} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={previewUrl} />
        {featuredImage && <meta property="og:image" content={featuredImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title || "Post preview"} />
        <meta name="twitter:description" content={description} />
        {featuredImage && <meta name="twitter:image" content={featuredImage} />}
      </Helmet>

      <EnhancedHeader />

      <main className="container max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-600 bg-amber-500/10"
          >
            <Clock className="h-3 w-3 mr-1" /> {statusLabel} preview
          </Badge>
        </div>

        <PreviewLinkCard
          token={post.preview_token || token}
          status={post.status}
          liveUrl={liveUrl}
          previewViewCount={post.preview_view_count}
          previewLastViewedAt={post.preview_last_viewed_at}
          title={post.title}
          className="mb-6"
        />

        <Card className="overflow-hidden border-border/50 shadow-lg">
          <CardContent className="p-0">
            <div className="p-5 sm:p-6 pb-0">
              <div className="flex items-center gap-3 mb-5">
                <Avatar className="h-11 w-11 ring-2 ring-background">
                  <AvatarImage src={data.profile?.avatar_url} />
                  <AvatarFallback>
                    <User className="h-5 w-5 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{authorName}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {publishDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(publishDate), "PPP 'at' p")}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.preview_view_count ?? 0} preview views
                    </span>
                  </div>
                </div>
              </div>

              {post.title && (
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {post.title}
                </h1>
              )}

              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {post.tags.map((t: string, i: number) => (
                    <Badge key={`${t}-${i}`} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {featuredImage && (
              <div className="px-5 sm:px-6 pb-5">
                <div className="rounded-lg overflow-hidden bg-muted/30">
                  <ResponsiveMedia
                    src={featuredImage}
                    alt={post.title || "Preview media"}
                    type={isVideo ? "video" : "image"}
                  />
                </div>
              </div>
            )}

            {post.content && (
              <div className="px-5 sm:px-6 pb-6">
                <FormattedContent content={post.content} />
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <section className="mb-4">
          <h2 className="text-lg font-semibold mb-1">How this looks when shared</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Preview how Google, LinkedIn, WhatsApp and other platforms will render this link.
          </p>
          <BlogSocialPreview
            url={previewUrl}
            title={post.title || "Untitled post"}
            description={description}
            image={featuredImage}
          />
        </section>
      </main>
    </div>
  );
};

export default PostPreview;
