import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  profiles?: {
    full_name: string;
    company_name?: string;
    avatar_url?: string;
  } | null;
  user_liked?: boolean;
}

const Community = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [filterType, setFilterType] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [availableTags, setAvailableTags] = useState<string[]>([]);

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
      let query = supabase
        .from('community_posts')
        .select('*')
        .eq('status', 'published');

      // Apply post type filter
      if (filterType !== 'all') {
        query = query.eq('post_type', filterType);
      }

      // Apply sorting
      switch (sortBy) {
        case 'latest':
          query = query.order('published_at', { ascending: false });
          break;
        case 'most_viewed':
          query = query.order('view_count', { ascending: false });
          break;
        case 'most_liked':
          query = query.order('like_count', { ascending: false });
          break;
        case 'trending':
          query = query.order('like_count', { ascending: false });
          break;
        default:
          query = query.order('published_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch author profiles for each post
      const postsWithProfiles = await Promise.all(
        (data || []).map(async (post) => {
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

      // If user is authenticated, check which posts they've liked
      let postsWithLikes = postsWithProfiles;
      if (user) {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postsWithProfiles.map(p => p.id));

        const likedPostIds = new Set(likesData?.map(l => l.post_id) || []);
        
        postsWithLikes = postsWithProfiles.map(post => ({
          ...post,
          user_liked: likedPostIds.has(post.id)
        }));
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

  const handleLikeUpdate = (postId: string, newLikeCount: number, userLiked: boolean) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, like_count: newLikeCount, user_liked: userLiked }
        : post
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Community</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Share ideas, insights, and connect with the robotics community
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

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-card rounded-lg border p-6 space-y-4">
                  <div className="aspect-video bg-muted rounded-md"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No posts found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || (selectedTag && selectedTag !== "all") || filterType !== "all"
                ? "Try adjusting your search or filter criteria." 
                : "Be the first to share with the community!"
              }
            </p>
            <CreatePostModal onPostCreated={fetchPosts} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                onLikeUpdate={handleLikeUpdate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Community;