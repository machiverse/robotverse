import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Save,
  Send,
  ArrowLeft,
  BookOpen,
  Clock,
  CalendarClock,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Search,
} from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import BlogRichEditor from "@/components/blog/BlogRichEditor";
import FeaturedImageUpload from "@/components/blog/FeaturedImageUpload";
import BlogSEOPanel, { type SeoFields } from "@/components/blog/BlogSEOPanel";
import BlogSocialPreview from "@/components/blog/BlogSocialPreview";
import { calcReadingTime, slugify, sanitizeHtml, SITE_URL } from "@/utils/blogSeo";
import { cn } from "@/lib/utils";

interface BlogFormData {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  image_url: string;
  featured_image_alt: string;
  featured_image_caption: string;
  scheduled_publish_at: string;
}

const BlogEditor = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<BlogFormData>({
    title: "",
    content: "",
    excerpt: "",
    tags: [],
    image_url: "",
    featured_image_alt: "",
    featured_image_caption: "",
    scheduled_publish_at: "",
  });

  const [seoFields, setSeoFields] = useState<SeoFields>({
    slug: "",
    meta_title: "",
    meta_description: "",
    focus_keywords: [],
    seo_tags: [],
    canonical_url: "",
    category: "",
  });

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"write" | "seo" | "preview" | "social">("write");
  const [autosaveStatus, setAutosaveStatus] = useState<string>("");

  const recordIdRef = useRef<string | undefined>(id);
  const lastSavedRef = useRef<string>("");
  const skipAutosaveRef = useRef(false);

  const readingTime = calcReadingTime(formData.content);

  useEffect(() => {
    if (isEditing && id) fetchBlog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, id]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("id", id)
        .eq("author_id", user?.id ?? "")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Blog not found");
        navigate("/robobook");
        return;
      }

      skipAutosaveRef.current = true;
      setFormData({
        title: data.title || "",
        content: data.content || "",
        excerpt: data.excerpt || "",
        tags: data.tags || [],
        image_url: data.image_url || "",
        featured_image_alt: (data as any).featured_image_alt || "",
        featured_image_caption: (data as any).featured_image_caption || "",
        scheduled_publish_at: (data as any).scheduled_publish_at
          ? new Date((data as any).scheduled_publish_at).toISOString().slice(0, 16)
          : "",
      });
      setSeoFields({
        slug: (data as any).slug || "",
        meta_title: (data as any).meta_title || "",
        meta_description: (data as any).meta_description || "",
        focus_keywords: (data as any).focus_keywords || [],
        seo_tags: (data as any).seo_tags || data.tags || [],
        canonical_url: (data as any).canonical_url || "",
        category: (data as any).category || "",
      });
      setTimeout(() => (skipAutosaveRef.current = false), 100);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load blog");
    } finally {
      setLoading(false);
    }
  };

  const buildPayload = useCallback(
    (status: "draft" | "published", asScheduled: boolean) => {
      const slug = seoFields.slug || slugify(formData.title);
      const excerpt =
        formData.excerpt.trim() ||
        formData.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 160);

      const scheduled = formData.scheduled_publish_at
        ? new Date(formData.scheduled_publish_at).toISOString()
        : null;

      return {
        title: formData.title.trim(),
        content: formData.content,
        excerpt,
        tags: seoFields.seo_tags.length ? seoFields.seo_tags : formData.tags,
        image_url: formData.image_url || null,
        status,
        is_draft: status === "draft",
        author_id: user?.id,
        slug: slug || null,
        meta_title: seoFields.meta_title || null,
        meta_description: seoFields.meta_description || null,
        focus_keywords: seoFields.focus_keywords,
        seo_tags: seoFields.seo_tags,
        featured_image_alt: formData.featured_image_alt || null,
        featured_image_caption: formData.featured_image_caption || null,
        canonical_url: seoFields.canonical_url || null,
        category: seoFields.category || null,
        scheduled_publish_at: asScheduled ? scheduled : null,
        published_at:
          status === "published" && !asScheduled ? new Date().toISOString() : undefined,
      };
    },
    [formData, seoFields, user?.id]
  );

  const persist = useCallback(
    async (payload: any) => {
      // Strip undefined
      const data: Record<string, any> = {};
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined) data[k] = v;
      });

      if (recordIdRef.current) {
        const { error } = await supabase.from("blogs").update(data).eq("id", recordIdRef.current);
        if (error) throw error;
        return recordIdRef.current;
      }
      const { data: row, error } = await supabase.from("blogs").insert(data).select("id").single();
      if (error) throw error;
      recordIdRef.current = row.id;
      return row.id as string;
    },
    []
  );

  // Auto-save every 25s when content changed and we have a title
  useEffect(() => {
    if (!user || skipAutosaveRef.current) return;
    if (!formData.title.trim() || !formData.content.trim()) return;

    const t = setInterval(async () => {
      const snap = JSON.stringify({ formData, seoFields });
      if (snap === lastSavedRef.current) return;
      try {
        setAutosaveStatus("Saving…");
        const payload = buildPayload("draft", false);
        await persist(payload);
        lastSavedRef.current = snap;
        setAutosaveStatus(`Saved ${new Date().toLocaleTimeString()}`);
      } catch {
        setAutosaveStatus("Auto-save failed");
      }
    }, 25_000);
    return () => clearInterval(t);
  }, [formData, seoFields, user, buildPayload, persist]);

  const validate = () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (!formData.content.trim()) {
      toast.error("Content is required");
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const recId = await persist(buildPayload("draft", false));
      lastSavedRef.current = JSON.stringify({ formData, seoFields });
      toast.success("Draft saved");
      if (!isEditing) navigate(`/robobook/${recId}/edit`, { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const publishBlog = async () => {
    if (!validate()) return;
    const isScheduled = !!formData.scheduled_publish_at &&
      new Date(formData.scheduled_publish_at).getTime() > Date.now();
    try {
      setPublishing(true);
      const recId = await persist(buildPayload(isScheduled ? "draft" : "published", isScheduled));
      toast.success(isScheduled ? "Scheduled successfully" : "Blog published");
      navigate(isScheduled ? "/robobook" : `/robobook/${recId}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const previewWidth = {
    desktop: "max-w-4xl",
    tablet: "max-w-2xl",
    mobile: "max-w-sm",
  }[previewDevice];

  const previewUrl = `${SITE_URL}/blog/${seoFields.slug || slugify(formData.title) || "preview"}`;
  const previewMetaTitle = seoFields.meta_title || formData.title || "Untitled";
  const previewMetaDesc =
    seoFields.meta_description ||
    formData.excerpt ||
    formData.content.replace(/<[^>]+>/g, " ").trim().slice(0, 160);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">Sign in to write</h1>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link to="/robobook">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold leading-none">
                {isEditing ? "Edit article" : "Create new article"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {readingTime} min read
                </span>
                {autosaveStatus && <span>· {autosaveStatus}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={saving || publishing || loading}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button
              onClick={publishBlog}
              disabled={saving || publishing || loading}
              className="gap-1.5"
            >
              {formData.scheduled_publish_at &&
              new Date(formData.scheduled_publish_at).getTime() > Date.now() ? (
                <>
                  <CalendarClock className="h-4 w-4" /> {publishing ? "Scheduling…" : "Schedule"}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> {publishing ? "Publishing…" : "Publish"}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Main column */}
          <div className="space-y-5">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="seo">
                  <Search className="h-3.5 w-3.5 mr-1" /> SEO
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                </TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>

              <TabsContent value="write" className="space-y-5 mt-4">
                <Card>
                  <CardContent className="space-y-5 pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-semibold">
                        Title *
                      </Label>
                      <Input
                        id="title"
                        placeholder="Your headline…"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, title: e.target.value }))
                        }
                        className="text-2xl font-semibold h-14"
                      />
                    </div>

                    <FeaturedImageUpload
                      imageUrl={formData.image_url}
                      alt={formData.featured_image_alt}
                      caption={formData.featured_image_caption}
                      userId={user.id}
                      onChange={(v) =>
                        setFormData((p) => ({
                          ...p,
                          image_url: v.imageUrl,
                          featured_image_alt: v.alt,
                          featured_image_caption: v.caption,
                        }))
                      }
                    />

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Content *</Label>
                      <BlogRichEditor
                        value={formData.content}
                        onChange={(html) => setFormData((p) => ({ ...p, content: html }))}
                        placeholder="Tell your story…"
                        userId={user.id}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excerpt" className="text-sm font-semibold">
                        Excerpt
                      </Label>
                      <Textarea
                        id="excerpt"
                        placeholder="Short summary shown on listings and social previews"
                        value={formData.excerpt}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, excerpt: e.target.value }))
                        }
                        maxLength={300}
                        className="min-h-[80px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.excerpt.length}/300
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">SEO settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BlogSEOPanel
                      title={formData.title}
                      excerpt={formData.excerpt}
                      fields={seoFields}
                      onChange={setSeoFields}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2">Preview as:</span>
                  {[
                    { id: "desktop", icon: Monitor, label: "Desktop" },
                    { id: "tablet", icon: Tablet, label: "Tablet" },
                    { id: "mobile", icon: Smartphone, label: "Mobile" },
                  ].map((d) => (
                    <Button
                      key={d.id}
                      variant={previewDevice === d.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewDevice(d.id as any)}
                      className="gap-1.5"
                    >
                      <d.icon className="h-3.5 w-3.5" /> {d.label}
                    </Button>
                  ))}
                </div>
                <Card className="bg-muted/30 p-4 sm:p-6">
                  <div className={cn("mx-auto bg-background rounded-lg shadow-sm border p-6", previewWidth)}>
                    {formData.image_url && (
                      <img
                        src={formData.image_url}
                        alt={formData.featured_image_alt}
                        className="w-full aspect-[1.91/1] object-cover rounded-md mb-4"
                      />
                    )}
                    <h1 className="text-3xl font-bold leading-tight mb-2">
                      {formData.title || "Untitled"}
                    </h1>
                    <p className="text-sm text-muted-foreground mb-4">
                      {readingTime} min read
                    </p>
                    <div
                      className="prose prose-base dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.content) }}
                    />
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="social" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Social media preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BlogSocialPreview
                      url={previewUrl}
                      title={previewMetaTitle}
                      description={previewMetaDesc}
                      image={formData.image_url || undefined}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" /> Publishing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="schedule" className="text-sm">
                    Schedule publish
                  </Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={formData.scheduled_publish_at}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, scheduled_publish_at: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to publish immediately
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Reading time</Label>
                  <p className="text-sm text-muted-foreground">
                    ~{readingTime} min · auto-calculated
                  </p>
                </div>

                {(seoFields.focus_keywords.length > 0 || seoFields.seo_tags.length > 0) && (
                  <div className="space-y-2">
                    <Label className="text-sm">Tags &amp; keywords</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {seoFields.focus_keywords.map((k) => (
                        <Badge key={`fk-${k}`} variant="default" className="text-xs">
                          {k}
                        </Badge>
                      ))}
                      {seoFields.seo_tags.map((t) => (
                        <Badge key={`tag-${t}`} variant="secondary" className="text-xs">
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick SEO</CardTitle>
              </CardHeader>
              <CardContent>
                <BlogSocialPreview
                  url={previewUrl}
                  title={previewMetaTitle}
                  description={previewMetaDesc}
                  image={formData.image_url || undefined}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default BlogEditor;
