import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import EnhancedHeader from "@/components/EnhancedHeader";
import { UniversalComments } from "@/components/universal/UniversalComments";
import { UniversalInteractionButtons } from "@/components/universal/UniversalInteractionButtons";
import { useUniversalInteractions } from "@/hooks/useUniversalInteractions";
import { 
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
  const { trackButtonClick } = useButtonTracking();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Determine content type based on post data
  const contentType = post?.post_type === 'blog' ? 'blog' : 'community_post';
  
  // Use universal interactions hook
  const {
    interaction,
    loading: interactionsLoading,
    toggleLike,
    incrementCommentCount,
    incrementShareCount,
  } = useUniversalInteractions(id || '', contentType);

  // Track interaction buttons
  const handleInteractionTracking = async (action: string) => {
    if (!post || !user) return;
    
    await trackButtonClick({
      buttonName: `${action} Community Post`,
      buttonType: 'community_interaction',
      itemId: post.id,
      itemType: 'community_post',
      additionalData: {
        post_title: post.title,
        post_type: post.post_type,
        author_id: post.author_id,
        action
      }
    });
  };

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

      setPost({
        ...postData,
        profiles: profile
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
      const isBlogPost = post.post_type === 'blog';
      
      if (isBlogPost) {
        await supabase.rpc('increment_blog_view_count', {
          p_blog_id: id
        });
      } else {
        await supabase.rpc('increment_community_post_view_count', {
          p_post_id: id
        });
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleCommentClick = () => {
    handleInteractionTracking('comment_click');
    const commentsSection = document.getElementById('comments');
    commentsSection?.scrollIntoView({ behavior: 'smooth' });
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
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full rounded-xl mb-6" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Post not found</p>
              <Button onClick={() => navigate('/robobook')} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 hover:bg-primary/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="overflow-hidden border-border/50 shadow-lg">
          <CardContent className="p-0">
            {/* Header Section */}
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className="border-none bg-gradient-to-r from-primary/10 to-accent/10 text-primary">
                  <div className="flex items-center gap-2">
                    {getPostTypeIcon()}
                    <span className="font-medium">
                      {post.post_type === 'short_post' ? 'POST' : post.post_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{post.view_count || 0} views</span>
                </div>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="h-12 w-12 ring-2 ring-background">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                    <User className="h-6 w-6 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">
                    {post.profiles?.full_name || post.profiles?.company_name || 'Community Member'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    {post.edited_at && (
                      <>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>Edited</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              {post.title && (
                <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {post.title}
                </h1>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="bg-secondary/50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Media Content */}
            {post.media_url && (
              <div className="px-6 pb-6">
                <div className="rounded-lg overflow-hidden bg-muted/30">
                  {post.post_type === 'video' ? (
                    <div className="relative group">
                      <ResponsiveMedia
                        src={post.media_url}
                        alt={post.title || 'Video content'}
                        type="video"
                      />
                      {post.video_duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {formatDuration(post.video_duration)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <ResponsiveMedia
                      src={post.media_url}
                      alt={post.title || 'Post media'}
                      type="image"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            {post.content && (
              <div className="px-6 pb-6">
                <FormattedContent content={post.content} />
              </div>
            )}

            <Separator />

            {/* Engagement Actions */}
            <div className="p-6 bg-muted/30">
              <UniversalInteractionButtons
                likeCount={interaction.like_count}
                commentCount={interaction.comment_count}
                shareCount={interaction.share_count}
                userLiked={interaction.user_liked}
                onLike={toggleLike}
                onShare={incrementShareCount}
                onCommentClick={handleCommentClick}
                disabled={interactionsLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div id="comments" className="mt-8">
          <UniversalComments
            contentId={post.id}
            contentType={contentType}
          />
        </div>
      </main>
    </div>
  );
};

export default CommunityPostDetails;
