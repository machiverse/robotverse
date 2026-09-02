import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSessionId } from "@/hooks/useSessionId";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageCircle, Send, User, Heart, Lock, Reply, Edit2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  post_id: string;
  like_count: number;
  parent_comment_id?: string;
  profiles?: {
    full_name?: string;
    company_name?: string;
    avatar_url?: string;
  } | null;
  replies?: Comment[];
  userLiked?: boolean;
}

interface EnhancedPostCommentsProps {
  postId: string;
  onCommentCountChange?: (newCount: number) => void;
}

const EnhancedPostComments = ({ postId, onCommentCountChange }: EnhancedPostCommentsProps) => {
  const { user } = useAuth();
  const sessionId = useSessionId();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  // Real-time subscription for comments
  useEffect(() => {
    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchComments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_likes'
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // Fetch comments
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          user_id,
          post_id,
          like_count,
          parent_comment_id
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Check which comments user has liked
      let likedCommentIds = new Set<string>();
      if (user || sessionId) {
        const { data: likes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .or(
            user 
              ? `user_id.eq.${user.id},session_id.eq.${sessionId}`
              : `session_id.eq.${sessionId}`
          );
        
        likes?.forEach(like => likedCommentIds.add(like.comment_id));
      }

      // Fetch profiles for comments and organize into tree structure
      const commentsMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment): Promise<Comment> => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, company_name, avatar_url')
              .eq('user_id', comment.user_id)
              .maybeSingle();
            
            const commentWithProfile = {
              ...comment,
              userLiked: likedCommentIds.has(comment.id),
              replies: [],
              profiles: profile
            };
            
            commentsMap.set(comment.id, commentWithProfile);
            
            if (!comment.parent_comment_id) {
              rootComments.push(commentWithProfile);
            }
            
            return commentWithProfile;
          } catch (profileErr) {
            console.warn('Failed to fetch profile for comment:', profileErr);
            const commentWithoutProfile = {
              ...comment,
              userLiked: likedCommentIds.has(comment.id),
              replies: [],
              profiles: null
            };
            
            commentsMap.set(comment.id, commentWithoutProfile);
            
            if (!comment.parent_comment_id) {
              rootComments.push(commentWithoutProfile);
            }
            
            return commentWithoutProfile;
          }
        })
      );

      // Add replies to parent comments
      commentsWithProfiles.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        }
      });

      setComments(rootComments);
      onCommentCountChange?.(commentsData?.length || 0);
      
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (parentId?: string) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    const content = parentId ? newComment : newComment;
    if (!content.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('post_comments')
        .insert([{
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentId || null
        }]);

      if (error) throw error;

      setNewComment("");
      setReplyTo(null);
      toast.success('Comment posted successfully!');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const comment = findComment(commentId);
      if (!comment) return;

      if (comment.userLiked) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .or(
            user
              ? `and(comment_id.eq.${commentId},user_id.eq.${user.id})`
              : `and(comment_id.eq.${commentId},session_id.eq.${sessionId})`
          );
        
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user?.id || null,
            session_id: !user ? sessionId : null
          });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error('Please enter comment content');
      return;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setEditingComment(null);
      setEditContent("");
      toast.success('Comment updated successfully!');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Comment deleted successfully!');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const findComment = (commentId: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === commentId) return comment;
      if (comment.replies) {
        for (const reply of comment.replies) {
          if (reply.id === commentId) return reply;
        }
      }
    }
    return null;
  };

  const CommentCard = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <Card className={`transition-all hover:shadow-md ${isReply ? 'ml-8 mt-4' : ''}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.profiles?.avatar_url} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">
                  {comment.profiles?.full_name || comment.profiles?.company_name || 'Community Member'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            {user?.id === comment.user_id && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="h-7 w-7 p-0"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          {editingComment === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEditComment(comment.id)}>
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-foreground">
              {comment.content}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleLikeComment(comment.id)}
              className={`h-7 px-2 ${
                comment.userLiked 
                  ? 'text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950' 
                  : 'text-muted-foreground hover:text-red-500'
              }`}
            >
              <Heart className={`h-3 w-3 mr-1 ${comment.userLiked ? 'fill-current' : ''}`} />
              {comment.like_count}
            </Button>
            
            {!isReply && user && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="h-7 px-2 text-muted-foreground hover:text-primary"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>

          {replyTo === comment.id && (
            <div className="mt-4 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleSubmitComment(comment.id)}
                  disabled={submitting}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Reply
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setReplyTo(null);
                    setNewComment("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-0">
          {comment.replies.map(reply => (
            <CommentCard key={reply.id} comment={reply} isReply={true} />
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <section className="mt-8 space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Comments ({comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)})</h2>
      </div>

      {/* Comment Form */}
      <Card>
        <CardContent className="p-6">
          {user ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Join the discussion
                </label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts on this post..."
                  className="min-h-[100px] resize-none"
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSubmitComment()}
                  disabled={submitting || !newComment.trim()}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Sign in to join the discussion</h3>
                <p className="text-muted-foreground mb-4">
                  Share your thoughts and engage with the community
                </p>
                <Button asChild>
                  <a href="/auth">Sign In to Comment</a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment, index) => (
            <div key={comment.id}>
              <CommentCard comment={comment} />
              {index < comments.length - 1 && <Separator className="my-6" />}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
            <p className="text-muted-foreground">
              {user ? 'Be the first to share your thoughts!' : 'Sign in to start the conversation'}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default EnhancedPostComments;