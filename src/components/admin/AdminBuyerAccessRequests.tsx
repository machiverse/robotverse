import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  User,
  Building2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AccessRequest {
  id: string;
  seller_id: string;
  buyer_id: string;
  inquiry_id: string;
  inquiry_type: string;
  item_id: string | null;
  item_name: string | null;
  status: string;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  seller?: {
    full_name: string;
    company_name: string;
    email: string;
  };
  buyer?: {
    full_name: string;
    company_name: string;
    email: string;
    mobile_number: string;
  };
}

const AdminBuyerAccessRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchAccessRequests();
  }, []);

  const fetchAccessRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('buyer_access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch seller and buyer profiles for each request
      const enrichedRequests = await Promise.all(
        (data || []).map(async (request) => {
          // Fetch seller profile
          const { data: sellerData } = await supabase
            .from('profiles')
            .select('full_name, company_name, email')
            .eq('user_id', request.seller_id)
            .single();

          // Fetch buyer profile
          const { data: buyerData } = await supabase
            .from('profiles')
            .select('full_name, company_name, email, mobile_number')
            .eq('user_id', request.buyer_id)
            .single();

          return {
            ...request,
            seller: sellerData,
            buyer: buyerData
          };
        })
      );

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching access requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load access requests"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: AccessRequest) => {
    if (!user) return;

    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('buyer_access_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: 'Approved by admin'
        })
        .eq('id', request.id);

      if (error) throw error;

      // Notify seller
      await supabase
        .from('notifications')
        .insert({
          user_id: request.seller_id,
          notification_type: 'buyer_access_approved',
          title: 'Buyer Access Approved',
          message: `Your request to view buyer details for "${request.item_name}" has been approved. You can now see the full buyer information.`,
          reference_id: request.id,
          reference_type: 'buyer_access_request'
        });

      toast({
        title: "Access Approved",
        description: "The seller can now view the buyer's details.",
      });

      fetchAccessRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve access request"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!user || !selectedRequest) return;

    setProcessingId(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('buyer_access_requests')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes || 'Rejected by admin'
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Notify seller
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedRequest.seller_id,
          notification_type: 'buyer_access_rejected',
          title: 'Buyer Access Denied',
          message: `Your request to view buyer details for "${selectedRequest.item_name}" has been denied. ${adminNotes ? `Reason: ${adminNotes}` : ''}`,
          reference_id: selectedRequest.id,
          reference_type: 'buyer_access_request'
        });

      toast({
        title: "Access Rejected",
        description: "The seller has been notified.",
      });

      setShowRejectDialog(false);
      setSelectedRequest(null);
      setAdminNotes('');
      fetchAccessRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject access request"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Buyer Access Requests
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingCount} Pending</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve seller requests to view buyer contact details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No access requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Buyer (Protected)</TableHead>
                    <TableHead>Product/Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{request.seller?.full_name || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            {request.seller?.company_name || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{request.buyer?.full_name || 'Unknown'}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.buyer?.email || 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.buyer?.mobile_number || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{request.item_name || 'Unknown'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {request.inquiry_type?.replace('_', ' ') || 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(request.created_at), 'MMM dd, yyyy')}
                          <br />
                          {format(new Date(request.created_at), 'hh:mm a')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(request)}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectDialog(true);
                              }}
                              disabled={processingId === request.id}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {request.approved_at && (
                              <>
                                Processed on
                                <br />
                                {format(new Date(request.approved_at), 'MMM dd, yyyy')}
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reject Access Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this access request? The seller will not be able to see the buyer's contact details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Textarea
                placeholder="Enter reason for rejection..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingId === selectedRequest?.id}
            >
              {processingId === selectedRequest?.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminBuyerAccessRequests;
