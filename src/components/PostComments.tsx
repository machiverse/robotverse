import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageCircle, Send, User, Heart, Reply, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string;
  like_count: number;
  profiles?: {
    full_name: string;
    company_name?: string;
    avatar_url?: string;
  } | null;
  user_liked?: boolean;
  replies?: Comment[];
}

interface PostCommentsProps {
  postId: string;
}

const PostComments = ({ postId }: PostCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // Fetch comments with better error handling
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }

      // Fetch author profiles for each comment with error handling
      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment) => {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('full_name, company_name, avatar_url')
              .eq('user_id', comment.user_id)
              .maybeSingle();
            
            if (profileError) {
              console.warn('Error fetching profile for comment:', profileError);
            }
            
            return {
              ...comment,
              profiles: profile
            };
          } catch (profileErr) {
            console.warn('Failed to fetch profile for comment:', profileErr);
            return {
              ...comment,
              profiles: null
            };
          }
        })
      );

      // Fetch replies for each comment with error handling
      const commentsWithReplies = await Promise.all(
        commentsWithProfiles.map(async (comment) => {
          try {
            const { data: repliesData, error: repliesError } = await supabase
              .from('post_comments')
              .select('*')
              .eq('parent_comment_id', comment.id)
              .order('created_at', { ascending: true });

            if (repliesError) {
              console.warn('Error fetching replies:', repliesError);
              return { ...comment, replies: [] };
            }

            // Fetch profiles for replies with error handling
            const repliesWithProfiles = await Promise.all(
              (repliesData || []).map(async (reply) => {
                try {
                  const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, company_name, avatar_url')
                    .eq('user_id', reply.user_id)
                    .maybeSingle();
                  
                  if (profileError) {
                    console.warn('Error fetching profile for reply:', profileError);
                  }
                  
                  return {
                    ...reply,
                    profiles: profile
                  };
                } catch (profileErr) {
                  console.warn('Failed to fetch profile for reply:', profileErr);
                  return {
                    ...reply,
                    profiles: null
                  };
                }
              })
            );

            return {
              ...comment,
              replies: repliesWithProfiles
            };
          } catch (repliesErr) {
            console.warn('Failed to fetch replies for comment:', repliesErr);
            return { ...comment, replies: [] };
          }
        })
      );

      setComments(commentsWithReplies as Comment[]);
    } catch (error) {
      console.error('Error fetching comments:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Connection error. Please check your internet connection and try again.');
      } else {
        toast.error('Failed to load comments. Please try refreshing the page.');
      }
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) {
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
          content: newComment.trim()
        }]);

      if (error) {
        console.error('Error posting comment:', error);
        throw error;
      }

      setNewComment("");
      await fetchComments();
      toast.success('Comment posted successfully');
    } catch (error) {
      console.error('Error posting comment:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Connection error. Please check your internet connection and try again.');
      } else if (error instanceof Error && error.message.includes('permission')) {
        toast.error('You do not have permission to comment on this post.');
      } else {
        toast.error('Failed to post comment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    if (!replyContent.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('post_comments')
        .insert([{
          post_id: postId,
          user_id: user.id,
          content: replyContent.trim(),
          parent_comment_id: parentCommentId
        }]);

      if (error) {
        console.error('Error posting reply:', error);
        throw error;
      }

      setReplyContent("");
      setReplyTo(null);
      await fetchComments();
      toast.success('Reply posted successfully');
    } catch (error) {
      console.error('Error posting reply:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Connection error. Please check your internet connection and try again.');
      } else if (error instanceof Error && error.message.includes('permission')) {
        toast.error('You do not have permission to reply to this comment.');
      } else {
        toast.error('Failed to post reply. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  const CommentCard = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <Card className={`transition-all hover:shadow-md ${isReply ? 'ml-12 border-l-2 border-primary/20' : ''}`}>
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
          </div>
          
          <div 
            className="prose prose-sm max-w-none leading-relaxed text-foreground"
            dangerouslySetInnerHTML={{ 
              __html: formatText(comment.content) 
            }}
          />

          <div className="flex items-center gap-2 pt-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
              <Heart className="h-3 w-3 mr-1" />
              {comment.like_count || 0}
            </Button>
            
            {!isReply && user && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="h-7 px-2 text-muted-foreground"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {replyTo === comment.id && (
            <div className="space-y-3 mt-4 p-3 bg-muted/50 rounded-lg">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[80px] resize-none"
                disabled={submitting}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setReplyTo(null)}>
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={submitting || !replyContent.trim()}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section className="mt-8 space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
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
                  onClick={handleSubmitComment}
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
              
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-3">
                  {comment.replies.map((reply) => (
                    <CommentCard key={reply.id} comment={reply} isReply />
                  ))}
                </div>
              )}
              
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

export default PostComments;