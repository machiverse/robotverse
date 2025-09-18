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
  comment_count: number;
  share_count: number;
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
    
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    if (isLiking) return;

    try {
      setIsLiking(true);
      
      if (post.user_liked) {
        // Unlike the post
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
        
        onLikeUpdate?.(post.id, post.like_count - 1, false);
        toast.success('Post unliked');
      } else {
        // Like the post
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;
        
        onLikeUpdate?.(post.id, post.like_count + 1, true);
        toast.success('Post liked!');
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
        url: `${window.location.origin}/community/${post.id}`
      };
      
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
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
    <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 bg-card overflow-hidden">
      <Link to={`/community/${post.id}`}>
        {/* Media Preview */}
        {post.media_url && (
          <div className="relative aspect-video overflow-hidden">
            {post.post_type === 'video' ? (
              <div className="relative">
                <video
                  src={post.media_url}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  poster={post.media_url}
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-3">
                    <Play className="h-8 w-8 text-primary fill-primary" />
                  </div>
                </div>
                {post.video_duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(post.video_duration)}
                  </div>
                )}
              </div>
            ) : (
              <img
                src={post.media_url}
                alt={post.title || 'Post media'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}
          </div>
        )}

        <CardContent className="p-6 space-y-4">
          {/* Post Type Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={`${getPostTypeColor()} text-white flex items-center gap-1`}>
              {getPostTypeIcon()}
              {post.post_type.replace('_', ' ').toUpperCase()}
            </Badge>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Eye className="h-4 w-4" />
              <span>{post.view_count}</span>
            </div>
          </div>

          {/* Title */}
          {post.title && (
            <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {post.title}
            </h3>
          )}

          {/* Content */}
          {post.content && (
            <p className="text-muted-foreground line-clamp-3 leading-relaxed">
              {post.excerpt || generateExcerpt(post.content)}
            </p>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {post.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{post.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Author and Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {post.profiles?.full_name || post.profiles?.company_name || 'Community Member'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking || !user}
                className={`h-8 px-2 ${post.user_liked ? 'text-red-500' : ''}`}
              >
                <Heart className={`h-4 w-4 ${post.user_liked ? 'fill-current' : ''}`} />
                <span className="ml-1 text-xs">{post.like_count}</span>
              </Button>

              <Button variant="ghost" size="sm" className="h-8 px-2">
                <MessageCircle className="h-4 w-4" />
                <span className="ml-1 text-xs">{post.comment_count}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-8 px-2"
              >
                <Share2 className="h-4 w-4" />
                <span className="ml-1 text-xs">{post.share_count}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default CommunityPostCard;