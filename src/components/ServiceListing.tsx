import { useState, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { useAuth } from "@/hooks/useAuth";  // Correct import, check your project setup
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
  Bot,
  Award,
  Globe,
  Zap,
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
  certifications: string[];
  description: string;
  experience_years: number;
  emergency_service: boolean;
  equipment_provided: boolean;
  language: string[];
  location: string;
  portfolio_images: string[];
  price_range: string;
  response_time: string;
  service_radius: number;
  specializations: string[];
  warranty_offered: boolean;
  availability: string[];
  contact_method: string;
}

const availabilityOptions = [
  "Monday-Friday",
  "Weekends",
  "24/7 Support",
  "Emergency On-Call",
  "Flexible Hours",
];

const priceRanges = [
  "₹500 - ₹1,500",
  "₹1,500 - ₹3,000",
  "₹3,000 - ₹5,000",
  "₹5,000 - ₹10,000",
  "₹10,000 - ₹20,000",
  "₹20,000+",
  "Fixed Project Rate",
  "Monthly Contract",
  "Annual Contract",
  "Contact for Quote",
];

const responseTimes = [
  { value: "1_hour", label: "Within 1 hour" },
  { value: "4_hours", label: "Within 4 hours" },
  { value: "24_hours", label: "Within 24 hours" },
  { value: "48_hours", label: "Within 48 hours" },
  { value: "1_week", label: "Within 1 week" },
];

// Your categories grouped as per your schema
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
    "Simulation",
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
    "Calibration",
    "Inspection",
    "Compliance Testing",
    "Retrofitting",
    "Custom Tool Design",
    "Quality Assurance",
  ],
};

export default function ServiceListing() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [validatingImages, setValidatingImages] = useState(false);
  const [formCompletion, setFormCompletion] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    service_type: "",
    certifications: [],
    description: "",
    experience_years: 0,
    emergency_service: false,
    equipment_provided: false,
    language: ["English"],
    location: "",
    portfolio_images: [""],
    price_range: "",
    response_time: "24_hours",
    service_radius: 50,
    specializations: [],
    warranty_offered: false,
    availability: [],
    contact_method: "both",
  });

  // Extra inputs for addable lists
  const [newCertification, setNewCertification] = useState("");
  const [newSpecialization, setNewSpecialization] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [newImageUrlFields, setNewImageUrlFields] = useState([""]);

  // Fetch Indian states once
  useEffect(() => {
    async function fetchStates() {
      const { data, error } = await supabase
        .from("states" as any)  // use "as any" if typing issue exists, update your DB and types soon
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to fetch states:", error.message);
        setStates([]);
      } else {
        setStates(data || []);
      }
    }
    fetchStates();
  }, []);

  // Calculate form completion
  useEffect(() => {
    const requiredFields: (keyof ServiceFormData)[] = [
      "name",
      "service_type",
      "description",
      "price_range",
      "location",
    ];
    const optionalFields: (keyof ServiceFormData)[] = [
      "specializations",
      "certifications",
      "availability",
      "language",
    ];

    let requiredCompleted = requiredFields.filter((field) => {
      const val = formData[field];
      if (Array.isArray(val)) return val.length > 0;
      return !!val && val !== "";
    }).length;

    let optionalCompleted = optionalFields.filter((field) => {
      const val = formData[field];
      if (Array.isArray(val)) return val.length > 0;
      return !!val && val !== "";
    }).length;

    let completion = Math.round(
      (requiredCompleted / requiredFields.length) * 70 +
        (optionalCompleted / optionalFields.length) * 30
    );

    setFormCompletion(completion);
  }, [formData]);

  // Validation check before submit
  function validateForm() {
    let newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Service name is required";
    if (!formData.service_type) newErrors.service_type = "Service type is required";
    if (!formData.price_range) newErrors.price_range = "Price range is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.description || formData.description.trim().length < 50)
      newErrors.description = "Description must be at least 50 characters";
    if (formData.experience_years < 0)
      newErrors.experience_years = "Experience cannot be negative";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Generic setter for formData fields
  function setField<T extends keyof ServiceFormData>(field: T, value: ServiceFormData[T]) {
    setFormData((old) => ({
      ...old,
      [field]: value,
    }));
    if (errors[field]) setErrors((old) => ({ ...old, [field]: "" }));
  }

  // Handlers for adding/removing certifications, specializations, languages
  function addCertification() {
    const val = newCertification.trim();
    if (val && !formData.certifications.includes(val)) {
      setField("certifications", [...formData.certifications, val]);
      setNewCertification("");
    }
  }

  function removeCertification(cert: string) {
    setField("certifications", formData.certifications.filter((c) => c !== cert));
  }

  function addSpecialization() {
    const val = newSpecialization.trim();
    if (val && !formData.specializations.includes(val)) {
      setField("specializations", [...formData.specializations, val]);
      setNewSpecialization("");
    }
  }

  function removeSpecialization(spec: string) {
    setField("specializations", formData.specializations.filter((s) => s !== spec));
  }

  function addLanguage() {
    if (newLanguage && !formData.language.includes(newLanguage)) {
      setField("language", [...formData.language, newLanguage]);
      setNewLanguage("");
    }
  }

  function removeLanguage(lang: string) {
    if (formData.language.length > 1) {
      setField("language", formData.language.filter((l) => l !== lang));
    }
  }

  // Availability checkbox handler
  function toggleAvailability(value: string, checked: boolean) {
    if (checked) {
      setField("availability", [...formData.availability, value]);
    } else {
      setField("availability", formData.availability.filter((a) => a !== value));
    }
  }

  // Image URL validation and management
  async function validateImageUrl(url: string): Promise<boolean> {
    if (!url || !url.startsWith("http")) return false;
    try {
      const response = await fetch(url, { method: "HEAD" });
      const contentType = response.headers.get("content-type") || "";
      return response.ok && contentType.startsWith("image");
    } catch {
      return false;
    }
  }

  async function changeImageUrl(index: number, url: string) {
    const urls = [...formData.portfolio_images];
    urls[index] = url;
    setField("portfolio_images", urls);

    if (url.startsWith("http")) {
      setValidatingImages(true);
      const valid = await validateImageUrl(url);
      setValidatingImages(false);
      if (!valid) {
        toast({
          title: "Invalid Image URL",
          description: "Provided URL is invalid or unreachable",
          variant: "destructive",
        });
      }
    }
  }

  function addImageField() {
    if (formData.portfolio_images.length < 10) {
      setField("portfolio_images", [...formData.portfolio_images, ""]);
    }
  }

  function removeImageField(index: number) {
    if (formData.portfolio_images.length > 1) {
      setField(
        "portfolio_images",
        formData.portfolio_images.filter((_, i) => i !== index)
      );
    }
  }

  // Submit form function
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix all errors before submitting.",
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

      toast({
        title: "Success",
        description: "Your service listing was created.",
      });

      setFormData({
        name: "",
        service_type: "",
        certifications: [],
        description: "",
        experience_years: 0,
        emergency_service: false,
        equipment_provided: false,
        language: ["English"],
        location: "",
        portfolio_images: [""],
        price_range: "",
        response_time: "24_hours",
        service_radius: 50,
        specializations: [],
        warranty_offered: false,
        availability: [],
        contact_method: "both",
      });
      setNewCertification("");
      setNewSpecialization("");
      setNewLanguage("");
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to create listing",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Your Service Listing</CardTitle>
          <CardDescription>
            Fill out the form below and connect with clients seeking your expertise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex justify-between items-center">
            <div className={`text-3xl font-bold ${
              formCompletion >= 80
                ? "text-green-600"
                : formCompletion >= 60
                ? "text-yellow-600"
                : "text-red-600"
            }`}>
              {formCompletion}%
            </div>
            <Progress value={formCompletion} className="flex-grow ml-4" />
          </div>

          {formCompletion < 80 && (
            <Alert variant="warning" className="mb-4">
              <AlertCircle className="mr-2" />
              <AlertDescription>
                Complete your profile to attract more clients.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Service Name */}
            <div>
              <Label htmlFor="service-name">Service Name *</Label>
              <Input
                id="service-name"
                value={formData.name}
                onChange={(e) => setField("name", e.target.value)}
                className={errors.name ? "border-red-600" : ""}
                required
              />
              {errors.name && <p className="text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Service Type */}
            <div>
              <Label htmlFor="service-type">Service Type *</Label>
              <Select
                id="service-type"
                value={formData.service_type}
                onValueChange={(v) => setField("service_type", v)}
                required
                className={errors.service_type ? "border-red-600" : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
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
              {errors.service_type && <p className="text-red-600 mt-1">{errors.service_type}</p>}
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location">Service Location *</Label>
              <Select
                id="location"
                value={formData.location}
                onValueChange={(v) => setField("location", v)}
                required
                className={errors.location ? "border-red-600" : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {states.length === 0 ? (
                    <SelectItem disabled>Loading locations...</SelectItem>
                  ) : (
                    states.map((state) => (
                      <SelectItem key={state.id} value={state.name}>
                        {state.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.location && <p className="text-red-600 mt-1">{errors.location}</p>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={5}
                className={errors.description ? "border-red-600" : ""}
                required
              />
              {errors.description && (
                <p className="text-red-600 mt-1">{errors.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {formData.description.length} / 50 minimum characters
              </p>
            </div>

            {/* Price Range */}
            <div>
              <Label htmlFor="price-range">Price Range *</Label>
              <Select
                id="price-range"
                value={formData.price_range}
                onValueChange={(v) => setField("price_range", v)}
                required
                className={errors.price_range ? "border-red-600" : ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a price range" />
                </SelectTrigger>
                <SelectContent>
                  {priceRanges.map((price) => (
                    <SelectItem key={price} value={price}>
                      {price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.price_range && <p className="text-red-600 mt-1">{errors.price_range}</p>}
            </div>

            {/* Response Time */}
            <div>
              <Label htmlFor="response-time">Response Time</Label>
              <Select
                id="response-time"
                value={formData.response_time}
                onValueChange={(v) => setField("response_time", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select response time" />
                </SelectTrigger>
                <SelectContent>
                  {responseTimes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Availability */}
            <div>
              <Label>Availability</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availabilityOptions.map((option) => (
                  <div key={option} className="flex items-centerspace-x-2">
                    <Checkbox
                      id={`avail-${option.replace(/\s+/g, "-")}`}
                      checked={formData.availability.includes(option)}
                      onCheckedChange={(checked) => toggleAvailability(option, checked as boolean)}
                    />
                    <Label htmlFor={`avail-${option.replace(/\s+/g, "-")}`}>
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Specializations */}
            <div>
              <Label>Specializations</Label>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  placeholder="Add specialization and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpecialization();
                    }
                  }}
                  className="flex-grow"
                />
                <Button type="button" onClick={addSpecialization}>
                  <Plus />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.specializations.map((spec, idx) => (
                  <Badge key={idx} className="flex items-center gap-1">
                    <Bot size={16} />
                    {spec}
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
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="Add certification and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCertification();
                    }
                  }}
                  className="flex-grow"
                />
                <Button type="button" onClick={addCertification}>
                  <Plus />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.certifications.map((cert, idx) => (
                  <Badge key={idx} className="flex items-center gap-1">
                    <Award size={16} />
                    {cert}
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
              <div className="flex items-center gap-2 mb-2">
                <Select
                  value={newLanguage}
                  onValueChange={(v) => setNewLanguage(v)}
                  className="flex-grow"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add language" />
                  </SelectTrigger>
                  <SelectContent>
                    {newLanguage.length > 0 && formData.language.includes(newLanguage) ? null : (
                      <>
                        {["English","Hindi","Tamil","Telugu","Bengali","Marathi","Gujarati","Kannada","Malayalam","Punjabi","German","Japanese"]
                          .filter((l) => !formData.language.includes(l))
                          .map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang}
                            </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <Button type="button" disabled={!newLanguage} onClick={addLanguage}>
                  <Plus />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.language.map((lang, idx) => (
                  <Badge key={idx} className="flex items-center gap-1">
                    <Globe size={16} />
                    {lang}
                    {formData.language.length > 1 && (
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
              {formData.portfolio_images.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input
                    value={url || ""}
                    onChange={(e) => changeImageUrl(idx, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-grow"
                  />
                  {url?.startsWith("http") && (
                    <img
                      src={url}
                      alt="preview"
                      className="w-16 h-16 object-cover rounded border"
                      onError={(e) => (e.currentTarget.src = "")}
                    />
                  )}
                  {formData.portfolio_images.length > 1 && (
                    <Button type="button" onClick={() => removeImageField(idx)}>
                      <X />
                    </Button>
                  )}
                </div>
              ))}
              {formData.portfolio_images.length < 10 && (
                <Button type="button" onClick={addImageField}>
                  <Plus /> Add Another Image
                </Button>
              )}
              {validatingImages && <p className="text-sm text-muted-foreground">Validating images...</p>}
            </div>

            {/* Submit Button */}
            <Button type="submit" size="lg" className="w-full" disabled={loading || formCompletion < 50}>
              {loading ? "Submitting..." : "Create Listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
