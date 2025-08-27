import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, FileText, CreditCard, Bot, Building2, User, Phone, Mail, Calculator, Calendar, Target } from 'lucide-react';

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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-6 border-b border-border">
          <DialogTitle className="flex items-center text-2xl font-bold">
            <CreditCard className="w-6 h-6 mr-3 text-blue-600" />
            Equipment Financing Application
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground">
            Apply for financing to acquire cutting-edge robotics equipment for your business
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Robot Details & Provider Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Robot Details Card */}
{robotDetails && (
  <Card className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 border-0 drop-shadow-xl rounded-2xl">
    <CardHeader className="flex items-center gap-2 pb-0">
      <Bot className="w-6 h-6 text-blue-300" />
      <CardTitle className="text-white text-xl font-bold tracking-wide">Equipment Details</CardTitle>
    </CardHeader>
    <Separator className="bg-blue-500 opacity-30 my-3" />
    <CardContent className="space-y-5 text-white">
      <div>
        <Label className="uppercase text-xs text-blue-200 font-bold tracking-wide mb-1">Robot Name</Label>
        <div className="font-extrabold text-2xl text-white">{robotDetails.name}</div>
      </div>
      <div>
        <Label className="uppercase text-xs text-blue-200 font-bold tracking-wide mb-1">Model</Label>
        <div className="font-medium text-lg text-blue-100">{robotDetails.model}</div>
      </div>
      <div>
        <Label className="uppercase text-xs text-blue-200 font-bold tracking-wide mb-1">Type</Label>
        <Badge className="bg-blue-600 text-white px-2 py-1 font-semibold text-sm">{robotDetails.type}</Badge>
      </div>
      <div>
        <Label className="uppercase text-xs text-blue-200 font-bold tracking-wide mb-1">Investment Amount</Label>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-300" />
          <span className="font-bold text-2xl text-green-400 tracking-wide">
            {robotDetails.currency === 'USD' ? '$' : robotDetails.currency === 'EUR' ? '€' : '₹'}
            {robotDetails.price.toLocaleString()}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
)}

{/* Finance Partner (Professional) */}
{financeProvider && (
  <Card className="bg-gradient-to-br from-green-800 via-green-700 to-green-900 border-0 drop-shadow-xl rounded-2xl mt-8">
    <CardHeader className="flex items-center gap-2 pb-0">
      <Building2 className="w-6 h-6 text-green-300" />
      <CardTitle className="text-white text-xl font-bold tracking-wide">Finance Partner</CardTitle>
    </CardHeader>
    <Separator className="bg-green-500 opacity-30 my-3" />
    <CardContent>
      <div className="font-bold text-lg text-white mb-1">
        {financeProvider.profiles?.company_name || financeProvider.profiles?.full_name}
      </div>
      <div className="text-md text-green-200">Trusted financing solutions for growing businesses</div>
    </CardContent>
  </Card>
)}

