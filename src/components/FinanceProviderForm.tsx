import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

interface FinanceProviderFormProps {
  onComplete: () => void;
}

const FinanceProviderForm = ({ onComplete }: FinanceProviderFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    phone: '',
    finance_type: [] as string[],
    financing_for: [] as string[],
    target_audience: [] as string[],
    government_scheme_support: false,
    mou_agreed: false
  });

  const financeTypes = [
    'Equipment Financing',
    'Working Capital Loans',
    'Business Loans',
    'Lease Financing',
    'Asset-Based Lending',
    'Trade Finance',
    'Invoice Financing',
    'Venture Capital'
  ];

  const financingForOptions = [
    'New Robot Purchase',
    'Used Robot Purchase',
    'Robot Upgrades',
    'Maintenance & Service',
    'Training & Certification',
    'Spare Parts Inventory',
    'Infrastructure Development',
    'Research & Development'
  ];

  const targetAudiences = [
    'Startups',
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

  const handleArrayFieldChange = (field: string, item: string, checked: boolean) => {
    const currentArray = formData[field as keyof typeof formData] as string[];
    if (checked) {
      handleInputChange(field, [...currentArray, item]);
    } else {
      handleInputChange(field, currentArray.filter(i => i !== item));
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
          finance_type: formData.finance_type,
          financing_for: formData.financing_for,
          target_audience: formData.target_audience,
          government_scheme_support: formData.government_scheme_support,
          mou_agreed: formData.mou_agreed,
          mou_agreed_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Finance provider profile completed successfully!');
      onComplete();

    } catch (error: any) {
      console.error('Error updating finance provider profile:', error);
      toast.error('Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Complete Your Finance Provider Profile
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Please provide additional details to complete your registration as a finance provider.
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

          {/* Finance Types */}
          <div className="space-y-3">
            <Label>Finance Types (Select all that apply)</Label>
            <div className="grid grid-cols-2 gap-3">
              {financeTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={formData.finance_type.includes(type)}
                    onCheckedChange={(checked) => handleArrayFieldChange('finance_type', type, checked as boolean)}
                  />
                  <Label htmlFor={type} className="text-sm">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Financing For */}
          <div className="space-y-3">
            <Label>Financing Available For (Select all that apply)</Label>
            <div className="grid grid-cols-2 gap-3">
              {financingForOptions.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={option}
                    checked={formData.financing_for.includes(option)}
                    onCheckedChange={(checked) => handleArrayFieldChange('financing_for', option, checked as boolean)}
                  />
                  <Label htmlFor={option} className="text-sm">
                    {option}
                  </Label>
                </div>
              ))}
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
                    onCheckedChange={(checked) => handleArrayFieldChange('target_audience', audience, checked as boolean)}
                  />
                  <Label htmlFor={audience} className="text-sm">
                    {audience}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Government Scheme Support */}
          <div className="space-y-3">
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
                  for finance providers on the RoboNexus platform.
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

export default FinanceProviderForm;