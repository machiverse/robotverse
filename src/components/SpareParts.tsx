import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Plus, Package } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, type Currency } from "@/utils/currency";
import { SPARE_PARTS_CATEGORIES, getMainCategories, getSubCategories } from "@/constants/sparePartsCategories";

interface SparePartFormData {
  name: string;
  part_number: string;
  compatible_robots: string[];
  quantity: number;
  price: number | null;
  currency: Currency;
  description: string;
  location: string;
  specifications: Record<string, any>;
  category_tags: string[];
  main_category: string;
  sub_category: string;
  custom_category: string;
}

const MAX_IMAGES = 10;

const SpareParts = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
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
    main_category: '',
    sub_category: '',
    custom_category: '',
  });

  // Update form fields
  const handleInputChange = (field: keyof SparePartFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Trigger hidden file input click
  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Handle selected files from input or drag/drop
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);

    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    setImages((prev) => [...prev, ...files]);
  };

  // Remove an image by index
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Add a new category tag
  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.category_tags.includes(tag)) {
      handleInputChange('category_tags', [...formData.category_tags, tag]);
      setNewTag('');
    }
  };

  // Remove a category tag
  const removeTag = (tagToRemove: string) => {
    handleInputChange(
      'category_tags',
      formData.category_tags.filter((tag) => tag !== tagToRemove)
    );
  };

  // Add a new compatible robot model
  const addCompatibleRobot = () => {
    const robot = newRobot.trim();
    if (robot && !formData.compatible_robots.includes(robot)) {
      handleInputChange('compatible_robots', [...formData.compatible_robots, robot]);
      setNewRobot('');
    }
  };

  // Remove a compatible robot model
  const removeCompatibleRobot = (robotToRemove: string) => {
    handleInputChange(
      'compatible_robots',
      formData.compatible_robots.filter((robot) => robot !== robotToRemove)
    );
  };

  // Upload images to Supabase Storage and return public URLs
  const uploadImagesToSupabase = async (): Promise<string[]> => {
    if (!user) throw new Error("User not authenticated");
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];

    await Promise.all(
      images.map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `spare-parts/${user.id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("robot-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("robot-images").getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      })
    );

    return uploadedUrls;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to upload spare parts");
      return;
    }

    if (images.length < 1) {
      toast.error("Minimum 1 image required");
      return;
    }

    setLoading(true);

    try {
      const imageUrls = await uploadImagesToSupabase();

      const { error } = await supabase
        .from("spare_parts")
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
          main_category: formData.main_category,
          sub_category: formData.sub_category,
          custom_category: formData.custom_category,
          images: imageUrls,
        });

      if (error) throw error;

      toast.success("Spare part listing created successfully!");

      // Reset form and images after successful submission
      setFormData({
        name: "",
        part_number: "",
        compatible_robots: [],
        quantity: 1,
        price: null,
        currency: "INR",
        description: "",
        location: "",
        specifications: {},
        category_tags: [],
        main_category: "",
        sub_category: "",
        custom_category: "",
      });
      setImages([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error("Error creating spare part listing:", error);
      toast.error("Failed to create spare part listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Upload Spare Parts & Accessories Listing
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label>Part Images (1 - {MAX_IMAGES} required)</Label>

            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer relative"
              onClick={triggerFileSelect}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dt = e.dataTransfer;
                if (!dt) return;
                const droppedFiles = Array.from(dt.files);
                if (images.length + droppedFiles.length > MAX_IMAGES) {
                  toast.error(`Maximum ${MAX_IMAGES} images allowed`);
                  return;
                }
                setImages((prev) => [...prev, ...droppedFiles]);
              }}
              aria-label="Upload part images by clicking or drag and drop"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") triggerFileSelect();
              }}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-primary hover:text-primary-glow font-semibold">
                Click to upload images
              </p>
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
                disabled={loading}
              />
            </div>

            {/* Preview Selected Images */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((file, idx) => {
                  const objectUrl = URL.createObjectURL(file);
                  return (
                    <div
                      key={idx}
                      className="relative group rounded-lg overflow-hidden border border-gray-300"
                    >
                      <img
                        src={objectUrl}
                        alt={`Image preview ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                        onLoad={() => URL.revokeObjectURL(objectUrl)}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(idx)}
                        aria-label={`Remove image ${idx + 1}`}
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Part Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
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
                onChange={(e) => handleInputChange("part_number", e.target.value)}
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
                onChange={(e) =>
                  handleInputChange("quantity", Number(e.target.value) || 1)
                }
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="Enter location"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <div className="flex gap-2">
              <Select 
                value={formData.currency} 
                onValueChange={(value) => handleInputChange('currency', value as Currency)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="price"
                type="number"
                min={0}
                value={formData.price ?? ""}
                onChange={(e) =>
                  handleInputChange("price", parseFloat(e.target.value) || null)
                }
                placeholder="Enter price (optional)"
                className="flex-1"
                disabled={loading}
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
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addCompatibleRobot())
                }
                disabled={loading}
              />
              <Button
                type="button"
                onClick={addCompatibleRobot}
                size="sm"
                disabled={loading}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.compatible_robots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.compatible_robots.map((robot, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
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
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                disabled={loading}
              />
              <Button type="button" onClick={addTag} size="sm" disabled={loading}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.category_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.category_tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
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

          {/* Main Category */}
          <div className="space-y-2">
            <Label htmlFor="main_category">Main Category *</Label>
            <Select
              value={formData.main_category}
              onValueChange={(value) => {
                handleInputChange("main_category", value);
                handleInputChange("sub_category", "");
                handleInputChange("custom_category", "");
              }}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select main category" />
              </SelectTrigger>
              <SelectContent>
                {getMainCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub Category */}
          {formData.main_category && formData.main_category !== "Other" && (
            <div className="space-y-2">
              <Label htmlFor="sub_category">Sub Category *</Label>
              <Select
                value={formData.sub_category}
                onValueChange={(value) => handleInputChange("sub_category", value)}
                disabled={loading || !formData.main_category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub category" />
                </SelectTrigger>
                <SelectContent>
                  {getSubCategories(formData.main_category).map((subCategory) => (
                    <SelectItem key={subCategory} value={subCategory}>
                      {subCategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Category (shown when "Other" is selected) */}
          {formData.main_category === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="custom_category">Specify Category *</Label>
              <Input
                id="custom_category"
                value={formData.custom_category}
                onChange={(e) => handleInputChange("custom_category", e.target.value)}
                placeholder="Enter your custom part or accessory name"
                required
                disabled={loading}
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the spare part, its condition, compatibility, etc."
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <div className="flex items-center space-x-2 justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                <span>Creating Listing...</span>
              </div>
            ) : (
              "Create Spare Parts & Accessories Listing"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SpareParts;
