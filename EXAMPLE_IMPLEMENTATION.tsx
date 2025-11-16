// EXAMPLE: How to use the new Universal Like & Comment System

// ============================================
// Example 1: Blog Post Page
// ============================================
import { useUniversalInteractions } from '@/hooks/useUniversalInteractions';
import { UniversalInteractionButtons } from '@/components/universal/UniversalInteractionButtons';
import { UniversalComments } from '@/components/universal/UniversalComments';

const BlogPostPage = ({ blogId }: { blogId: string }) => {
  const { interaction, toggleLike, incrementShareCount } = useUniversalInteractions(
    blogId,
    'blog'
  );

  const scrollToComments = () => {
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      <article>
        {/* Blog content here */}
      </article>

      {/* Interaction Buttons */}
      <UniversalInteractionButtons
        likeCount={interaction.like_count}
        commentCount={interaction.comment_count}
        shareCount={interaction.share_count}
        userLiked={interaction.user_liked}
        onLike={toggleLike}
        onShare={incrementShareCount}
        onCommentClick={scrollToComments}
      />

      {/* Comments Section */}
      <div id="comments-section">
        <UniversalComments contentId={blogId} contentType="blog" />
      </div>
    </div>
  );
};

// ============================================
// Example 2: Community Post Card
// ============================================
const CommunityPostCard = ({ post }: { post: any }) => {
  const { interaction, toggleLike, incrementShareCount } = useUniversalInteractions(
    post.id,
    'community_post'
  );

  return (
    <Card>
      <CardContent>
        <h3>{post.title}</h3>
        <p>{post.content}</p>

        <UniversalInteractionButtons
          likeCount={interaction.like_count}
          commentCount={interaction.comment_count}
          shareCount={interaction.share_count}
          userLiked={interaction.user_liked}
          onLike={toggleLike}
          onShare={incrementShareCount}
          onCommentClick={() => {/* Navigate to details page */}}
        />
      </CardContent>
    </Card>
  );
};

// ============================================
// Example 3: Video Post
// ============================================
const VideoPostPage = ({ videoId }: { videoId: string }) => {
  const { interaction, toggleLike } = useUniversalInteractions(videoId, 'video');

  return (
    <div>
      <video controls src={videoUrl} />
      
      <UniversalInteractionButtons
        likeCount={interaction.like_count}
        commentCount={interaction.comment_count}
        shareCount={interaction.share_count}
        userLiked={interaction.user_liked}
        onLike={toggleLike}
        onCommentClick={() => {}}
      />

      <UniversalComments contentId={videoId} contentType="video" />
    </div>
  );
};
