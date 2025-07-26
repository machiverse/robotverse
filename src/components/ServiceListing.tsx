import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Settings } from "lucide-react";
import { toast } from "sonner";

interface ServiceFormData {
  name: string;
  service_type: string;
  specializations: string[];
  price_range: string;
  location: string;
  description: string;
}

const ServiceListing = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newSpecialization, setNewSpecialization] = useState('');
  
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    service_type: '',
    specializations: [],
    price_range: '',
    location: '',
    description: '',
  });

  const serviceTypes = [
    'Robot Maintenance',
    'Robot Repair',
    'Installation & Setup',
    'Programming & Configuration',
    'Training & Support',
    'Consulting',
    'Custom Robot Development',
    'System Integration',
    'Preventive Maintenance',
    'Emergency Repair',
    'Parts Replacement',
    'Software Updates',
    'Calibration Services',
    'Robot Inspection',
    'Other'
  ];

  const priceRanges = [
    '₹500 - ₹2,000 per hour',
    '₹2,000 - ₹5,000 per hour',
    '₹5,000 - ₹10,000 per hour',
    '₹10,000 - ₹25,000 per hour',
    '₹25,000+ per hour',
    'Fixed Project Rate',
    'Contact for Quote'
  ];

  const handleInputChange = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to create service listings');
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
          description: formData.description
        });

      if (error) throw error;

      toast.success('Service listing created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        service_type: '',
        specializations: [],
        price_range: '',
        location: '',
        description: '',
      });

    } catch (error: any) {
      console.error('Error creating service listing:', error);
      toast.error('Failed to create service listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Create Service Listing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter service name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Service Type *</Label>
              <Select 
                value={formData.service_type} 
                onValueChange={(value) => handleInputChange('service_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Service Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Enter service area/location"
              />
            </div>
            
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
          </div>

          {/* Specializations */}
          <div className="space-y-2">
            <Label>Specializations</Label>
            <div className="flex gap-2">
              <Input
                value={newSpecialization}
                onChange={(e) => setNewSpecialization(e.target.value)}
                placeholder="Add specialization (e.g., ABB Robots, KUKA Systems)"
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Service Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your service offerings, experience, certifications, and what makes you unique..."
              rows={6}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                <span>Creating Service Listing...</span>
              </div>
            ) : (
              'Create Service Listing'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ServiceListing;