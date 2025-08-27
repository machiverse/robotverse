import React, { useState, useRef, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  CheckCircle,
  Download,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, type Currency, CURRENCY_SYMBOLS, convertToINR } from "@/utils/currency";
import Papa from 'papaparse';

interface SparePartFormData {
  name: string;
  part_number: string;
  brand: string;
  model: string;
  condition: string;
  price: number | null;
  currency: Currency;
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

interface BulkUploadResult {
  success: number;
  errors: string[];
  total: number;
}

interface CSVRow {
  name: string;
  part_number: string;
  brand: string;
  model: string;
  condition: string;
  price: string;
  quantity: string;
  location: string;
  state: string;
  pincode: string;
  description: string;
  image_urls: string;
  compatible_robots: string;
  category_tags: string;
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

interface EnhancedSparePartsFormProps {
  editingPart?: any;
  onSuccess?: () => void;
}

const EnhancedSparePartsForm = ({ editingPart, onSuccess }: EnhancedSparePartsFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("single");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(() => {
    return editingPart?.images || [];
  });
  const [newTag, setNewTag] = useState('');
  const [newRobot, setNewRobot] = useState('');
  const [urlInput, setUrlInput] = useState('');
  
  // Bulk upload states
  const [bulkLoading, setBulkLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<SparePartFormData>(() => {
    if (editingPart) {
      return {
        name: editingPart.name || '',
        part_number: editingPart.part_number || '',
        brand: editingPart.brand || '',
        model: editingPart.model || '',
        condition: editingPart.condition || 'new',
        price: editingPart.price,
        currency: editingPart.currency || 'INR',
        location: editingPart.location || '',
        state: editingPart.state || '',
        pincode: editingPart.pincode || '',
        quantity: editingPart.quantity || 1,
        description: editingPart.description || '',
        compatible_robots: editingPart.compatible_robots || [],
        category_tags: editingPart.category_tags || [],
        specifications: editingPart.specifications || {},
        is_international: editingPart.is_international || false,
        duty_amount: editingPart.duty_amount || 0,
        shipping_amount: editingPart.shipping_amount || 0,
      };
    }
    return {
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
    };
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

      const partData = {
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
      };

      let result;
      if (editingPart) {
        result = await supabase
          .from("spare_parts")
          .update(partData)
          .eq('id', editingPart.id)
          .select();
      } else {
        result = await supabase
          .from("spare_parts")
          .insert([partData])
          .select();
      }

      const { error } = result;

      if (error) throw error;

      toast({
        title: "Success",
        description: `Spare part ${editingPart ? 'updated' : 'created'} successfully!`
      });

      // Call success callback to refresh data and close dialog
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error(`Error ${editingPart ? 'updating' : 'creating'} spare part listing:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingPart ? 'update' : 'create'} spare part listing`
      });
    } finally {
      setLoading(false);
    }
  };

  // Download CSV template
  const downloadTemplate = useCallback(() => {
    const headers = [
      'name',
      'part_number', 
      'brand',
      'model',
      'condition',
      'price',
      'quantity',
      'location',
      'state',
      'pincode',
      'description',
      'image_urls',
      'compatible_robots',
      'category_tags'
    ];
    
    const sampleData = [
      'Robot Arm Joint',
      'RB-001-ARM',
      'ABB',
      'IRB-6700',
      'new',
      '15000',
      '5',
      'Chennai',
      'Tamil Nadu',
      '600001',
      'High precision robot arm joint for industrial applications',
      'https://example.com/image1.jpg,https://example.com/image2.jpg',
      'IRB-6700,IRB-6650',
      'robot-parts,arm-joint,industrial'
    ];

    const csvContent = [headers, sampleData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spare_parts_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded successfully"
    });
  }, [toast]);

