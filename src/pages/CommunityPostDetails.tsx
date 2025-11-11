import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import EnhancedHeader from "@/components/EnhancedHeader";
import EnhancedPostComments from "@/components/EnhancedPostComments";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  Play, 
  ArrowLeft,
  User,
  BookOpen,
  Video,
  FileText,
  Image as ImageIcon,
  Calendar,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import FormattedContent from "@/components/FormattedContent";
import ResponsiveMedia from "@/components/ResponsiveMedia";

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
  published_at?: string;
  author_id: string;
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

const CommunityPostDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  // Separate useEffect for incrementing view count after post is loaded
  useEffect(() => {
    if (post && id) {
      incrementViewCount();
    }
  }, [post, id]);

  const getPostTypeIcon = () => {
    if (!post) return <FileText className="h-5 w-5" />;
    switch (post.post_type) {
      case 'blog':
        return <BookOpen className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'short_post':
        return <FileText className="h-5 w-5" />;
      case 'media':
        return <ImageIcon className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const fetchPost = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from community_posts first
      const { data: communityPost, error: communityError } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();

      let postData = communityPost;
      
      // If not found in community_posts, try blogs table
      if (!communityPost && !communityError) {
        const { data: blogPost, error: blogError } = await supabase
          .from('blogs')
          .select('*')
          .eq('id', id)
          .eq('status', 'published')
          .maybeSingle();

        if (blogPost) {
          // Transform blog to match community post format
          postData = {
            ...blogPost,
            post_type: 'blog',
            comment_count: 0,
            share_count: 0,
            video_duration: null,
            media_url: blogPost.image_url,
            media_type: blogPost.image_url ? 'image' : null,
            edited_at: null,
            edit_history: [],
            video_thumbnail: null
          };
        }
      }

      if (!postData) {
        navigate('/robobook');
        toast.error('Post not found');
        return;
      }

      // Fetch author profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name, avatar_url')
        .eq('user_id', postData.author_id)
        .maybeSingle();

      // Check if user has liked this post
      let userLiked = false;
      if (user && communityPost) {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postData.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        userLiked = !!likesData;
      }

      setPost({
        ...postData,
        profiles: profile,
        user_liked: userLiked
      } as CommunityPost);
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
      navigate('/robobook');
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    if (!id || !post) return;
    
    try {
      // Determine if this is a blog post or community post
      const isBlogPost = post.post_type === 'blog';
      
      if (isBlogPost) {
        // Use blog view count function for blog posts
        await supabase.rpc('increment_blog_view_count', {
          p_blog_id: id
        });
      } else {
        // Use community post view count function for community posts
        await supabase.rpc('increment_community_post_view_count', {
          p_post_id: id
        });
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleLike = async () => {
    if (!post || isLiking) return;

    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      setIsLiking(true);
      
      const isBlogPost = post.post_type === 'blog';
      
      if (post.user_liked) {
        // Unlike the post
        if (isBlogPost) {
          const { error } = await supabase
            .from('blog_likes')
            .delete()
            .eq('blog_id', post.id)
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('post_likes')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', user.id);
          if (error) throw error;
        }
        
        setPost(prev => prev ? { 
          ...prev, 
          like_count: prev.like_count - 1, 
          user_liked: false 
        } : null);
        toast.success('Post unliked');
      } else {
        // Like the post
        if (isBlogPost) {
          const { error } = await supabase
            .from('blog_likes')
            .insert({ 
              blog_id: post.id, 
              user_id: user.id 
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('post_likes')
            .insert({ 
              post_id: post.id, 
              user_id: user.id 
            });
          if (error) throw error;
        }
        
        setPost(prev => prev ? { 
          ...prev, 
          like_count: prev.like_count + 1, 
          user_liked: true 
        } : null);
        toast.success('Post liked!');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    
    try {
      // Use custom domain for sharing
      const baseUrl = 'https://robotverse.in';
      const shareUrl = `${baseUrl}/robobook/${post.id}`;
      
      const shareData = {
        title: post.title || 'RoboBook Post - RobotVerse',
        text: post.excerpt || post.content?.substring(0, 100) + '...',
        url: shareUrl
      };
      
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Post shared successfully!');
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }

      // Track share
      if (user) {
        await supabase
          .from('post_shares')
          .insert({ 
            post_id: post.id, 
            user_id: user.id,
            shared_to: 'external'
          });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error('Failed to share post');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Card className="mb-8">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="aspect-video w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
            <p className="text-muted-foreground mb-6">The post you're looking for doesn't exist or has been removed.</p>
            <Link to="/robobook">
              <Button>Back to RoboBook</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/robobook')}
          className="mb-6 hover:bg-muted/80"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to RoboBook
        </Button>

        {/* Post Content */}
        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-0">
            {/* Author Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 ring-2 ring-background">
                    <AvatarImage src={post.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                      <User className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg">
                      {post.profiles?.full_name || post.profiles?.company_name || 'RoboBook Member'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{post.view_count} views</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                  <div className="flex items-center gap-2">
                    {getPostTypeIcon()}
                    <span className="font-medium">
                      {post.post_type === 'short_post' ? 'POST' : post.post_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Title */}
            {post.title && (
              <div className="p-6 pb-4">
                <h1 className="text-3xl font-bold leading-tight">
                  {post.title}
                </h1>
              </div>
            )}

            {/* Media */}
            {post.media_url && (
              <ResponsiveMedia
                src={post.media_url}
                type={post.post_type === 'video' || post.media_type === 'video' ? 'video' : 'image'}
                alt={post.title || 'Post media'}
                title={post.title}
                videoDuration={post.video_duration}
                autoplay={post.post_type === 'video' || post.media_type === 'video'}
                controls={true}
                className="w-full"
              />
            )}

            {/* Content */}
            {post.content && (
              <div className="p-6">
                <FormattedContent 
                  content={post.content}
                  className="prose-lg max-w-none"
                />
              </div>
            )}

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-muted/60">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Engagement Actions */}
            <div className="p-6 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleLike}
                    disabled={isLiking}
                    className={`rounded-full transition-all hover:scale-105 ${
                      post.user_liked 
                        ? 'text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900' 
                        : 'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
                    }`}
                  >
                    <Heart className={`h-5 w-5 mr-2 ${post.user_liked ? 'fill-current' : ''}`} />
                    <span className="font-semibold">{post.like_count} Likes</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="lg"
                    className="rounded-full hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all hover:scale-105"
                    onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    <span className="font-semibold">{post.comment_count} Comments</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleShare}
                    className="rounded-full hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-all hover:scale-105"
                  >
                    <Share2 className="h-5 w-5 mr-2" />
                    <span className="font-semibold">{post.share_count} Shares</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div id="comments">
          <EnhancedPostComments 
            postId={post.id} 
            onCommentCountChange={(count) => 
              setPost(prev => prev ? { ...prev, comment_count: count } : null)
            } 
          />
        </div>
      </main>
    </div>
  );
};

export default CommunityPostDetails;