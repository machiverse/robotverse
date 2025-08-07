import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, FileText, CreditCard } from 'lucide-react';

interface LoanApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  robotDetails?: {
    name: string;
    model: string;
    price: number;
    currency: string;
    type: string;
  };
  financeProvider?: any;
}

const LoanApplicationModal = ({ open, onOpenChange, robotDetails, financeProvider }: LoanApplicationModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    applicant_name: user?.user_metadata?.full_name || '',
    applicant_email: user?.email || '',
    applicant_phone: '',
    business_type: '',
    loan_type: robotDetails ? 'Equipment Finance' : '',
    amount_requested: robotDetails?.price?.toString() || '',
    purpose: robotDetails ? `Financing for ${robotDetails.name} - ${robotDetails.model} (${robotDetails.type}) robot equipment for business operations and automation.` : '',
    monthly_income: '',
    credit_score: '',
    business_vintage_months: '',
    collateral_offered: ''
  });

  const loanTypes = [
    'Business Loan',
    'Equipment Finance',
    'Working Capital',
    'Term Loan',
    'MSME Loan'
  ];

  const businessTypes = [
    'Sole Proprietorship',
    'Partnership',
    'Private Limited Company',
    'Public Limited Company',
    'LLP'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit a loan application.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const applicationData = {
        applicant_id: user.id,
        provider_id: financeProvider?.provider_id || null,
        applicant_name: formData.applicant_name,
        applicant_email: formData.applicant_email,
        applicant_phone: formData.applicant_phone,
        business_type: formData.business_type,
        loan_type: formData.loan_type,
        amount_requested: parseFloat(formData.amount_requested),
        purpose: formData.purpose,
        monthly_income: formData.monthly_income ? parseFloat(formData.monthly_income) : null,
        credit_score: formData.credit_score ? parseInt(formData.credit_score) : null,
        business_vintage_months: formData.business_vintage_months ? parseInt(formData.business_vintage_months) : null,
        collateral_offered: formData.collateral_offered,
        status: 'pending'
      };

      const { error } = await supabase
        .from('loan_applications')
        .insert([applicationData]);

      if (error) throw error;

      toast({
        title: "Application Submitted Successfully",
        description: "Your loan application has been submitted. You will receive updates via email.",
      });

      onOpenChange(false);
      
      // Reset form
      setFormData({
        applicant_name: user?.user_metadata?.full_name || '',
        applicant_email: user?.email || '',
        applicant_phone: '',
        business_type: '',
        loan_type: '',
        amount_requested: '',
        purpose: '',
        monthly_income: '',
        credit_score: '',
        business_vintage_months: '',
        collateral_offered: ''
      });

    } catch (error: any) {
      console.error('Error submitting loan application:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit loan application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Loan Application
            {robotDetails && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                for {robotDetails.name}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Fill out this form to apply for financing
            {financeProvider && (
              <span> with {financeProvider.profiles?.company_name || financeProvider.profiles?.full_name}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Robot Details Preview */}
          {robotDetails && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Equipment Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Robot:</span>
                  <p className="font-medium">{robotDetails.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  <p className="font-medium">{robotDetails.model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{robotDetails.type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-medium">
                    {robotDetails.currency === 'USD' ? '$' : robotDetails.currency === 'EUR' ? '€' : '₹'}
                    {robotDetails.price.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="applicant_name">Full Name *</Label>
                <Input
                  id="applicant_name"
                  value={formData.applicant_name}
                  onChange={(e) => handleInputChange('applicant_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="applicant_email">Email *</Label>
                <Input
                  id="applicant_email"
                  type="email"
                  value={formData.applicant_email}
                  onChange={(e) => handleInputChange('applicant_email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="applicant_phone">Phone Number</Label>
                <Input
                  id="applicant_phone"
                  value={formData.applicant_phone}
                  onChange={(e) => handleInputChange('applicant_phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="business_type">Business Type</Label>
                <Select onValueChange={(value) => handleInputChange('business_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Loan Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="loan_type">Loan Type *</Label>
                <Select onValueChange={(value) => handleInputChange('loan_type', value)} value={formData.loan_type}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    {loanTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount_requested">Amount Requested (₹) *</Label>
                <Input
                  id="amount_requested"
                  type="number"
                  value={formData.amount_requested}
                  onChange={(e) => handleInputChange('amount_requested', e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="purpose">Purpose of Loan</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => handleInputChange('purpose', e.target.value)}
                  rows={3}
                  placeholder="Describe how you plan to use the loan..."
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="monthly_income">Monthly Income (₹)</Label>
                <Input
                  id="monthly_income"
                  type="number"
                  value={formData.monthly_income}
                  onChange={(e) => handleInputChange('monthly_income', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="credit_score">Credit Score</Label>
                <Input
                  id="credit_score"
                  type="number"
                  min="300"
                  max="900"
                  value={formData.credit_score}
                  onChange={(e) => handleInputChange('credit_score', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="business_vintage_months">Business Age (Months)</Label>
                <Input
                  id="business_vintage_months"
                  type="number"
                  value={formData.business_vintage_months}
                  onChange={(e) => handleInputChange('business_vintage_months', e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="collateral_offered">Collateral Offered</Label>
                <Textarea
                  id="collateral_offered"
                  value={formData.collateral_offered}
                  onChange={(e) => handleInputChange('collateral_offered', e.target.value)}
                  rows={2}
                  placeholder="Describe any collateral you can offer..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoanApplicationModal;