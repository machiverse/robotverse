import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth"; // Make sure this path is correct in your project
import { supabase } from "@/integrations/supabase/client"; // Adjust path
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
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

export default function ServiceListing() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<State[]>([]);

  const [specializationInput, setSpecializationInput] = useState("");
  const [certificationInput, setCertificationInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [validatingImages, setValidatingImages] = useState(false);

  const [formCompletion, setFormCompletion] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Fetch Indian states dynamically from Supabase `states` table
  useEffect(() => {
    async function fetchStates() {
      const { data, error } = await supabase
        .from("states")
        .select("id, name")
        .order("name");
      if (error) {
        console.error("Failed to fetch states:", error.message);
        setStates([]);
      } else {
        setStates(data || []);
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

    const completedRequired = required.filter((field) => {
      const val = formData[field as keyof ServiceFormData];
      if (Array.isArray(val)) {
        return val.length > 0;
      }
      return val && val !== "" && val !== 0;
    }).length;

    const completedOptional = optional.filter((field) => {
      const val = formData[field as keyof ServiceFormData];
      if (Array.isArray(val)) {
        return val.length > 0;
      }
      return val && val !== "" && val !== 0;
    }).length;

    const completion = Math.round(
      (completedRequired / required.length) * 70 +
      (completedOptional / optional.length) * 30
    );

    setFormCompletion(completion);
  }

  function validateForm() {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) errs.name = "Service name is required";
    if (!formData.service_type) errs.service_type = "Select a service type";
    if (!formData.description || formData.description.length < 50)
      errs.description = "Description must be at least 50 characters";
    if (!formData.location) errs.location = "Select your service location";
    if (formData.experience_years < 0)
      errs.experience_years = "Experience years cannot be negative";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleInputChange<T extends keyof ServiceFormData>(field: T, value: ServiceFormData[T]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function addSpecialization() {
    const val = specializationInput.trim();
    if (val && !formData.specializations.includes(val)) {
      handleInputChange("specializations", [...formData.specializations, val]);
      setSpecializationInput("");
    }
  }

  function removeSpecialization(val: string) {
    handleInputChange(
      "specializations",
      formData.specializations.filter((s) => s !== val)
    );
  }

  function addCertification() {
    const val = certificationInput.trim();
    if (val && !formData.certifications.includes(val)) {
      handleInputChange("certifications", [...formData.certifications, val]);
      setCertificationInput("");
    }
  }

  function removeCertification(val: string) {
    handleInputChange(
      "certifications",
      formData.certifications.filter((c) => c !== val)
    );
  }

  function addLanguage() {
    if (languageInput && !formData.languages.includes(languageInput)) {
      handleInputChange("languages", [...formData.languages, languageInput]);
      setLanguageInput("");
    }
  }

  function removeLanguage(val: string) {
    if (formData.languages.length > 1) {
      handleInputChange(
        "languages",
        formData.languages.filter((l) => l !== val)
      );
    }
  }

  function handleAvailabilityChange(opt: string, checked: boolean) {
    if (checked) {
      handleInputChange("availability", [...formData.availability, opt]);
    } else {
      handleInputChange(
        "availability",
        formData.availability.filter((v) => v !== opt)
      );
    }
  }

  async function validateImage(url: string): Promise<boolean> {
    if (!url.startsWith("http")) return false;
    try {
      const res = await fetch(url, { method: "HEAD" });
      const ct = res.headers.get("content-type");
      return res.ok && ct?.startsWith("image/");
    } catch {
      return false;
    }
  }

  async function handleImageUrlChange(index: number, url: string) {
    const newUrls = [...imageUrls];
    newUrls[index] = url;
    setImageUrls(newUrls);

    if (url.startsWith("http")) {
      setValidatingImages(true);
      const isValid = await validateImage(url);
      setValidatingImages(false);

      if (!isValid) {
        toast({
          variant: "destructive",
          title: "Invalid Image URL",
          description: "The image URL is invalid or unreachable.",
        });
      } else {
        const validImages = newUrls.filter((u) => u.startsWith("http"));
        handleInputChange("portfolio_images", validImages);
      }
    }
  }

  function addImageField() {
    if (imageUrls.length < 10) setImageUrls([...imageUrls, ""]);
  }

  function removeImageField(index: number) {
    if (imageUrls.length > 1) {
      const updated = imageUrls.filter((_, i) => i !== index);
      setImageUrls(updated);
      handleInputChange(
        "portfolio_images",
        updated.filter((u) => u.startsWith("http"))
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to submit a service listing.",
      });
      return;
    }
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the highlighted errors before submitting.",
      });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.from("services").insert({
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
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Service Created!",
        description: "Your listing has been successfully created.",
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
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  const getCompletionColor = (completion: number) => {
    if (completion >= 80) return "text-green-600";
    if (completion >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Service Listing</CardTitle>
          <CardDescription>
            Please fill in all required fields to publish your service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className={`text-3xl font-semibold ${getCompletionColor(formCompletion)}`}>
              {formCompletion}%
            </div>
            <Progress value={formCompletion} className="flex-grow ml-4" />
          </div>
          {formCompletion < 80 && (
            <Alert className="mb-4 border-yellow-200 bg-yellow-50 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-700" />
              <AlertDescription className="text-yellow-700">
                Complete your listing to attract more clients!
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
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={errors.name ? "border-red-500" : ""}
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
                onValueChange={(v) => handleInputChange("service_type", v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries({
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
                  }).map(([category, options]) => (
                    <optgroup key={category} label={category}>
                      {options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </optgroup>
                  ))}
                </SelectContent>
              </Select>
              {errors.service_type && (
                <p className="text-red-600 text-sm">{errors.service_type}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location-select">Service Location *</Label>
              <Select
                id="location-select"
                value={formData.location}
                onValueChange={(v) => handleInputChange("location", v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent>
                  {states.length === 0 && <SelectItem disabled>Loading...</SelectItem>}
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.name}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location && (
                <p className="text-red-600 text-sm">{errors.location}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description-textarea">Description *</Label>
              <Textarea
                id="description-textarea"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                required
                rows={5}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-red-600 text-sm">{errors.description}</p>
              )}
            </div>

            {/* Add the rest of your inputs for specializations, certifications, availability, images etc., using similar controlled components and the handlers */}

            {/* Submit Button */}
            <Button type="submit" disabled={loading || formCompletion < 50} className="w-full py-3 text-lg">
              {loading ? "Submitting..." : "Create Service Listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceListing;
