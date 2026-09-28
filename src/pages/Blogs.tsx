import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { BLOG_CATEGORIES, blogCategoryOf } from "@/utils/blogCategories";
import NewsLeadCarousel from "@/components/robobook/NewsLeadCarousel";
import ArticleCard from "@/components/robobook/ArticleCard";
import { useSearchParams } from "react-router-dom";
import { useUrlParam, useDebouncedUrlParam } from "@/hooks/useUrlState";
import CopySearchLinkButton from "@/components/CopySearchLinkButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Filter,
  Clock,
  Heart,
  Eye,
  TrendingUp,
  BookOpen,
  Video,
  FileText,
  Image as ImageIcon,
  SlidersHorizontal,
  Rss,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EnhancedHeader from "@/components/EnhancedHeader";
import BackButton from "@/components/navigation/BackButton";
import CommunityPostCard from "@/components/CommunityPostCard";
import CreatePostModal from "@/components/CreatePostModal";
import SEOMetaTags from "@/components/SEOMetaTags";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


// RSS feed of every published RoboBook article (edge function robobook-rss).
const RSS_URL = `${import.meta.env.VITE_SUPABASE_URL || "https://cmahwgetrqczytnijbuk.supabase.co"}/functions/v1/robobook-rss`;
const rssFor = (category: string) => (category && category !== "all" ? `${RSS_URL}?category=${encodeURIComponent(category)}` : RSS_URL);
const PAGE_SIZE = 12;
const CATEGORY_BLURB = Object.fromEntries(BLOG_CATEGORIES.map((c) => [c.name, c.blurb]));

interface CommunityPost {
  id: string;
  post_type: 'blog' | 'video' | 'short_post' | 'media';
  title?: string;
  content?: string;
  excerpt?: string;
  media_url?: string;
  media_type?: string;
  video_duration?: number;
  tags: string[];
  category?: string | null;
  /** Author's category, or one worked out from the post text */
  display_category?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  author_id: string;
  published_at?: string;
  edited_at?: string;
  edit_history?: any[];
  video_thumbnail?: string;
  profiles?: {
    full_name: string;
    company_name?: string;
    avatar_url?: string;
  } | null;
  user_liked?: boolean;
  status?: string;
  scheduled_publish_at?: string;
}

