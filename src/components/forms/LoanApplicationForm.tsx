import { useState } from 'react';
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
import { FileText, DollarSign } from 'lucide-react';

interface LoanApplicationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const LoanApplicationForm = ({ onSuccess, onCancel }: LoanApplicationFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    business_type: '',
    loan_type: '',
    amount_requested: '',
    purpose: '',
    monthly_income: '',
    credit_score: '',
    business_vintage_months: '',
    collateral_offered: '',
    documents_submitted: [] as string[]
  });

  const loanTypes = [
    'Business Loan',
    'Equipment Finance',
    'Working Capital',
    'Term Loan',
    'Invoice Financing',
    'Line of Credit',
    'MSME Loan',
    'Startup Funding'
  ];

  const businessTypes = [
    'Manufacturing',
    'Trading',
    'Services',
    'Retail',
    'Technology',
    'Healthcare',
    'Education',
    'Food & Beverage',
    'Construction',
    'Agriculture'
  ];

  const documentTypes = [
    'PAN Card',
    'Aadhar Card',
    'Business Registration',
    'GST Certificate',
    'Income Tax Returns',
    'Bank Statements',
    'Financial Statements',
    'Business Plan'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocumentChange = (document: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      documents_submitted: checked 
        ? [...prev.documents_submitted, document]
        : prev.documents_submitted.filter(d => d !== document)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to submit loan application"
      });
      return;
    }

    if (!formData.applicant_name || !formData.loan_type || !formData.amount_requested) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('loan_applications')
        .insert({
          applicant_id: user.id,
          applicant_name: formData.applicant_name,
          applicant_email: formData.applicant_email,
          applicant_phone: formData.applicant_phone,
          business_type: formData.business_type,
          loan_type: formData.loan_type,
          amount_requested: parseFloat(formData.amount_requested),
          purpose: formData.purpose,
          monthly_income: parseFloat(formData.monthly_income) || null,
          credit_score: parseInt(formData.credit_score) || null,
          business_vintage_months: parseInt(formData.business_vintage_months) || null,
          collateral_offered: formData.collateral_offered,
          documents_submitted: formData.documents_submitted,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Loan application submitted successfully!"
      });

      onSuccess();
    } catch (error) {
      console.error('Error submitting loan application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit loan application"
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
          Loan Application
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicant_name">Full Name *</Label>
                <Input
                  id="applicant_name"
                  value={formData.applicant_name}
                  onChange={(e) => handleInputChange('applicant_name', e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="applicant_email">Email</Label>
                <Input
                  id="applicant_email"
                  type="email"
                  value={formData.applicant_email}
                  onChange={(e) => handleInputChange('applicant_email', e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicant_phone">Phone Number</Label>
                <Input
                  id="applicant_phone"
                  value={formData.applicant_phone}
                  onChange={(e) => handleInputChange('applicant_phone', e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
              
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="loan_type">Loan Type *</Label>
                <Select onValueChange={(value) => handleInputChange('loan_type', value)}>
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
              
              <div className="space-y-2">
                <Label htmlFor="amount_requested">Amount Requested (₹) *</Label>
                <Input
                  id="amount_requested"
                  type="number"
                  value={formData.amount_requested}
                  onChange={(e) => handleInputChange('amount_requested', e.target.value)}
                  placeholder="1000000"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose of Loan</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                placeholder="Describe how you plan to use the loan..."
                rows={3}
              />
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_income">Monthly Income (₹)</Label>
                <Input
                  id="monthly_income"
                  type="number"
                  value={formData.monthly_income}
                  onChange={(e) => handleInputChange('monthly_income', e.target.value)}
                  placeholder="100000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="credit_score">Credit Score</Label>
                <Input
                  id="credit_score"
                  type="number"
                  value={formData.credit_score}
                  onChange={(e) => handleInputChange('credit_score', e.target.value)}
                  placeholder="750"
                  min="300"
                  max="900"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business_vintage_months">Business Vintage (Months)</Label>
                <Input
                  id="business_vintage_months"
                  type="number"
                  value={formData.business_vintage_months}
                  onChange={(e) => handleInputChange('business_vintage_months', e.target.value)}
                  placeholder="24"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collateral_offered">Collateral Offered (if any)</Label>
              <Textarea
                id="collateral_offered"
                value={formData.collateral_offered}
                onChange={(e) => handleInputChange('collateral_offered', e.target.value)}
                placeholder="Describe any collateral you can offer..."
                rows={2}
              />
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-2">
            <Label>Documents Available</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {documentTypes.map((document) => (
                <div key={document} className="flex items-center space-x-2">
                  <Checkbox
                    id={document}
                    checked={formData.documents_submitted.includes(document)}
                    onCheckedChange={(checked) => handleDocumentChange(document, checked as boolean)}
                  />
                  <Label htmlFor={document} className="text-sm">{document}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoanApplicationForm;