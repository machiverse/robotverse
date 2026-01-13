import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Search, 
  Eye, 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  User,
  Building,
  MapPin,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface QuoteRequest {
  id: string;
  user_id: string;
  seller_id: string;
  request_type: string;
  item_type: string;
  item_id: string | null;
  item_name: string | null;
  user_name: string;
  company_name: string | null;
  mobile_number: string | null;
  email_address: string;
  location: string | null;
  requirements: string | null;
  urgency: string | null;
  additional_data: any;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface QuoteRequestsSectionProps {
  sellerId: string;
  itemType?: string; // Optional filter by item type
}

const QuoteRequestsSection = ({ sellerId, itemType }: QuoteRequestsSectionProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchQuoteRequests();
  }, [sellerId, itemType]);

  useEffect(() => {
    filterRequests();
  }, [quoteRequests, searchQuery, filterStatus, filterUrgency]);

  const fetchQuoteRequests = async () => {
    if (!sellerId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('user_requests')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('request_type', 'get_quote')
        .order('created_at', { ascending: false });

      if (itemType) {
        query = query.eq('item_type', itemType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setQuoteRequests(data || []);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load quote requests"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...quoteRequests];

    if (searchQuery) {
      filtered = filtered.filter(req =>
        req.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.email_address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    if (filterUrgency !== 'all') {
      filtered = filtered.filter(req => req.urgency === filterUrgency);
    }

    setFilteredRequests(filtered);
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      setQuoteRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, status: newStatus } : req)
      );

      toast({
        title: "Status Updated",
        description: `Request status changed to ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status"
      });
    }
  };

  const getUrgencyBadge = (urgency: string | null) => {
    switch (urgency) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case 'spare_part':
        return <Badge variant="secondary"><Package className="w-3 h-3 mr-1" />Spare Part</Badge>;
      case 'service':
        return <Badge className="bg-purple-500">Service</Badge>;
      case 'logistics':
        return <Badge className="bg-green-500">Logistics</Badge>;
      case 'robot':
        return <Badge className="bg-blue-500">Robot</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleStartChat = (request: QuoteRequest) => {
    const queryParams = new URLSearchParams({
      other_user: request.user_id,
      item: request.item_id || '',
      type: request.item_type,
      name: request.item_name || 'Quote Request'
    });
    navigate(`/chat?${queryParams.toString()}`);
  };

  const viewRequestDetails = (request: QuoteRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading quote requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUrgency} onValueChange={setFilterUrgency}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchQuoteRequests}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{quoteRequests.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {quoteRequests.filter(r => !r.status || r.status === 'pending').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {quoteRequests.filter(r => r.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {quoteRequests.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No quote requests found</h3>
          <p className="text-muted-foreground">
            {quoteRequests.length === 0 
              ? "You haven't received any quote requests yet"
              : "No requests match your current filters"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{request.user_name}</span>
                      {request.company_name && (
                        <span className="text-sm text-muted-foreground">{request.company_name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{request.email_address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{request.item_name || 'N/A'}</span>
                      {getItemTypeBadge(request.item_type)}
                    </div>
                  </TableCell>
                  <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </span>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), 'HH:mm')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewRequestDetails(request)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartChat(request)}
                        title="Start Chat"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      {request.mobile_number && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`tel:${request.mobile_number}`)}
                          title="Call"
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`mailto:${request.email_address}`)}
                        title="Email"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Quote Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 p-1">
                {/* Customer Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedRequest.user_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedRequest.email_address}</p>
                    </div>
                    {selectedRequest.company_name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium">{selectedRequest.company_name}</p>
                      </div>
                    )}
                    {selectedRequest.mobile_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedRequest.mobile_number}</p>
                      </div>
                    )}
                    {selectedRequest.location && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {selectedRequest.location}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Item Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Item Information
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{selectedRequest.item_name || 'N/A'}</p>
                      {getItemTypeBadge(selectedRequest.item_type)}
                    </div>
                    {selectedRequest.additional_data?.item_model && (
                      <p className="text-sm text-muted-foreground">
                        Model: {selectedRequest.additional_data.item_model}
                      </p>
                    )}
                    {selectedRequest.additional_data?.item_category && (
                      <p className="text-sm text-muted-foreground">
                        Category: {selectedRequest.additional_data.item_category}
                      </p>
                    )}
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Request Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Urgency</p>
                        {getUrgencyBadge(selectedRequest.urgency)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Received</p>
                        <p className="text-sm">{format(new Date(selectedRequest.created_at), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                    
                    {selectedRequest.requirements && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Requirements</p>
                        <p className="whitespace-pre-wrap">{selectedRequest.requirements}</p>
                      </div>
                    )}

                    {selectedRequest.additional_data?.additional_info && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Additional Information</p>
                        <p className="whitespace-pre-wrap">{selectedRequest.additional_data.additional_info}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button onClick={() => handleStartChat(selectedRequest)}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Chat
                  </Button>
                  <Button variant="outline" onClick={() => window.open(`mailto:${selectedRequest.email_address}`)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                  {selectedRequest.mobile_number && (
                    <Button variant="outline" onClick={() => window.open(`tel:${selectedRequest.mobile_number}`)}>
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Select 
                    value={selectedRequest.status || 'pending'} 
                    onValueChange={(value) => {
                      updateRequestStatus(selectedRequest.id, value);
                      setSelectedRequest({ ...selectedRequest, status: value });
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteRequestsSection;
