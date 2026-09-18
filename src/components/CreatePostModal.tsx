import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { 
  PlusCircle, 
  Upload, 
  X, 
  BookOpen, 
  Video, 
  FileText, 
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Bold,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Italic,
  Underline
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import MediaPreview from "@/components/MediaPreview";
import RichTextEditor from "@/components/RichTextEditor";
import { useNavigate } from "react-router-dom";

interface CreatePostModalProps {
  onPostCreated?: () => void;
}

const CreatePostModal = ({ onPostCreated }: CreatePostModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [open, setOpen] = useState(false);
  const [postType, setPostType] = useState<'blog' | 'video' | 'short_post' | 'media'>('short_post');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>('');

  const postTypes = [
    { value: 'short_post', label: 'Short Post', icon: FileText, description: 'Quick thoughts and updates' },
    { value: 'blog', label: 'Blog Article', icon: BookOpen, description: 'In-depth articles and tutorials' },
    { value: 'video', label: 'Video', icon: Video, description: 'Video content and demonstrations' },
    { value: 'media', label: 'Media', icon: ImageIcon, description: 'Images and visual content' },
  ];

  const allowedFileTypes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/mov', 'video/avi'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  // Rich text formatting functions
  const applyFormat = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let newText = '';
    let newContent = '';

    switch (format) {
      case 'bold':
        newText = selectedText ? `**${selectedText}**` : '****';
        break;
      case 'italic':
        newText = selectedText ? `*${selectedText}*` : '**';
        break;
      case 'underline':
        newText = selectedText ? `<u>${selectedText}</u>` : '<u></u>';
        break;
      case 'bullet':
        newText = selectedText ? `\n• ${selectedText}` : '\n• ';
        break;
      case 'align-left':
        newText = selectedText ? `<div style="text-align: left;">${selectedText}</div>` : '<div style="text-align: left;"></div>';
        break;
      case 'align-center':
        newText = selectedText ? `<div style="text-align: center;">${selectedText}</div>` : '<div style="text-align: center;"></div>';
        break;
      case 'align-right':
        newText = selectedText ? `<div style="text-align: right;">${selectedText}</div>` : '<div style="text-align: right;"></div>';
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          newText = selectedText ? `[${selectedText}](${url})` : `[Link Text](${url})`;
        } else {
          return;
        }
        break;
      default:
        return;
    }

    newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);

    // Set cursor position after formatting
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + newText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  };

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

  const validateFile = (file: File): string[] => {
    const errors: string[] = [];
    
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size must be less than 50MB. Current size: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
    }
    
    // Check file type
    const allAllowedTypes = [
      ...allowedFileTypes.image,
      ...allowedFileTypes.video,
      ...allowedFileTypes.document
    ];
    
    if (!allAllowedTypes.includes(file.type)) {
      errors.push(`File type "${file.type}" is not supported. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV, AVI, PDF, DOC, DOCX`);
    }
    
    return errors;
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setMediaFile(null);
      setValidationErrors([]);
      return;
    }
    
    const errors = validateFile(file);
    setValidationErrors(errors);
    
    if (errors.length === 0) {
      setMediaFile(file);
      setMediaUrl(''); // Clear URL if file is selected
    } else {
      setMediaFile(null);
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleFileUpload = async (file: File) => {
    try {
      console.log('Starting file upload:', file.name, file.size, file.type);
      
      // Validate file before upload
      const errors = validateFile(file);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
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

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!user) {
      errors.push('Please sign in to create posts');
      return errors;
    }

    if ((postType === 'blog' || postType === 'video') && !title.trim()) {
      errors.push('Title is required for blog articles and videos');
    }

    if (!content.trim() && !mediaFile && !mediaUrl) {
      errors.push('Please add some content, upload a file, or provide a media URL');
    }

    if (mediaFile && validationErrors.length > 0) {
      errors.push(...validationErrors);
    }

    if (content.length > 500000) {
      errors.push('Content is too long (maximum 5,00,000 characters)');
    }

    if (title && title.length > 200) {
      errors.push('Title is too long (maximum 200 characters)');
    }

    return errors;
  };

  const handleSubmit = async (mode: 'draft' | 'publish' | 'schedule' = 'publish') => {
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
      let uploadedMediaUrl = mediaUrl;
      let mediaType = '';

      if (mediaFile) {
        uploadedMediaUrl = await handleFileUpload(mediaFile);
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      } else if (mediaUrl) {
        const isVideo = /\.(mp4|webm|mov|avi)$/i.test(mediaUrl) || mediaUrl.includes('youtube') || mediaUrl.includes('vimeo');
        mediaType = isVideo ? 'video' : 'image';
      }

      const plain = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const excerpt = plain.length > 200 ? plain.substring(0, 200) + '...' : plain;

      const status = mode === 'draft' ? 'draft' : mode === 'schedule' ? 'scheduled' : 'published';
      const postData: any = {
        post_type: postType,
        author_id: user.id,
        title: title.trim() || null,
        content: content.trim(),
        excerpt: excerpt,
        media_url: uploadedMediaUrl || null,
        media_type: mediaType || null,
        tags: tags,
        status,
        is_draft: mode === 'draft',
        published_at: mode === 'publish' ? new Date().toISOString() : null,
        scheduled_publish_at: mode === 'schedule' ? scheduleIso : null,
      };

      const { error } = await supabase
        .from('community_posts')
        .insert([postData])
        .select();

      if (error) throw error;

      toast.success(
        mode === 'draft' ? 'Draft saved!' :
        mode === 'schedule' ? `Post scheduled for ${new Date(scheduleIso!).toLocaleString()}` :
        'Post published successfully!'
      );

      setTitle('');
      setContent('');
      setTags([]);
      setTagInput('');
      setMediaFile(null);
      setMediaUrl('');
      setPostType('short_post');
      setValidationErrors([]);
      setActiveFormats([]);
      setScheduledAt('');
      setOpen(false);

      onPostCreated?.();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(`Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthRequired = () => {
    navigate('/auth');
  };

  if (!user) {
    return (
      <Button onClick={handleAuthRequired} className="flex items-center gap-2">
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
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New RoboBook Post</DialogTitle>
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
            <div className="text-xs text-muted-foreground">
              Use the toolbar above for formatting: bold, italic, lists, alignment, links, and more
            </div>
          </div>

          {/* Enhanced Media Upload */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Media Upload</Label>
            
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="border border-destructive rounded-lg p-3 bg-destructive/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Upload Issues</span>
                </div>
                <ul className="text-xs text-destructive space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="space-y-4">
              {/* File Upload with Preview */}
              {!mediaFile ? (
                <div className="border-2 border-dashed border-primary/25 rounded-xl p-8 bg-gradient-to-br from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all">
                  <div className="text-center">
                    <div className="bg-primary/5 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">Upload High-Quality Media</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Supported: JPG, PNG, GIF, WebP, MP4, WebM, MOV, AVI, PDF, DOC, DOCX (max 50MB)
                    </p>
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.avi,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {/* Custom file upload button */}
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="rounded-full px-6"
                      onClick={handleFileButtonClick}
                      type="button"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                </div>
              ) : (
                <MediaPreview 
                  file={mediaFile} 
                  onRemove={() => handleFileSelect(null)} 
                />
              )}

              {/* URL Input */}
              {!mediaFile && (
                <div className="relative">
                  <Label htmlFor="media-url" className="text-sm font-medium text-muted-foreground">
                    Or embed from URL
                  </Label>
                  <Input
                    id="media-url"
                    value={mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      if (e.target.value) setValidationErrors([]);
                    }}
                    placeholder="YouTube, Vimeo, or direct media URL"
                    className="mt-2 h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports YouTube, Vimeo, and direct image/video links
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
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

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-at">Schedule for later (optional)</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Pick a future date/time — the post will be published automatically.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save as Draft
            </Button>
            {scheduledAt && (
              <Button
                variant="secondary"
                onClick={() => handleSubmit('schedule')}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Schedule Post
              </Button>
            )}
            <Button
              onClick={() => handleSubmit('publish')}
              disabled={isSubmitting || validateForm().length > 0}
              className="min-w-[120px]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Publishing...' : 'Publish Now'}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