const Community = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useDebouncedUrlParam("search", "", 400);
  const [sortBy, setSortBy] = useUrlParam<string>("sort", "latest");
  const [filterType, setFilterType] = useUrlParam<string>("type", "all");
  const [category, setCategory] = useUrlParam<string>("category", "all");
  // Older links used ?category=<post type> (blog, video, short_post, media): read them as the type.
  useEffect(() => {
    if (["blog", "video", "short_post", "media"].includes(category)) {
      // One URL update: two separate param setters in a row would overwrite each other.
      const next = new URLSearchParams(searchParams);
      next.delete("category");
      next.set("type", category);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
  const [selectedTag, setSelectedTag] = useUrlParam<string>("tag", "all");
  const [view, setView] = useUrlParam<"grid" | "feed">("view", "grid");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tab, setTab] = useState<"published" | "scheduled" | "drafts">("published");


  useEffect(() => {
    fetchPosts();
  }, [sortBy, filterType, user?.id]);

  useEffect(() => {
    if (posts.length > 0) {
      const tags = Array.from(new Set(posts.flatMap(post => post.tags || []))).filter(Boolean);
      setAvailableTags(tags);
    }
  }, [posts]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Show published posts to everyone; additionally show the current user's own scheduled/draft posts
      let communityQuery = supabase
        .from('community_posts')
        .select('*');

      if (user?.id) {
        communityQuery = communityQuery.or(
          `status.eq.published,and(author_id.eq.${user.id},status.in.(scheduled,draft))`
        );
      } else {
        communityQuery = communityQuery.eq('status', 'published');
      }

      // Apply post type filter
      if (filterType !== 'all') {
        communityQuery = communityQuery.eq('post_type', filterType);
      }

      // Community posts and older blogs load independently: one failing never hides the other.
      const { data: communityRows, error: communityError } = await communityQuery;
      if (communityError) console.error('Error fetching community posts:', communityError);
      const communityData = communityRows || [];

      // Fetch old blogs (only if not filtering by specific post type or if filtering by blog)
      let blogData: any[] = [];
      if (filterType === 'all' || filterType === 'blog') {
        const { data: oldBlogs, error: blogError } = await supabase
          .from('blogs')
          .select('*')
          .eq('status', 'published');

        if (blogError) console.error('Error fetching blogs:', blogError);

        // Transform old blogs to match new community post format
        blogData = (oldBlogs || []).map(blog => ({
          ...blog,
          post_type: 'blog',
          comment_count: 0,
          share_count: 0,
          media_url: blog.image_url,
          media_type: blog.image_url ? 'image' : null
        }));
      }

      // Combine both data sources. Older posts can have no tags or category: normalise them.
      const allPosts = [...communityData, ...blogData].map((post) => ({
        ...post,
        tags: Array.isArray(post.tags) ? post.tags.filter(Boolean) : [],
        category: typeof post.category === 'string' && post.category.trim() ? post.category.trim() : null,
      })).map((post) => ({ ...post, display_category: blogCategoryOf(post) }));

      // Fetch author profiles for all posts in one request
      const authorIds = Array.from(new Set(allPosts.map((p) => p.author_id).filter(Boolean)));
      type AuthorProfile = { user_id: string; full_name: string; company_name?: string; avatar_url?: string };
      const profileMap = new Map<string, AuthorProfile>();
      for (let i = 0; i < authorIds.length; i += 200) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, company_name, avatar_url')
          .in('user_id', authorIds.slice(i, i + 200));
        (profiles as AuthorProfile[] | null)?.forEach((pr) => profileMap.set(pr.user_id, pr));
      }
      const postsWithProfiles = allPosts.map((post) => ({
        ...post,
        profiles: profileMap.get(post.author_id) ?? null,
      }));

      // Apply sorting
      let sortedPosts = [...postsWithProfiles];
      switch (sortBy) {
        case 'latest':
          sortedPosts.sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime());
          break;
        case 'most_viewed':
          sortedPosts.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
          break;
        case 'most_liked':
          sortedPosts.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
          break;
        case 'trending':
          // Simple trending algorithm: recent posts with good engagement
          sortedPosts.sort((a, b) => {
            const aScore = (a.like_count || 0) + (a.comment_count || 0) + (a.view_count || 0) * 0.1;
            const bScore = (b.like_count || 0) + (b.comment_count || 0) + (b.view_count || 0) * 0.1;
            const aRecency = new Date(a.published_at || a.created_at).getTime();
            const bRecency = new Date(b.published_at || b.created_at).getTime();
            
            // Combine engagement score with recency
            return (bScore + bRecency / 1000000) - (aScore + aRecency / 1000000);
          });
          break;
      }

      // If user is authenticated, check which posts they've liked
      let postsWithLikes = sortedPosts;
      if (user) {
        // Check community post likes
        let likedPostIds = new Set<string>();
        if (communityData && communityData.length > 0) {
          const { data: communityLikes } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', communityData.map(p => p.id));
          
          communityLikes?.forEach(like => likedPostIds.add(like.post_id));
        }
        
        // Check blog likes
        if (blogData && blogData.length > 0) {
          const { data: blogLikes } = await supabase
            .from('blog_likes')
            .select('blog_id')
            .eq('user_id', user.id)
            .in('blog_id', blogData.map(p => p.id));
          
          blogLikes?.forEach(like => likedPostIds.add(like.blog_id));
        }
        
        postsWithLikes = sortedPosts.map(post => {
          const postWithLike = {
            ...post,
            user_liked: likedPostIds.has(post.id)
          };

          // Store like state for interaction

          return postWithLike;
        });
      } else {
        // For non-authenticated users, just use the posts as is
        postsWithLikes = sortedPosts;
      }

      setPosts(postsWithLikes as CommunityPost[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const isMine = (post: CommunityPost) => !!user && post.author_id === user.id;

  // Categories with post counts (published posts only), largest first
  const categoryOf = (post: CommunityPost) => post.display_category || "General";
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    posts
      .filter((p) => !p.status || p.status === "published")
      .forEach((p) => counts.set(categoryOf(p), (counts.get(categoryOf(p)) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [posts]);
  const publishedCount = categories.reduce((n, [, c]) => n + c, 0);

  const myScheduledCount = posts.filter(p => isMine(p) && p.status === 'scheduled').length;
  const myDraftsCount = posts.filter(p => isMine(p) && p.status === 'draft').length;

  const filteredPosts = posts.filter(post => {
    // Tab filter
    if (tab === "published") {
      if (post.status && post.status !== 'published') return false;
    } else if (tab === "scheduled") {
      if (!(isMine(post) && post.status === 'scheduled')) return false;
    } else if (tab === "drafts") {
      if (!(isMine(post) && post.status === 'draft')) return false;
    }

    const searchContent = [
      post.title,
      post.content,
      post.excerpt,
      post.category,
      ...(post.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();

    const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === "all" || (post.tags || []).includes(selectedTag);
    const matchesCategory = category === "all" || categoryOf(post) === category;

    return matchesSearch && matchesTag && matchesCategory;
  });


  const handleLikeUpdate = async (postId: string, newLikeCount: number, userLiked: boolean, newShareCount?: number) => {
    // Track like/unlike interaction
    const post = posts.find(p => p.id === postId);
    if (post) {
      trackButtonClick({
        buttonName: userLiked ? "Like Post" : "Unlike Post",
        buttonType: "blog_interaction",
        sellerId: post.author_id,
        sellerName: post.profiles?.full_name,
        sellerCompany: post.profiles?.company_name,
        itemId: postId,
        itemType: "blog",
        additionalData: {
          postTitle: post.title,
          postType: post.post_type,
          action: userLiked ? "like" : "unlike",
          newLikeCount
        }
      });
    }

    // Update local state immediately for smooth UI
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            like_count: newLikeCount, 
            user_liked: userLiked,
            share_count: newShareCount !== undefined ? newShareCount : post.share_count
          }
        : post
    ));
  };

  const handleCommentUpdate = (postId: string, newCommentCount: number) => {
    // Track comment interaction
    const post = posts.find(p => p.id === postId);
    if (post) {
      trackButtonClick({
        buttonName: "Comment on Post",
        buttonType: "blog_interaction",
        sellerId: post.author_id,
        sellerName: post.profiles?.full_name,
        sellerCompany: post.profiles?.company_name,
        itemId: postId,
        itemType: "blog",
        additionalData: {
          postTitle: post.title,
          postType: post.post_type,
          action: "comment",
          newCommentCount
        }
      });
    }

    setPosts(prevPosts => prevPosts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            comment_count: newCommentCount
          }
        : post
    ));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  const hasFilters = !!searchTerm || (selectedTag && selectedTag !== "all") || filterType !== "all" || category !== "all";
  // A new filter or sort starts again from the first page of cards.
  useEffect(() => setVisible(PAGE_SIZE), [category, filterType, selectedTag, searchTerm, sortBy, tab]);
  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setSelectedTag("all");
    setCategory("all");
  };

  const filterPanel = (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search posts by content, title, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 font-medium"
              />
            </div>

            {categories.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2">Categories</p>
                <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
                  {[["all", publishedCount] as [string, number], ...categories].map(([name, count]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCategory(name)}
                      title={CATEGORY_BLURB[name] || undefined}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        category === name ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{name === "all" ? "All articles" : name}</span>
                      <span className="ml-2 text-xs tabular-nums text-muted-foreground">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs font-semibold -mb-2">Post Type</p>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full font-medium">
                <SelectValue placeholder="Post type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    All Types
                  </div>
                </SelectItem>
                <SelectItem value="short_post">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Short Posts
                  </div>
                </SelectItem>
                <SelectItem value="blog">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Blog Articles
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Videos
                  </div>
                </SelectItem>
                <SelectItem value="media">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Media
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <p className="text-xs font-semibold -mb-2">Sort By</p>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full font-medium">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Latest
                  </div>
                </SelectItem>
                <SelectItem value="trending">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Trending
                  </div>
                </SelectItem>
                <SelectItem value="most_viewed">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Most Viewed
                  </div>
                </SelectItem>
                <SelectItem value="most_liked">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Most Liked
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {availableTags.length > 0 && <p className="text-xs font-semibold -mb-2">Tag</p>}
            {availableTags.length > 0 && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-full font-medium">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {availableTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      #{tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasFilters && (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={clearFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags 
        seoElements={{
          urlSlug: "/community",
          pageTitle: "RoboBook - Industrial Robotics Community | RobotVerse",
          metaDescription: "Join the RoboBook community to connect with robotics professionals, share insights, and discover the latest trends in industrial automation and robotics technology.",
          h1Heading: "RoboBook",
          seoContentBlock: "Connect with robotics professionals and share insights on industrial automation",
          imageAltText: "RoboBook community page",
          structuredData: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "RoboBook - Robotics Community",
            "description": "Connect with robotics professionals and share insights on industrial automation",
            "url": typeof window !== 'undefined' ? window.location.href : ""
          },
          breadcrumbSchema: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": typeof window !== 'undefined' ? window.location.origin : ""
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "RoboBook",
                "item": typeof window !== 'undefined' ? window.location.href : ""
              }
            ]
          }
        }}
      />
      <Helmet>
        <link rel="alternate" type="application/rss+xml" title="RoboBook: all articles | RobotVerse" href={RSS_URL} />
        {category !== "all" && (
          <link rel="alternate" type="application/rss+xml" title={`RoboBook: ${category} | RobotVerse`} href={rssFor(category)} />
        )}
      </Helmet>
      <EnhancedHeader />
      <BackButton fallbackPath="/" label="Back" />

      
      <main className="container mx-auto px-4 pb-16 pt-6">
        {/* Masthead */}
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[65ch]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">RobotVerse knowledge hub</p>
            <h1 className="mt-1 text-4xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">RoboBook</h1>
            <p className="mt-3 text-base leading-relaxed text-foreground/65">
              Articles, videos and industry news on industrial robots and automation, from engineers, integrators and the wider industry.
            </p>
            <p className="mt-2 text-xs tabular-nums text-foreground/45">
              {publishedCount} community posts · {categories.length} topics · news refreshed every 4 hours
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CreatePostModal onPostCreated={fetchPosts} />
            <Button variant="ghost" size="sm" asChild>
              <a href={rssFor(category)} target="_blank" rel="noopener noreferrer" title="Subscribe in any feed reader">
                <Rss className="mr-1.5 h-4 w-4 text-orange-500" />
                RSS
              </a>
            </Button>
            <CopySearchLinkButton />
          </div>
        </header>

        <NewsLeadCarousel />

        {/* Community posts */}
        <section className="mt-12" aria-labelledby="community-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="community-heading" className="text-2xl font-semibold tracking-[-0.02em]">
                From the community
              </h2>
              <p className="mt-1 text-sm tabular-nums text-foreground/55">
                {loading ? "Loading…" : (
                  <>
                    {filteredPosts.length} {filteredPosts.length === 1 ? "post" : "posts"}
                    {category !== "all" && <> in {category}</>}
                  </>
                )}
              </p>
            </div>
            {user && (
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="published">Published</TabsTrigger>
                  <TabsTrigger value="scheduled">Scheduled ({myScheduledCount})</TabsTrigger>
                  <TabsTrigger value="drafts">Drafts ({myDraftsCount})</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          {/* Toolbar: search, sort, filters, layout, topics */}
          <div className="sticky top-16 z-20 -mx-4 mb-6 border-y border-border/60 bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                <Input
                  placeholder="Search articles, topics, tags…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-9"
                  aria-label="Search posts"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-9 w-[150px]" aria-label="Sort posts">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="most_viewed">Most viewed</SelectItem>
                  <SelectItem value="most_liked">Most liked</SelectItem>
                </SelectContent>
              </Select>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                    Filters
                    {(filterType !== "all" || (selectedTag && selectedTag !== "all")) && (
                      <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-label="Filters active" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 overflow-y-auto">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Filter posts</SheetTitle>
                  </SheetHeader>
                  {filterPanel}
                </SheetContent>
              </Sheet>
              <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="Layout">
                {(["grid", "feed"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    title={v === "grid" ? "Card grid" : "Full posts with likes and comments"}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      view === v ? "bg-foreground/[0.08] text-foreground" : "text-foreground/55 hover:text-foreground"
                    }`}
                  >
                    {v === "grid" ? <LayoutGrid className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
                    {v === "grid" ? "Grid" : "Feed"}
                  </button>
                ))}
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 text-foreground/60" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
            {categories.length > 0 && (
              <div className="-mb-1 mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Topics">
                {[["all", publishedCount] as [string, number], ...categories].map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={category === name}
                    title={CATEGORY_BLURB[name] || undefined}
                    onClick={() => setCategory(name)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      category === name
                        ? "bg-foreground text-background"
                        : "bg-foreground/[0.05] text-foreground/70 hover:bg-foreground/[0.09] hover:text-foreground"
                    }`}
                  >
                    {name === "all" ? "All topics" : name}
                    <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border/70">
                  <div className="aspect-[16/9] animate-pulse bg-muted" />
                  <div className="space-y-2 p-5">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="mx-auto max-w-md py-20 text-center">
              <BookOpen className="mx-auto mb-4 h-10 w-10 text-foreground/30" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold">{hasFilters ? "No posts match these filters" : "No posts yet"}</h3>
              <p className="mb-6 mt-1 text-sm text-foreground/60">
                {hasFilters ? "Try another topic or clear the filters." : "Share an article, video or tip with the robotics community."}
              </p>
              {hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <CreatePostModal onPostCreated={fetchPosts} />
              )}
            </div>
          ) : view === "feed" ? (
            <div className="mx-auto max-w-3xl space-y-6">
              {filteredPosts.slice(0, visible).map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  onLikeUpdate={handleLikeUpdate}
                  onCommentUpdate={handleCommentUpdate}
                  onPostDeleted={handlePostDeleted}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPosts.slice(0, visible).map((post, i) => (
                <ArticleCard key={post.id} post={post} featured={i === 0 && !hasFilters && filteredPosts.length > 2} />
              ))}
            </div>
          )}

          {!loading && filteredPosts.length > visible && (
            <div className="mt-10 text-center">
              <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Show more posts
                <span className="ml-1.5 tabular-nums text-foreground/50">{filteredPosts.length - visible}</span>
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Community;