import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, X } from 'lucide-react';

interface SupplierQuoteFormProps {
  onClose: () => void;
  supplierInfo: {
    name: string;
    email: string;
    company: string;
    phone?: string;
    sellerId?: string; // Add sellerId to track which seller this is for
  };
  itemInfo: {
    type: 'spare_part' | 'service' | 'logistics' | 'robot';
    name: string;
    id: string;
    model?: string;
    category?: string;
  };
  robotInfo?: {
    name: string;
    model: string;
    id: string;
  };
}

const SupplierQuoteForm = ({ onClose, supplierInfo, itemInfo, robotInfo }: SupplierQuoteFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: user?.user_metadata?.full_name || '',
    customerEmail: user?.email || '',
    customerPhone: '',
    company: '',
    urgency: 'medium',
    requirements: '',
    additionalInfo: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getItemTypeDisplay = () => {
    switch (itemInfo.type) {
      case 'spare_part': return 'Spare Part';
      case 'service': return 'Service';
      case 'logistics': return 'Logistics Service';
      case 'robot': return 'Robot';
      default: return 'Item';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to send quote requests"
      });
      return;
    }

    if (!formData.customerName || !formData.customerEmail || !formData.requirements) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    setLoading(true);

    try {
      // First, log the user request in the database
      const requestData = {
        user_id: user.id,
        seller_id: supplierInfo.sellerId || null, // This should be passed from the calling component
        request_type: 'get_quote',
        item_type: itemInfo.type,
        item_id: itemInfo.id,
        item_name: itemInfo.name,
        user_name: formData.customerName,
        company_name: formData.company || null,
        mobile_number: formData.customerPhone || null,
        email_address: formData.customerEmail,
        location: user.user_metadata?.location || null,
        requirements: formData.requirements,
        urgency: formData.urgency,
        additional_data: {
          item_model: itemInfo.model,
          item_category: itemInfo.category,
          robot_info: robotInfo,
          additional_info: formData.additionalInfo,
          supplier_info: {
            name: supplierInfo.name,
            email: supplierInfo.email,
            company: supplierInfo.company
          }
        }
      };

      const { error: dbError } = await supabase
        .from('user_requests')
        .insert([requestData]);

      if (dbError) {
        console.error('Error logging request:', dbError);
        // Don't fail the entire process if logging fails
      } else {
        // Send notification to seller about the quote request
        if (supplierInfo.sellerId) {
          try {
            // Fetch user profile for additional details
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('full_name, company_name, mobile_number, email, location')
              .eq('user_id', user.id)
              .single();

            await supabase.from('notifications').insert({
              user_id: supplierInfo.sellerId,
              notification_type: 'quote_request',
              title: 'New Quote Request - Use Credits to Unlock',
              message: `A buyer requested a quote for "${itemInfo.name}". Use credits to unlock buyer contact details.`,
              reference_id: itemInfo.id,
              reference_type: itemInfo.type,
              is_read: false
            });

            // Also create a lead entry in seller_leads for credit-based unlock
            await supabase.from('seller_leads').upsert({
              seller_id: supplierInfo.sellerId,
              buyer_id: user.id,
              lead_source: 'quote_request',
              item_type: itemInfo.type,
              item_id: itemInfo.id,
              item_name: itemInfo.name,
              buyer_name: formData.customerName || userProfile?.full_name || 'Unknown',
              buyer_email: formData.customerEmail || userProfile?.email || '',
              buyer_phone: formData.customerPhone || userProfile?.mobile_number || '',
              buyer_company: formData.company || userProfile?.company_name || '',
              buyer_location: userProfile?.location || '',
              requirements: formData.requirements,
              urgency: formData.urgency,
              status: 'new',
              is_unlocked: false,
              created_at: new Date().toISOString()
            }, { 
              onConflict: 'seller_id,buyer_id,item_id',
              ignoreDuplicates: false 
            });

            console.log('Quote notification and lead created for seller:', supplierInfo.sellerId);
          } catch (notificationError) {
            console.error('Error sending quote notification:', notificationError);
          }
        }
        // Cross-provider notifications for spare parts enquiries
        if (itemInfo.type === 'spare_part') {
          try {
            // Find related service providers
            const { data: serviceProviders } = await supabase
              .from('profiles')
              .select('user_id')
              .or('account_type.eq.seller,primary_user_type.eq.service_provider')
              .contains('user_roles', ['service_provider']);

            // Find related logistics providers
            const { data: logisticsProviders } = await supabase
              .from('profiles')
              .select('user_id')
              .or('account_type.eq.logistics,primary_user_type.eq.logistics_provider')
              .contains('user_roles', ['logistics_provider']);

            // Find related finance providers
            const { data: financeProviders } = await supabase
              .from('profiles')
              .select('user_id')
              .or('account_type.eq.finance,primary_user_type.eq.finance_provider')
              .contains('user_roles', ['finance_provider']);

            // Create cross-notifications
            const crossNotifications = [];
            
            if (serviceProviders) {
              serviceProviders.slice(0, 3).forEach(provider => {
                crossNotifications.push({
                  user_id: user.id,
                  seller_id: provider.user_id,
                  item_id: itemInfo.id,
                  item_type: `${itemInfo.type}_enquiry`,
                  item_name: itemInfo.name,
                  request_type: 'Related Service Enquiry',
                  user_name: formData.customerName,
                  company_name: formData.company || '',
                  mobile_number: formData.customerPhone || '',
                  email_address: formData.customerEmail,
                  location: user.user_metadata?.location || '',
                  requirements: `Related enquiry for ${itemInfo.name} - potential service opportunity`,
                  urgency: formData.urgency,
                  additional_data: {
                    original_item: itemInfo.name,
                    cross_notification: true,
                    source_request: itemInfo.type
                  }
                });
              });
            }

            if (logisticsProviders) {
              logisticsProviders.slice(0, 3).forEach(provider => {
                crossNotifications.push({
                  user_id: user.id,
                  seller_id: provider.user_id,
                  item_id: itemInfo.id,
                  item_type: `${itemInfo.type}_enquiry`,
                  item_name: itemInfo.name,
                  request_type: 'Shipping Enquiry',
                  user_name: formData.customerName,
                  company_name: formData.company || '',
                  mobile_number: formData.customerPhone || '',
                  email_address: formData.customerEmail,
                  location: user.user_metadata?.location || '',
                  requirements: `Potential shipping requirement for: ${itemInfo.name}`,
                  urgency: formData.urgency,
                  additional_data: {
                    original_item: itemInfo.name,
                    cross_notification: true,
                    source_request: itemInfo.type
                  }
                });
              });
            }

            if (financeProviders) {
              financeProviders.slice(0, 3).forEach(provider => {
                crossNotifications.push({
                  user_id: user.id,
                  seller_id: provider.user_id,
                  item_id: itemInfo.id,
                  item_type: `${itemInfo.type}_enquiry`,
                  item_name: itemInfo.name,
                  request_type: 'Financing Enquiry',
                  user_name: formData.customerName,
                  company_name: formData.company || '',
                  mobile_number: formData.customerPhone || '',
                  email_address: formData.customerEmail,
                  location: user.user_metadata?.location || '',
                  requirements: `Potential financing requirement for: ${itemInfo.name}`,
                  urgency: formData.urgency,
                  additional_data: {
                    original_item: itemInfo.name,
                    cross_notification: true,
                    source_request: itemInfo.type
                  }
                });
              });
            }

            // Insert cross-notifications
            if (crossNotifications.length > 0) {
              const { error: crossError } = await supabase
                .from('user_requests')
                .insert(crossNotifications);
              
              if (crossError) {
                console.warn('Cross-notification error:', crossError);
                // Don't fail the main request for cross-notification errors
              }
            }
          } catch (crossNotificationError) {
            console.warn('Cross-notification setup error:', crossNotificationError);
            // Don't fail the main request
          }
        }
      }

      // Send email via edge function
      const { data, error } = await supabase.functions.invoke('send-quote-request', {
        body: {
          supplierEmail: supplierInfo.email,
          supplierName: supplierInfo.name,
          supplierCompany: supplierInfo.company,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          customerCompany: formData.company,
          itemType: getItemTypeDisplay(),
          itemName: itemInfo.name,
          itemId: itemInfo.id,
          itemModel: itemInfo.model,
          itemCategory: itemInfo.category,
          robotName: robotInfo?.name,
          robotModel: robotInfo?.model,
          robotId: robotInfo?.id,
          urgency: formData.urgency,
          requirements: formData.requirements,
          additionalInfo: formData.additionalInfo
        }
      });

      if (error) throw error;

      toast({
        title: "Quote Request Sent",
        description: `Your quote request has been sent to ${supplierInfo.company || supplierInfo.name}`
      });

      onClose();
    } catch (error) {
      console.error('Error sending quote request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send quote request. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Request Quote - {getItemTypeDisplay()}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Supplier Information */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Sending to:</h3>
              <p className="text-sm">{supplierInfo.company || supplierInfo.name}</p>
              <p className="text-sm text-muted-foreground">{supplierInfo.email}</p>
            </div>

            {/* Item Information */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">{getItemTypeDisplay()} Details:</h3>
              <p className="text-sm">{itemInfo.name}</p>
              {itemInfo.model && <p className="text-sm text-muted-foreground">Model: {itemInfo.model}</p>}
              {itemInfo.category && <p className="text-sm text-muted-foreground">Category: {itemInfo.category}</p>}
              {robotInfo && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm font-medium">For Robot: {robotInfo.name}</p>
                  <p className="text-sm text-muted-foreground">Model: {robotInfo.model}</p>
                </div>
              )}
            </div>

            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Information</h3>
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
            </div>

            {/* Request Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Request Details</h3>
              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - No rush</SelectItem>
                    <SelectItem value="medium">Medium - Standard</SelectItem>
                    <SelectItem value="high">High - Within 24 hours</SelectItem>
                    <SelectItem value="urgent">Urgent - ASAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements & Specifications *</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  placeholder="Please describe your specific requirements, quantities needed, delivery timeline, budget range, etc."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder="Any additional details, special requirements, or questions..."
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Quote Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierQuoteForm;