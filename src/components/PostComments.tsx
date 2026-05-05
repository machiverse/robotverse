import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageCircle, Send, User, Heart, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  blog_id: string;
  profiles?: {
    full_name: string;
    company_name?: string;
    avatar_url?: string;
  } | null;
}

interface PostCommentsProps {
  postId: string;
  postType?: 'blog' | 'community_posts';
  onCommentCountChange?: (newCount: number) => void;
}

const PostComments = ({ postId, postType = 'blog', onCommentCountChange }: PostCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  // Set up real-time subscription for comments
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blog_comments',
          filter: `blog_id=eq.${postId}`
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
      
      // Fetch comments - simplified for flat structure
      const { data: commentsData, error } = await supabase
        .from('blog_comments')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          user_id,
          blog_id
        `)
        .eq('blog_id', postId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }

      // Fetch author profiles for each comment
      const commentsWithProfiles: Comment[] = await Promise.all(
        (commentsData || []).map(async (comment): Promise<Comment> => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, company_name, avatar_url')
              .eq('user_id', comment.user_id)
              .maybeSingle();
            
            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              updated_at: comment.updated_at,
              user_id: comment.user_id,
              blog_id: comment.blog_id,
              profiles: profile
            };
          } catch (profileErr) {
            console.warn('Failed to fetch profile for comment:', profileErr);
            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              updated_at: comment.updated_at,
              user_id: comment.user_id,
              blog_id: comment.blog_id,
              profiles: null
            };
          }
        })
      );

      setComments(commentsWithProfiles);
      
      // Update comment count
      onCommentCountChange?.(commentsWithProfiles.length);
      
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
      const { data, error } = await supabase
        .from('blog_comments')
        .insert([{
          blog_id: postId,
          user_id: user.id,
          content: newComment.trim()
        }])
        .select();

      if (error) {
        console.error('Error posting comment:', error);
        throw error;
      }

      setNewComment("");
      // Refresh comments to show the new one
      await fetchComments();
      toast.success('Comment posted successfully!');
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

  const formatText = (text: string) => {
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['strong', 'em', 'br'],
      ALLOWED_ATTR: [],
    });
  };

  const CommentCard = ({ comment }: { comment: Comment }) => (
    <Card className="transition-all hover:shadow-md">
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
              0
            </Button>
          </div>
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