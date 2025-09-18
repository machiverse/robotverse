import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { 
  PlusCircle, 
  Upload, 
  X, 
  BookOpen, 
  Video, 
  FileText, 
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CreatePostModalProps {
  onPostCreated?: () => void;
}

const CreatePostModal = ({ onPostCreated }: CreatePostModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [postType, setPostType] = useState<'blog' | 'video' | 'short_post' | 'media'>('short_post');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postTypes = [
    { value: 'short_post', label: 'Short Post', icon: FileText, description: 'Quick thoughts and updates' },
    { value: 'blog', label: 'Blog Article', icon: BookOpen, description: 'In-depth articles and tutorials' },
    { value: 'video', label: 'Video', icon: Video, description: 'Video content and demonstrations' },
    { value: 'media', label: 'Media', icon: ImageIcon, description: 'Images and visual content' },
  ];

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFileUpload = async (file: File) => {
    try {
      console.log('Starting file upload:', file.name, file.size, file.type);
      
      // Check file size (limit to 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size must be less than 50MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `community-media/${fileName}`;

      console.log('Uploading to path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('robot-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data } = supabase.storage
        .from('robot-images')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to create posts');
      return;
    }

    if ((postType === 'blog' || postType === 'video') && !title.trim()) {
      toast.error('Title is required for this post type');
      return;
    }

    if (!content.trim() && !mediaFile && !mediaUrl) {
      toast.error('Please add some content to your post');
      return;
    }

    try {
      setIsSubmitting(true);

      let uploadedMediaUrl = mediaUrl;
      let mediaType = '';

      // Upload media file if provided
      if (mediaFile) {
        console.log('Uploading file:', mediaFile.name, mediaFile.type);
        uploadedMediaUrl = await handleFileUpload(mediaFile);
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
        console.log('File uploaded successfully:', uploadedMediaUrl);
      } else if (mediaUrl) {
        // Determine media type from URL
        const isVideo = /\.(mp4|webm|mov|avi)$/i.test(mediaUrl) || mediaUrl.includes('youtube') || mediaUrl.includes('vimeo');
        mediaType = isVideo ? 'video' : 'image';
      }

      // Generate excerpt for longer content
      const excerpt = content.length > 200 ? content.substring(0, 200) + '...' : content;

      const postData = {
        post_type: postType,
        author_id: user.id,
        title: title.trim() || null,
        content: content.trim(),
        excerpt: excerpt,
        media_url: uploadedMediaUrl || null,
        media_type: mediaType || null,
        tags: tags,
        status: 'published',
        published_at: new Date().toISOString()
      };

      console.log('Creating post with data:', postData);

      const { data, error } = await supabase
        .from('community_posts')
        .insert([postData])
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Post created successfully:', data);
      toast.success('Post created successfully!');
      
      // Reset form
      setTitle('');
      setContent('');
      setTags([]);
      setTagInput('');
      setMediaFile(null);
      setMediaUrl('');
      setPostType('short_post');
      setOpen(false);
      
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(`Failed to create post: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Button disabled className="flex items-center gap-2 opacity-50 cursor-not-allowed">
        <PlusCircle className="h-4 w-4" />
        Create Post
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Community Post</DialogTitle>
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

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === 'short_post' 
                  ? "What's on your mind? Share your thoughts with the robotics community..."
                  : postType === 'blog'
                  ? "Write your article content here..."
                  : "Describe your video or media content..."
              }
              className={`w-full resize-none ${
                postType === 'blog' ? 'min-h-[200px]' : 'min-h-[100px]'
              }`}
            />
          </div>

          {/* Enhanced Media Upload */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Media Upload</Label>
            <div className="space-y-4">
              {/* File Upload with Preview */}
              <div className="border-2 border-dashed border-primary/25 rounded-xl p-8 bg-gradient-to-br from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Upload High-Quality Media</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Share images, videos, or documents up to 50MB
                  </p>
                  <Input
                    type="file"
                    accept={postType === 'video' ? 'video/*' : 'image/*,video/*'}
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="media-upload"
                  />
                  <Label htmlFor="media-upload" className="cursor-pointer">
                    <Button variant="default" size="sm" className="rounded-full px-6">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </Label>
                  {mediaFile && (
                    <div className="mt-4 p-3 bg-card border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <p className="text-sm font-medium text-primary">
                          {mediaFile.name} ({(mediaFile.size / 1024 / 1024).toFixed(1)} MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* URL Input */}
              <div className="relative">
                <Label htmlFor="media-url" className="text-sm font-medium text-muted-foreground">
                  Or embed from URL
                </Label>
                <Input
                  id="media-url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="YouTube, Vimeo, or direct media URL"
                  className="mt-2 h-12 text-base"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports YouTube, Vimeo, and direct image/video links
                </p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleAddTag} type="button">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    #{tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTag(tag)}
                      className="h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;