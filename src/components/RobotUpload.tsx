import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Upload,
  X,
  Plus,
  Package,
  Bot,
  Camera,
  Link,
  AlertCircle,
  CheckCircle,
  Star,
  DollarSign,
  Settings,
  FileText,
  Target,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

interface RobotFormData {
  name: string;
  model: string | null;
  robot_type: string;
  quantity: number;
  location: string | null;
  price: number | null;
  currency: string;
  description: string | null;
  technical_specifications: Record<string, any>;
  category_tags: string[];
  images: string[];
  condition?: string;           // extra, ignored for now since not in your db
  year_manufactured?: number;   // extra, ignored for now
  payload_capacity?: number | null;  // extra, ignored for now
  reach?: number | null;        // extra, ignored for now
  repeatability?: number | null;// extra, ignored 
  power_consumption?: number | null; // extra, ignored 
  operating_environment?: string;  // extra, ignored 
  warranty_info?: string;      // extra, ignored
  certification_standards?: string[]; // extra, ignored
  applications?: string[];     // extra, ignored
  included_accessories?: string[]; // extra, ignored
  training_included?: boolean; // extra, ignored
  installation_service?: boolean;// extra, ignored
  maintenance_contract?: boolean;// extra, ignored
  financing_available?: boolean; // extra, ignored
}

interface RobotUploadProps {
  onSuccess?: () => void;
  editMode?: boolean;
  robotData?: any;
}

