import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Plus, Package } from "lucide-react";
import { toast } from "sonner";

interface SparePartFormData {
  name: string;
  part_number: string;
  compatible_robots: string[];
  quantity: number;
  price: number | null;
  currency: string;
  description: string;
  location: string;
  specifications: Record<string, any>;
  category_tags: string[];
}

const SpareParts = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newRobot, setNewRobot] = useState('');
  
  const [formData, setFormData] = useState<SparePartFormData>({
    name: '',
    part_number: '',
    compatible_robots: [],
    quantity: 1,
    price: null,
    currency: 'INR',
    description: '',
    location: '',
    specifications: {},
    category_tags: [],
  });

  const handleInputChange = (field: keyof SparePartFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    // Removed the minimum 3 images check from here
    setImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setImageUrls(prev => [...prev, url]);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.category_tags.includes(newTag.trim())) {
      handleInputChange('category_tags', [...formData.category_tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('category_tags', formData.category_tags.filter(tag => tag !== tagToRemove));
  };

  const addCompatibleRobot = () => {
    if (newRobot.trim() && !formData.compatible_robots.includes(newRobot.trim())) {
      handleInputChange('compatible_robots', [...formData.compatible_robots, newRobot.trim()]);
      setNewRobot('');
    }
  };

  const removeCompatibleRobot = (robotToRemove: string) => {
    handleInputChange('compatible_robots', formData.compatible_robots.filter(robot => robot !== robotToRemove));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `spare-parts/${user?.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('robot-images')
        .upload(fileName, image);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('robot-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to upload spare parts');
      return;
    }

    // Changed from 3 to 1 minimum image
    if (images.length < 1) {
      toast.error('Minimum 1 image required');
      return;
    }

    setLoading(true);

    try {
      const uploadedImageUrls = await uploadImages();

      const { error } = await supabase
        .from('spare_parts')
        .insert({
          seller_id: user.id,
          name: formData.name,
          part_number: formData.part_number,
          compatible_robots: formData.compatible_robots,
          quantity: formData.quantity,
          price: formData.price,
          currency: formData.currency,
          description: formData.description,
          location: formData.location,
          specifications: formData.specifications,
          category_tags: formData.category_tags,
          images: uploadedImageUrls
        });

      if (error) throw error;

      toast.success('Spare part listing created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        part_number: '',
        compatible_robots: [],
        quantity: 1,
        price: null,
        currency: 'INR',
        description: '',
        location: '',
        specifications: {},
        category_tags: [],
      });
      setImages([]);
      setImageUrls([]);

    } catch (error: any) {
      console.error('Error creating spare part listing:', error);
      toast.error('Failed to create spare part listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Upload Spare Part Listing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-4">
            {/* Changed label from (3-10 required) to (1-10 required) */}
            <Label>Part Images (1-10 required)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6">
              <div className="text-center">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <span className="text-primary hover:text-primary-glow">Click to upload images</span>
                  <span className="text-muted-foreground"> or drag and drop</span>
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  PNG, JPG, WEBP up to 10MB each
                </p>
              </div>
            </div>
            
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Part ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Part Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter part name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="part_number">Part Number</Label>
              <Input
                id="part_number"
                value={formData.part_number}
                onChange={(e) => handleInputChange('part_number', e.target.value)}
                placeholder="Enter part number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Available Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Enter location"
              />
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <div className="flex gap-2">
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || null)}
                placeholder="Enter price (optional)"
                className="flex-1"
              />
            </div>
          </div>

          {/* Compatible Robots */}
          <div className="space-y-2">
            <Label>Compatible Robot Models</Label>
            <div className="flex gap-2">
              <Input
                value={newRobot}
                onChange={(e) => setNewRobot(e.target.value)}
                placeholder="Add compatible robot model"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCompatibleRobot())}
              />
              <Button type="button" onClick={addCompatibleRobot} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.compatible_robots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.compatible_robots.map((robot, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {robot}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeCompatibleRobot(robot)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Category Tags */}
          <div className="space-y-2">
            <Label>Category Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add category tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.category_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.category_tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the spare part, its condition, compatibility, etc."
              rows={4}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                <span>Creating Listing...</span>
              </div>
            ) : (
              'Create Spare Part Listing'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SpareParts;
