# Universal Like & Comment System - Migration Guide

## Overview
This system provides a unified solution for likes, comments, and shares across all content types (blogs, posts, videos) with real-time updates.

## New Components & Hooks

### 1. Core Hook: `useUniversalInteractions`
Located in: `src/hooks/useUniversalInteractions.tsx`

**Usage:**
```typescript
import { useUniversalInteractions } from '@/hooks/useUniversalInteractions';

const { 
  interaction,        // { like_count, comment_count, share_count, user_liked }
  loading,           // boolean
  toggleLike,        // () => Promise<boolean>
  incrementCommentCount,  // () => void
  incrementShareCount,    // () => Promise<boolean>
  refetch            // () => Promise<void>
} = useUniversalInteractions(contentId, 'blog' | 'community_post' | 'video');
```

### 2. Components

#### UniversalLikeButton
Located in: `src/components/universal/UniversalLikeButton.tsx`

```typescript
<UniversalLikeButton
  likeCount={interaction.like_count}
  userLiked={interaction.user_liked}
  onToggleLike={toggleLike}
/>
```

#### UniversalComments
Located in: `src/components/universal/UniversalComments.tsx`

```typescript
<UniversalComments
  contentId={contentId}
  contentType="blog" // or 'community_post' or 'video'
  onCommentCountChange={(count) => console.log('New count:', count)}
/>
```

#### UniversalInteractionButtons
Located in: `src/components/universal/UniversalInteractionButtons.tsx`

```typescript
<UniversalInteractionButtons
  likeCount={interaction.like_count}
  commentCount={interaction.comment_count}
  shareCount={interaction.share_count}
  userLiked={interaction.user_liked}
  onLike={toggleLike}
  onShare={incrementShareCount}
  onCommentClick={() => scrollToComments()}
/>
```

## Migration Steps

### Step 1: Remove Old Components
Delete or stop using:
- `src/hooks/usePostInteractions.tsx` (OLD)
- `src/components/PostInteractionButtons.tsx` (OLD)
- `src/components/BlogComments.tsx` (OLD)
- `src/components/PostComments.tsx` (OLD)
- `src/components/EnhancedPostComments.tsx` (OLD)

### Step 2: Update Your Pages

#### Before (Old System):
```typescript
import { usePostInteractions } from '@/hooks/usePostInteractions';
import PostInteractionButtons from '@/components/PostInteractionButtons';
import BlogComments from '@/components/BlogComments';

const MyPage = () => {
  const { toggleLike, ... } = usePostInteractions();
  
  return (
    <>
      <PostInteractionButtons ... />
      <BlogComments blogId={id} />
    </>
  );
};
```

#### After (New System):
```typescript
import { useUniversalInteractions } from '@/hooks/useUniversalInteractions';
import { UniversalInteractionButtons } from '@/components/universal/UniversalInteractionButtons';
import { UniversalComments } from '@/components/universal/UniversalComments';

const MyPage = () => {
  const { interaction, toggleLike, incrementShareCount } = useUniversalInteractions(
    contentId,
    'blog' // or 'community_post' or 'video'
  );
  
  return (
    <>
      <UniversalInteractionButtons
        likeCount={interaction.like_count}
        commentCount={interaction.comment_count}
        shareCount={interaction.share_count}
        userLiked={interaction.user_liked}
        onLike={toggleLike}
        onShare={incrementShareCount}
        onCommentClick={() => {/* scroll to comments */}}
      />
      
      <UniversalComments
        contentId={contentId}
        contentType="blog"
      />
    </>
  );
};
```

## Key Features

✅ **Real-time Updates** - All users see changes instantly via Supabase subscriptions
✅ **Single Code Path** - One implementation for all content types
✅ **Optimistic Updates** - Immediate UI feedback before server confirmation
✅ **Auth Support** - Works with both logged-in users and session IDs
✅ **Type Safe** - Full TypeScript support
✅ **Clean Architecture** - Separation of concerns with hooks and components

## Content Type Mapping

| Content Type | Likes Table | Comments Table | Content Table |
|-------------|-------------|----------------|---------------|
| `blog` | `blog_likes` | `blog_comments` | `blogs` |
| `community_post` | `post_likes` | `post_comments` | `community_posts` |
| `video` | `post_likes` | `post_comments` | `community_posts` |

## Real-time Features

The system automatically subscribes to:
1. Like changes on the content
2. Comment additions/updates/deletions
3. Content counter updates

All changes are reflected immediately across all connected clients.

## Security

- Comments require authentication (enforced at component level)
- Likes support anonymous users via session IDs
- All database operations respect RLS policies
- User can only delete/edit their own comments

## Testing Checklist

After migration, test:
- [ ] Like button shows correct count
- [ ] Like button toggles correctly
- [ ] Comments appear for logged-in users
- [ ] Comments hidden for anonymous users
- [ ] Real-time updates work (open 2 browsers)
- [ ] Edit/delete own comments works
- [ ] Share counter increments
- [ ] No duplicate likes possible
- [ ] Page loads show existing likes correctly

## Troubleshooting

**Issue:** Counts not updating
- Check Supabase real-time is enabled on tables
- Verify RLS policies allow reading counters

**Issue:** Can't like/comment
- Check user authentication status
- Verify database permissions (RLS policies)

**Issue:** TypeScript errors
- Ensure you're passing the correct `ContentType`
- Check all required props are provided

## Support

For issues or questions, check:
- Component source code for prop interfaces
- Hook implementation for available methods
- Database schema for table structures
