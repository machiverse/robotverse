import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, X } from "lucide-react";
import { toast } from "sonner";

interface LogisticsProviderFormProps {
  onComplete: () => void;
}

const LogisticsProviderForm = ({ onComplete }: LogisticsProviderFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    phone: '',
    logistics_type: '',
    logistics_region: '',
    transport_modes: [] as string[],
    warehouse_storage: false,
    target_audience: [] as string[],
    government_scheme_support: false,
    mou_agreed: false
  });

  const logisticsTypes = [
    'Full Truckload (FTL)',
    'Less Than Truckload (LTL)',
    'Express Delivery',
    'Heavy Equipment Transport',
    'Specialized Robot Transport',
    'International Shipping',
    'Last Mile Delivery',
    'Warehousing & Storage',
    'Supply Chain Management'
  ];

  const transportModes = [
    'Road Transport',
    'Rail Transport',
    'Air Cargo',
    'Sea Freight',
    'Multimodal Transport',
    'Special Handling Equipment'
  ];

  const regions = [
    'Pan India',
    'North India',
    'South India',
    'East India',
    'West India',
    'International'
  ];

  const targetAudiences = [
    'Small Manufacturing Units',
    'Medium Scale Industries',
    'Large Enterprises',
    'Research Institutions',
    'Educational Institutes',
    'Government Organizations'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTransportModeChange = (mode: string, checked: boolean) => {
    if (checked) {
      handleInputChange('transport_modes', [...formData.transport_modes, mode]);
    } else {
      handleInputChange('transport_modes', formData.transport_modes.filter(m => m !== mode));
    }
  };

  const handleTargetAudienceChange = (audience: string, checked: boolean) => {
    if (checked) {
      handleInputChange('target_audience', [...formData.target_audience, audience]);
    } else {
      handleInputChange('target_audience', formData.target_audience.filter(a => a !== audience));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to complete registration');
      return;
    }

    if (!formData.mou_agreed) {
      toast.error('Please agree to the MOU to continue');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: formData.company_name,
          phone: formData.phone,
          logistics_type: formData.logistics_type,
          logistics_region: formData.logistics_region,
          transport_modes: formData.transport_modes,
          warehouse_storage: formData.warehouse_storage,
          target_audience: formData.target_audience,
          government_scheme_support: formData.government_scheme_support,
          mou_agreed: formData.mou_agreed,
          mou_agreed_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Logistics provider profile completed successfully!');
      onComplete();

    } catch (error: any) {
      console.error('Error updating logistics provider profile:', error);
      toast.error('Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Complete Your Logistics Provider Profile
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Please provide additional details to complete your registration as a logistics provider.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Enter company name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Business Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter business phone number"
                required
              />
            </div>
          </div>

          {/* Logistics Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logistics Type *</Label>
              <Select 
                value={formData.logistics_type} 
                onValueChange={(value) => handleInputChange('logistics_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select logistics type" />
                </SelectTrigger>
                <SelectContent>
                  {logisticsTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Service Region *</Label>
              <Select 
                value={formData.logistics_region} 
                onValueChange={(value) => handleInputChange('logistics_region', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transport Modes */}
          <div className="space-y-3">
            <Label>Transport Modes (Select all that apply)</Label>
            <div className="grid grid-cols-2 gap-3">
              {transportModes.map((mode) => (
                <div key={mode} className="flex items-center space-x-2">
                  <Checkbox
                    id={mode}
                    checked={formData.transport_modes.includes(mode)}
                    onCheckedChange={(checked) => handleTransportModeChange(mode, checked as boolean)}
                  />
                  <Label htmlFor={mode} className="text-sm">
                    {mode}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Services */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="warehouse_storage"
                checked={formData.warehouse_storage}
                onCheckedChange={(checked) => handleInputChange('warehouse_storage', checked)}
              />
              <Label htmlFor="warehouse_storage">
                We provide warehousing and storage facilities
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="government_scheme_support"
                checked={formData.government_scheme_support}
                onCheckedChange={(checked) => handleInputChange('government_scheme_support', checked)}
              />
              <Label htmlFor="government_scheme_support">
                We support government scheme beneficiaries
              </Label>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-3">
            <Label>Target Audience (Select all that apply)</Label>
            <div className="grid grid-cols-2 gap-3">
              {targetAudiences.map((audience) => (
                <div key={audience} className="flex items-center space-x-2">
                  <Checkbox
                    id={audience}
                    checked={formData.target_audience.includes(audience)}
                    onCheckedChange={(checked) => handleTargetAudienceChange(audience, checked as boolean)}
                  />
                  <Label htmlFor={audience} className="text-sm">
                    {audience}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* MOU Agreement */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="mou_agreed"
                checked={formData.mou_agreed}
                onCheckedChange={(checked) => handleInputChange('mou_agreed', checked)}
                required
              />
              <div className="space-y-1">
                <Label htmlFor="mou_agreed" className="text-sm font-medium">
                  I agree to the Memorandum of Understanding (MOU) *
                </Label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, I confirm that I have read and agree to the terms and conditions 
                  for logistics providers on the RoboVerse platform.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onComplete}
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Complete Registration'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LogisticsProviderForm;