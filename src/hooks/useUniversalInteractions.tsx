import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSessionId } from '@/hooks/useSessionId';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

export type ContentType = 'blog' | 'community_post' | 'video';

interface ContentInteraction {
  id: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  user_liked: boolean;
}

interface LikeTableMap {
  blog: 'blog_likes';
  community_post: 'post_likes';
  video: 'post_likes';
}

interface CommentTableMap {
  blog: 'blog_comments';
  community_post: 'post_comments';
  video: 'post_comments';
}

const LIKE_TABLES: LikeTableMap = {
  blog: 'blog_likes',
  community_post: 'post_likes',
  video: 'post_likes',
};

const COMMENT_TABLES: CommentTableMap = {
  blog: 'blog_comments',
  community_post: 'post_comments',
  video: 'post_comments',
};

const CONTENT_TABLES = {
  blog: 'blogs',
  community_post: 'community_posts',
  video: 'community_posts',
};

export const useUniversalInteractions = (contentId: string, contentType: ContentType) => {
  const { user } = useAuth();
  const sessionId = useSessionId();
  const [interaction, setInteraction] = useState<ContentInteraction>({
    id: contentId,
    like_count: 0,
    comment_count: 0,
    share_count: 0,
    user_liked: false,
  });
  const [loading, setLoading] = useState(true);

  const likeTable = LIKE_TABLES[contentType];
  const commentTable = COMMENT_TABLES[contentType];
  const contentTable = CONTENT_TABLES[contentType];

  // Fetch initial data
  const fetchInteractionData = useCallback(async () => {
    try {
      setLoading(true);

      let contentData: any = null;
      let contentError: any = null;
      let commentCount = 0;

      // Use specific queries based on content type
      if (contentType === 'blog') {
        const result = await supabase
          .from('blogs')
          .select('like_count, share_count')
          .eq('id', contentId)
          .single();
        contentData = result.data;
        contentError = result.error;

        // Count comments separately for blogs (blogs table doesn't have comment_count)
        if (!contentError) {
          const { count } = await supabase
            .from('blog_comments')
            .select('*', { count: 'exact', head: true })
            .eq('blog_id', contentId);
          commentCount = count || 0;
        }
      } else {
        const result = await supabase
          .from('community_posts')
          .select('like_count, comment_count, share_count')
          .eq('id', contentId)
          .single();
        contentData = result.data;
        contentError = result.error;
        commentCount = contentData?.comment_count || 0;
      }

      if (contentError) throw contentError;

      // Check if user has liked
      let userLiked = false;
      if (user) {
        // Authenticated users can like all content
        let likeData: any = null;
        if (contentType === 'blog') {
          const result = await supabase
            .from('blog_likes')
            .select('id')
            .eq('blog_id', contentId)
            .eq('user_id', user.id)
            .maybeSingle();
          likeData = result.data;
        } else {
          const result = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', contentId)
            .eq('user_id', user.id)
            .maybeSingle();
          likeData = result.data;
        }

        userLiked = !!likeData;
      } else if (sessionId && contentType !== 'blog') {
        // Anonymous likes only for community posts (blog_likes doesn't have session_id)
        const result = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', contentId)
          .eq('session_id', sessionId)
          .maybeSingle();
        userLiked = !!result.data;
      }

      setInteraction({
        id: contentId,
        like_count: contentData?.like_count || 0,
        comment_count: commentCount,
        share_count: contentData?.share_count || 0,
        user_liked: userLiked,
      });
    } catch (error) {
      console.error('Error fetching interaction data:', error);
    } finally {
      setLoading(false);
    }
  }, [contentId, contentType, user, sessionId]);

  // Real-time subscriptions
  useEffect(() => {
    fetchInteractionData();

    const channels: RealtimeChannel[] = [];

    // Subscribe to like changes
    const likeChannel = supabase
      .channel(`${contentType}-likes-${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: likeTable,
          filter: contentType === 'blog' ? `blog_id=eq.${contentId}` : `post_id=eq.${contentId}`,
        },
        () => {
          fetchInteractionData();
        }
      )
      .subscribe();
    channels.push(likeChannel);

    // Subscribe to comment changes
    const commentChannel = supabase
      .channel(`${contentType}-comments-${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: commentTable,
          filter: contentType === 'blog' ? `blog_id=eq.${contentId}` : `post_id=eq.${contentId}`,
        },
        () => {
          fetchInteractionData();
        }
      )
      .subscribe();
    channels.push(commentChannel);

    // Subscribe to content table changes (for counter updates)
    const contentChannel = supabase
      .channel(`${contentType}-content-${contentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: contentTable,
          filter: `id=eq.${contentId}`,
        },
        () => {
          fetchInteractionData();
        }
      )
      .subscribe();
    channels.push(contentChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [contentId, contentType, fetchInteractionData, likeTable, commentTable, contentTable]);

  // Toggle like
  const toggleLike = useCallback(async () => {
    // Blogs require authentication (blog_likes table doesn't support session_id)
    if (contentType === 'blog' && !user) {
      toast.error('Please sign in to like blogs');
      return false;
    }

    // Community posts allow anonymous likes
    if (contentType !== 'blog' && !user && !sessionId) {
      toast.error('Unable to process like. Please refresh and try again.');
      return false;
    }

    try {
      const idField = contentType === 'blog' ? 'blog_id' : 'post_id';

      if (interaction.user_liked) {
        // Unlike
        let error: any = null;
        if (contentType === 'blog') {
          error = (await supabase
            .from('blog_likes')
            .delete()
            .eq('blog_id', contentId)
            .eq('user_id', user!.id)).error;
        } else {
          if (user) {
            error = (await supabase
              .from('post_likes')
              .delete()
              .eq('post_id', contentId)
              .eq('user_id', user.id)).error;
          } else {
            error = (await supabase
              .from('post_likes')
              .delete()
              .eq('post_id', contentId)
              .eq('session_id', sessionId)).error;
          }
        }

        if (error) throw error;

        // Optimistic update
        setInteraction(prev => ({
          ...prev,
          like_count: Math.max(0, prev.like_count - 1),
          user_liked: false,
        }));
      } else {
        // Like
        const insertData: any = { [idField]: contentId };
        if (user) {
          insertData.user_id = user.id;
        } else if (contentType !== 'blog') {
          // Only add session_id for non-blog content
          insertData.session_id = sessionId;
        }

        let error: any = null;
        if (contentType === 'blog') {
          const result = await supabase
            .from('blog_likes')
            .insert(insertData);
          error = result.error;
        } else {
          const result = await supabase
            .from('post_likes')
            .insert(insertData);
          error = result.error;
        }

        if (error) throw error;

        // Optimistic update
        setInteraction(prev => ({
          ...prev,
          like_count: prev.like_count + 1,
          user_liked: true,
        }));
      }

      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like. Please try again.');
      // Revert optimistic update on error
      fetchInteractionData();
      return false;
    }
  }, [contentId, contentType, interaction.user_liked, user, sessionId, fetchInteractionData]);

  // Increment comment count (for optimistic updates)
  const incrementCommentCount = useCallback(() => {
    setInteraction(prev => ({
      ...prev,
      comment_count: prev.comment_count + 1,
    }));
  }, []);

  // Increment share count
  const incrementShareCount = useCallback(async () => {
    try {
      let error: any = null;
      
      if (contentType === 'blog') {
        error = (await supabase
          .from('blogs')
          .update({ share_count: interaction.share_count + 1 })
          .eq('id', contentId)).error;
      } else {
        error = (await supabase
          .from('community_posts')
          .update({ share_count: interaction.share_count + 1 })
          .eq('id', contentId)).error;
      }

      if (error) throw error;

      // Optimistic update
      setInteraction(prev => ({
        ...prev,
        share_count: prev.share_count + 1,
      }));

      toast.success('Shared successfully!');
      return true;
    } catch (error) {
      console.error('Error incrementing share count:', error);
      toast.error('Failed to share. Please try again.');
      return false;
    }
  }, [contentId, contentType, interaction.share_count]);

  // Refetch data
  const refetch = useCallback(() => {
    fetchInteractionData();
  }, [fetchInteractionData]);

  return {
    interaction,
    loading,
    toggleLike,
    incrementCommentCount,
    incrementShareCount,
    refetch,
  };
};
