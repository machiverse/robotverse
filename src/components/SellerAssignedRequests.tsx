import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSellerAssignments } from '@/hooks/useUserProductRequests';
import { Bot, Package, Wrench, Send, Eye, Loader2, MessageSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SellerAssignedRequestsProps {
  categoryFilter?: 'robot' | 'spare_part' | 'service';
}

const SellerAssignedRequests = ({ categoryFilter }: SellerAssignedRequestsProps) => {
  const { myAssignments, loading, fetchMyAssignments, respondToAssignment } = useSellerAssignments();
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [responseForm, setResponseForm] = useState({
    quotation_amount: '',
    quotation_details: '',
    product_details: '',
    seller_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchMyAssignments(); }, [fetchMyAssignments]);

  const filtered = categoryFilter 
    ? myAssignments.filter(a => a.request?.product_type === categoryFilter)
    : myAssignments;

  const openResponseModal = (assignment: any) => {
    setSelectedAssignment(assignment);
    setResponseForm({
      quotation_amount: assignment.quotation_amount?.toString() || '',
      quotation_details: assignment.quotation_details || '',
      product_details: assignment.product_details || '',
      seller_notes: assignment.seller_notes || '',
    });
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedAssignment) return;
    setSubmitting(true);
    await respondToAssignment(selectedAssignment.id, {
      status: 'quote_submitted',
      seller_notes: responseForm.seller_notes,
      quotation_amount: parseFloat(responseForm.quotation_amount) || undefined,
      quotation_details: responseForm.quotation_details,
      product_details: responseForm.product_details,
    });
    setSubmitting(false);
    setShowResponseModal(false);
    fetchMyAssignments();
  };

  const handleAccept = async (assignmentId: string) => {
    await respondToAssignment(assignmentId, { status: 'accepted' });
    fetchMyAssignments();
  };

  const handleDecline = async (assignmentId: string) => {
    await respondToAssignment(assignmentId, { status: 'declined' });
    fetchMyAssignments();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Assigned User Requests ({filtered.length})</h3>
        <Button variant="outline" size="sm" onClick={fetchMyAssignments}>Refresh</Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>No user requests assigned to you yet.</p>
        </CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(a => {
              const r = a.request;
              if (!r) return null;
              const TypeIcon = a.request?.product_type === 'robot' ? Bot : a.request?.product_type === 'spare_part' ? Package : Wrench;
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{r.product_name}</TableCell>
                  <TableCell><Badge variant="outline" className="flex items-center gap-1 w-fit"><TypeIcon className="w-3 h-3" />{r.product_type}</Badge></TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{r.contact_name}</p>
                    <p className="text-xs text-muted-foreground">{r.contact_email}</p>
                  </TableCell>
                  <TableCell>{r.location || '-'}</TableCell>
                  <TableCell>{r.budget || '-'}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === 'quote_submitted' ? 'default' : a.status === 'declined' ? 'destructive' : 'secondary'}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(a.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {a.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleAccept(a.id)}>Accept</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDecline(a.id)}>Decline</Button>
                        </>
                      )}
                      {(a.status === 'accepted' || a.status === 'pending') && (
                        <Button size="sm" onClick={() => openResponseModal(a)}>
                          <Send className="w-3 h-3 mr-1" /> Submit Quote
                        </Button>
                      )}
                      {a.status === 'quote_submitted' && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Quote Sent
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Response Modal */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Quotation / Solution</DialogTitle>
          </DialogHeader>
          {selectedAssignment?.request && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedAssignment.request.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAssignment.request.specifications || 'No specifications provided'}
                </p>
                {selectedAssignment.request.budget && (
                  <p className="text-sm mt-1">Budget: {selectedAssignment.request.budget}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Quotation Amount (₹)</Label>
                <Input
                  type="number"
                  value={responseForm.quotation_amount}
                  onChange={e => setResponseForm(p => ({ ...p, quotation_amount: e.target.value }))}
                  placeholder="Enter your quotation amount"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Quotation Details</Label>
                <Textarea
                  value={responseForm.quotation_details}
                  onChange={e => setResponseForm(p => ({ ...p, quotation_details: e.target.value }))}
                  placeholder="Breakdown, terms, delivery timeline..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Product/Solution Details</Label>
                <Textarea
                  value={responseForm.product_details}
                  onChange={e => setResponseForm(p => ({ ...p, product_details: e.target.value }))}
                  placeholder="Product details, alternatives, availability..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Additional Notes</Label>
                <Textarea
                  value={responseForm.seller_notes}
                  onChange={e => setResponseForm(p => ({ ...p, seller_notes: e.target.value }))}
                  placeholder="Any other notes for the buyer..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseModal(false)}>Cancel</Button>
            <Button onClick={handleSubmitResponse} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerAssignedRequests;
