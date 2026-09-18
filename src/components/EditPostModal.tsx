import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, 
  X, 
  BookOpen, 
  Video, 
  FileText, 
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CalendarClock
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import PostMediaManager from "@/components/post/PostMediaManager";
import { PostMediaItem, kindForUrl, normalizePostMedia, splitPostMedia } from "@/components/post/postMedia";
import RichTextEditor from "@/components/RichTextEditor";

interface CommunityPost {
  id: string;
  post_type: 'blog' | 'video' | 'short_post' | 'media';
  title?: string;
  content?: string;
  excerpt?: string;
  media_url?: string;
  media_type?: string;
  video_duration?: number;
  tags: string[];
  created_at: string;
  author_id: string;
  edited_at?: string;
  edit_history?: any[];
  video_thumbnail?: string;
}

interface EditPostModalProps {
  post: CommunityPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated?: () => void;
}

const EditPostModal = ({ post, open, onOpenChange, onPostUpdated }: EditPostModalProps) => {
  const { user } = useAuth();

  const [postType, setPostType] = useState<'blog' | 'video' | 'short_post' | 'media'>(post.post_type);
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || '');
  const [tags, setTags] = useState<string[]>(post.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [mediaItems, setMediaItems] = useState<PostMediaItem[]>(
    normalizePostMedia((post as any).media_items, post.media_url, post.media_type)
  );
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>('');

  const postTypes = [
    { value: 'short_post', label: 'Short Post', icon: FileText, description: 'Quick thoughts and updates' },
    { value: 'blog', label: 'Blog Article', icon: BookOpen, description: 'In-depth articles and tutorials' },
    { value: 'video', label: 'Video', icon: Video, description: 'Video content and demonstrations' },
    { value: 'media', label: 'Media', icon: ImageIcon, description: 'Images and visual content' },
  ];


  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setPostType(post.post_type);
      setTitle(post.title || '');
      setContent(post.content || '');
      setTags(post.tags || []);
      setMediaItems(normalizePostMedia((post as any).media_items, post.media_url, post.media_type));
      setMediaUrl('');
      const sp = (post as any).scheduled_publish_at;
      if (sp) {
        const d = new Date(sp);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduledAt(local);
      } else {
        setScheduledAt('');
      }
    }
  }, [open, post]);

  const addTagsFromText = (raw: string) => {
    const parts = raw
      .split(/[,\n]/)
      .map((t) => t.replace(/^#+/, "").trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setTags((prev) => {
      const merged = [...prev];
      for (const p of parts) if (!merged.includes(p)) merged.push(p);
      return merged;
    });
    setTagInput('');
  };

  const handleAddTag = () => addTagsFromText(tagInput);

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };


  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!user || post.author_id !== user.id) {
      errors.push('You can only edit your own posts');
      return errors;
    }

    if ((postType === 'blog' || postType === 'video') && !title.trim()) {
      errors.push('Title is required for blog articles and videos');
    }

    if (!content.trim() && mediaItems.length === 0 && !mediaUrl) {
      errors.push('Please add some content, upload a file, or provide a media URL');
    }

    if (content.length > 500000) {
      errors.push('Content is too long (maximum 5,00,000 characters)');
    }

    if (title && title.length > 200) {
      errors.push('Title is too long (maximum 200 characters)');
    }

    return errors;
  };

  const handleSubmit = async (mode: 'draft' | 'publish' | 'schedule' | 'save' = 'publish') => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    let scheduleIso: string | null = null;
    if (mode === 'schedule') {
      if (!scheduledAt) {
        toast.error('Please pick a date and time to schedule the post');
        return;
      }
      const dt = new Date(scheduledAt);
      if (isNaN(dt.getTime()) || dt.getTime() <= Date.now()) {
        toast.error('Scheduled time must be in the future');
        return;
      }
      scheduleIso = dt.toISOString();
    }


    try {
      setIsSubmitting(true);

      const allMedia: PostMediaItem[] = [...mediaItems];
      if (mediaUrl.trim()) {
        allMedia.push({ url: mediaUrl.trim(), type: kindForUrl(mediaUrl.trim()) });
      }
      const primary = splitPostMedia(allMedia).visuals[0];

      const plain = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const excerpt = plain.length > 200 ? plain.substring(0, 200) + '...' : plain;

      const editHistory = [
        ...(post.edit_history || []),
        {
          edited_at: new Date().toISOString(),
          changes: {
            title: post.title !== title.trim() ? { old: post.title, new: title.trim() } : null,
            content: post.content !== content.trim() ? { old: post.content, new: content.trim() } : null,
            media_url: post.media_url !== (primary?.url || null) ? { old: post.media_url, new: primary?.url || null } : null,
            tags: JSON.stringify(post.tags) !== JSON.stringify(tags) ? { old: post.tags, new: tags } : null,
          },
        },
      ];

      const currentStatus = (post as any).status || 'published';
      const status =
        mode === 'draft' ? 'draft' :
        mode === 'schedule' ? 'scheduled' :
        mode === 'save' ? currentStatus :
        'published';
      const updateData: any = {
        post_type: postType,
        title: title.trim() || null,
        content: content.trim(),
        excerpt: excerpt,
        media_items: allMedia,
        media_url: primary?.url || null,
        media_type: primary?.type || null,
        tags: tags,
        updated_at: new Date().toISOString(),
        edited_at: new Date().toISOString(),
        edit_history: editHistory,
        status,
        is_draft: status === 'draft',
      };
      if (mode === 'schedule') {
        updateData.scheduled_publish_at = scheduleIso;
      } else if (mode === 'save') {
        // keep the existing schedule untouched
        updateData.scheduled_publish_at = (post as any).scheduled_publish_at ?? null;
      } else {
        updateData.scheduled_publish_at = null;
      }
      if (mode === 'publish') {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('community_posts')
        .update(updateData)
        .eq('id', post.id)
        .eq('author_id', user.id);

      if (error) throw error;

      toast.success(
        mode === 'draft' ? 'Draft saved!' :
        mode === 'schedule' ? `Post scheduled for ${new Date(scheduleIso!).toLocaleString()}` :
        mode === 'save' ? 'Changes saved!' :
        'Post published!'
      );

      onOpenChange(false);
      onPostUpdated?.();
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast.error(`Failed to update post: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSchedule = async () => {
    if (!user || post.author_id !== user.id) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('community_posts')
        .update({
          status: 'draft',
          is_draft: true,
          scheduled_publish_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)
        .eq('author_id', user.id);
      if (error) throw error;
      toast.success('Scheduling cancelled — post moved to drafts');
      setScheduledAt('');
      onOpenChange(false);
      onPostUpdated?.();
    } catch (error: any) {
      console.error('Error cancelling schedule:', error);
      toast.error(`Failed to cancel scheduling: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || post.author_id !== user.id) {
    return null;
  }

  const isScheduled = (post as any).status === 'scheduled' && !!(post as any).scheduled_publish_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Post Type Selection */}
          <div className="space-y-3">
            <Label>Post Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {postTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all ${
                      postType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setPostType(type.value as any)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${postType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <h4 className="font-medium">{type.label}</h4>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Title (for blog and video posts) */}
          {(postType === 'blog' || postType === 'video') && (
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title..."
                className="w-full"
              />
            </div>
          )}

          {/* Rich Text Content Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <span className="text-xs text-muted-foreground">
                {content.length.toLocaleString()} / 5,00,000 characters
              </span>
            </div>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your post content..."
              className="min-h-[250px]"
            />
          </div>

          {/* Media Upload/Update */}
          <div className="space-y-4">
            <PostMediaManager items={mediaItems} onChange={setMediaItems} />

            <div className="space-y-2">
              <Label htmlFor="media-url" className="text-sm font-medium text-muted-foreground">
                Or add a media URL
              </Label>
              <Input
                id="media-url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://example.com/image.jpg or video URL"
                className="w-full"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  #{tag}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/[,\n]/.test(v)) {
                    addTagsFromText(v);
                  } else {
                    setTagInput(v);
                  }
                }}
                placeholder="Add tags (comma separated)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Add Tag
              </Button>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            {isScheduled && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                  <CalendarClock className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Scheduled to publish</div>
                    <div className="text-xs opacity-90">
                      {format(new Date((post as any).scheduled_publish_at), "PPP 'at' p")}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelSchedule}
                  disabled={isSubmitting}
                  className="border-amber-500/40"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel Scheduling
                </Button>
              </div>
            )}
            <Label htmlFor="edit-scheduled-at">
              {isScheduled ? 'Reschedule publish time' : 'Schedule for later (optional)'}
            </Label>
            <Input
              id="edit-scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              {isScheduled
                ? 'Pick a new date/time and click Reschedule to update when the post goes live.'
                : 'Pick a future date/time — the post will be published automatically.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save as Draft
            </Button>
            <Button variant="secondary" onClick={() => handleSubmit('save')} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isScheduled ? 'Save (Keep Scheduled)' : 'Save Changes'}
            </Button>
            {scheduledAt && (
              <Button variant="secondary" onClick={() => handleSubmit('schedule')} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isScheduled ? 'Reschedule' : 'Schedule Post'}
              </Button>
            )}

            <Button onClick={() => handleSubmit('publish')} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {(post as any).status === 'draft' || (post as any).is_draft || (post as any).status === 'scheduled' ? 'Publish Now' : 'Update Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPostModal;
