import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserProductRequests } from '@/hooks/useUserProductRequests';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from '@/lib/router-compat';
import { Bot, Package, Wrench, Send, Loader2, Search, AlertCircle, LogIn } from 'lucide-react';

interface UserProductRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProductType?: 'robot' | 'spare_part' | 'service';
  initialQuery?: string;
}

const PRODUCT_TYPES = [
  { value: 'robot', label: 'Robot / Automation Equipment', icon: Bot, color: 'bg-blue-100 text-blue-800' },
  { value: 'spare_part', label: 'Spare Parts / Components', icon: Package, color: 'bg-green-100 text-green-800' },
  { value: 'service', label: 'Service / Maintenance', icon: Wrench, color: 'bg-purple-100 text-purple-800' },
];

const UserProductRequestModal = ({ open, onOpenChange, defaultProductType, initialQuery }: UserProductRequestModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submitRequest } = useUserProductRequests();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    product_type: defaultProductType || '',
    product_name: '',
    brand: '',
    specifications: '',
    quantity: '1',
    budget: '',
    location: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });

  // Auto-fill from logged-in user's profile when modal opens
  useEffect(() => {
    if (open && user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email, mobile_number, phone, location, company_name')
          .eq('user_id', user.id)
          .single();

        setForm(prev => ({
          ...prev,
          contact_name: data?.full_name || user.user_metadata?.full_name || prev.contact_name || '',
          contact_email: data?.email || user.email || prev.contact_email || '',
          contact_phone: data?.mobile_number || data?.phone || prev.contact_phone || '',
          location: data?.location || prev.location || '',
        }));
      };
      fetchProfile();
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;

    const normalizedQuery = initialQuery?.trim() || '';
    const aiSpecification = normalizedQuery
      ? `AI assistant query: ${normalizedQuery}\nPlease help source the closest matching product, spare part, EOAT, or service option.`
      : '';

    setForm(prev => ({
      ...prev,
      product_type: defaultProductType || prev.product_type,
      product_name: normalizedQuery || prev.product_name,
      specifications: normalizedQuery ? aiSpecification : prev.specifications,
    }));
  }, [open, defaultProductType, initialQuery]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_type || !form.product_name || !form.contact_name || !form.contact_email) return;
    
    setSubmitting(true);
    const result = await submitRequest({
      ...form,
      quantity: parseInt(form.quantity) || 1,
    });
    setSubmitting(false);
    
    if (result) {
      onOpenChange(false);
      // Reset product fields but keep contact details (auto-filled)
      setForm(prev => ({
        ...prev,
        product_type: defaultProductType || '',
        product_name: '',
        brand: '',
        specifications: '',
        quantity: '1',
        budget: '',
      }));
    }
  };

  // If not logged in, show login prompt
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <LogIn className="w-5 h-5 text-primary" />
              Login Required
            </DialogTitle>
            <DialogDescription>
              You need to be logged in to submit a product request. Please sign in or create an account first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Sign in to submit your requirement and get connected with the best sellers and service providers.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => { onOpenChange(false); navigate('/auth'); }}>
              <LogIn className="w-4 h-4 mr-2" /> Sign In / Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Search className="w-5 h-5 text-primary" />
            Can't Find What You Need?
          </DialogTitle>
          <DialogDescription>
            Submit your requirement and we'll connect you with the best sellers and service providers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">What are you looking for? *</Label>
            <div className="grid grid-cols-3 gap-3">
              {PRODUCT_TYPES.map(pt => {
                const Icon = pt.icon;
                const selected = form.product_type === pt.value;
                return (
                  <Card
                    key={pt.value}
                    className={`cursor-pointer transition-all ${selected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                    onClick={() => handleChange('product_type', pt.value)}
                  >
                    <CardContent className="flex flex-col items-center p-4 gap-2">
                      <Icon className={`w-6 h-6 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs text-center font-medium">{pt.label}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product_name" className="text-sm font-medium">Product / Service Name *</Label>
              <Input id="product_name" value={form.product_name} onChange={e => handleChange('product_name', e.target.value)} placeholder="e.g., 6-Axis Welding Robot" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="brand" className="text-sm font-medium">Brand (Optional)</Label>
              <Input id="brand" value={form.brand} onChange={e => handleChange('brand', e.target.value)} placeholder="e.g., FANUC, ABB, KUKA" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="quantity" className="text-sm font-medium">Quantity</Label>
              <Input id="quantity" type="number" min="1" value={form.quantity} onChange={e => handleChange('quantity', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="budget" className="text-sm font-medium">Budget Range (Optional)</Label>
              <Input id="budget" value={form.budget} onChange={e => handleChange('budget', e.target.value)} placeholder="e.g., ₹5,00,000 - ₹10,00,000" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="specifications" className="text-sm font-medium">Specifications / Description</Label>
              <Textarea id="specifications" value={form.specifications} onChange={e => handleChange('specifications', e.target.value)} rows={3} placeholder="Describe your requirements, specifications, use case..." className="mt-1" />
            </div>
            <div>
              <Label htmlFor="location" className="text-sm font-medium">Location</Label>
              <Input id="location" value={form.location} onChange={e => handleChange('location', e.target.value)} placeholder="City, State" className="mt-1" />
            </div>
          </div>

          {/* Contact Details */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">Your Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contact_name" className="text-sm font-medium">Name *</Label>
                <Input id="contact_name" value={form.contact_name} onChange={e => handleChange('contact_name', e.target.value)} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="contact_email" className="text-sm font-medium">Email *</Label>
                <Input id="contact_email" type="email" value={form.contact_email} onChange={e => handleChange('contact_email', e.target.value)} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="contact_phone" className="text-sm font-medium">Phone</Label>
                <Input id="contact_phone" value={form.contact_phone} onChange={e => handleChange('contact_phone', e.target.value)} placeholder="+91 XXXXX XXXXX" className="mt-1" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !form.product_type || !form.product_name}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4 mr-2" /> Submit Request</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserProductRequestModal;
