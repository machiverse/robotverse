import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type ContentType = 'blog' | 'community_post' | 'video';

interface ContentInteractionData {
  likeCount: number;
  commentCount: number;
  userHasLiked: boolean;
  comments: Comment[];
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name?: string;
    company_name?: string;
    avatar_url?: string;
  };
}

export const useContentInteractions = (contentId: string, contentType: ContentType) => {
  const { user } = useAuth();
  const [data, setData] = useState<ContentInteractionData>({
    likeCount: 0,
    commentCount: 0,
    userHasLiked: false,
    comments: []
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchInteractions = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all interactions for this content
      const { data: interactions, error } = await supabase
        .from('content_interactions')
        .select('*')
        .eq('content_id', contentId)
        .eq('content_type', contentType);

      if (error) throw error;

      // Calculate counts
      const likeCount = interactions?.filter(i => i.interaction_type === 'like').length || 0;
      const commentCount = interactions?.filter(i => i.interaction_type === 'comment').length || 0;
      const userHasLiked = user 
        ? interactions?.some(i => i.interaction_type === 'like' && i.user_id === user.id) || false
        : false;

      // Get comments with profiles
      const commentInteractions = interactions?.filter(i => i.interaction_type === 'comment') || [];
      const commentsWithProfiles = await Promise.all(
        commentInteractions.map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name, avatar_url')
            .eq('user_id', comment.user_id)
            .single();

          return {
            ...comment,
            profiles: profile
          };
        })
      );

      setData({
        likeCount,
        commentCount,
        userHasLiked,
        comments: commentsWithProfiles.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      });
    } catch (error) {
      console.error('Error fetching interactions:', error);
    } finally {
      setLoading(false);
    }
  }, [contentId, contentType, user]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`content-interactions-${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_interactions',
          filter: `content_id=eq.${contentId}`
        },
        () => {
          fetchInteractions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId, fetchInteractions]);

  const toggleLike = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to like');
      return false;
    }

    try {
      if (data.userHasLiked) {
        // Unlike
        const { error } = await supabase
          .from('content_interactions')
          .delete()
          .eq('content_id', contentId)
          .eq('content_type', contentType)
          .eq('user_id', user.id)
          .eq('interaction_type', 'like');

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('content_interactions')
          .insert({
            content_id: contentId,
            content_type: contentType,
            user_id: user.id,
            interaction_type: 'like'
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
      return false;
    }
  }, [user, contentId, contentType, data.userHasLiked]);

  const addComment = useCallback(async (commentText: string) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return false;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return false;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('content_interactions')
        .insert({
          content_id: contentId,
          content_type: contentType,
          user_id: user.id,
          interaction_type: 'comment',
          comment_text: commentText.trim()
        });

      if (error) throw error;

      toast.success('Comment posted successfully');
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to post comment');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, contentId, contentType]);

  const updateComment = useCallback(async (commentId: string, commentText: string) => {
    if (!user) {
      toast.error('Please sign in to edit comment');
      return false;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return false;
    }

    try {
      const { error } = await supabase
        .from('content_interactions')
        .update({ comment_text: commentText.trim() })
        .eq('id', commentId)
        .eq('user_id', user.id)
        .eq('interaction_type', 'comment');

      if (error) throw error;

      toast.success('Comment updated');
      return true;
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
      return false;
    }
  }, [user]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) {
      toast.error('Please sign in to delete comment');
      return false;
    }

    try {
      const { error } = await supabase
        .from('content_interactions')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)
        .eq('interaction_type', 'comment');

      if (error) throw error;

      toast.success('Comment deleted');
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
      return false;
    }
  }, [user]);

  return {
    ...data,
    loading,
    submitting,
    toggleLike,
    addComment,
    updateComment,
    deleteComment,
    refetch: fetchInteractions
  };
};
