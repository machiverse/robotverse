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

interface LoanProductFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingProduct?: any;
}

const LoanProductForm = ({ onSuccess, onCancel, editingProduct }: LoanProductFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    product_name: '',
    loan_type: [] as string[],
    description: '',
    min_amount: '',
    max_amount: '',
    min_interest_rate: '',
    max_interest_rate: '',
    min_tenure_months: '',
    max_tenure_months: '',
    processing_fee_percentage: '',
    eligibility_criteria: '',
    required_documents: [] as string[],
    collateral_required: false,
    quick_approval: false,
    digital_process: false,
    prepayment_allowed: true
  });

  // Populate form when editing
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        product_name: editingProduct.product_name || '',
        loan_type: editingProduct.loan_type || [],
        description: editingProduct.description || '',
        min_amount: editingProduct.min_amount?.toString() || '',
        max_amount: editingProduct.max_amount?.toString() || '',
        min_interest_rate: editingProduct.min_interest_rate?.toString() || '',
        max_interest_rate: editingProduct.max_interest_rate?.toString() || '',
        min_tenure_months: editingProduct.min_tenure_months?.toString() || '',
        max_tenure_months: editingProduct.max_tenure_months?.toString() || '',
        processing_fee_percentage: editingProduct.processing_fee_percentage?.toString() || '',
        eligibility_criteria: editingProduct.eligibility_criteria || '',
        required_documents: editingProduct.required_documents || [],
        collateral_required: editingProduct.collateral_required || false,
        quick_approval: editingProduct.quick_approval || false,
        digital_process: editingProduct.digital_process || false,
        prepayment_allowed: editingProduct.prepayment_allowed !== false
      });
    }
  }, [editingProduct]);

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

  const documentTypes = [
    'PAN Card',
    'Aadhar Card',
    'Business Registration',
    'GST Certificate',
    'Income Tax Returns',
    'Bank Statements',
    'Financial Statements',
    'Business Plan',
    'Property Documents',
    'Salary Slips'
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
      required_documents: checked 
        ? [...prev.required_documents, document]
        : prev.required_documents.filter(d => d !== document)
    }));
  };

  const handleLoanTypeChange = (loanType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      loan_type: checked 
        ? [...prev.loan_type, loanType]
        : prev.loan_type.filter(t => t !== loanType)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to add loan products"
      });
      return;
    }

    if (!formData.product_name || formData.loan_type.length === 0 || !formData.max_amount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    setLoading(true);

    try {
      const productData = {
        provider_id: user.id,
        product_name: formData.product_name,
        loan_type: formData.loan_type,
        description: formData.description,
        min_amount: parseFloat(formData.min_amount) || 0,
        max_amount: parseFloat(formData.max_amount),
        min_interest_rate: parseFloat(formData.min_interest_rate) || 0,
        max_interest_rate: parseFloat(formData.max_interest_rate) || 0,
        min_tenure_months: parseInt(formData.min_tenure_months) || 1,
        max_tenure_months: parseInt(formData.max_tenure_months) || 12,
        processing_fee_percentage: parseFloat(formData.processing_fee_percentage) || 0,
        eligibility_criteria: formData.eligibility_criteria,
        required_documents: formData.required_documents,
        collateral_required: formData.collateral_required,
        quick_approval: formData.quick_approval,
        digital_process: formData.digital_process,
        prepayment_allowed: formData.prepayment_allowed,
        is_active: true
      };

      let error;
      if (editingProduct) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('loan_products')
          .update(productData)
          .eq('id', editingProduct.id);
        error = updateError;
      } else {
        // Insert new product
        const { error: insertError } = await supabase
          .from('loan_products')
          .insert(productData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: editingProduct ? "Loan product updated successfully!" : "Loan product added successfully!"
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding loan product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add loan product"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          {editingProduct ? 'Edit Loan Product' : 'Add Loan Product'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => handleInputChange('product_name', e.target.value)}
                placeholder="e.g., Quick Business Loan"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Loan Types * (Select multiple)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/20">
                {loanTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={formData.loan_type.includes(type)}
                      onCheckedChange={(checked) => handleLoanTypeChange(type, checked as boolean)}
                    />
                    <Label htmlFor={type} className="text-sm">{type}</Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select one or more loan types this product covers
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your loan product features and benefits..."
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
              <Label htmlFor="min_interest_rate">Min Interest Rate (%)</Label>
              <Input
                id="min_interest_rate"
                type="number"
                step="0.01"
                value={formData.min_interest_rate}
                onChange={(e) => handleInputChange('min_interest_rate', e.target.value)}
                placeholder="8.50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_interest_rate">Max Interest Rate (%)</Label>
              <Input
                id="max_interest_rate"
                type="number"
                step="0.01"
                value={formData.max_interest_rate}
                onChange={(e) => handleInputChange('max_interest_rate', e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="eligibility_criteria">Eligibility Criteria</Label>
            <Textarea
              id="eligibility_criteria"
              value={formData.eligibility_criteria}
              onChange={(e) => handleInputChange('eligibility_criteria', e.target.value)}
              placeholder="Minimum business vintage, turnover requirements, credit score..."
              rows={2}
            />
          </div>

          {/* Required Documents */}
          <div className="space-y-2">
            <Label>Required Documents</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {documentTypes.map((document) => (
                <div key={document} className="flex items-center space-x-2">
                  <Checkbox
                    id={document}
                    checked={formData.required_documents.includes(document)}
                    onCheckedChange={(checked) => handleDocumentChange(document, checked as boolean)}
                  />
                  <Label htmlFor={document} className="text-sm">{document}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label>Product Features</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="collateral_required"
                  checked={formData.collateral_required}
                  onCheckedChange={(checked) => handleInputChange('collateral_required', checked)}
                />
                <Label htmlFor="collateral_required" className="text-sm">Collateral Required</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quick_approval"
                  checked={formData.quick_approval}
                  onCheckedChange={(checked) => handleInputChange('quick_approval', checked)}
                />
                <Label htmlFor="quick_approval" className="text-sm">Quick Approval</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="digital_process"
                  checked={formData.digital_process}
                  onCheckedChange={(checked) => handleInputChange('digital_process', checked)}
                />
                <Label htmlFor="digital_process" className="text-sm">Digital Process</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prepayment_allowed"
                  checked={formData.prepayment_allowed}
                  onCheckedChange={(checked) => handleInputChange('prepayment_allowed', checked)}
                />
                <Label htmlFor="prepayment_allowed" className="text-sm">Prepayment Allowed</Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editingProduct ? 'Updating...' : 'Adding...') : (editingProduct ? 'Update Product' : 'Add Product')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoanProductForm;