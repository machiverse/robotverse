import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { Input } from "@/components/ui/input";
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
  Image as ImageIcon
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EnhancedHeader from "@/components/EnhancedHeader";
import CommunityPostCard from "@/components/CommunityPostCard";
import CreatePostModal from "@/components/CreatePostModal";
import SEOMetaTags from "@/components/SEOMetaTags";

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
}

const Community = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [filterType, setFilterType] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Read filter from URL params
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setFilterType(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPosts();
  }, [sortBy, filterType]);

  useEffect(() => {
    if (posts.length > 0) {
      const tags = Array.from(new Set(posts.flatMap(post => post.tags)));
      setAvailableTags(tags);
    }
  }, [posts]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Fetch new community posts
      let communityQuery = supabase
        .from('community_posts')
        .select('*')
        .eq('status', 'published');

      // Apply post type filter
      if (filterType !== 'all') {
        communityQuery = communityQuery.eq('post_type', filterType);
      }

      const { data: communityData, error: communityError } = await communityQuery;
      if (communityError) throw communityError;

      // Fetch old blogs (only if not filtering by specific post type or if filtering by blog)
      let blogData: any[] = [];
      if (filterType === 'all' || filterType === 'blog') {
        const { data: oldBlogs, error: blogError } = await supabase
          .from('blogs')
          .select('*')
          .eq('status', 'published');

        if (blogError) throw blogError;

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

      // Combine both data sources
      const allPosts = [...(communityData || []), ...blogData];

      // Fetch author profiles for all posts
      const postsWithProfiles = await Promise.all(
        allPosts.map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name, avatar_url')
            .eq('user_id', post.author_id)
            .maybeSingle();
          
          return {
            ...post,
            profiles: profile
          };
        })
      );

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

  const filteredPosts = posts.filter(post => {
    const searchContent = [
      post.title,
      post.content,
      post.excerpt,
      ...post.tags
    ].filter(Boolean).join(' ').toLowerCase();
    
    const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === "all" || post.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
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
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">RoboBook</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Learn, share, and connect - your knowledge hub for industrial robotics and automation technology
              </p>
            </div>
            
            <CreatePostModal onPostCreated={fetchPosts} />
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 bg-card p-6 rounded-lg shadow-sm border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search posts by content, title, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 font-medium"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 font-medium">
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
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48 font-medium">
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

            {availableTags.length > 0 && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-full md:w-48 font-medium">
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
          </div>
        </div>

        {/* Feed Layout - Professional Social Platform Style */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-card rounded-xl border p-6 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-32"></div>
                        <div className="h-3 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                    <div className="aspect-video bg-muted rounded-lg"></div>
                    <div className="space-y-3">
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                      <div className="flex justify-between pt-4">
                        <div className="flex gap-6">
                          <div className="h-8 bg-muted rounded w-16"></div>
                          <div className="h-8 bg-muted rounded w-20"></div>
                          <div className="h-8 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-full p-8 w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Start the Conversation</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                {searchTerm || (selectedTag && selectedTag !== "all") || filterType !== "all"
                  ? "No posts match your criteria. Try adjusting your filters to discover more content." 
                  : "Be the first to share your insights and connect with the robotics community. Your voice matters!"
                }
              </p>
              <CreatePostModal onPostCreated={fetchPosts} />
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {filteredPosts.map((post) => (
                  <CommunityPostCard
                    key={post.id}
                    post={post}
                    onLikeUpdate={handleLikeUpdate}
                    onCommentUpdate={handleCommentUpdate}
                    onPostDeleted={handlePostDeleted}
                  />
                ))}
              </div>
              
              {/* Load More Section */}
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  You've reached the end of the feed. Share something new!
                </p>
                <CreatePostModal onPostCreated={fetchPosts} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Community;