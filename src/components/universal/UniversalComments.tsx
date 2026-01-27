import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageCircle, Send, User, Lock, Trash2, Edit2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ContentType } from "@/hooks/useUniversalInteractions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    full_name?: string;
    company_name?: string;
    avatar_url?: string;
  } | null;
}

interface UniversalCommentsProps {
  contentId: string;
  contentType: ContentType;
  onCommentCountChange?: (newCount: number) => void;
}

const COMMENT_TABLES = {
  blog: 'blog_comments',
  community_post: 'post_comments',
  video: 'post_comments',
};

export const UniversalComments = ({ contentId, contentType, onCommentCountChange }: UniversalCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const commentTable = COMMENT_TABLES[contentType];
  const idField = contentType === 'blog' ? 'blog_id' : 'post_id';

  useEffect(() => {
    fetchComments();
  }, [contentId, contentType]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${contentType}-${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: commentTable,
          filter: `${idField}=eq.${contentId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId, contentType, commentTable, idField]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      let commentsData: any[] = [];
      let error: any = null;

      // Use specific queries based on content type
      if (contentType === 'blog') {
        const result = await supabase
          .from('blog_comments')
          .select('id, content, created_at, updated_at, user_id')
          .eq('blog_id', contentId)
          .order('created_at', { ascending: false });
        commentsData = result.data || [];
        error = result.error;
      } else {
        const result = await supabase
          .from('post_comments')
          .select('id, content, created_at, updated_at, user_id')
          .eq('post_id', contentId)
          .order('created_at', { ascending: false });
        commentsData = result.data || [];
        error = result.error;
      }

      if (error) throw error;

      // Fetch profiles
      const commentsWithProfiles = await Promise.all(
        commentsData.map(async (comment: any): Promise<Comment> => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, company_name, avatar_url')
              .eq('user_id', comment.user_id)
              .maybeSingle();
            
            return {
              ...comment,
              profiles: profile,
            };
          } catch {
            return {
              ...comment,
              profiles: null,
            };
          }
        })
      );

      setComments(commentsWithProfiles);
      onCommentCountChange?.(commentsWithProfiles.length);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Please sign in to post comments');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      const insertData: any = {
        [idField]: contentId,
        user_id: user.id,
        content: newComment.trim(),
      };

      let error: any = null;
      if (contentType === 'blog') {
        const result = await supabase
          .from('blog_comments')
          .insert([insertData]);
        error = result.error;
      } else {
        const result = await supabase
          .from('post_comments')
          .insert([insertData]);
        error = result.error;
      }

      if (error) throw error;

      setNewComment("");
      toast.success('Comment posted successfully');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      let error: any = null;
      if (contentType === 'blog') {
        const result = await supabase
          .from('blog_comments')
          .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
          .eq('id', commentId);
        error = result.error;
      } else {
        const result = await supabase
          .from('post_comments')
          .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
          .eq('id', commentId);
        error = result.error;
      }

      if (error) throw error;

      setEditingId(null);
      setEditContent("");
      toast.success('Comment updated');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteId) return;

    try {
      let error: any = null;
      if (contentType === 'blog') {
        const result = await supabase
          .from('blog_comments')
          .delete()
          .eq('id', deleteId);
        error = result.error;
      } else {
        const result = await supabase
          .from('post_comments')
          .delete()
          .eq('id', deleteId);
        error = result.error;
      }

      if (error) throw error;

      setDeleteId(null);
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  return (
    <section className="mt-12 space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
      </div>

      {/* Comment Form - Only for logged-in users */}
      {user ? (
        <Card>
          <CardContent className="p-6">
            <Textarea
              placeholder="Share your thoughts..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px] mb-4"
            />
            <Button 
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted">
          <CardContent className="p-6 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Sign in to join the conversation
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Sign In to Comment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No comments yet. Be the first to comment!
              </p>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment, index) => (
            <div key={comment.id}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">
                            {comment.profiles?.full_name || 'Anonymous User'}
                          </p>
                          {comment.profiles?.company_name && (
                            <p className="text-sm text-muted-foreground">
                              {comment.profiles.company_name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        
                        {user?.id === comment.user_id && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(comment)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(comment.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {editingId === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditComment(comment.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(null);
                                setEditContent("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-foreground whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {index < comments.length - 1 && <Separator className="my-4" />}
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
