import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Eye, 
  Play,
  User,
  BookOpen,
  Video,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Clock, FileEdit, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useContentInteractions } from "@/hooks/useContentInteractions";
import { toast } from "sonner";
import FormattedContent from "@/components/FormattedContent";
import ResponsiveMedia from "@/components/ResponsiveMedia";
import EditPostModal from "@/components/EditPostModal";
import { ContentInteractionButtons } from "@/components/content/ContentInteractionButtons";
import { buildRoboBookPostPath, buildRoboBookPostUrl } from "@/utils/blogSeo";
import PreviewLinkCard from "@/components/blog/PreviewLinkCard";

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
  comment_count?: number;
  share_count?: number;
  created_at: string;
  author_id: string;
  edited_at?: string;
  edit_history?: any[];
  video_thumbnail?: string;
  status?: string;
  scheduled_publish_at?: string | null;
  published_at?: string | null;
  preview_token?: string | null;
  preview_view_count?: number | null;
  preview_last_viewed_at?: string | null;
  profiles?: {
    full_name: string;
    company_name?: string;
    avatar_url?: string;
  } | null;
  user_liked?: boolean;
}

interface CommunityPostCardProps {
  post: CommunityPost;
  onLikeUpdate?: (postId: string, newLikeCount: number, userLiked: boolean) => void;
  onCommentUpdate?: (postId: string, newCommentCount: number) => void;
  onPostDeleted?: (postId: string) => void;
}

