import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Save, 
  Send, 
  ArrowLeft, 
  Plus, 
  X,
  Upload,
  BookOpen
} from "lucide-react";
import { Link } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";

interface BlogFormData {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  image_url: string;
}

const BlogEditor = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<BlogFormData>({
    title: "",
    content: "",
    excerpt: "",
    tags: [],
    image_url: "",
  });

  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      fetchBlog();
    }
  }, [isEditing, id]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .eq('author_id', user?.id)
        .single();

      if (error) throw error;

      setFormData({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || "",
        tags: data.tags || [],
        image_url: data.image_url || "",
      });
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Failed to load blog post');
      navigate('/robobook');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BlogFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setImageUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('robot-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('robot-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const generateExcerpt = () => {
    if (formData.content.length <= 150) {
      setFormData(prev => ({ ...prev, excerpt: prev.content }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        excerpt: prev.content.substring(0, 150).trim() + "..." 
      }));
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const blogData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim() || formData.content.substring(0, 150).trim() + "...",
        tags: formData.tags,
        image_url: formData.image_url || null,
        status: 'draft',
        author_id: user?.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('blogs')
          .update(blogData)
          .eq('id', id);

        if (error) throw error;
        toast.success('Draft saved successfully');
      } else {
        const { data, error } = await supabase
          .from('blogs')
          .insert([blogData])
          .select()
          .single();

        if (error) throw error;
        toast.success('Draft saved successfully');
        navigate(`/robobook/${data.id}/edit`);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const publishBlog = async () => {
    if (!validateForm()) return;

    try {
      setPublishing(true);
      const blogData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim() || formData.content.substring(0, 150).trim() + "...",
        tags: formData.tags,
        image_url: formData.image_url || null,
        status: 'published',
        author_id: user?.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('blogs')
          .update(blogData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('blogs')
          .insert([blogData])
          .select()
          .single();

        if (error) throw error;
        navigate(`/robobook/${data.id}`);
        toast.success('Blog published successfully');
        return;
      }

      navigate(`/robobook/${id}`);
      toast.success('Blog published successfully');
    } catch (error) {
      console.error('Error publishing blog:', error);
      toast.error('Failed to publish blog');
    } finally {
      setPublishing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-md mx-auto">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
            <p className="text-muted-foreground mb-6">
              Please sign in to create blog posts.
            </p>
            <Link to="/auth">
              <Button>Sign In to Continue</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link to="/robobook">
                <Button variant="ghost" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to RoboBook
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">
                {isEditing ? 'Edit Article' : 'Create New Article'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={saveDraft}
                disabled={saving || publishing || loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              
              <Button 
                onClick={publishBlog}
                disabled={saving || publishing || loading}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {publishing ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="h-6 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-10 bg-muted rounded animate-pulse" />
                  <div className="h-32 bg-muted rounded animate-pulse" />
                  <div className="h-20 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main Content Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Article Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter your article title..."
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="text-lg"
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="image">Featured Image</Label>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={imageUploading}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload">
                          <Button 
                            variant="outline" 
                            disabled={imageUploading}
                            className="flex items-center gap-2 cursor-pointer"
                            asChild
                          >
                            <span>
                              <Upload className="h-4 w-4" />
                              {imageUploading ? 'Uploading...' : 'Upload Image'}
                            </span>
                          </Button>
                        </label>
                        
                        {formData.image_url && (
                          <Button
                            variant="ghost"
                            onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                            className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      {formData.image_url && (
                        <div className="aspect-video max-w-md overflow-hidden rounded-lg border">
                          <img
                            src={formData.image_url}
                            alt="Featured image preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your article content here..."
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      className="min-h-[400px] resize-y"
                    />
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="excerpt">Excerpt</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateExcerpt}
                        className="text-xs"
                      >
                        Auto-generate
                      </Button>
                    </div>
                    <Textarea
                      id="excerpt"
                      placeholder="Brief description of your article (optional)"
                      value={formData.excerpt}
                      onChange={(e) => handleInputChange('excerpt', e.target.value)}
                      className="min-h-[100px]"
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.excerpt.length}/300 characters
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleAddTag}
                          disabled={!newTag.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                              {tag}
                              <X 
                                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                onClick={() => handleRemoveTag(tag)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BlogEditor;