const RobotUpload = ({ onSuccess, editMode = false, robotData }: RobotUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(['']); // For manual URLs
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [validatingImages, setValidatingImages] = useState(false);

  const [formCompletion, setFormCompletion] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<RobotFormData>(() => {
    if (editMode && robotData) {
      return {
        name: robotData.name || '',
        model: robotData.model || null,
        robot_type: robotData.robot_type || '',
        quantity: robotData.quantity || 1,
        location: robotData.location || null,
        price: robotData.price ?? null,
        currency: robotData.currency || 'INR',
        description: robotData.description || null,
        technical_specifications: robotData.technical_specifications || {},
        category_tags: robotData.category_tags || [],
        images: robotData.images || [],
      };
    }
    return {
      name: '',
      model: null,
      robot_type: '',
      quantity: 1,
      location: null,
      price: null,
      currency: 'INR',
      description: null,
      technical_specifications: {},
      category_tags: [],
      images: [],
    };
  });

  const robotTypes = [
    "Industrial Robot",
    "Collaborative Robot (Cobot)",
    "Articulated Robot",
    "SCARA Robot",
    "Delta Robot",
    "Cartesian Robot",
    "Cylindrical Robot",
    "Spherical Robot",
    "Humanoid Robot",
    "Mobile Robot",
    "AGV (Automated Guided Vehicle)",
    "Welding Robot",
    "Painting Robot",
    "Assembly Robot",
    "Pick and Place Robot",
    "Packaging Robot",
    "Palletizing Robot",
    "Service Robot",
    "Other"
  ];

  useEffect(() => {
    calculateFormCompletion();
  }, [formData, images, imageUrls]);

  function calculateFormCompletion() {
    // Simplified: required fields are name, robot_type, description, price, and at least one image or URL
    let completed = 0;
    const requiredFields = ['name', 'robot_type', 'description', 'price'];

    requiredFields.forEach(field => {
      const val = formData[field as keyof RobotFormData];
      if (val !== null && val !== undefined && val !== '') completed++;
    });

    // images presence
    const hasImage = images.length > 0 || imageUrls.some(url => url.trim() !== '');
    if (hasImage) completed++;

    const total = requiredFields.length + 1; // +1 for images
    const percent = Math.round((completed / total) * 100);

    setFormCompletion(percent);
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Robot name is required";
    if (!formData.robot_type) newErrors.robot_type = "Robot type is required";
    if (!formData.description || formData.description.length < 20) newErrors.description = "Description must be at least 20 characters";
    if (!formData.price || Number.isNaN(formData.price)) newErrors.price = "Valid price is required";

    const hasImage = images.length > 0 || imageUrls.some(url => url.trim() !== '');
    if (!hasImage) newErrors.images = "At least one image or image URL is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleInputChange(field: keyof RobotFormData, value: any) {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }

  // Upload local files to Supabase Storage
  async function uploadImages(): Promise<string[]> {
    const uploadedUrls = [];
    for (const file of images) {
      const ext = file.name.split('.').pop();
      const fileName = `robots/${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("robot-images")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("robot-images")
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please login to create or edit a robot listing"
      });
      return;
    }
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please fix form errors before submitting."
      });
      return;
    }

    setLoading(true);
    try {
      const uploadedImageUrls = images.length > 0 ? await uploadImages() : [];
      const validImageUrls = imageUrls.filter(url => url.startsWith('http') && url.trim() !== '');
      const allImageUrls = [...uploadedImageUrls, ...validImageUrls];

      const dataToSave = {
        seller_id: user.id,
        name: formData.name,
        model: formData.model,
        robot_type: formData.robot_type,
        quantity: formData.quantity,
        location: formData.location,
        availability: 'available',
        price: formData.price,
        currency: formData.currency,
        description: formData.description,
        technical_specifications: formData.technical_specifications || {},
        category_tags: formData.category_tags,
        images: allImageUrls,
        updated_at: new Date().toISOString(),
      };

      if (editMode && robotData) {
        const { error } = await supabase
          .from('robots')
          .update(dataToSave)
          .eq('id', robotData.id);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Robot listing updated successfully!"
        });
      } else {
        dataToSave['created_at'] = new Date().toISOString();
        const { error } = await supabase
          .from('robots')
          .insert(dataToSave);
        if (error) throw error;

        toast({
          title: "Success!",
          description: "Robot listing created successfully!"
        });
      }

      // Reset form
      setFormData({
        name: '',
        model: null,
        robot_type: '',
        quantity: 1,
        location: null,
        price: null,
        currency: 'INR',
        description: null,
        technical_specifications: {},
        category_tags: [],
        images: [],
      });
      setImages([]);
      setImageUrls(['']);
      setImagePreviewUrls([]);
      setErrors({});

      if (onSuccess) onSuccess();

    } catch (error: any) {
      console.error("Error saving robot", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save robot listing."
      });
    } finally {
      setLoading(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (images.length + files.length > 10) {
      toast({
        variant: "destructive",
        title: "Too many images",
        description: "You can upload a maximum of 10 images."
      });
      return;
    }
    setImages(prev => [...prev, ...files]);

    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setImagePreviewUrls(prev => [...prev, url]);
    });
  }

  function removeImage(index: number, fromUploads: boolean = true) {
    if (fromUploads) {
      setImages(prev => prev.filter((_, i) => i !== index));
      setImagePreviewUrls(prev => {
        if(prev[index]) URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
    } else {
      setImageUrls(prev => prev.filter((_, i) => i !== index));
    }
  }

  function handleImageUrlChange(index: number, url: string) {
    const newUrls = [...imageUrls];
    newUrls[index] = url;
    setImageUrls(newUrls);
  }

  function addImageUrlField() {
    if (imageUrls.length < 10) {
      setImageUrls(prev => [...prev, '']);
    }
  }

  // Add handlers for category tags if needed (omitted here for brevity)

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <Bot className="w-6 h-6 text-blue-600" />
                {editMode ? "Edit Robot Listing" : "Create Professional Robot Listing"}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {editMode 
                  ? "Update your robot listing details" 
                  : "Add your robot to the marketplace and reach thousands of buyers"}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${formCompletion >= 80 ? 'text-green-600' : formCompletion >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {formCompletion}%
              </div>
              <Progress value={formCompletion} className="w-24 mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Complete</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {formCompletion < 70 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-yellow-700">
            <strong>Boost your listing visibility!</strong><br />
            Complete more details to improve your listing's searchability and attract more buyers.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Upload Images (Max 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <Label htmlFor="image-upload" className="cursor-pointer text-primary hover:text-primary/80 font-medium">
                Click or drag and drop to upload images
              </Label>
              <Input
                id="image-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            {errors.images && <p className="text-red-500 text-sm mt-2">{errors.images}</p>}

            {/* Preview of uploaded images */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {imagePreviewUrls.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt={`Robot upload preview ${i + 1}`} className="w-full h-24 object-cover rounded-md border" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1"
                    onClick={() => removeImage(i, true)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Image URLs manual input */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Label>Add image URLs (Optional)</Label>
                <Button type="button" size="sm" variant="outline" onClick={addImageUrlField} disabled={imageUrls.length >= 10}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {imageUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={url}
                    onChange={e => handleImageUrlChange(i, e.target.value)}
                  />
                  {url && url.startsWith("http") && (
                    <Button type="button" variant="outline" size="sm" onClick={() => window.open(url, "_blank")}>
                      <Link className="w-4 h-4" />
                    </Button>
                  )}
                  {imageUrls.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => removeImage(i, false)}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Basic Robot Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Robot Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => handleInputChange("name", e.target.value)}
                  className={errors.name ? "border-red-500" : ""}
                  required
                />
                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model || ''}
                  onChange={e => handleInputChange("model", e.target.value || null)}
                />
              </div>

              <div>
                <Label htmlFor="robot_type">Robot Type *</Label>
                <Select
                  value={formData.robot_type}
                  onValueChange={value => handleInputChange("robot_type", value)}
                >
                  <SelectTrigger className={errors.robot_type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select robot type" />
                  </SelectTrigger>
                  <SelectContent>
                    {robotTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.robot_type && <p className="text-red-500 text-sm">{errors.robot_type}</p>}
              </div>

              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={e => handleInputChange("quantity", parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={e => handleInputChange("location", e.target.value || null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Description *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={e => handleInputChange("description", e.target.value)}
              placeholder="Provide a detailed description..."
              rows={6}
              className={errors.description ? "border-red-500" : ""}
              required
            />
            {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing & Currency *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                id="price"
                type="number"
                min={0}
                value={formData.price || ''}
                onChange={e => handleInputChange("price", parseFloat(e.target.value) || null)}
                className={errors.price ? "border-red-500" : ""}
                placeholder="Price"
                required
              />
              <Select value={formData.currency} onValueChange={value => handleInputChange("currency", value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
          </CardContent>
        </Card>

        {/* Category Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Categories / Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Simple input & add/remove for tags (implement similarly to images if desired) */}
            <div className="flex gap-2">
              {/* You can implement tag input here */}
              {formData.category_tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-0 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => {
                      handleInputChange(
                        "category_tags",
                        formData.category_tags.filter(t => t !== tag)
                      );
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Input
              type="text"
              placeholder="Add new tag and press Enter"
              onKeyDown={e => {
                if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
                  e.preventDefault();
                  if (!formData.category_tags.includes(e.currentTarget.value.trim())) {
                    handleInputChange("category_tags", [...formData.category_tags, e.currentTarget.value.trim()]);
                    e.currentTarget.value = "";
                  }
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Card>
          <CardContent className="p-6 flex justify-end">
            <Button 
              type="submit" 
              disabled={loading || formCompletion < 40}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>{editMode ? "Updating..." : "Creating..."}</span>
                </span>
              ) : (
                <span>{editMode ? "Update Robot Listing" : "Create Robot Listing"}</span>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default RobotUpload;
