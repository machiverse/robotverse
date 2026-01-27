# RoboBook Unified Interaction System

## Overview
A clean, scalable YouTube-like interaction system for all content types (blogs, community posts, videos) using a single unified database table and consistent API.

## Architecture

### Database Schema
**Table:** `content_interactions`
```sql
- id: UUID (Primary Key)
- content_id: UUID (The post/blog/video ID)
- content_type: TEXT ('blog' | 'community_post' | 'video')
- user_id: UUID (The user performing the interaction)
- interaction_type: TEXT ('like' | 'comment')
- comment_text: TEXT (For comments only)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Key Features:**
- Single table for all interaction types
- Automatic counter updates via database triggers
- Real-time subscriptions for instant updates
- RLS policies ensure only authenticated users can interact

### Frontend Components

#### 1. `useContentInteractions` Hook
**Location:** `src/hooks/useContentInteractions.tsx`

The main hook that provides all interaction functionality:
```tsx
const {
  likeCount,
  commentCount,
  userHasLiked,
  comments,
  loading,
  submitting,
  toggleLike,
  addComment,
  updateComment,
  deleteComment,
  refetch
} = useContentInteractions(contentId, contentType);
```

**Parameters:**
- `contentId`: string - The ID of the content
- `contentType`: 'blog' | 'community_post' | 'video'

**Returns:**
- `likeCount`: number - Current like count
- `commentCount`: number - Current comment count
- `userHasLiked`: boolean - Whether current user has liked
- `comments`: Comment[] - Array of comments with user profiles
- `loading`: boolean - Loading state
- `submitting`: boolean - Submitting state for new comments
- `toggleLike`: () => Promise<boolean> - Toggle like/unlike
- `addComment`: (text: string) => Promise<boolean> - Add new comment
- `updateComment`: (id: string, text: string) => Promise<boolean> - Edit comment
- `deleteComment`: (id: string) => Promise<boolean> - Delete comment
- `refetch`: () => Promise<void> - Manually refresh data

#### 2. `ContentLikeButton` Component
**Location:** `src/components/content/ContentLikeButton.tsx`

Displays like button with count and animated heart:
```tsx
<ContentLikeButton
  likeCount={likeCount}
  userHasLiked={userHasLiked}
  onToggleLike={toggleLike}
  disabled={false}
  size="sm"
/>
```

#### 3. `ContentInteractionButtons` Component
**Location:** `src/components/content/ContentInteractionButtons.tsx`

Combines like, comment, and share buttons:
```tsx
<ContentInteractionButtons
  likeCount={likeCount}
  commentCount={commentCount}
  userHasLiked={userHasLiked}
  onLike={toggleLike}
  onCommentClick={() => navigate('#comments')}
  onShare={handleShare}
/>
```

#### 4. `ContentComments` Component
**Location:** `src/components/content/ContentComments.tsx`

Full-featured comment section with:
- Add new comments
- Edit own comments
- Delete own comments
- Display with user avatars and timestamps
- Sign-in prompt for non-authenticated users

```tsx
<ContentComments
  comments={comments}
  commentCount={commentCount}
  loading={loading}
  submitting={submitting}
  onAddComment={addComment}
  onUpdateComment={updateComment}
  onDeleteComment={deleteComment}
/>
```

## Usage Examples

### Post Card Component
```tsx
import { useContentInteractions } from '@/hooks/useContentInteractions';
import { ContentInteractionButtons } from '@/components/content';

const PostCard = ({ post }) => {
  const contentType = post.post_type === 'blog' ? 'blog' : 'community_post';
  const { likeCount, commentCount, userHasLiked, toggleLike } = 
    useContentInteractions(post.id, contentType);

  return (
    <Card>
      {/* Post content */}
      <ContentInteractionButtons
        likeCount={likeCount}
        commentCount={commentCount}
        userHasLiked={userHasLiked}
        onLike={toggleLike}
        onCommentClick={() => navigate(`/post/${post.id}#comments`)}
      />
    </Card>
  );
};
```

### Post Details Page
```tsx
import { useContentInteractions } from '@/hooks/useContentInteractions';
import { ContentComments, ContentInteractionButtons } from '@/components/content';

const PostDetails = () => {
  const { id } = useParams();
  const contentType = 'community_post'; // or 'blog' or 'video'
  
  const {
    likeCount,
    commentCount,
    userHasLiked,
    comments,
    loading,
    submitting,
    toggleLike,
    addComment,
    updateComment,
    deleteComment
  } = useContentInteractions(id, contentType);

  return (
    <div>
      {/* Post content */}
      
      <ContentInteractionButtons
        likeCount={likeCount}
        commentCount={commentCount}
        userHasLiked={userHasLiked}
        onLike={toggleLike}
        onCommentClick={() => scrollToComments()}
      />

      <ContentComments
        comments={comments}
        commentCount={commentCount}
        loading={loading}
        submitting={submitting}
        onAddComment={addComment}
        onUpdateComment={updateComment}
        onDeleteComment={deleteComment}
      />
    </div>
  );
};
```

## Features

### Real-Time Updates
- Automatic subscription to database changes
- Instant updates across all users viewing the same content
- Optimistic UI updates for better UX

### Authentication
- Only logged-in users can like or comment
- Clear error messages for unauthenticated users
- Easy sign-in prompts

### Security
- RLS policies ensure data integrity
- Users can only edit/delete their own comments
- Validation at database level

### Scalability
- Single table design for all interactions
- Indexed queries for performance
- Clean separation of concerns

## Migration from Old System

### Removed Components
- ❌ `UniversalLikeButton`
- ❌ `UniversalInteractionButtons`
- ❌ `UniversalComments`
- ❌ `useUniversalInteractions`
- ❌ `usePostInteractions`

### Replaced With
- ✅ `ContentLikeButton`
- ✅ `ContentInteractionButtons`
- ✅ `ContentComments`
- ✅ `useContentInteractions`

### Old Tables (Deprecated)
- `blog_likes`
- `blog_comments`
- `post_likes`
- `post_comments`
- `comment_likes`

### New Table
- `content_interactions` (unified for all)

## Best Practices

1. **Always use the hook at the top level of your component**
```tsx
const { likeCount, toggleLike } = useContentInteractions(id, type);
```

2. **Pass callbacks properly**
```tsx
onLike={toggleLike}  // ✅ Correct
onLike={() => toggleLike()}  // ✅ Also correct
onLike={toggleLike()} // ❌ Wrong - executes immediately
```

3. **Handle loading states**
```tsx
{loading ? <Skeleton /> : <ContentComments {...props} />}
```

4. **Use proper content types**
```tsx
const contentType = post.post_type === 'blog' ? 'blog' : 
                    post.post_type === 'video' ? 'video' : 
                    'community_post';
```

## Troubleshooting

### Likes not updating?
- Check if user is authenticated
- Verify RLS policies are enabled
- Check browser console for errors

### Comments not showing?
- Ensure real-time subscriptions are active
- Check if content_id and content_type match
- Verify user has SELECT permission

### Duplicate likes?
- Database constraint prevents this
- Check for race conditions in your code
- Use the `userHasLiked` flag to disable button

## Performance Considerations

- Real-time subscriptions are automatically cleaned up
- Comments are paginated (can add later if needed)
- Indexes on content_id and user_id for fast queries
- Triggers update counters efficiently

## Future Enhancements

- [ ] Comment pagination for popular posts
- [ ] Comment threading (replies to comments)
- [ ] Reaction types (love, laugh, wow, etc.)
- [ ] Share tracking and analytics
- [ ] Mention system (@username)
- [ ] Rich text formatting in comments
