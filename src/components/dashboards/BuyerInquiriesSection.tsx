import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Eye, 
  Lock, 
  Unlock, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  UserX,
  Send,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BuyerInquiry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_company: string | null;
  user_mobile: string | null;
  item_id: string | null;
  item_type: string | null;
  button_type: string;
  button_name: string;
  created_at: string;
  additional_data: any;
}

interface BuyerInquiriesSectionProps {
  sellerId: string;
  itemType?: string; // 'robots', 'spare_parts', 'services', 'logistics', 'finance'
}

const BuyerInquiriesSection = ({ sellerId, itemType }: BuyerInquiriesSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inquiries, setInquiries] = useState<BuyerInquiry[]>([]);
  const [accessRequests, setAccessRequests] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [requestingAccess, setRequestingAccess] = useState<string | null>(null);

  useEffect(() => {
    if (sellerId) {
      fetchInquiries();
      fetchAccessRequests();
    }
  }, [sellerId, itemType]);

  const fetchInquiries = async () => {
    try {
      let query = supabase
        .from('button_interactions')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      // Filter by item type if provided
      if (itemType) {
        query = query.eq('item_type', itemType);
      }

      // Filter for inquiry-type interactions
      query = query.in('button_type', ['inquiry', 'contact', 'quote_request', 'chat_start', 'robot_view', 'spare_part_view', 'service_view']);

      const { data, error } = await query;

      if (error) throw error;

      setInquiries(data || []);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('buyer_access_requests')
        .select('*')
        .eq('seller_id', sellerId);

      if (error) throw error;

      // Create a map of inquiry_id to access request
      const requestMap: Record<string, any> = {};
      (data || []).forEach(request => {
        requestMap[request.inquiry_id] = request;
      });
      setAccessRequests(requestMap);
    } catch (error) {
      console.error('Error fetching access requests:', error);
    }
  };

  const requestBuyerAccess = async (inquiry: BuyerInquiry) => {
    if (!user) return;

    setRequestingAccess(inquiry.id);
    try {
      // Create access request
      const { error: insertError } = await supabase
        .from('buyer_access_requests')
        .insert({
          seller_id: sellerId,
          buyer_id: inquiry.user_id,
          inquiry_id: inquiry.id,
          inquiry_type: inquiry.item_type || 'general',
          item_id: inquiry.item_id,
          item_name: inquiry.additional_data?.item_name || 'Unknown Item',
          status: 'pending'
        });

      if (insertError) {
        // Check if it's a duplicate
        if (insertError.code === '23505') {
          toast({
            title: "Request Already Sent",
            description: "You have already requested access for this buyer.",
            variant: "default"
          });
        } else {
          throw insertError;
        }
      } else {
        // Create notification for admin
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: sellerId, // Will be updated to admin in production
            notification_type: 'buyer_access_request',
            title: 'New Buyer Access Request',
            message: `A seller has requested access to view buyer details for ${inquiry.additional_data?.item_name || 'an item'}.`,
            reference_id: inquiry.id,
            reference_type: 'buyer_access_request'
          });

        toast({
          title: "Access Request Sent",
          description: "Your request has been sent to the admin for approval.",
        });

        // Refresh access requests
        fetchAccessRequests();
      }
    } catch (error) {
      console.error('Error requesting access:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send access request. Please try again."
      });
    } finally {
      setRequestingAccess(null);
    }
  };

  const getAccessStatus = (inquiryId: string): 'none' | 'pending' | 'approved' | 'rejected' => {
    const request = accessRequests[inquiryId];
    if (!request) return 'none';
    return request.status;
  };

  const getMaskedValue = (value: string | null, hasAccess: boolean): string => {
    if (hasAccess && value) return value;
    return 'XXXXX';
  };

  const getInquiryTypeBadge = (buttonType: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      'inquiry': { color: 'bg-blue-100 text-blue-800', label: 'Inquiry' },
      'contact': { color: 'bg-green-100 text-green-800', label: 'Contact' },
      'quote_request': { color: 'bg-purple-100 text-purple-800', label: 'Quote Request' },
      'chat_start': { color: 'bg-orange-100 text-orange-800', label: 'Chat' },
      'robot_view': { color: 'bg-cyan-100 text-cyan-800', label: 'View' },
      'spare_part_view': { color: 'bg-cyan-100 text-cyan-800', label: 'View' },
      'service_view': { color: 'bg-cyan-100 text-cyan-800', label: 'View' },
    };

    const config = variants[buttonType] || { color: 'bg-gray-100 text-gray-800', label: buttonType };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: 'none' | 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Buyer Inquiries
        </CardTitle>
        <CardDescription>
          View buyer interactions with your listings. Request admin approval to unlock buyer details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {inquiries.length === 0 ? (
          <div className="text-center py-12">
            <UserX className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No buyer inquiries yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              When buyers view or interact with your listings, their inquiries will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Product/Service</TableHead>
                  <TableHead>Inquiry Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry) => {
                  const accessStatus = getAccessStatus(inquiry.id);
                  const hasAccess = accessStatus === 'approved';

                  return (
                    <TableRow key={inquiry.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {hasAccess ? (
                            <Unlock className="w-4 h-4 text-green-600" />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                          {getMaskedValue(inquiry.user_name, hasAccess)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getMaskedValue(inquiry.user_company, hasAccess)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div>{getMaskedValue(inquiry.user_mobile, hasAccess)}</div>
                          <div className="text-muted-foreground">
                            {getMaskedValue(inquiry.user_email, hasAccess)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {inquiry.additional_data?.item_name || 'Unknown'}
                          </div>
                          <div className="text-muted-foreground capitalize">
                            {inquiry.item_type?.replace('_', ' ') || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getInquiryTypeBadge(inquiry.button_type)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(inquiry.created_at), 'MMM dd, yyyy')}
                          <br />
                          {format(new Date(inquiry.created_at), 'hh:mm a')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(accessStatus)}
                      </TableCell>
                      <TableCell>
                        {accessStatus === 'none' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => requestBuyerAccess(inquiry)}
                            disabled={requestingAccess === inquiry.id}
                            className="flex items-center gap-2"
                          >
                            {requestingAccess === inquiry.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            Request Access
                          </Button>
                        )}
                        {accessStatus === 'pending' && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Awaiting Admin
                          </span>
                        )}
                        {accessStatus === 'approved' && hasAccess && (
                          <Button size="sm" variant="default">
                            Start Chat
                          </Button>
                        )}
                        {accessStatus === 'rejected' && (
                          <span className="text-sm text-destructive">
                            Request Denied
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BuyerInquiriesSection;
