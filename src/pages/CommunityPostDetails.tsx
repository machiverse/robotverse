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
import { ContentComments } from "@/components/content/ContentComments";
import { ContentInteractionButtons } from "@/components/content/ContentInteractionButtons";
import { useContentInteractions } from "@/hooks/useContentInteractions";
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
  Clock,
  Edit,
  Trash2
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
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import FormattedContent from "@/components/FormattedContent";
import ResponsiveMedia from "@/components/ResponsiveMedia";
import BlogShareBar from "@/components/blog/BlogShareBar";
import EditPostModal from "@/components/EditPostModal";
import { buildRoboBookPostUrl } from "@/utils/blogSeo";

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
  const [sourceTable, setSourceTable] = useState<'community_posts' | 'blogs'>('community_posts');
  const [editOpen, setEditOpen] = useState(false);
  
  // Determine content type based on post data
  const contentType = post?.post_type === 'blog' ? 'blog' : (post?.post_type === 'video' ? 'video' : 'community_post');
  const interactionPostId = post?.id || id || '';
  const shareUrl = post ? buildRoboBookPostUrl((post as any).slug || post.id) : "";
  
  // Use new unified interactions hook
  const {
    likeCount,
    commentCount,
    userHasLiked,
    comments,
    loading: interactionsLoading,
    submitting,
    toggleLike,
    addComment,
    updateComment,
    deleteComment
  } = useContentInteractions(interactionPostId, contentType);

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
    if (post) {
      incrementViewCount();
    }
  }, [post]);

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
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");

      // Try to fetch from community_posts first by slug or UUID
      const communityBaseQuery = supabase
        .from('community_posts')
        .select('*')
        .eq('status', 'published');
      const { data: communityPost, error: communityError } = isUuid
        ? await communityBaseQuery.eq('id', id).maybeSingle()
        : await communityBaseQuery.eq('slug', id).maybeSingle();

      let postData = communityPost;
      let src: 'community_posts' | 'blogs' = 'community_posts';
      
      // If not found in community_posts, try blogs table
      if (!communityPost && !communityError) {
        const blogBaseQuery = supabase
          .from('blogs')
          .select('*')
          .eq('status', 'published');
        const { data: blogPost, error: blogError } = isUuid
          ? await blogBaseQuery.eq('id', id).maybeSingle()
          : await blogBaseQuery.eq('slug', id).maybeSingle();

        if (blogError) throw blogError;

        if (blogPost) {
          src = 'blogs';
          // Transform blog to match community post format
          postData = {
            ...blogPost,
            post_type: 'blog',
            comment_count: blogPost.comment_count ?? 0,
              share_count: (blogPost as any).share_count ?? 0,
            video_duration: null,
            media_url: blogPost.image_url,
            media_type: blogPost.image_url ? 'image' : null,
            edited_at: null,
            edit_history: [],
            video_thumbnail: null,
            featured_image: (blogPost as any).featured_image ?? blogPost.image_url ?? null,
          } as any;
        }
      }
      setSourceTable(src);

      if (!postData) {
        setPost(null);
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
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    try {
      const { error } = await supabase.from(sourceTable).delete().eq('id', post.id);
      if (error) throw error;
      toast.success('Post deleted');
      navigate('/robobook');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete post');
    }
  };

  const handleEditClick = () => {
    if (!post) return;
    if (sourceTable === 'blogs') {
      navigate(`/robobook/${(post as any).slug || post.id}/edit`);
    } else {
      setEditOpen(true);
    }
  };

  const incrementViewCount = async () => {
    if (!post?.id) return;
    
    try {
      const isBlogPost = post.post_type === 'blog';
      
      if (isBlogPost) {
        await supabase.rpc('increment_blog_view_count', {
          p_blog_id: post.id
        });
      } else {
        await supabase.rpc('increment_community_post_view_count', {
          p_post_id: post.id
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
        <main className="container max-w-md mx-auto px-4 py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">Post not found</h1>
          <p className="text-muted-foreground mb-6">
            This post may have been removed or the link is no longer valid.
          </p>
          <Button onClick={() => navigate('/robobook')}>
            Back to RoboBook
          </Button>
        </main>
      </div>
    );
  }

  const isAuthor = !!user && user.id === post.author_id;

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {isAuthor && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleEditClick}
              >
                <Edit className="h-4 w-4" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletePost}
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
              <BlogShareBar
                url={shareUrl}
                title={post.title || "RoboBook Post - RobotVerse"}
                excerpt={post.excerpt || post.content?.replace(/<[^>]+>/g, " ").slice(0, 140)}
                postId={post.id}
                table={post.post_type === "blog" ? "blogs" : "community_posts"}
                className="mb-4"
              />
              <ContentInteractionButtons
                likeCount={likeCount}
                commentCount={commentCount}
                userHasLiked={userHasLiked}
                onLike={async () => {
                  handleInteractionTracking('like');
                  return await toggleLike();
                }}
                onCommentClick={handleCommentClick}
                onShare={() => {
                  handleInteractionTracking('share');
                  navigator.clipboard.writeText(shareUrl)
                    .then(() => toast.success('Link copied to clipboard'))
                    .catch(() => toast.error('Failed to copy link'));
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div id="comments" className="mt-8">
          <ContentComments
            comments={comments}
            commentCount={commentCount}
            loading={interactionsLoading}
            submitting={submitting}
            onAddComment={addComment}
            onUpdateComment={updateComment}
            onDeleteComment={deleteComment}
          />
        </div>
      </main>
      {post && sourceTable === 'community_posts' && (
        <EditPostModal
          post={post as any}
          open={editOpen}
          onOpenChange={setEditOpen}
          onPostUpdated={() => {
            setEditOpen(false);
            fetchPost();
          }}
        />
      )}
    </div>
  );
};

export default CommunityPostDetails;
