import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
    if (!user) {
      toast.error('Please sign in to like posts');
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
            .eq('blog_id', postId)
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('post_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);
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
            .upsert({ 
              blog_id: postId, 
              user_id: user.id 
            }, { 
              onConflict: 'blog_id,user_id',
              ignoreDuplicates: false
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('post_likes')
            .upsert({ 
              post_id: postId, 
              user_id: user.id 
            }, { 
              onConflict: 'post_id,user_id',
              ignoreDuplicates: false
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
  }, [user, interactions, updateInteraction]);

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