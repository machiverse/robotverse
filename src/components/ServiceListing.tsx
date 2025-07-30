import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth"; // Adjust import path/name if needed
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components//ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

import {
  Plus,
  X,
  Settings,
  Camera,
  Zap,
  Globe,
  Star,
  Award,
  Bot,
  Shield,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface State {
  id: string;
  name: string;
}

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

const availabilityOptions = [
  "Monday-Friday",
  "Weekends",
  "24/7 Support",
  "Emergency On-Call",
  "Flexible Hours",
];

const priceRanges = [
  "₹500 - ₹1,500 per hour",
  "₹1,500 - ₹3,000 per hour",
  "₹3,000 - ₹5,000 per hour",
  "₹5,000 - ₹10,000 per hour",
  "₹10,000 - ₹20,000 per hour",
  "₹20,000+",
  "Fixed Project Rate",
  "Monthly Contract",
  "Annual Contract",
  "Contact for Quote",
];

const responseTimeOptions = [
  { value: "1_hour", label: "Within 1 hour" },
  { value: "4_hours", label: "Within 4 hours" },
  { value: "24_hours", label: "Within 24 hours" },
  { value: "48_hours", label: "Within 48 hours" },
  { value: "1_week", label: "Within 1 week" },
];

const languageOptions = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "German",
  "Japanese",
];

const serviceCategories = {
  "Maintenance": [
    "Preventive Maintenance",
    "Corrective Maintenance",
    "Emergency Repair",
    "Parts Replacement",
    "System Overhaul",
    "Condition Monitoring",
  ],
  "Installation": [
    "Robot Installation",
    "System Integration",
    "Commissioning",
    "Site Preparation",
    "Safety Setup",
    "Network Configuration",
  ],
  "Programming": [
    "Robot Programming",
    "Software Updates",
    "Custom Application Development",
    "PLC Programming",
    "HMI Development",
    "Simulation Services",
  ],
  "Training": [
    "Operator Training",
    "Technical Training",
    "Safety Training",
    "Process Optimization",
    "Automation Consulting",
    "ROI Analysis",
  ],
  "Specialized": [
    "Calibration Services",
    "Robot Inspection",
    "Compliance Testing",
    "Retrofitting",
    "Custom Tool Design",
    "Quality Assurance",
  ],
};