{/* Quick EMI Estimate (Professional) */}
{robotDetails && (
  <Card className="bg-gradient-to-br from-orange-800 via-orange-700 to-orange-900 border-0 drop-shadow-xl rounded-2xl mt-8">
    <CardHeader className="flex items-center gap-2 pb-0">
      <Calculator className="w-6 h-6 text-orange-300" />
      <CardTitle className="text-white text-xl font-bold tracking-wide">Quick EMI Estimate</CardTitle>
    </CardHeader>
    <Separator className="bg-orange-500 opacity-30 my-3" />
    <CardContent>
      <div className="text-white font-medium mb-2">Estimated EMI <span className="text-orange-200 font-semibold">(60 months @ 12%)</span></div>
      <div className="font-extrabold text-3xl text-orange-200 mb-2">
        ₹{Math.round((robotDetails.price * 0.12 * Math.pow(1.12, 5)) / (Math.pow(1.12, 5) - 1) / 12).toLocaleString()} / month
      </div>
      <div className="text-xs text-orange-100 italic">*Actual rates may vary</div>
    </CardContent>
  </Card>
)}
          </div>

          {/* Right Column - Application Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="applicant_name" className="text-sm font-medium">Full Name *</Label>
                      <Input
                        id="applicant_name"
                        value={formData.applicant_name}
                        onChange={(e) => handleInputChange('applicant_name', e.target.value)}
                        required
                        className="mt-1"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="applicant_email" className="text-sm font-medium">Email Address *</Label>
                      <Input
                        id="applicant_email"
                        type="email"
                        value={formData.applicant_email}
                        onChange={(e) => handleInputChange('applicant_email', e.target.value)}
                        required
                        className="mt-1"
                        placeholder="your.email@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="applicant_phone" className="text-sm font-medium">Phone Number</Label>
                      <Input
                        id="applicant_phone"
                        value={formData.applicant_phone}
                        onChange={(e) => handleInputChange('applicant_phone', e.target.value)}
                        className="mt-1"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="business_type" className="text-sm font-medium">Business Type</Label>
                      <Select onValueChange={(value) => handleInputChange('business_type', value)}>
                        <SelectTrigger className="mt-1">
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
                </CardContent>
              </Card>

              {/* Loan Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Target className="w-5 h-5 mr-2 text-green-600" />
                    Loan Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="loan_type" className="text-sm font-medium">Loan Type *</Label>
                      <Select onValueChange={(value) => handleInputChange('loan_type', value)} value={formData.loan_type}>
                        <SelectTrigger className="mt-1">
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
                      <Label htmlFor="amount_requested" className="text-sm font-medium">Loan Amount (₹) *</Label>
                      <Input
                        id="amount_requested"
                        type="number"
                        value={formData.amount_requested}
                        onChange={(e) => handleInputChange('amount_requested', e.target.value)}
                        required
                        className="mt-1"
                        placeholder="Enter loan amount"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="purpose" className="text-sm font-medium">Purpose & Business Impact</Label>
                      <Textarea
                        id="purpose"
                        value={formData.purpose}
                        onChange={(e) => handleInputChange('purpose', e.target.value)}
                        rows={4}
                        className="mt-1"
                        placeholder="Describe how this robot will enhance your business operations, expected productivity gains, and ROI projections..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <DollarSign className="w-5 h-5 mr-2 text-purple-600" />
                    Financial Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="monthly_income" className="text-sm font-medium">Monthly Revenue (₹)</Label>
                      <Input
                        id="monthly_income"
                        type="number"
                        value={formData.monthly_income}
                        onChange={(e) => handleInputChange('monthly_income', e.target.value)}
                        className="mt-1"
                        placeholder="Enter monthly business revenue"
                      />
                    </div>
                    <div>
                      <Label htmlFor="credit_score" className="text-sm font-medium">Credit Score</Label>
                      <Input
                        id="credit_score"
                        type="number"
                        min="300"
                        max="900"
                        value={formData.credit_score}
                        onChange={(e) => handleInputChange('credit_score', e.target.value)}
                        className="mt-1"
                        placeholder="300-900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="business_vintage_months" className="text-sm font-medium">Business Age (Months)</Label>
                      <Input
                        id="business_vintage_months"
                        type="number"
                        value={formData.business_vintage_months}
                        onChange={(e) => handleInputChange('business_vintage_months', e.target.value)}
                        className="mt-1"
                        placeholder="Years in business"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor="collateral_offered" className="text-sm font-medium">Collateral & Security</Label>
                      <Textarea
                        id="collateral_offered"
                        value={formData.collateral_offered}
                        onChange={(e) => handleInputChange('collateral_offered', e.target.value)}
                        rows={3}
                        className="mt-1"
                        placeholder="Describe any assets, property, or other collateral you can offer as security for this loan..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter className="pt-6 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  size="lg"
                >
                  Cancel Application
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <FileText className="w-4 h-4 mr-2 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Submit Loan Application
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanApplicationModal;