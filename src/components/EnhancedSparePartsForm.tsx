import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  X, 
  Plus, 
  Package, 
  FileSpreadsheet, 
  Link as LinkIcon,
  MapPin,
  DollarSign,
  Truck,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SparePartFormData {
  name: string;
  part_number: string;
  brand: string;
  model: string;
  condition: string;
  price: number | null;
  currency: string;
  location: string;
  state: string;
  pincode: string;
  quantity: number;
  description: string;
  compatible_robots: string[];
  category_tags: string[];
  specifications: Record<string, any>;
  is_international: boolean;
  duty_amount: number;
  shipping_amount: number;
}

const conditionOptions = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'refurbished', label: 'Refurbished' }
];

const MAX_IMAGES = 10;

const EnhancedSparePartsForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("single");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newRobot, setNewRobot] = useState('');
  const [urlInput, setUrlInput] = useState('');

  const [formData, setFormData] = useState<SparePartFormData>({
    name: '',
    part_number: '',
    brand: '',
    model: '',
    condition: 'new',
    price: null,
    currency: 'INR',
    location: '',
    state: '',
    pincode: '',
    quantity: 1,
    description: '',
    compatible_robots: [],
    category_tags: [],
    specifications: {},
    is_international: false,
    duty_amount: 0,
    shipping_amount: 0,
  });

  // Handle form field updates
  const handleInputChange = (field: keyof SparePartFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > MAX_IMAGES) {
      toast({
        variant: "destructive",
        title: "Too many images",
        description: `Maximum ${MAX_IMAGES} images allowed`
      });
      return;
    }
    setImages((prev) => [...prev, ...files]);
  };

  // Handle URL input
  const addImageFromUrl = () => {
    if (urlInput && !imageUrls.includes(urlInput)) {
      if (images.length + imageUrls.length >= MAX_IMAGES) {
        toast({
          variant: "destructive",
          title: "Too many images",
          description: `Maximum ${MAX_IMAGES} images allowed`
        });
        return;
      }
      setImageUrls(prev => [...prev, urlInput]);
      setUrlInput('');
    }
  };

  // Remove image
  const removeImage = (index: number, type: 'file' | 'url') => {
    if (type === 'file') {
      setImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setImageUrls((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Add tag
  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.category_tags.includes(tag)) {
      handleInputChange('category_tags', [...formData.category_tags, tag]);
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    handleInputChange(
      'category_tags',
      formData.category_tags.filter((tag) => tag !== tagToRemove)
    );
  };

  // Add compatible robot
  const addCompatibleRobot = () => {
    const robot = newRobot.trim();
    if (robot && !formData.compatible_robots.includes(robot)) {
      handleInputChange('compatible_robots', [...formData.compatible_robots, robot]);
      setNewRobot('');
    }
  };

  // Remove compatible robot
  const removeCompatibleRobot = (robotToRemove: string) => {
    handleInputChange(
      'compatible_robots',
      formData.compatible_robots.filter((robot) => robot !== robotToRemove)
    );
  };

  // Upload images to Supabase
  const uploadImagesToSupabase = async (): Promise<string[]> => {
    if (!user) throw new Error("User not authenticated");
    
    const uploadedUrls: string[] = [...imageUrls];

    if (images.length > 0) {
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
    }

    return uploadedUrls;
  };

  // Handle single part submission
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to upload spare parts"
      });
      return;
    }

    if (images.length === 0 && imageUrls.length === 0) {
      toast({
        variant: "destructive",
        title: "Images required",
        description: "Please add at least one image"
      });
      return;
    }

    setLoading(true);

    try {
      const finalImageUrls = await uploadImagesToSupabase();

      const { error } = await supabase
        .from("spare_parts")
        .insert({
          seller_id: user.id,
          name: formData.name,
          part_number: formData.part_number,
          brand: formData.brand,
          model: formData.model,
          condition: formData.condition,
          price: formData.price,
          currency: formData.currency,
          location: formData.location,
          state: formData.state,
          pincode: formData.pincode,
          quantity: formData.quantity,
          description: formData.description,
          compatible_robots: formData.compatible_robots,
          category_tags: formData.category_tags,
          specifications: formData.specifications,
          is_international: formData.is_international,
          duty_amount: formData.duty_amount,
          shipping_amount: formData.shipping_amount,
          images: finalImageUrls,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Spare part listing created successfully!"
      });

      // Reset form
      setFormData({
        name: '',
        part_number: '',
        brand: '',
        model: '',
        condition: 'new',
        price: null,
        currency: 'INR',
        location: '',
        state: '',
        pincode: '',
        quantity: 1,
        description: '',
        compatible_robots: [],
        category_tags: [],
        specifications: {},
        is_international: false,
        duty_amount: 0,
        shipping_amount: 0,
      });
      setImages([]);
      setImageUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error("Error creating spare part listing:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create spare part listing"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file"
      });
      return;
    }

    toast({
      title: "CSV Upload",
      description: "CSV bulk upload feature will be implemented in the next update!"
    });
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-6 h-6" />
          Spare Parts Management
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Single Part Upload
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Bulk CSV Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6 mt-6">
            <form onSubmit={handleSingleSubmit} className="space-y-6">
              {/* Image Upload Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Product Images</Label>
                
                {/* Drag & Drop Area */}
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dt = e.dataTransfer;
                    if (!dt) return;
                    const droppedFiles = Array.from(dt.files);
                    if (images.length + droppedFiles.length > MAX_IMAGES) {
                      toast({
                        variant: "destructive",
                        title: "Too many images",
                        description: `Maximum ${MAX_IMAGES} images allowed`
                      });
                      return;
                    }
                    setImages((prev) => [...prev, ...droppedFiles]);
                  }}
                >
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-primary font-semibold">Click to upload images</p>
                  <p className="text-muted-foreground">or drag and drop here</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    PNG, JPG, WEBP up to 10MB each (Max {MAX_IMAGES} images)
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

                {/* URL Input */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Or paste image URL"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <Button type="button" onClick={addImageFromUrl} disabled={loading}>
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>

                {/* Image Previews */}
                {(images.length > 0 || imageUrls.length > 0) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {images.map((file, idx) => {
                      const objectUrl = URL.createObjectURL(file);
                      return (
                        <div key={`file-${idx}`} className="relative group rounded-lg overflow-hidden border">
                          <img
                            src={objectUrl}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-20 object-cover"
                            onLoad={() => URL.revokeObjectURL(objectUrl)}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(idx, 'file')}
                            disabled={loading}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                    {imageUrls.map((url, idx) => (
                      <div key={`url-${idx}`} className="relative group rounded-lg overflow-hidden border">
                        <img
                          src={url}
                          alt={`URL Preview ${idx + 1}`}
                          className="w-full h-20 object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(idx, 'url')}
                          disabled={loading}
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

                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange("brand", e.target.value)}
                    placeholder="Enter brand name"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    placeholder="Enter model"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => handleInputChange("condition", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => handleInputChange("quantity", Number(e.target.value) || 1)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <Label className="text-base font-semibold">Location Details</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="City, Area"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      placeholder="State/Province"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pin Code</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => handleInputChange("pincode", e.target.value)}
                      placeholder="Pin/Zip code"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  <Label className="text-base font-semibold">Pricing Information</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.price ?? ""}
                      onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || null)}
                      placeholder="Enter price"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>International Shipping</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="international"
                        checked={formData.is_international}
                        onCheckedChange={(checked) => handleInputChange("is_international", checked)}
                      />
                      <Label htmlFor="international">Available for international shipping</Label>
                    </div>
                  </div>
                </div>

                {/* International shipping costs */}
                {formData.is_international && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="duty_amount">Duty Amount (₹)</Label>
                      <Input
                        id="duty_amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={formData.duty_amount}
                        onChange={(e) => handleInputChange("duty_amount", parseFloat(e.target.value) || 0)}
                        placeholder="Customs duty"
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shipping_amount">International Shipping (₹)</Label>
                      <Input
                        id="shipping_amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={formData.shipping_amount}
                        onChange={(e) => handleInputChange("shipping_amount", parseFloat(e.target.value) || 0)}
                        placeholder="Shipping cost"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Compatible Robots */}
              <div className="space-y-2">
                <Label>Compatible Robot Models</Label>
                <div className="flex gap-2">
                  <Input
                    value={newRobot}
                    onChange={(e) => setNewRobot(e.target.value)}
                    placeholder="Add compatible robot model"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCompatibleRobot())}
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
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
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
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe the spare part, its condition, compatibility, specifications, etc."
                  rows={4}
                  disabled={loading}
                />
              </div>

              {/* Submit Button */}
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <div className="flex items-center space-x-2 justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                    <span>Creating Listing...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Spare Part Listing
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6 mt-6">
            <div className="text-center py-12">
              <FileSpreadsheet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Bulk CSV Upload</h3>
              <p className="text-muted-foreground mb-6">Upload multiple spare parts at once using CSV or Excel files</p>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    ref={csvFileRef}
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => csvFileRef.current?.click()}
                    size="lg"
                    className="mb-4"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload CSV/Excel File
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: .csv, .xlsx, .xls
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
                  <p className="text-sm text-muted-foreground">
                    Your CSV should include columns: name, part_number, brand, model, condition, price, quantity, location, state, pincode, description
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedSparePartsForm;