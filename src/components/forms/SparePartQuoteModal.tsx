import { useState } from 'react';
import { pushEvent } from '@/lib/analytics';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Part {
  id: string;
  name: string;
  partNumber: string;
  price: number;
  sellerId?: string;
  seller?: {
    full_name?: string;
    company_name?: string;
    email?: string;
  };
}

interface SparePartQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: Part | null;
  userEmail: string;
  userName: string;
}

const SparePartQuoteModal = ({ isOpen, onClose, part, userEmail, userName }: SparePartQuoteModalProps) => {
  const [formData, setFormData] = useState({
    quantity: '1',
    urgency: 'standard',
    message: '',
    companyName: '',
    phone: '',
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!part) return;

    setIsSubmitting(true);
    
    try {
      // Create quote request in database
      const { error: requestError } = await supabase
        .from('user_requests')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          user_name: userName,
          company_name: formData.companyName,
          mobile_number: formData.phone,
          email_address: userEmail,
          location: formData.location,
          request_type: 'Request Quote',
          item_type: 'spare_parts',
          item_id: part.id,
          item_name: part.name,
          seller_id: part.sellerId || '',
          status: 'pending',
          urgency: formData.urgency,
          requirements: formData.message,
          additional_data: {
            quantity: parseInt(formData.quantity),
            partNumber: part.partNumber,
            estimatedPrice: part.price
          }
        });

      if (requestError) throw requestError;

      // Create notification for seller
      if (part.sellerId) {
        await supabase
          .from('seller_notifications')
          .insert({
            seller_id: part.sellerId,
            title: 'New Quote Request',
            message: `${userName} requested a quote for ${part.name} (Qty: ${formData.quantity})`,
            notification_type: 'quote_request'
          });

        // Send email notifications via Zoho SMTP
        try {
          await supabase.functions.invoke('send-quote-request', {
            body: {
              type: 'quote_request',
              sellerEmail: part.seller?.email || '',
              sellerName: part.seller?.full_name || '',
              sellerCompany: part.seller?.company_name || '',
              buyerName: userName,
              buyerEmail: userEmail,
              itemType: 'Spare Part',
              itemName: part.name,
              itemModel: part.partNumber,
              urgency: formData.urgency,
              requirements: formData.message || `Quote request for ${part.name}, Qty: ${formData.quantity}`,
            }
          });
        } catch (emailError) {
          console.error('Email sending error:', emailError);
        }
      }

      pushEvent('generate_lead', { item_id: part.id, item_type: 'part', value: part.price || undefined, currency: 'INR' });
      toast({
        title: "Quote Request Sent",
        description: `Your request for ${part.name} has been sent to the seller.`,
      });

      onClose();
      setFormData({
        quantity: '1',
        urgency: 'standard',
        message: '',
        companyName: '',
        phone: '',
        location: ''
      });
    } catch (error) {
      console.error('Error sending quote request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send quote request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!part) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Request Quote for {part.name}
          </DialogTitle>
          <DialogDescription>
            Fill out the details below to request a quote from the seller.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Part Details */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Part Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Part Number:</span>
                <p className="font-medium">{part.partNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Listed Price:</span>
                <p className="font-medium">₹{part.price.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Seller:</span>
                <p className="font-medium">{part.seller?.company_name || part.seller?.full_name || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Required *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select value={formData.urgency} onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Within 2 weeks</SelectItem>
                  <SelectItem value="standard">Standard - Within 1 week</SelectItem>
                  <SelectItem value="high">High - Within 3 days</SelectItem>
                  <SelectItem value="urgent">Urgent - ASAP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="City, State"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Additional Requirements</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Any specific requirements, delivery preferences, or questions..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Quote Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SparePartQuoteModal;