const CommunityPostCard = ({ post, onLikeUpdate, onCommentUpdate, onPostDeleted }: CommunityPostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackButtonClick } = useButtonTracking();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Use new unified interaction system
  const contentType = post.post_type === 'blog' ? 'blog' : (post.post_type === 'video' ? 'video' : 'community_post');
  const { 
    likeCount, 
    commentCount, 
    userHasLiked, 
    toggleLike 
  } = useContentInteractions(post.id, contentType);
  const postPath = buildRoboBookPostPath((post as any).slug || post.id);
  const postUrl = buildRoboBookPostUrl((post as any).slug || post.id);

  const getPostTypeIcon = () => {
    switch (post.post_type) {
      case 'blog':
        return <BookOpen className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'short_post':
        return <FileText className="h-4 w-4" />;
      case 'media':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getPostTypeColor = () => {
    switch (post.post_type) {
      case 'blog':
        return 'bg-blue-500';
      case 'video':
        return 'bg-red-500';
      case 'short_post':
        return 'bg-green-500';
      case 'media':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleLike = async () => {
    if (user) {
      // Track button click
      await trackButtonClick({
        buttonName: userHasLiked ? 'Unlike Post' : 'Like Post',
        buttonType: 'community_interaction',
        itemId: post.id,
        itemType: 'community_post',
        additionalData: {
          post_title: post.title,
          post_type: post.post_type,
          author_id: post.author_id,
          action: userHasLiked ? 'unlike' : 'like'
        }
      });
    }
    
    return await toggleLike();
  };

  const handleShare = () => {
    // Track share button click
    if (user) {
      trackButtonClick({
        buttonName: 'Share Post',
        buttonType: 'community_interaction',
        itemId: post.id,
        itemType: 'community_post',
        additionalData: {
          post_title: post.title,
          post_type: post.post_type,
          author_id: post.author_id,
          action: 'share'
        }
      });
    }
    
    try {
      const shareData = {
        title: post.title || 'RoboBook Post - RobotVerse',
        text: post.excerpt || post.content?.substring(0, 100) + '...',
        url: postUrl
      };
      
      if (navigator.share && navigator.canShare(shareData)) {
        navigator.share(shareData);
        toast.success('Post shared successfully!');
      } else {
        navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      toast.error('Failed to share post');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const generateExcerpt = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  const handleDelete = async () => {
    if (!user || post.author_id !== user.id) {
      toast.error('You can only delete your own posts');
      return;
    }

    try {
      setIsDeleting(true);

      console.log('[DeletePost] attempting delete', { id: post.id, status: post.status, author_id: post.author_id, user_id: user.id });

      const { data, error, count } = await supabase
        .from('community_posts')
        .delete({ count: 'exact' })
        .eq('id', post.id)
        .eq('author_id', user.id)
        .select();

      if (error) {
        console.error('[DeletePost] supabase error', error);
        throw error;
      }

      console.log('[DeletePost] deleted rows:', count, data);

      if (!count || count === 0) {
        toast.error('Post could not be deleted (no matching row / permission denied)');
        return;
      }

      toast.success('Post deleted successfully');
      onPostDeleted?.(post.id);
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error(`Failed to delete post: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };


  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('[role="button"]')
    ) {
      return;
    }
    navigate(postPath);
  };

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 bg-card border border-border/50 rounded-xl overflow-hidden w-full cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Author Header */}
      <div className="flex items-center justify-between p-4 pb-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-background">
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
              <User className="h-5 w-5 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
              {post.profiles?.full_name || post.profiles?.company_name || 'Community Member'}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{post.view_count}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Status Badge */}
          {post.status === 'scheduled' && (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Clock className="h-3 w-3 mr-1" />
              <span className="text-xs font-medium">
                Scheduled{post.scheduled_publish_at ? ` · ${format(new Date(post.scheduled_publish_at), 'MMM d, h:mm a')}` : ''}
              </span>
            </Badge>
          )}
          {post.status === 'draft' && (
            <Badge variant="outline" className="border-muted-foreground/30 bg-muted text-muted-foreground">
              <FileEdit className="h-3 w-3 mr-1" />
              <span className="text-xs font-medium">Draft</span>
            </Badge>
          )}
          {post.status === 'published' && (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              <span className="text-xs font-medium">Published</span>
            </Badge>
          )}

          {/* Post Type Badge */}
          <Badge variant="outline" className="border-none bg-gradient-to-r from-primary/10 to-accent/10 text-primary hover:from-primary/20 hover:to-accent/20 transition-all">
            <div className="flex items-center gap-1">
              {getPostTypeIcon()}
              <span className="text-xs font-medium">
                {post.post_type === 'short_post' ? 'POST' : post.post_type.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </Badge>

          {/* Edit/Delete Menu */}
          {user && post.author_id === user.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditModal(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Post
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

        </div>
      </div>

      <Link to={postPath} className="block">
        <div className="px-4 pb-3">
          {/* Title */}
          {post.title && (
            <h2 className="text-xl font-bold line-clamp-3 group-hover:text-primary transition-colors leading-tight mb-2">
              {post.title}
            </h2>
          )}

          {/* Content */}
          {post.content && (
            <div className="text-muted-foreground line-clamp-4 leading-relaxed mb-3">
              <FormattedContent 
                content={post.excerpt || generateExcerpt(post.content, 200)}
                className="prose-sm"
              />
            </div>
          )}
        </div>

        {/* Media Preview with Enhanced Video Support */}
        {post.media_url && (
          <div className="relative overflow-hidden rounded-lg">
            <ResponsiveMedia
              src={post.media_url}
              type={post.post_type === 'video' || post.media_type === 'video' ? 'video' : 'image'}
              alt={post.title || 'Post media'}
              title={post.title}
              videoDuration={post.video_duration}
              autoplay={post.post_type === 'video' || post.media_type === 'video'}
              controls={post.post_type === 'video' || post.media_type === 'video'}
              className="w-full h-auto max-h-[500px] object-cover"
            />
            {/* Video overlay for better UX */}
            {(post.post_type === 'video' || post.media_type === 'video') && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 rounded-full p-3">
                  <Play className="h-8 w-8 text-white" />
                </div>
              </div>
            )}
          </div>
        )}
      </Link>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="px-4 py-3 border-t border-border/50">
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs bg-muted/60 hover:bg-muted transition-colors">
                #{tag}
              </Badge>
            ))}
            {post.tags.length > 4 && (
              <Badge variant="secondary" className="text-xs bg-muted/60">
                +{post.tags.length - 4} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Preview link for author on scheduled/draft */}
      {user && post.author_id === user.id &&
        (post.status === 'scheduled' || post.status === 'draft') &&
        post.preview_token && (
          <div className="px-4 pt-3">
            <PreviewLinkCard
              token={post.preview_token}
              status={post.status}
              previewViewCount={post.preview_view_count}
              previewLastViewedAt={post.preview_last_viewed_at}
              title={post.title}
            />
          </div>
        )}

      {/* Engagement Actions */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <ContentInteractionButtons
            likeCount={likeCount}
            commentCount={commentCount}
            userHasLiked={userHasLiked}
            onLike={handleLike}
            onCommentClick={() => navigate(`${postPath}#comments`)}
            onShare={handleShare}
          />
        </div>
      </div>

      {/* Edit Post Modal */}
      <EditPostModal
        post={post}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onPostUpdated={() => window.location.reload()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CommunityPostCard;