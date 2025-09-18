import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  Play, 
  Clock,
  User,
  BookOpen,
  Video,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
}

const CommunityPostCard = ({ post, onLikeUpdate }: CommunityPostCardProps) => {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);

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

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLiking) return;

    try {
      setIsLiking(true);
      
      if (post.user_liked) {
        // Unlike the post
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user?.id);

        if (error) throw error;
        
        onLikeUpdate?.(post.id, post.like_count - 1, false);
      } else {
        // Like the post - allow all users to like
        if (user) {
          const { error } = await supabase
            .from('post_likes')
            .insert({ post_id: post.id, user_id: user.id });

          if (error) throw error;
          
          onLikeUpdate?.(post.id, post.like_count + 1, true);
        } else {
          // For non-authenticated users, just update the UI
          onLikeUpdate?.(post.id, post.like_count + 1, false);
          toast.success('Thanks for the like! Sign in to save your preferences.');
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const shareData = {
        title: post.title || 'Community Post',
        text: post.excerpt || post.content?.substring(0, 100) + '...',
        url: post.post_type === 'blog' && !post.media_url 
          ? `${window.location.origin}/blogs/${post.id}`
          : `${window.location.origin}/community/${post.id}`
      };
      
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Post shared successfully!');
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }

      // Track share - allow all users to share
      if (user) {
        await supabase
          .from('post_shares')
          .insert({ 
            post_id: post.id, 
            user_id: user.id,
            shared_to: 'external'
          });
      }
      
      // Update share count in UI regardless of auth status
      onLikeUpdate?.(post.id, post.like_count, post.user_liked || false);
    } catch (error) {
      console.error('Error sharing:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled the share, don't show error
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 bg-card border border-border/50 rounded-xl overflow-hidden w-full">
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

        {/* Post Type Badge */}
        <Badge variant="outline" className="border-none bg-gradient-to-r from-primary/10 to-accent/10 text-primary hover:from-primary/20 hover:to-accent/20 transition-all">
          <div className="flex items-center gap-1">
            {getPostTypeIcon()}
            <span className="text-xs font-medium">
              {post.post_type === 'short_post' ? 'POST' : post.post_type.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </Badge>
      </div>

      <Link to={post.post_type === 'blog' && !post.media_url ? `/blogs/${post.id}` : `/community/${post.id}`} className="block">
        <div className="px-4 pb-3">
          {/* Title */}
          {post.title && (
            <h2 className="text-xl font-bold line-clamp-3 group-hover:text-primary transition-colors leading-tight mb-2">
              {post.title}
            </h2>
          )}

          {/* Content */}
          {post.content && (
            <p className="text-muted-foreground line-clamp-4 leading-relaxed mb-3">
              {post.excerpt || generateExcerpt(post.content, 200)}
            </p>
          )}
        </div>

        {/* Media Preview */}
        {post.media_url && (
          <div className="relative overflow-hidden bg-muted/30">
            {post.post_type === 'video' ? (
              <div className="relative aspect-video">
                <video
                  src={post.media_url}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                  poster={post.media_url}
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="bg-white/95 backdrop-blur-sm rounded-full p-4 shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-primary fill-primary" />
                  </div>
                </div>
                {post.video_duration && (
                  <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded-md font-medium">
                    {formatDuration(post.video_duration)}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video">
                <img
                  src={post.media_url}
                  alt={post.title || 'Post media'}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                />
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

      {/* Engagement Actions */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className={`h-9 px-3 rounded-full transition-all hover:scale-105 ${
                post.user_liked 
                  ? 'text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900' 
                  : 'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
              }`}
            >
              <Heart className={`h-4 w-4 mr-1 ${post.user_liked ? 'fill-current' : ''}`} />
              <span className="font-medium">{post.like_count}</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-3 rounded-full hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all hover:scale-105"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!user) {
                  toast.error('Please sign in to comment');
                  return;
                }
                // Navigate to post with comments focused
                window.location.href = post.post_type === 'blog' && !post.media_url ? `/blogs/${post.id}#comments` : `/community/${post.id}#comments`;
              }}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="font-medium">{post.comment_count || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-9 px-3 rounded-full hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-all hover:scale-105"
            >
              <Share2 className="h-4 w-4 mr-1" />
              <span className="font-medium">{post.share_count || 0}</span>
            </Button>
          </div>

          {/* View Details Link */}
          <Link 
            to={post.post_type === 'blog' && !post.media_url ? `/blogs/${post.id}` : `/community/${post.id}`}
            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View Details →
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default CommunityPostCard;