  // Handle CSV file upload
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a CSV file"
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            variant: "destructive",
            title: "CSV Parse Error",
            description: "Error parsing CSV file. Please check the format."
          });
          return;
        }

        const data = results.data as CSVRow[];
        
        // Validate required fields
        const invalidRows = data.filter(row => !row.name || !row.quantity);
        if (invalidRows.length > 0) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: `${invalidRows.length} rows are missing required fields (name, quantity)`
          });
          return;
        }

        setCsvData(data);
        setShowPreview(true);
        toast({
          title: "CSV Loaded",
          description: `${data.length} parts loaded for preview`
        });
      },
      error: (error) => {
        toast({
          variant: "destructive",
          title: "File Read Error",
          description: error.message
        });
      }
    });
  };

  // Process bulk upload
  const processBulkUpload = async () => {
    if (!user || csvData.length === 0) return;

    setBulkLoading(true);
    setUploadProgress(0);
    setBulkResult(null);

    const results: BulkUploadResult = {
      success: 0,
      errors: [],
      total: csvData.length
    };

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        setUploadProgress(((i + 1) / csvData.length) * 100);

        try {
          // Parse image URLs
          const imageUrls = row.image_urls 
            ? row.image_urls.split(',').map(url => url.trim()).filter(url => url)
            : [];

          // Parse compatible robots
          const compatibleRobots = row.compatible_robots
            ? row.compatible_robots.split(',').map(robot => robot.trim()).filter(robot => robot)
            : [];

          // Parse category tags
          const categoryTags = row.category_tags
            ? row.category_tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            : [];

          const partData = {
            seller_id: user.id,
            name: row.name,
            part_number: row.part_number || null,
            brand: row.brand || null,
            model: row.model || null,
            condition: row.condition || 'new',
            price: row.price ? parseFloat(row.price) : null,
            currency: 'INR',
            location: row.location || null,
            state: row.state || null,
            pincode: row.pincode || null,
            quantity: parseInt(row.quantity) || 1,
            description: row.description || null,
            compatible_robots: compatibleRobots,
            category_tags: categoryTags,
            specifications: {},
            is_international: false,
            duty_amount: 0,
            shipping_amount: 0,
            images: imageUrls,
          };

          const { error } = await supabase
            .from("spare_parts")
            .insert([partData]);

          if (error) {
            results.errors.push(`Row ${i + 1}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (error: any) {
          results.errors.push(`Row ${i + 1}: ${error.message || 'Unknown error'}`);
        }
      }

      setBulkResult(results);
      
      if (results.success > 0) {
        toast({
          title: "Bulk Upload Complete",
          description: `Successfully uploaded ${results.success} out of ${results.total} parts`
        });
        
        // Reset form if all successful
        if (results.errors.length === 0) {
          setCsvData([]);
          setShowPreview(false);
          if (csvFileRef.current) csvFileRef.current.value = "";
        }
      } else {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "No parts were uploaded successfully"
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Bulk Upload Error",
        description: error.message || 'An unexpected error occurred'
      });
    } finally {
      setBulkLoading(false);
      setUploadProgress(0);
    }
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
                            className="w-full h-full object-cover rounded-lg"
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
                          className="w-full h-full object-cover rounded-lg"
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
                     <Label htmlFor="price">Price *</Label>
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
                         step="0.01"
                         value={formData.price ?? ""}
                         onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || null)}
                         placeholder="Enter price"
                         className="flex-1"
                         disabled={loading}
                       />
                     </div>
                     {formData.price && formData.currency !== 'INR' && (
                       <p className="text-sm text-muted-foreground">
                         ≈ ₹{convertToINR(formData.price, formData.currency).toLocaleString()} INR
                       </p>
                     )}
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
                    {editingPart ? 'Update Spare Part' : 'Create Spare Part Listing'}
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6 mt-6">
            {!showPreview ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Bulk CSV Upload</h3>
                <p className="text-muted-foreground mb-6">Upload multiple spare parts at once using CSV files</p>
                
                <div className="space-y-4">
                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={downloadTemplate}
                      variant="outline"
                      size="lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    
                    <div className="border-2 border-dashed border-border rounded-lg p-8">
                      <input
                        type="file"
                        accept=".csv"
                        ref={csvFileRef}
                        onChange={handleCsvUpload}
                        className="hidden"
                      />
                      <Button
                        onClick={() => csvFileRef.current?.click()}
                        size="lg"
                        disabled={bulkLoading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload CSV File
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg max-w-2xl mx-auto">
                    <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Required columns:</strong> name, quantity</p>
                      <p><strong>Optional columns:</strong> part_number, brand, model, condition, price, location, state, pincode, description</p>
                      <p><strong>Special columns:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>image_urls:</strong> Comma-separated URLs (e.g., "url1.jpg,url2.jpg")</li>
                        <li><strong>compatible_robots:</strong> Comma-separated robot models</li>
                        <li><strong>category_tags:</strong> Comma-separated tags</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Preview CSV Data ({csvData.length} parts)</h3>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPreview(false);
                        setCsvData([]);
                        if (csvFileRef.current) csvFileRef.current.value = "";
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={processBulkUpload}
                      disabled={bulkLoading}
                    >
                      {bulkLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Upload {csvData.length} Parts
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {bulkLoading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading parts...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                {bulkResult && (
                  <Alert className={bulkResult.errors.length === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">
                          Upload Complete: {bulkResult.success}/{bulkResult.total} parts uploaded successfully
                        </p>
                        {bulkResult.errors.length > 0 && (
                          <details className="text-sm">
                            <summary className="cursor-pointer">View {bulkResult.errors.length} errors</summary>
                            <ul className="mt-2 list-disc list-inside space-y-1">
                              {bulkResult.errors.map((error, index) => (
                                <li key={index} className="text-red-600">{error}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="border rounded-lg max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Part Number</th>
                        <th className="p-2 text-left">Brand</th>
                        <th className="p-2 text-left">Model</th>
                        <th className="p-2 text-left">Condition</th>
                        <th className="p-2 text-left">Price</th>
                        <th className="p-2 text-left">Quantity</th>
                        <th className="p-2 text-left">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.part_number}</td>
                          <td className="p-2">{row.brand}</td>
                          <td className="p-2">{row.model}</td>
                          <td className="p-2">{row.condition}</td>
                          <td className="p-2">₹{row.price}</td>
                          <td className="p-2">{row.quantity}</td>
                          <td className="p-2">{row.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedSparePartsForm;