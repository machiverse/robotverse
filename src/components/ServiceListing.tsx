import { useState, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { useAuth } from "@/hooks/useAuth"; // Adjust this path if different
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

import {
  Plus,
  X,
  Settings,
  Zap,
  Bot,
  Award,
  Globe,
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
  "₹20,000+ per hour",
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
  "Maintenance & Repair": [
    "Preventive Maintenance",
    "Corrective Maintenance",
    "Emergency Repair",
    "Parts Replacement",
    "System Overhaul",
    "Condition Monitoring",
  ],
  "Installation & Setup": [
    "Robot Installation",
    "System Integration",
    "Commissioning",
    "Site Preparation",
    "Safety Setup",
    "Network Configuration",
  ],
  "Programming & Software": [
    "Robot Programming",
    "Software Updates",
    "Custom Application Development",
    "PLC Programming",
    "HMI Development",
    "Simulation Services",
  ],
  "Training & Consulting": [
    "Operator Training",
    "Technical Training",
    "Safety Training",
    "Process Optimization",
    "Automation Consulting",
    "ROI Analysis",
  ],
  "Specialized Services": [
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

  const [specializationInput, setSpecializationInput] = useState("");
  const [certificationInput, setCertificationInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [validatingImages, setValidatingImages] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formCompletion, setFormCompletion] = useState(0);
  const [loading, setLoading] = useState(false);

  const [states, setStates] = useState<State[]>([]);

  useEffect(() => {
    async function fetchStates() {
      const { data, error } = await supabase
        .from("states" as any) // Use "as any" temporarily if typing errors arise
        .select("id, name")
        .order("name");
      if (error) {
        console.error("Error fetching states:", error.message);
        setStates([]);
      } else {
        setStates(data ?? []);
      }
    }
    fetchStates();
  }, []);

  useEffect(() => {
    let totalFields = 5 + 4; // required + optional count
    let filledRequired = 0;
    let filledOptional = 0;

    const requiredFields: (keyof ServiceFormData)[] = [
      "name",
      "service_type",
      "location",
      "description",
      "price_range",
    ];

    requiredFields.forEach((field) => {
      const val = formData[field];
      if (Array.isArray(val)) {
        if (val.length > 0) filledRequired++;
      } else if (val && val !== "") {
        filledRequired++;
      }
    });

    const optionalFields: (keyof ServiceFormData)[] = [
      "specializations",
      "certifications",
      "availability",
      "languages",
    ];

    optionalFields.forEach((field) => {
      const val = formData[field];
      if (Array.isArray(val)) {
        if (val.length > 0) filledOptional++;
      } else if (val && val !== "") {
        filledOptional++;
      }
    });

    const percentage =
      Math.round(
        (filledRequired / requiredFields.length) * 70 +
          (filledOptional / optionalFields.length) * 30
      ) || 0;
    setFormCompletion(percentage);
  }, [formData]);

  function validateForm(): boolean {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) errs.name = "Service name is required";
    if (!formData.service_type) errs.service_type = "Service type is required";
    if (!formData.location) errs.location = "Location is required";
    if (!formData.price_range) errs.price_range = "Price range is required";
    if (!formData.description || formData.description.trim().length < 50)
      errs.description = "Description must be at least 50 characters";
    if (formData.experience_years < 0)
      errs.experience_years = "Experience cannot be negative";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleInput<T extends keyof ServiceFormData>(field: T, value: ServiceFormData[T]) {
    setFormData((old) => ({
      ...old,
      [field]: value,
    }));
    if (errors[field]) setErrors((old) => ({ ...old, [field]: "" }));
  }

  function addSpecialization() {
    const val = specializationInput.trim();
    if (val && !formData.specializations.includes(val)) {
      handleInput("specializations", [...formData.specializations, val]);
      setSpecializationInput("");
    }
  }

  function removeSpecialization(val: string) {
    handleInput(
      "specializations",
      formData.specializations.filter((s) => s !== val)
    );
  }

  function addCertification() {
    const val = certificationInput.trim();
    if (val && !formData.certifications.includes(val)) {
      handleInput("certifications", [...formData.certifications, val]);
      setCertificationInput("");
    }
  }

  function removeCertification(val: string) {
    handleInput(
      "certifications",
      formData.certifications.filter((c) => c !== val)
    );
  }

  function addLanguage() {
    if (languageInput && !formData.languages.includes(languageInput)) {
      handleInput("languages", [...formData.languages, languageInput]);
      setLanguageInput("");
    }
  }

  function removeLanguage(val: string) {
    if (formData.languages.length > 1) {
      handleInput(
        "languages",
        formData.languages.filter((l) => l !== val)
      );
    }
  }

  function handleAvailabilityChange(opt: string, checked: boolean) {
    if (checked) {
      handleInput("availability", [...formData.availability, opt]);
    } else {
      handleInput(
        "availability",
        formData.availability.filter((v) => v !== opt)
      );
    }
  }

  async function validateImageUrl(url: string): Promise<boolean> {
    if (!url || !url.startsWith("http")) return false;
    try {
      const res = await fetch(url, { method: "HEAD" });
      const ct = res.headers.get("content-type");
      return res.ok && !!ct && ct.startsWith("image/");
    } catch {
      return false;
    }
  }

  async function handleImageUrlChange(idx: number, url: string) {
    const updated = [...imageUrls];
    updated[idx] = url;
    setImageUrls(updated);

    if (url.startsWith("http")) {
      setValidatingImages(true);
      const valid = await validateImageUrl(url);
      setValidatingImages(false);

      if (!valid) {
        toast.toast({
          title: "Invalid Image URL",
          description: "Provided URL is invalid or unreachable.",
          variant: "destructive",
        });
      } else {
        const goodUrls = updated.filter((u) => u.startsWith("http"));
        handleInput("portfolio_images", goodUrls);
      }
    }
  }

  function addImageField() {
    if (imageUrls.length < 10) setImageUrls((old) => [...old, ""]);
  }
  function removeImageField(idx: number) {
    if (imageUrls.length > 1) {
      const updated = imageUrls.filter((_, i) => i !== idx);
      setImageUrls(updated);
      handleInput(
        "portfolio_images",
        updated.filter((u) => u.startsWith("http"))
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.toast({
        title: "Authentication Required",
        description: "Please login to submit your listing.",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      toast.toast({
        title: "Validation Error",
        description: "Please fix the highlighted errors.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("services").insert([
        {
          ...formData,
          provider_id: user.id,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;

      toast.toast({
        title: "Success",
        description: "Your service listing has been created.",
      });

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
    } catch (error) {
      toast.toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to submit listing.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Service Listing</CardTitle>
          <CardDescription>
            Please fill all required fields to attract clients.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-4 flex justify-between items-center">
            <span className={`text-3xl font-semibold ${formCompletion >= 80 ? "text-green-600" : formCompletion >= 60 ? "text-yellow-600" : "text-red-600"}`}>
              {formCompletion}%
            </span>
            <Progress value={formCompletion} className="flex-grow ml-4" />
          </div>

          {formCompletion < 80 && (
            <Alert className="mb-6" variant="warning">
              <AlertCircle className="mr-2" />
              <AlertDescription>
                Complete your profile for better visibility and trust.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Name */}
            <div>
              <Label htmlFor="service-name">Service Name *</Label>
              <Input
                id="service-name"
                value={formData.name}
                onChange={(e) => handleInput("name", e.target.value)}
                className={errors.name ? "border-red-600" : ""}
                required
              />
              {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
            </div>

            {/* Service Type */}
            <div>
              <Label htmlFor="service-type">Service Type *</Label>
              <Select
                id="service-type"
                value={formData.service_type}
                onChange={(v) => handleInput("service_type", v)}
                required
                className={errors.service_type ? "border-red-600" : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(serviceCategories).map(([group, services]) => (
                    <optgroup key={group} label={group}>
                      {services.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </optgroup>
                  ))}
                </SelectContent>
              </Select>
              {errors.service_type && <p className="text-red-600 text-sm">{errors.service_type}</p>}
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location">Location *</Label>
              <Select
                id="location"
                value={formData.location}
                onChange={(v) => handleInput("location", v)}
                required
                className={errors.location ? "border-red-600" : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {states.length === 0 ? (
                    <SelectItem disabled>Loading states...</SelectItem>
                  ) : (
                    states.map((state) => (
                      <SelectItem key={state.id} value={state.name}>
                        {state.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.location && <p className="text-red-600 text-sm">{errors.location}</p>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInput("description", e.target.value)}
                rows={5}
                className={errors.description ? "border-red-600" : ""}
                required
              />
              {errors.description && (
                <p className="text-red-600 text-sm">{errors.description}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {formData.description.length}/50 minimum characters
              </p>
            </div>

            {/* Price Range */}
            <div>
              <Label htmlFor="price-range">Price Range *</Label>
              <Select
                id="price-range"
                value={formData.price_range}
                onChange={(v) => handleInput("price_range", v)}
                required
                className={errors.price_range ? "border-red-600" : ""}
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
              {errors.price_range && (
                <p className="text-red-600 text-sm">{errors.price_range}</p>
              )}
            </div>

            {/* Response Time */}
            <div>
              <Label htmlFor="response-time">Response Time</Label>
              <Select
                id="response-time"
                value={formData.response_time}
                onChange={(v) => handleInput("response_time", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select response time" />
                </SelectTrigger>
                <SelectContent>
                  {responseTimeOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Availability */}
            <div>
              <Label>Availability</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availabilityOptions.map((option) => {
                  const id = option.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={id}
                        checked={formData.availability.includes(option)}
                        onCheckedChange={(checked) =>
                          handleAvailabilityChange(option, checked as boolean)
                        }
                      />
                      <Label htmlFor={id}>{option}</Label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Specializations */}
            <div>
              <Label>Specializations</Label>
              <div className="flex space-x-2 items-center mb-2">
                <Input
                  value={specializationInput}
                  onChange={(e) => setSpecializationInput(e.target.value)}
                  placeholder="Add specialization and press Enter"
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpecialization();
                    }
                  }}
                />
                <Button type="button" onClick={addSpecialization}>
                  <Plus />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.specializations.map((spec, i) => (
                  <Badge key={i} className="flex items-center space-x-1">
                    <Bot size={16} />
                    <span>{spec}</span>
                    <Button type="button" onClick={() => removeSpecialization(spec)}>
                      <X size={16} />
                    </Button>
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
                  onChange={(e) => setCertificationInput(e.target.value)}
                  placeholder="Add certification and press Enter"
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCertification();
                    }
                  }}
                />
                <Button type="button" onClick={addCertification}>
                  <Plus />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.certifications.map((cert, i) => (
                  <Badge key={i} className="flex items-center space-x-1">
                    <Award size={16} />
                    <span>{cert}</span>
                    <Button type="button" onClick={() => removeCertification(cert)}>
                      <X size={16} />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <Label>Languages</Label>
              <div className="flex space-x-2 items-center mb-2">
                <Select
                  value={languageInput}
                  onValueChange={(v) => setLanguageInput(v)}
                  className="flex-grow"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions
                      .filter((l) => !formData.languages.includes(l))
                      .map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={addLanguage}
                  disabled={!languageInput}
                >
                  <Plus />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.languages.map((lang, i) => (
                  <Badge key={i} className="flex items-center space-x-1">
                    <Globe size={16} />
                    <span>{lang}</span>
                    {formData.languages.length > 1 && (
                      <Button type="button" onClick={() => removeLanguage(lang)}>
                        <X size={16} />
                      </Button>
                    )}
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
                    onChange={(e) => handleImageUrlChange(idx, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-grow"
                  />
                  {url.startsWith("http") ? (
                    <img
                      src={url}
                      alt="Portfolio Preview"
                      className="w-16 h-16 object-cover rounded border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "";
                      }}
                    />
                  ) : null}
                  {imageUrls.length > 1 && (
                    <Button type="button" onClick={() => removeImageField(idx)}>
                      <X />
                    </Button>
                  )}
                </div>
              ))}
              {imageUrls.length < 10 && (
                <Button type="button" onClick={addImageField} className="w-full mt-2">
                  <Plus /> Add Another Image URL
                </Button>
              )}
              {validatingImages && (
                <p className="text-sm text-muted-foreground">Validating images...</p>
              )}
            </div>

            {/* Submit */}
            <Button type="submit" size="lg" className="w-full" disabled={loading || formCompletion < 50}>
              {loading ? "Submitting..." : "Create Service Listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceListing;
