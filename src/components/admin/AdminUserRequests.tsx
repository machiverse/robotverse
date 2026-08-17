import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAdminProductRequests } from '@/hooks/useUserProductRequests';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Bot, Package, Wrench, Search, Filter, UserPlus, Eye, Clock,
  CheckCircle, AlertCircle, MessageSquare, Loader2, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new_request: { label: 'New Request', variant: 'default' },
  seller_assigned: { label: 'Seller Assigned', variant: 'secondary' },
  quote_submitted: { label: 'Quote Submitted', variant: 'outline' },
  negotiation: { label: 'Negotiation', variant: 'secondary' },
  closed: { label: 'Closed', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'default' },
};

const TYPE_ICONS: Record<string, any> = {
  robot: Bot,
  spare_part: Package,
  service: Wrench,
};

const AdminUserRequests = () => {
  const { allRequests, loading, fetchAllRequests, assignSeller, updateRequestStatus } = useAdminProductRequests();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [requestAssignments, setRequestAssignments] = useState<any[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);

  useEffect(() => { fetchAllRequests(); }, [fetchAllRequests]);

  const filteredRequests = allRequests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && r.product_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.product_name?.toLowerCase().includes(q) || r.contact_name?.toLowerCase().includes(q) || r.brand?.toLowerCase().includes(q);
    }
    return true;
  });

  const robotRequests = allRequests.filter(r => r.product_type === 'robot');
  const spareRequests = allRequests.filter(r => r.product_type === 'spare_part');
  const serviceRequests = allRequests.filter(r => r.product_type === 'service');

  const openAssignModal = async (request: any) => {
    setSelectedRequest(request);
    setShowAssignModal(true);
    setLoadingSellers(true);
    
    // Fetch relevant sellers based on product type
    try {
      let query = supabase.from('profiles').select('user_id, full_name, company_name, email, location, user_roles, account_type');
      
      if (request.product_type === 'robot') {
        query = query.or("account_type.eq.seller,user_roles.cs.{robot_seller}");
      } else if (request.product_type === 'spare_part') {
        query = query.or("account_type.eq.seller,user_roles.cs.{spare_parts_seller}");
      } else if (request.product_type === 'service') {
        query = query.or("account_type.eq.seller,user_roles.cs.{service_provider}");
      }
      
      const { data } = await query.limit(50);
      setSellers(data || []);

      // Fetch existing assignments
      const { data: assignData } = await supabase
        .from('request_assignments')
        .select('*')
        .eq('request_id', request.id);
      setRequestAssignments(assignData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSellers(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRequest || !selectedSellerId) return;
    await assignSeller(selectedRequest.id, selectedSellerId);
    setShowAssignModal(false);
    setSelectedSellerId('');
    fetchAllRequests();
  };

  const handleStatusChange = async (requestId: string, status: string) => {
    await updateRequestStatus(requestId, status);
    fetchAllRequests();
  };

  const openDetail = async (request: any) => {
    setSelectedRequest(request);
    const { data } = await supabase
      .from('request_assignments')
      .select('*')
      .eq('request_id', request.id);
    setRequestAssignments(data || []);
    setShowDetailModal(true);
  };

  const renderRequestTable = (requests: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Brand</TableHead>
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
        {requests.length === 0 ? (
          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No requests found</TableCell></TableRow>
        ) : requests.map(r => {
          const statusInfo = STATUS_CONFIG[r.status] || { label: r.status, variant: 'outline' as const };
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.product_name}</TableCell>
              <TableCell>{r.brand || '-'}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <p className="font-medium">{r.contact_name}</p>
                  <p className="text-muted-foreground">{r.contact_email}</p>
                </div>
              </TableCell>
              <TableCell>{r.location || '-'}</TableCell>
              <TableCell>{r.budget || '-'}</TableCell>
              <TableCell>{r.quantity}</TableCell>
              <TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
              <TableCell className="text-sm">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openDetail(r)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openAssignModal(r)}>
                    <UserPlus className="w-4 h-4" />
                  </Button>
                  <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v)}>
                    <SelectTrigger className="w-auto h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Request Lead Manager</h2>
          <p className="text-muted-foreground">Manage user product/service requests and assign sellers</p>
        </div>
        <Button variant="outline" onClick={fetchAllRequests} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Bot className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{robotRequests.length}</p><p className="text-xs text-muted-foreground">Robot Requests</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg"><Package className="w-5 h-5 text-success" /></div>
          <div><p className="text-2xl font-bold">{spareRequests.length}</p><p className="text-xs text-muted-foreground">Spare Part Requests</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Wrench className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{serviceRequests.length}</p><p className="text-xs text-muted-foreground">Service Requests</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
          <div><p className="text-2xl font-bold">{allRequests.filter(r => r.status === 'new_request').length}</p><p className="text-xs text-muted-foreground">Pending</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by product name, requester..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs by product type */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({filteredRequests.length})</TabsTrigger>
          <TabsTrigger value="robot" className="flex items-center gap-1"><Bot className="w-3 h-3" /> Robots ({robotRequests.length})</TabsTrigger>
          <TabsTrigger value="spare_part" className="flex items-center gap-1"><Package className="w-3 h-3" /> Spare Parts ({spareRequests.length})</TabsTrigger>
          <TabsTrigger value="service" className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Services ({serviceRequests.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderRequestTable(filteredRequests)}</TabsContent>
        <TabsContent value="robot">{renderRequestTable(filteredRequests.filter(r => r.product_type === 'robot'))}</TabsContent>
        <TabsContent value="spare_part">{renderRequestTable(filteredRequests.filter(r => r.product_type === 'spare_part'))}</TabsContent>
        <TabsContent value="service">{renderRequestTable(filteredRequests.filter(r => r.product_type === 'service'))}</TabsContent>
      </Tabs>

      {/* Assign Seller Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Seller to Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedRequest.product_name}</p>
                <p className="text-sm text-muted-foreground">Type: {selectedRequest.product_type} | By: {selectedRequest.contact_name}</p>
              </div>
              
              {requestAssignments.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Already Assigned:</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {requestAssignments.map(a => (
                      <Badge key={a.id} variant="secondary">{a.seller_id.slice(0, 8)}... ({a.status})</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Select Seller</Label>
                {loadingSellers ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : (
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a seller..." /></SelectTrigger>
                    <SelectContent>
                      {sellers.map(s => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.full_name || s.email} {s.company_name ? `(${s.company_name})` : ''} - {s.location || 'No location'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedSellerId}>
              <UserPlus className="w-4 h-4 mr-2" /> Assign Seller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Product Name</Label><p className="font-medium">{selectedRequest.product_name}</p></div>
                <div><Label className="text-xs text-muted-foreground">Type</Label><Badge>{selectedRequest.product_type}</Badge></div>
                <div><Label className="text-xs text-muted-foreground">Brand</Label><p>{selectedRequest.brand || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Quantity</Label><p>{selectedRequest.quantity}</p></div>
                <div><Label className="text-xs text-muted-foreground">Budget</Label><p>{selectedRequest.budget || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Location</Label><p>{selectedRequest.location || '-'}</p></div>
                <div className="col-span-2"><Label className="text-xs text-muted-foreground">Specifications</Label><p className="whitespace-pre-wrap">{selectedRequest.specifications || '-'}</p></div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Contact Info</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs text-muted-foreground">Name</Label><p>{selectedRequest.contact_name}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Email</Label><p>{selectedRequest.contact_email}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Phone</Label><p>{selectedRequest.contact_phone || '-'}</p></div>
                </div>
              </div>
              {requestAssignments.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Assigned Sellers ({requestAssignments.length})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seller ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Quote</TableHead>
                        <TableHead>Response</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestAssignments.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs">{a.seller_id.slice(0, 12)}...</TableCell>
                          <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                          <TableCell>{a.quotation_amount ? `₹${a.quotation_amount.toLocaleString()}` : '-'}</TableCell>
                          <TableCell className="text-sm">{a.seller_notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserRequests;
