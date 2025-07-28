import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Plus, Package } from "lucide-react";
import { toast } from "sonner";

interface RobotFormData {
  name: string;
  model: string;
  robot_type: string;
  quantity: number;
  location: string;
  price: number | null;
  currency: string;
  description: string;
  technical_specifications: Record<string, any>;
  category_tags: string[];
}

interface RobotUploadProps {
  onSuccess?: () => void;
  editMode?: boolean;
  robotData?: any;
}

const RobotUpload = ({ onSuccess, editMode = false, robotData }: RobotUploadProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const [formData, setFormData] = useState<RobotFormData>(() => {
    if (editMode && robotData) {
      return {
        name: robotData.name || '',
        model: robotData.model || '',
        robot_type: robotData.robot_type || '',
        quantity: robotData.quantity || 1,
        location: robotData.location || '',
        price: robotData.price || null,
        currency: robotData.currency || 'INR',
        description: robotData.description || '',
        technical_specifications: robotData.technical_specifications || {},
        category_tags: robotData.category_tags || [],
      };
    }
    return {
      name: '',
      model: '',
      robot_type: '',
      quantity: 1,
      location: '',
      price: null,
      currency: 'INR',
      description: '',
      technical_specifications: {},
      category_tags: [],
    };
  });

  const robotTypes = [
    'Industrial Robot',
    'Collaborative Robot (Cobot)',
    'Articulated Robot',
    'SCARA Robot',
    'Delta Robot',
    'Cartesian Robot',
    'Cylindrical Robot',
    'Spherical Robot',
    'Humanoid Robot',
    'Mobile Robot',
    'Service Robot',
    'Other'
  ];

  const handleInputChange = (field: keyof RobotFormData, value: any) => {
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

    if (images.length + files.length < 3 && images.length === 0) {
      toast.error('Minimum 3 images required');
    }

    setImages(prev => [...prev, ...files]);
    
    // Create preview URLs
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

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
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
      toast.error('Please sign in to upload robots');
      return;
    }

    if (!editMode && images.length < 3) {
      toast.error('Minimum 3 images required');
      return;
    }

    if (images.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    setLoading(true);

    try {
      // Upload new images if any
      const uploadedImageUrls = images.length > 0 ? await uploadImages() : [];
      
      if (editMode && robotData) {
        // Update existing robot listing
        const updateData: any = {
          name: formData.name,
          model: formData.model,
          robot_type: formData.robot_type,
          quantity: formData.quantity,
          location: formData.location,
          price: formData.price,
          currency: formData.currency,
          description: formData.description,
          technical_specifications: formData.technical_specifications,
          category_tags: formData.category_tags,
        };

        // Only update images if new ones were uploaded
        if (uploadedImageUrls.length > 0) {
          updateData.images = uploadedImageUrls;
        }

        const { error } = await supabase
          .from('robots')
          .update(updateData)
          .eq('id', robotData.id);

        if (error) throw error;
        toast.success('Robot listing updated successfully!');
      } else {
        // Create new robot listing
        const { error } = await supabase
          .from('robots')
          .insert({
            seller_id: user.id,
            name: formData.name,
            model: formData.model,
            robot_type: formData.robot_type,
            quantity: formData.quantity,
            location: formData.location,
            price: formData.price,
            currency: formData.currency,
            description: formData.description,
            technical_specifications: formData.technical_specifications,
            category_tags: formData.category_tags,
            images: uploadedImageUrls,
            availability: 'available'
          });

        if (error) throw error;
        toast.success('Robot listing created successfully!');
      }
      
      // Reset form
      setFormData({
        name: '',
        model: '',
        robot_type: '',
        quantity: 1,
        location: '',
        price: null,
        currency: 'INR',
        description: '',
        technical_specifications: {},
        category_tags: [],
      });
      setImages([]);
      setImageUrls([]);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Error creating robot listing:', error);
      toast.error('Failed to create robot listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {editMode ? 'Edit Robot Listing' : 'Upload Robot Listing'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-4">
            <Label>Robot Images (3-10 required)</Label>
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
                      alt={`Robot ${index + 1}`}
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
              <Label htmlFor="name">Robot Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter robot name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="Enter robot model"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Robot Type *</Label>
              <Select 
                value={formData.robot_type} 
                onValueChange={(value) => handleInputChange('robot_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select robot type" />
                </SelectTrigger>
                <SelectContent>
                  {robotTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Enter location"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <div className="flex gap-2">
                <Select 
                  value={formData.currency} 
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">₹</SelectItem>
                    <SelectItem value="USD">$</SelectItem>
                    <SelectItem value="EUR">€</SelectItem>
                  </SelectContent>
                </Select>
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
              placeholder="Describe your robot, its capabilities, condition, etc."
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
              editMode ? 'Update Robot Listing' : 'Create Robot Listing'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RobotUpload;