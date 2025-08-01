import React, { useState, useRef } from "react";
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

const MAX_IMAGES = 10;

const SpareParts = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);

  // Files selected but not yet uploaded
  const [images, setImages] = useState<File[]>([]);

  // URLs of uploaded images to store in DB
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

  const [newTag, setNewTag] = useState('');
  const [newRobot, setNewRobot] = useState('');

  // Optional: track upload progress per image or overall here

  const [formData, setFormData] = useState<SparePartFormData>({
    name: '',
    part_number: '',
    compatible_robots: [],
    quantity: 1,
    price: null,
    currency: "INR",
    description: '',
    location: '',
    specifications: {},
    category_tags: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle form field changes
  const handleInputChange = (field: keyof SparePartFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Open file dialog on click
  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Handle files selected from file dialog or drag/drop
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    let files: File[] = [];

    if ("dataTransfer" in event && event.dataTransfer) {
      // Drag and drop
      files = Array.from(event.dataTransfer.files);
    } else if ("target" in event && event.target.files) {
      // File input
      files = Array.from(event.target.files);
    }

    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    setImages(prev => [...prev, ...files]);

    // Revoke old URLs on cleanup? No need here as we're not creating preview URLs for files yet.
  };

  // Remove selected image before upload
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Upload all images in parallel, returning array of public URLs
  const uploadImagesToSupabase = async (): Promise<string[]> => {
    if (!user) throw new Error('User not authenticated');
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];

    // Use Promise.all for parallel uploads
    await Promise.all(images.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `spare-parts/${user.id}/${Date.now()}-${file.name}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('robot-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('robot-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }));

    return uploadedUrls;
  };

  // Submit form handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to upload spare parts');
      return;
    }

    if (images.length < 1) {
      toast.error('Minimum 1 image required');
      return;
    }

    setLoading(true);
    try {
      // Upload images to Supabase Storage
      const urls = await uploadImagesToSupabase();
      setUploadedImageUrls(urls);

      // Insert part data with image URLs
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
          images: urls
        });

      if (error) throw error;

      toast.success('Spare part listing created successfully!');

      // Reset form and images
      setFormData({
        name: '',
        part_number: '',
        compatible_robots: [],
        quantity: 1,
        price: null,
        currency: "INR",
        description: '',
        location: '',
        specifications: {},
        category_tags: [],
      });
      setImages([]);
      setUploadedImageUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = ''; // reset file input

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

          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label>Part Images (1 - 10 required)</Label>

            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer relative"
              onClick={triggerFileSelect}
              onDragOver={e => e.preventDefault()}
              onDrop={handleImageUpload}
              aria-label="Upload part images by clicking or drag and drop"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') triggerFileSelect(); }}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-primary hover:text-primary-glow font-semibold">Click to upload images</p>
              <p className="text-muted-foreground">or drag and drop here</p>
              <p className="text-sm text-muted-foreground mt-2">
                PNG, JPG, WEBP up to 10MB each
              </p>
              <Input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
            </div>

            {/* Preview of selected images before upload */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((file, idx) => {
                  const objectUrl = URL.createObjectURL(file);
                  return (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-300">
                      <img
                        src={objectUrl}
                        alt={`Image preview ${idx + 1}`}
                        className="w-full h-24 object-cover"
                        onLoad={() => URL.revokeObjectURL(objectUrl)} // revoke after load
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(idx)}
                        aria-label={`Remove image ${idx + 1}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other form fields (name, part_number, etc.) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Part Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter part name"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="part_number">Part Number</Label>
              <Input
                id="part_number"
                value={formData.part_number}
                onChange={(e) => handleInputChange('part_number', e.target.value)}
                placeholder="Enter part number"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Available Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', Number(e.target.value) || 1)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Enter location"
                disabled={loading}
              />
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              min={0}
              value={formData.price ?? ''}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || null)}
              placeholder="Enter price (optional)"
              disabled={loading}
            />
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
                disabled={loading}
              />
              <Button type="button" onClick={addCompatibleRobot} size="sm" disabled={loading}>
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
                      disabled={loading}
                      aria-label={`Remove compatible robot ${robot}`}
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
                disabled={loading}
              />
              <Button type="button" onClick={addTag} size="sm" disabled={loading}>
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
                      disabled={loading}
                      aria-label={`Remove category tag ${tag}`}
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
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <div className="flex items-center space-x-2 justify-center">
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
