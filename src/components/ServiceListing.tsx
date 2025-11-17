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
  Plus, 
  X, 
  Settings, 
  Upload, 
  Camera, 
  MapPin, 
  DollarSign, 
  Clock, 
  Award, 
  Users, 
  Star,
  CheckCircle,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  Globe,
  Calendar,
  Wrench,
  Bot,
  Shield,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ServiceFormData {
  name: string;
  service_type: string;
  specializations: string[];
  price_range: string;
  location: string;
  description: string;
  certifications: string[];
  experience_years: number;
  availability: string[];
  emergency_service: boolean;
  warranty_offered: boolean;
  service_radius: number;
  contact_method: string;
  response_time: string;
  languages: string[];
  equipment_provided: boolean;
  portfolio_images: string[];
}

const ServiceListing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [formCompletion, setFormCompletion] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [validatingImages, setValidatingImages] = useState(false);
  
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    service_type: '',
    specializations: [],
    price_range: '',
    location: '',
    description: '',
    certifications: [],
    experience_years: 0,
    availability: [],
    emergency_service: false,
    warranty_offered: false,
    service_radius: 50,
    contact_method: 'both',
    response_time: '24_hours',
    languages: ['English'],
    equipment_provided: false,
    portfolio_images: []
  });

  // Enhanced service types with categories
  const serviceCategories = {
    'Industrial Automation': [
      'Robotic Welding Services',
      'Pick & Place Automation',
      'Assembly Line Integration',
      'Material Handling Systems',
      'Quality Inspection Automation',
      'Packaging Automation'
    ],
    'Maintenance & Repair': [
      'Preventive Maintenance',
      'Emergency Repair Services',
      'Parts Replacement',
      'System Diagnostics',
      'Performance Optimization',
      'Condition Monitoring'
    ],
    'Installation & Commissioning': [
      'Robot Installation',
      'System Integration',  
      'Site Preparation',
      'Safety System Setup',
      'Network Configuration',
      'End-of-Arm Tooling'
    ],
    'Programming & Software': [
      'Robot Programming',
      'Vision System Programming',
      'PLC Integration',
      'HMI Development',
      'Custom Software Development',
      'Simulation & Modeling'
    ],
    'Training & Consulting': [
      'Operator Training',
      'Technical Training',
      'Safety Certification',
      'Process Optimization',
      'ROI Analysis',
      'Automation Consulting'
    ],
    'Specialized Services': [
      'Calibration Services',
      'Compliance Testing',
      'Robot Retrofitting',
      'Custom Tool Design',
      'System Validation',
      'Performance Analysis'
    ]
  };

  const priceRanges = [
    '₹500 - ₹1,500 per hour',
    '₹1,500 - ₹3,000 per hour', 
    '₹3,000 - ₹5,000 per hour',
    '₹5,000 - ₹10,000 per hour',
    '₹10,000 - ₹20,000 per hour',
    '₹20,000+ per hour',
    'Fixed Project Rate',
    'Monthly Contract',
    'Annual Maintenance Contract',
    'Contact for Quote'
  ];

  const availabilityOptions = [
    'Monday-Friday',
    'Weekends',
    '24/7 Support',
    'Emergency On-Call',
    'Flexible Hours'
  ];

  const responseTimeOptions = [
    { value: '1_hour', label: 'Within 1 hour' },
    { value: '4_hours', label: 'Within 4 hours' },
    { value: '24_hours', label: 'Within 24 hours' },
    { value: '48_hours', label: 'Within 48 hours' },
    { value: '1_week', label: 'Within 1 week' }
  ];

  const languageOptions = [
    'English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 
    'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'German', 'Japanese'
  ];

  useEffect(() => {
    calculateFormCompletion();
  }, [formData]);

  const calculateFormCompletion = () => {
    const requiredFields = [
      'name', 'service_type', 'location', 'description', 'price_range'
    ];
    const optionalFields = [
      'specializations', 'certifications', 'experience_years', 'availability'
    ];

    const requiredCompleted = requiredFields.filter(field => {
      const value = formData[field as keyof ServiceFormData];
      if (Array.isArray(value)) return value.length > 0;
      return value && value !== '' && value !== 0;
    }).length;

    const optionalCompleted = optionalFields.filter(field => {
      const value = formData[field as keyof ServiceFormData];
      if (Array.isArray(value)) return value.length > 0;
      return value && value !== '' && value !== 0;
    }).length;

    const completion = Math.round(
      ((requiredCompleted / requiredFields.length) * 70) + 
      ((optionalCompleted / optionalFields.length) * 30)
    );
    
    setFormCompletion(completion);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }
    
    if (!formData.service_type) {
      newErrors.service_type = 'Service type is required';
    }
    
    if (!formData.description.trim() || formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Service location is required';
    }

    if (formData.experience_years < 0) {
      newErrors.experience_years = 'Experience years cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations.includes(newSpecialization.trim())) {
      handleInputChange('specializations', [...formData.specializations, newSpecialization.trim()]);
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (specializationToRemove: string) => {
    handleInputChange('specializations', formData.specializations.filter(spec => spec !== specializationToRemove));
  };

  const addCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      handleInputChange('certifications', [...formData.certifications, newCertification.trim()]);
      setNewCertification('');
    }
  };

  const removeCertification = (certToRemove: string) => {
    handleInputChange('certifications', formData.certifications.filter(cert => cert !== certToRemove));
  };

  const addLanguage = () => {
    if (newLanguage && !formData.languages.includes(newLanguage)) {
      handleInputChange('languages', [...formData.languages, newLanguage]);
      setNewLanguage('');
    }
  };

  const removeLanguage = (langToRemove: string) => {
    if (formData.languages.length > 1) { // Keep at least one language
      handleInputChange('languages', formData.languages.filter(lang => lang !== langToRemove));
    }
  };

  const handleAvailabilityChange = (availability: string, checked: boolean) => {
    if (checked) {
      handleInputChange('availability', [...formData.availability, availability]);
    } else {
      handleInputChange('availability', formData.availability.filter(a => a !== availability));
    }
  };

  const validateImageUrl = async (url: string): Promise<boolean> => {
    if (!url || !url.startsWith('http')) return false;
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      return response.ok && contentType?.startsWith('image/');
    } catch {
      return false;
    }
  };

  const handleImageUrlChange = async (index: number, url: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = url;
    setImageUrls(newUrls);

    if (url && url.startsWith('http')) {
      setValidatingImages(true);
      const isValid = await validateImageUrl(url);
      
      if (isValid) {
        const validUrls = newUrls.filter(u => u && u.startsWith('http'));
        handleInputChange('portfolio_images', validUrls);
      }
      
      setValidatingImages(false);

      if (!isValid && url.length > 10) {
        toast({
          variant: "destructive",
          title: "Invalid Image URL",
          description: "Please provide a valid image URL"
        });
      }
    }
  };

  const addImageUrlField = () => {
    if (imageUrls.length < 10) {
      setImageUrls([...imageUrls, '']);
    }
  };

  const removeImageUrlField = (index: number) => {
    if (imageUrls.length > 1) {
      const newUrls = imageUrls.filter((_, i) => i !== index);
      setImageUrls(newUrls);
      const validUrls = newUrls.filter(u => u && u.startsWith('http'));
      handleInputChange('portfolio_images', validUrls);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to create service listings"
      });
      return;
    }

    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the errors before submitting"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('services')
        .insert({
          provider_id: user.id,
          name: formData.name,
          service_type: formData.service_type,
          specializations: formData.specializations,
          price_range: formData.price_range,
          location: formData.location,
          description: formData.description,
          certifications: formData.certifications,
          experience_years: formData.experience_years,
          availability: formData.availability,
          emergency_service: formData.emergency_service,
          warranty_offered: formData.warranty_offered,
          service_radius: formData.service_radius,
          contact_method: formData.contact_method,
          response_time: formData.response_time,
          languages: formData.languages,
          equipment_provided: formData.equipment_provided,
          portfolio_images: formData.portfolio_images,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Service listing created successfully!"
      });
      
      // Reset form
      setFormData({
        name: '',
        service_type: '',
        specializations: [],
        price_range: '',
        location: '',
        description: '',
        certifications: [],
        experience_years: 0,
        availability: [],
        emergency_service: false,
        warranty_offered: false,
        service_radius: 50,
        contact_method: 'both',
        response_time: '24_hours',
        languages: ['English'],
        equipment_provided: false,
        portfolio_images: []
      });
      setImageUrls(['']);
      setErrors({});

    } catch (error: any) {
      console.error('Error creating service listing:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create service listing"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompletionColor = (completion: number) => {
    if (completion >= 80) return 'text-green-600';
    if (completion >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                Create Professional Service Listing
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Showcase your robotics expertise and attract quality clients
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getCompletionColor(formCompletion)}`}>
                {formCompletion}%
              </div>
              <Progress value={formCompletion} className="w-24 mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Complete</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form Completion Alert */}
      {formCompletion < 80 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-yellow-700">
            <strong>Complete your listing to attract more clients!</strong>
            <br />
            Add more details like certifications, specializations, and portfolio images to improve visibility.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Basic Service Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Professional Robot Maintenance Services"
                  className={errors.name ? 'border-red-500' : ''}
                  required
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Service Category *</Label>
                <Select 
                  value={formData.service_type} 
                  onValueChange={(value) => handleInputChange('service_type', value)}
                >
                  <SelectTrigger className={errors.service_type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select service category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(serviceCategories).map(([category, services]) => (
                      <div key={category}>
                        <div className="px-2 py-1 text-sm font-semibold text-muted-foreground bg-muted">
                          {category}
                        </div>
                        {services.map((service) => (
                          <SelectItem key={service} value={service} className="pl-4">
                            {service}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {errors.service_type && (
                  <p className="text-red-500 text-sm">{errors.service_type}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="location">Service Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Mumbai, Maharashtra"
                  className={errors.location ? 'border-red-500' : ''}
                  required
                />
                {errors.location && (
                  <p className="text-red-500 text-sm">{errors.location}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="service_radius">Service Radius (km)</Label>
                <Input
                  id="service_radius"
                  type="number"
                  min="1"
                  max="500"
                  value={formData.service_radius}
                  onChange={(e) => handleInputChange('service_radius', parseInt(e.target.value) || 50)}
                  placeholder="50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience_years">Experience (Years)</Label>
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience_years}
                  onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                  placeholder="5"
                  className={errors.experience_years ? 'border-red-500' : ''}
                />
                {errors.experience_years && (
                  <p className="text-red-500 text-sm">{errors.experience_years}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Service Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your service offerings, experience, expertise, and what makes you unique. Include details about your approach, quality standards, and client success stories..."
                rows={6}
                className={errors.description ? 'border-red-500' : ''}
                required
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formData.description.length} characters (minimum 50)</span>
                {errors.description && (
                  <span className="text-red-500">{errors.description}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing & Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Price Range</Label>
                <Select 
                  value={formData.price_range} 
                  onValueChange={(value) => handleInputChange('price_range', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select price range" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceRanges.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Response Time</Label>
                <Select 
                  value={formData.response_time} 
                  onValueChange={(value) => handleInputChange('response_time', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {responseTimeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Availability</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availabilityOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={formData.availability.includes(option)}
                      onCheckedChange={(checked) => handleAvailabilityChange(option, checked as boolean)}
                    />
                    <Label htmlFor={option} className="text-sm font-normal">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emergency_service"
                  checked={formData.emergency_service}
                  onCheckedChange={(checked) => handleInputChange('emergency_service', checked)}
                />
                <Label htmlFor="emergency_service" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Emergency Service Available
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="warranty_offered"
                  checked={formData.warranty_offered}
                  onCheckedChange={(checked) => handleInputChange('warranty_offered', checked)}
                />
                <Label htmlFor="warranty_offered" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Warranty Offered
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="equipment_provided"
                  checked={formData.equipment_provided}
                  onCheckedChange={(checked) => handleInputChange('equipment_provided', checked)}
                />
                <Label htmlFor="equipment_provided" className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Equipment Provided
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expertise & Specializations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Expertise & Specializations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Specializations */}
            <div className="space-y-2">
              <Label>Robot/System Specializations</Label>
              <div className="flex gap-2">
                <Input
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  placeholder="e.g., ABB IRB Series, KUKA KR Series, Fanuc Arc Mate"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                />
                <Button type="button" onClick={addSpecialization} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.specializations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.specializations.map((spec, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      {spec}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeSpecialization(spec)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className="space-y-2">
              <Label>Certifications & Qualifications</Label>
              <div className="flex gap-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="e.g., Certified Robot Technician, ISO 9001, Safety Training Certificate"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                />
                <Button type="button" onClick={addCertification} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.certifications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.certifications.map((cert, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {cert}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeCertification(cert)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Languages */}
            <div className="space-y-2">
              <Label>Languages Supported</Label>
              <div className="flex gap-2">
                <Select value={newLanguage} onValueChange={setNewLanguage}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.filter(lang => !formData.languages.includes(lang)).map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addLanguage} size="sm" disabled={!newLanguage}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.languages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.languages.map((lang, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {lang}
                      {formData.languages.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeLanguage(lang)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Portfolio Images (Optional)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add images of your work, equipment, or completed projects to showcase your expertise
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {imageUrls.map((url, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    value={url}
                    onChange={(e) => handleImageUrlChange(index, e.target.value)}
                    placeholder="https://example.com/your-work-image.jpg"
                  />
                </div>
                {url && url.startsWith('http') && (
                  <div className="w-16 h-16 border rounded overflow-hidden flex-shrink-0">
                    <img 
                      src={url} 
                      alt="Portfolio preview" 
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                      }}
                    />
                  </div>
                )}
                {imageUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeImageUrlField(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
            
            {imageUrls.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addImageUrlField}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Image URL
              </Button>
            )}
            
            {validatingImages && (
              <p className="text-sm text-muted-foreground">Validating image URLs...</p>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to publish your service listing?</h3>
                <p className="text-sm text-muted-foreground">
                  {formCompletion >= 80 
                    ? 'Your listing looks great and is ready to attract clients!' 
                    : 'Consider adding more details to improve your listing visibility.'
                  }
                </p>
              </div>
              <Button 
                type="submit" 
                disabled={loading || formCompletion < 40}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating Listing...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Service Listing
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default ServiceListing;