export default function ServiceListing() {
  const { user } = useAuth();
  const toast = useToast();

  // States for form
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    service_type: "",
    specializations: [],
    price_range: "",
    location: "",
    description: "",
    certifications: [],
    experience_years: 0,
    availability: [],
    emergency_service: false,
    warranty_offered: false,
    service_radius: 50,
    contact_method: "both",
    response_time: "24_hours",
    languages: ["English"],
    equipment_provided: false,
    portfolio_images: [],
  });

  // Inputs for adding to list-type fields
  const [specializationInput, setSpecializationInput] = useState("");
  const [certificationInput, setCertificationInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [validatingImages, setValidatingImages] = useState(false);

  // Validation & progress
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formCompletion, setFormCompletion] = useState(0);
  const [loading, setLoading] = useState(false);

  // States from DB
  const [states, setStates] = useState<State[]>([]);

  useEffect(() => {
    // Fetch Indian states for location dropdown
    async function fetchStates() {
      const { data, error } = await supabase
        .from("states")
        .select("id, name")
        .order("name");
      if (error) {
        console.error("Failed to load states:", error.message);
        setStates([]);
      } else {
        setStates(data ?? []);
      }
    }
    fetchStates();
  }, []);

  useEffect(() => {
    calculateCompletion();
  }, [formData]);

  function calculateCompletion() {
    const required = ["name", "service_type", "location", "description", "price_range"];
    const optional = ["specializations", "certifications", "availability", "languages"];

    const requiredCount = required.filter(d => {
      const val = formData[d as keyof ServiceFormData];
      if (Array.isArray(val)) return val.length > 0;
      return val !== null && val !== undefined && val !== "" && val !== 0;
    }).length;

    const optionalCount = optional.filter(d => {
      const val = formData[d as keyof ServiceFormData];
      if (Array.isArray(val)) return val.length > 0;
      return val !== null && val !== undefined && val !== "" && val !== 0;
    }).length;

    const completion = Math.round((requiredCount / required.length) * 70 + (optionalCount / optional.length) * 30);
    setFormCompletion(completion);
  }

  function validateForm() {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) errs.name = "Service name is required";
    if (!formData.service_type) errs.service_type = "Service type is required";
    if (!formData.location) errs.location = "Location is required";
    if (!formData.price_range) errs.price_range = "Price range is required";
    if (!formData.description || formData.description.length < 50) errs.description = "Description must be at least 50 characters";
    if (formData.experience_years < 0) errs.experience_years = "Experience cannot be negative";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleInputChange<T extends keyof ServiceFormData>(field: T, value: ServiceFormData[T]) {
    setFormData(old => ({ ...old, [field]: value }));
    if(errors[field]) setErrors(old => ({ ...old, [field]: '' }));
  }

  // Items list management helpers

  const addSpecialization = () => {
    const val = specializationInput.trim();
    if(val && !formData.specializations.includes(val)) {
      handleInputChange("specializations", [...formData.specializations, val]);
      setSpecializationInput("");
    }
  };

  const removeSpecialization = (val: string) => {
    handleInputChange("specializations", formData.specializations.filter(v => v !== val));
  };

  const addCertification = () => {
    const val = certificationInput.trim();
    if(val && !formData.certifications.includes(val)) {
      handleInputChange("certifications", [...formData.certifications, val]);
      setCertificationInput("");
    }
  };

  const removeCertification = (val: string) => {
    handleInputChange("certifications", formData.certifications.filter(v => v !== val));
  };

  const addLanguage = () => {
    if(languageInput && !formData.languages.includes(languageInput)) {
      handleInputChange("languages", [...formData.languages, languageInput]);
      setLanguageInput("");
    }
  };

  const removeLanguage = (val: string) => {
    if(formData.languages.length > 1) {
      handleInputChange("languages", formData.languages.filter(v => v !== val));
    }
  };

  const handleAvailabilityChange = (value: string, checked: boolean) => {
    if(checked) {
      handleInputChange("availability", [...formData.availability, value]);
    } else {
      handleInputChange("availability", formData.availability.filter(v => v !== value));
    }
  };

  // Image validation

  async function validateImageUrl(url: string): Promise<boolean> {
    if(!url || !url.startsWith("http")) return false;
    try {
      const res = await fetch(url, { method: "HEAD" });
      const ct = res.headers.get("content-type");
      return res.ok && !!ct && ct.startsWith("image");
    } catch {
      return false;
    }
  }

  async function handleImageUrlChange(index: number, url: string) {
    const urls = [...imageUrls];
    urls[index] = url;
    setImageUrls(urls);

    if(url.startsWith("http")) {
      setValidatingImages(true);
      const valid = await validateImageUrl(url);
      setValidatingImages(false);
      if(!valid) {
        toast({
          variant: "destructive",
          title: "Invalid Image URL",
          description: "The image URL is invalid or unreachable"
        });
      } else {
        // Update formData if valid urls exist
        const validUrls = urls.filter(u => u && u.startsWith("http"));
        handleInputChange("portfolio_images", validUrls);
      }
    }
  }

  function addImageUrlField() {
    if(imageUrls.length < 10) setImageUrls(old => [...old, ""]);
  }

  function removeImageUrlField(index: number) {
    if(imageUrls.length > 1) {
      const updated = imageUrls.filter((_, i) => i !== index);
      setImageUrls(updated);
      handleInputChange("portfolio_images", updated.filter(u => u && u.startsWith("http")));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if(!user) {
      toast({ variant:"destructive", title:"Authentication Required", description:"Please sign in to continue" });
      return;
    }
    if(!validateForm()) {
      toast({ variant:"destructive", title:"Validation Error", description:"Please fill all required fields correctly" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("services").insert({
        ...formData,
        provider_id: user.id,
        created_at: new Date().toISOString(),
      });
      if(error) throw error;
      toast({ title:"Success!", description:"Your service listing has been created." });
      // Reset form
      setFormData({
        name: "",
        service_type: "",
        specializations: [],
        price_range: "",
        location: "",
        description: "",
        certifications: [],
        experience_years: 0,
        availability: [],
        emergency_service: false,
        warranty_offered: false,
        service_radius: 50,
        contact_method: "both",
        response_time: "24_hours",
        languages: ["English"],
        equipment_provided: false,
        portfolio_images: [],
      });
      setSpecializationInput("");
      setCertificationInput("");
      setLanguageInput("");
      setImageUrls([""]);
      setErrors({});
    } catch (e) {
      toast({ variant:"destructive", title:"Error", description:(e as Error).message || "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  const completionColor = formCompletion >= 80 ? "text-green-600" : formCompletion >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="max-w-4xl mx-auto my-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Service Listing</CardTitle>
          <CardDescription>Fill all required fields to attract clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <span className={`text-3xl font-bold ${completionColor}`}>{formCompletion}% Complete</span>
            <Progress value={formCompletion} className="flex-grow ml-4" />
          </div>
          {formCompletion < 80 && 
            <Alert className="mb-6" variant="warning">
              <AlertCircle className="mr-2" />
              Complete your profile for better visibility and client trust
            </Alert>
          }
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <Label htmlFor="service-name">Service Name *</Label>
              <Input
                id="service-name"
                value={formData.name}
                onChange={e => handleInputChange("name", e.target.value)}
                className={errors.name ? "border-red-600" : ""}
                required
              />
              {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="service-type">Service Type *</Label>
              <Select
                id="service-type"
                value={formData.service_type}
                onValueChange={v => handleInputChange("service_type", v)}
                required
                className={errors.service_type ? "border-red-600" : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Service Type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(serviceCategories).map(([categoryName, services]) => (
                    <optgroup key={categoryName} label={categoryName}>
                      {services.map(service => (
                        <SelectItem key={service} value={service}>{service}</SelectItem>
                      ))}
                    </optgroup>
                  ))}
                </SelectContent>
              </Select>
              {errors.service_type && <p className="text-red-600 text-sm">{errors.service_type}</p>}
            </div>

            <div>
              <Label htmlFor="location">Service Location *</Label>
              <Select
                id="location"
                value={formData.location}
                onValueChange={v => handleInputChange("location", v)}
                required
                className={errors.location ? "border-red-600" : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  {states.length === 0 && <SelectItem disabled>Loading...</SelectItem>}
                  {states.map(state => (
                    <SelectItem key={state.id} value={state.name}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location && <p className="text-red-600 text-sm">{errors.location}</p>}
            </div>

            <div>
              <Label htmlFor="description">Service Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange("description", e.target.value)}
                rows={5}
                className={errors.description ? "border-red-600" : ""}
                required
              />
              {errors.description && <p className="text-red-600 text-sm">{errors.description}</p>}
              <p className="text-sm text-muted-foreground">{formData.description.length} / 50 minimum characters</p>
            </div>

            {/* Further inputs (price_range, response_time, availability, certifications, languages etc.) */}

            {/* Price Range */}
            <div>
              <Label htmlFor="price-range">Price Range *</Label>
              <Select
                id="price-range"
                value={formData.price_range}
                onValueChange={v => handleInputChange("price_range", v)}
                required
                className={errors.price_range ? "border-red-600" : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Price Range" />
                </SelectTrigger>
                <SelectContent>
                  {priceRanges.map(price => (
                    <SelectItem key={price} value={price}>{price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.price_range && <p className="text-red-600 text-sm">{errors.price_range}</p>}
            </div>

            {/* Response Time */}
            <div>
              <Label htmlFor="response-time">Response Time</Label>
              <Select
                id="response-time"
                value={formData.response_time}
                onValueChange={v => handleInputChange("response_time", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Response Time" />
                </SelectTrigger>
                <SelectContent>
                  {responseTimeOptions.map(({value, label}) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Availability */}
            <div>
              <Label>Availability</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availabilityOptions.map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox 
                      checked={formData.availability.includes(option)} 
                      onCheckedChange={checked => handleAvailabilityChange(option, checked as boolean)} 
                      id={`avail-${option}`}
                    />
                    <Label htmlFor={`avail-${option}`}>{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Specializations */}
            <div>
              <Label>Specializations</Label>
              <div className="flex space-x-2 items-center mb-2">
                <Input
                  value={specializationInput}
                  onChange={e => setSpecializationInput(e.target.value)}
                  placeholder="Add specialization and press enter"
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                />
                <Button type="button" onClick={addSpecialization}><Plus /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.specializations.map((spec, i) => (
                  <Badge key={i} className="flex items-center space-x-1">
                    <Bot className="w-4 h-4" />
                    <span>{spec}</span>
                    <Button type="button" onClick={() => removeSpecialization(spec)}><X className="w-4 h-4" /></Button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <Label>Certifications</Label>
              <div className="flex space-x-2 items-center mb-2">
                <Input
                  value={certificationInput}
                  onChange={e => setCertificationInput(e.target.value)}
                  placeholder="Add certification and press enter"
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                />
                <Button type="button" onClick={addCertification}><Plus /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.certifications.map((cert, i) => (
                  <Badge key={i} className="flex items-center space-x-1">
                    <Award className="w-4 h-4" />
                    <span>{cert}</span>
                    <Button type="button" onClick={() => removeCertification(cert)}><X className="w-4 h-4" /></Button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <Label>Languages</Label>
              <div className="flex space-x-2 items-center mb-2">
                <Select value={languageInput} onValueChange={v => setLanguageInput(v)} className="flex-grow">
                  <SelectTrigger>
                    <SelectValue placeholder="Add language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.filter(l => !formData.languages.includes(l)).map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addLanguage} disabled={!languageInput}><Plus /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.languages.map((lang, i) => (
                  <Badge key={i} className="flex items-center space-x-1">
                    <Globe className="w-4 h-4" />
                    <span>{lang}</span>
                    {formData.languages.length > 1 &&
                      <Button type="button" onClick={() => removeLanguage(lang)}><X className="w-4 h-4" /></Button>
                    }
                  </Badge>
                ))}
              </div>
            </div>

            {/* Portfolio Images */}
            <div>
              <Label>Portfolio Images (URLs)</Label>
              {imageUrls.map((url, idx) => (
                <div key={idx} className="flex space-x-2 items-center mb-2">
                  <Input 
                    value={url}
                    onChange={e => handleImageUrlChange(idx, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-grow"
                  />
                  {url.startsWith("http") && (
                    <img 
                      src={url} alt="Preview" 
                      className="w-16 h-16 object-cover rounded border"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = ""; }}
                    />
                  )}
                  {imageUrls.length > 1 && (
                    <Button type="button" onClick={() => removeImageUrlField(idx)}><X /></Button>
                  )}
                </div>
              ))}
              {imageUrls.length < 10 && (
                <Button type="button" onClick={addImageUrlField} className="w-full mt-2">
                  <Plus /> Add Another Image URL
                </Button>
              )}
              {validatingImages && <p className="text-sm text-muted-foreground">Validating images...</p>}
            </div>

            {/* Submit */}
            <Button type="submit" disabled={loading || formCompletion < 50} size="lg" className="w-full">
              {loading ? "Submitting..." : "Create Service Listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default ServiceListing;
