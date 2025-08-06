import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, Calculator, FileText } from 'lucide-react';

interface LoanSchemeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingScheme?: any;
}

const LoanSchemeForm = ({ onSuccess, onCancel, editingScheme }: LoanSchemeFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    scheme_name: '',
    scheme_type: '',
    description: '',
    min_amount: '',
    max_amount: '',
    interest_rate_min: '',
    interest_rate_max: '',
    min_tenure_months: '',
    max_tenure_months: '',
    processing_fee_percentage: '',
    eligibility_criteria: '',
    target_segment: '',
    is_government_scheme: false,
    subsidy_available: false,
    collateral_required: false
  });

  // Populate form when editing
  useEffect(() => {
    if (editingScheme) {
      setFormData({
        scheme_name: editingScheme.scheme_name || '',
        scheme_type: editingScheme.scheme_type || '',
        description: editingScheme.description || '',
        min_amount: editingScheme.min_amount?.toString() || '',
        max_amount: editingScheme.max_amount?.toString() || '',
        interest_rate_min: editingScheme.interest_rate_min?.toString() || '',
        interest_rate_max: editingScheme.interest_rate_max?.toString() || '',
        min_tenure_months: editingScheme.min_tenure_months?.toString() || '',
        max_tenure_months: editingScheme.max_tenure_months?.toString() || '',
        processing_fee_percentage: editingScheme.processing_fee_percentage?.toString() || '',
        eligibility_criteria: editingScheme.eligibility_criteria || '',
        target_segment: editingScheme.target_segment || '',
        is_government_scheme: editingScheme.is_government_scheme || false,
        subsidy_available: editingScheme.subsidy_available || false,
        collateral_required: editingScheme.collateral_required || false
      });
    }
  }, [editingScheme]);

  const schemeTypes = [
    'MSME Loan',
    'Startup Funding',
    'Equipment Finance',
    'Working Capital',
    'Business Expansion',
    'Export Finance',
    'Agriculture Loan',
    'Women Entrepreneur',
    'Technology Upgrade'
  ];

  const targetSegments = [
    'MSME',
    'Startups',
    'Manufacturing',
    'Services',
    'Retail',
    'Agriculture',
    'Export Business',
    'Women Entrepreneurs',
    'Rural Business'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to add loan schemes"
      });
      return;
    }

    if (!formData.scheme_name || !formData.scheme_type || !formData.max_amount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    setLoading(true);

    try {
      const schemeData = {
        provider_id: user.id,
        scheme_name: formData.scheme_name,
        scheme_type: formData.scheme_type,
        description: formData.description,
        min_amount: parseFloat(formData.min_amount) || 0,
        max_amount: parseFloat(formData.max_amount),
        interest_rate_min: parseFloat(formData.interest_rate_min) || 0,
        interest_rate_max: parseFloat(formData.interest_rate_max) || 0,
        min_tenure_months: parseInt(formData.min_tenure_months) || 1,
        max_tenure_months: parseInt(formData.max_tenure_months) || 12,
        processing_fee_percentage: parseFloat(formData.processing_fee_percentage) || 0,
        eligibility_criteria: formData.eligibility_criteria,
        target_segment: formData.target_segment,
        is_government_scheme: formData.is_government_scheme,
        subsidy_available: formData.subsidy_available,
        collateral_required: formData.collateral_required,
        is_active: true
      };

      let error;
      if (editingScheme) {
        // Update existing scheme
        const { error: updateError } = await supabase
          .from('loan_schemes')
          .update(schemeData)
          .eq('id', editingScheme.id);
        error = updateError;
      } else {
        // Insert new scheme
        const { error: insertError } = await supabase
          .from('loan_schemes')
          .insert(schemeData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: editingScheme ? "Loan scheme updated successfully!" : "Loan scheme added successfully!"
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding loan scheme:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add loan scheme"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {editingScheme ? 'Edit Loan Scheme' : 'Add Loan Scheme'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheme_name">Scheme Name *</Label>
              <Input
                id="scheme_name"
                value={formData.scheme_name}
                onChange={(e) => handleInputChange('scheme_name', e.target.value)}
                placeholder="e.g., MSME Growth Scheme"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scheme_type">Scheme Type *</Label>
              <Select value={formData.scheme_type} onValueChange={(value) => handleInputChange('scheme_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme type" />
                </SelectTrigger>
                <SelectContent>
                  {schemeTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the loan scheme details..."
              rows={3}
            />
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_amount">Minimum Amount (₹)</Label>
              <Input
                id="min_amount"
                type="number"
                value={formData.min_amount}
                onChange={(e) => handleInputChange('min_amount', e.target.value)}
                placeholder="50000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_amount">Maximum Amount (₹) *</Label>
              <Input
                id="max_amount"
                type="number"
                value={formData.max_amount}
                onChange={(e) => handleInputChange('max_amount', e.target.value)}
                placeholder="10000000"
                required
              />
            </div>
          </div>

          {/* Interest Rate Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interest_rate_min">Min Interest Rate (%)</Label>
              <Input
                id="interest_rate_min"
                type="number"
                step="0.01"
                value={formData.interest_rate_min}
                onChange={(e) => handleInputChange('interest_rate_min', e.target.value)}
                placeholder="8.50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="interest_rate_max">Max Interest Rate (%)</Label>
              <Input
                id="interest_rate_max"
                type="number"
                step="0.01"
                value={formData.interest_rate_max}
                onChange={(e) => handleInputChange('interest_rate_max', e.target.value)}
                placeholder="15.00"
              />
            </div>
          </div>

          {/* Tenure Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_tenure_months">Min Tenure (Months)</Label>
              <Input
                id="min_tenure_months"
                type="number"
                value={formData.min_tenure_months}
                onChange={(e) => handleInputChange('min_tenure_months', e.target.value)}
                placeholder="12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_tenure_months">Max Tenure (Months)</Label>
              <Input
                id="max_tenure_months"
                type="number"
                value={formData.max_tenure_months}
                onChange={(e) => handleInputChange('max_tenure_months', e.target.value)}
                placeholder="84"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="processing_fee_percentage">Processing Fee (%)</Label>
              <Input
                id="processing_fee_percentage"
                type="number"
                step="0.01"
                value={formData.processing_fee_percentage}
                onChange={(e) => handleInputChange('processing_fee_percentage', e.target.value)}
                placeholder="2.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eligibility_criteria">Eligibility Criteria</Label>
              <Textarea
                id="eligibility_criteria"
                value={formData.eligibility_criteria}
                onChange={(e) => handleInputChange('eligibility_criteria', e.target.value)}
                placeholder="Business vintage, turnover, credit score requirements..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_segment">Target Segment</Label>
              <Select value={formData.target_segment} onValueChange={(value) => handleInputChange('target_segment', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target segment" />
                </SelectTrigger>
                <SelectContent>
                  {targetSegments.map((segment) => (
                    <SelectItem key={segment} value={segment}>{segment}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label>Scheme Features</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_government_scheme"
                  checked={formData.is_government_scheme}
                  onCheckedChange={(checked) => handleInputChange('is_government_scheme', checked)}
                />
                <Label htmlFor="is_government_scheme" className="text-sm">Government Scheme</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="subsidy_available"
                  checked={formData.subsidy_available}
                  onCheckedChange={(checked) => handleInputChange('subsidy_available', checked)}
                />
                <Label htmlFor="subsidy_available" className="text-sm">Subsidy Available</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="collateral_required"
                  checked={formData.collateral_required}
                  onCheckedChange={(checked) => handleInputChange('collateral_required', checked)}
                />
                <Label htmlFor="collateral_required" className="text-sm">Collateral Required</Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editingScheme ? 'Updating...' : 'Adding...') : (editingScheme ? 'Update Scheme' : 'Add Scheme')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoanSchemeForm;