import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Loader2, Bot, User, Phone, Building, MapPin, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CouponApplyBox from '@/components/coupons/CouponApplyBox';
import { recordCouponUsage } from '@/hooks/useCoupons';

interface RobotQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  robot: {
    id: string;
    name: string;
    model: string;
    brand?: string;
    price?: number;
    currency?: string;
    robot_type?: string;
    seller_id: string;
    images?: string[];
    profiles: {
      full_name: string;
      company_name: string;
      phone: string;
      mobile_number: string;
      email: string;
      location: string;
    };
  };
}

const RobotQuoteModal = ({ isOpen, onClose, robot }: RobotQuoteModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [coupon, setCoupon] = useState<{ couponId: string; code: string; discount: number; finalPrice: number } | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    company: '',
    location: '',
    urgency: 'medium',
    requirements: '',
    quantity: '1'
  });

  const unitPrice = Number(robot.price || 0);
  const qty = Math.max(1, parseInt(formData.quantity || '1', 10) || 1);
  const subtotal = unitPrice * qty;
  const discount = coupon ? coupon.discount * qty : 0;
  const total = Math.max(0, subtotal - discount);

  // Fetch user profile to auto-fill form
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, company_name, mobile_number, email, location, phone')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setUserProfile(data);
          setFormData(prev => ({
            ...prev,
            customerName: data.full_name || user.user_metadata?.full_name || '',
            customerEmail: data.email || user.email || '',
            customerPhone: data.mobile_number || data.phone || '',
            company: data.company_name || '',
            location: data.location || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback to user metadata
        setFormData(prev => ({
          ...prev,
          customerName: user.user_metadata?.full_name || '',
          customerEmail: user.email || ''
        }));
      }
    };

    if (isOpen) {
      fetchUserProfile();
      setSuccess(false);
    }
  }, [user, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to send quote requests');
      return;
    }

    if (!formData.customerName || !formData.customerEmail) {
      toast.error('Please fill in your name and email');
      return;
    }

    setLoading(true);

    try {
      // 1. Create user request record
      const requestData = {
        user_id: user.id,
        seller_id: robot.seller_id,
        request_type: 'get_quote',
        item_type: 'robot',
        item_id: robot.id,
        item_name: robot.name,
        user_name: formData.customerName,
        company_name: formData.company || null,
        mobile_number: formData.customerPhone || null,
        email_address: formData.customerEmail,
        location: formData.location || null,
        requirements: formData.requirements || `Quote request for ${robot.name}`,
        urgency: formData.urgency,
        additional_data: {
          robot_model: robot.model,
          robot_brand: robot.brand,
          robot_type: robot.robot_type,
          robot_price: robot.price,
          robot_currency: robot.currency,
          quantity: formData.quantity,
          auto_submitted: true,
          coupon_code: coupon?.code || null,
          coupon_id: coupon?.couponId || null,
          unit_price: unitPrice,
          subtotal,
          discount_amount: discount,
          final_total: total,
        }
      };

      const { error: dbError } = await supabase
        .from('user_requests')
        .insert([requestData]);

      if (dbError) {
        console.error('Error logging request:', dbError);
      }

      // Record coupon usage (if any)
      if (coupon) {
        try {
          await recordCouponUsage({
            couponId: coupon.couponId,
            robotId: robot.id,
            originalPrice: subtotal,
            orderReference: `quote:${robot.id}:${Date.now()}`,
          });
        } catch (err) {
          console.error('Coupon record error:', err);
        }
      }

      // 2. Create notification for seller
      await supabase.from('notifications').insert({
        user_id: robot.seller_id,
        notification_type: 'quote_request',
        title: 'New Quote Request - Use Credits to Unlock',
        message: `A buyer requested a quote for "${robot.name}" (${robot.model}). Use credits to unlock buyer contact details.`,
        reference_id: robot.id,
        reference_type: 'robot',
        is_read: false
      });

      // 3. Create seller lead with locked buyer info
      await supabase.from('seller_leads').upsert({
        seller_id: robot.seller_id,
        buyer_id: user.id,
        lead_source: 'quote_request',
        item_type: 'robot',
        item_id: robot.id,
        item_name: `${robot.brand || ''} ${robot.name} - ${robot.model}`.trim(),
        buyer_name: formData.customerName,
        buyer_email: formData.customerEmail,
        buyer_phone: formData.customerPhone || '',
        buyer_company: formData.company || '',
        buyer_location: formData.location || '',
        requirements: formData.requirements || `Quote request for quantity: ${formData.quantity}`,
        urgency: formData.urgency,
        status: 'new',
        is_unlocked: false,
        created_at: new Date().toISOString()
      }, { 
        onConflict: 'seller_id,buyer_id,item_id',
        ignoreDuplicates: false 
      });

      // 4. Send email notification via edge function (Zoho SMTP)
      try {
        await supabase.functions.invoke('send-quote-request', {
          body: {
            type: 'quote_request',
            sellerEmail: robot.profiles.email,
            sellerName: robot.profiles.full_name,
            sellerCompany: robot.profiles.company_name,
            buyerName: formData.customerName,
            buyerEmail: formData.customerEmail,
            buyerPhone: formData.customerPhone,
            buyerCompany: formData.company,
            itemType: 'Robot',
            itemName: robot.name,
            itemModel: robot.model,
            itemCategory: robot.robot_type,
            urgency: formData.urgency,
            requirements: formData.requirements || `Quote request for quantity: ${formData.quantity}`,
            additionalInfo: `Brand: ${robot.brand || 'N/A'}, Price: ${robot.price ? `${robot.currency} ${robot.price}` : 'On Request'}`
          }
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

      setSuccess(true);
      toast.success('Quote request sent successfully!');
      
      // Close after showing success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error sending quote request:', error);
      toast.error('Failed to send quote request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!robot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Get Quote for Robot
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold">Quote Request Sent!</h3>
            <p className="text-muted-foreground text-center">
              The seller has been notified and will contact you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Robot Information */}
            <div className="bg-muted/50 p-4 rounded-lg flex gap-4">
              {robot.images?.[0] && (
                <img 
                  src={robot.images[0]} 
                  alt={robot.name}
                  className="w-20 h-20 object-contain rounded-lg bg-background"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {robot.brand && (
                      <Badge variant="outline" className="text-xs mb-1">{robot.brand}</Badge>
                    )}
                    <h3 className="font-semibold truncate">{robot.name}</h3>
                    <p className="text-sm text-muted-foreground">{robot.model}</p>
                  </div>
                  {robot.price && (
                    <p className="font-bold text-primary whitespace-nowrap">
                      {robot.currency} {robot.price.toLocaleString()}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Seller: {robot.profiles.company_name || robot.profiles.full_name}
                </p>
              </div>
            </div>

            {/* Auto-filled Customer Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Your information (auto-filled from profile)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Full Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="Your company name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="City, State"
                />
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Request Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Required</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - No rush</SelectItem>
                      <SelectItem value="medium">Medium - Standard</SelectItem>
                      <SelectItem value="high">High - Within a week</SelectItem>
                      <SelectItem value="urgent">Urgent - ASAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Additional Requirements (Optional)</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  placeholder="Any specific requirements, questions, or details you'd like to include..."
                  rows={3}
                />
              </div>
            </div>

            {/* Coupon + Price Summary */}
            {unitPrice > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Pricing</h3>
                <CouponApplyBox
                  sellerId={robot.seller_id}
                  robotId={robot.id}
                  amount={unitPrice}
                  onApplied={(r) => setCoupon(r)}
                  onCleared={() => setCoupon(null)}
                />
                <div className="rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit price × {qty}</span>
                    <span>{robot.currency || '₹'} {subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {coupon && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Coupon "{coupon.code}"</span>
                      <span>− {robot.currency || '₹'} {discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                    <span>Total</span>
                    <span className="text-primary">{robot.currency || '₹'} {total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Info Note */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Note:</strong> Your quote request will be sent to the seller. 
                They will need to use credits to view your contact details and respond to your inquiry.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Quote Request
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RobotQuoteModal;
