import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSessionId } from '@/hooks/useSessionId';
import { toast } from 'sonner';

interface PostInteraction {
  id: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  user_liked: boolean;
}

export const usePostInteractions = () => {
  const { user } = useAuth();
  const sessionId = useSessionId();
  const [interactions, setInteractions] = useState<Record<string, PostInteraction>>({});

  const updateInteraction = useCallback((postId: string, updates: Partial<PostInteraction>) => {
    setInteractions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        ...updates
      }
    }));
  }, []);

  const toggleLike = useCallback(async (postId: string, postType: 'blog' | 'community_posts') => {
    if (!user && !sessionId) {
      toast.error('Unable to process like. Please refresh and try again.');
      return false;
    }

    const current = interactions[postId];
    if (!current) return false;

    try {
      const isBlogPost = postType === 'blog';
      
      if (current.user_liked) {
        // Unlike
        if (isBlogPost) {
          const { error } = await supabase
            .from('blog_likes')
            .delete()
            .or(
              user 
                ? `and(blog_id.eq.${postId},user_id.eq.${user.id})`
                : `and(blog_id.eq.${postId},session_id.eq.${sessionId})`
            );
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('post_likes')
            .delete()
            .or(
              user 
                ? `and(post_id.eq.${postId},user_id.eq.${user.id})`
                : `and(post_id.eq.${postId},session_id.eq.${sessionId})`
            );
          if (error) throw error;
        }
        
        updateInteraction(postId, {
          like_count: current.like_count - 1,
          user_liked: false
        });
        toast.success('Post unliked');
      } else {
        // Like
        if (isBlogPost) {
          const { error } = await supabase
            .from('blog_likes')
            .insert({ 
              blog_id: postId, 
              user_id: user?.id || null,
              session_id: !user ? sessionId : null
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('post_likes')
            .insert({ 
              post_id: postId, 
              user_id: user?.id || null,
              session_id: !user ? sessionId : null
            });
          if (error) throw error;
        }
        
        updateInteraction(postId, {
          like_count: current.like_count + 1,
          user_liked: true
        });
        toast.success('Post liked!');
      }
      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like. Please try again.');
      return false;
    }
  }, [user, sessionId, interactions, updateInteraction]);

  const incrementCommentCount = useCallback((postId: string) => {
    const current = interactions[postId];
    if (current) {
      updateInteraction(postId, {
        comment_count: current.comment_count + 1
      });
    }
  }, [interactions, updateInteraction]);

  const incrementShareCount = useCallback((postId: string) => {
    const current = interactions[postId];
    if (current) {
      updateInteraction(postId, {
        share_count: current.share_count + 1
      });
    }
  }, [interactions, updateInteraction]);

  const initializeInteraction = useCallback((postId: string, data: PostInteraction) => {
    setInteractions(prev => ({
      ...prev,
      [postId]: data
    }));
  }, []);

  const getInteraction = useCallback((postId: string) => {
    return interactions[postId];
  }, [interactions]);

  return {
    toggleLike,
    incrementCommentCount,
    incrementShareCount,
    initializeInteraction,
    getInteraction,
    updateInteraction
  };
};