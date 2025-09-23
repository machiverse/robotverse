import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Clock, 
  User,
  FileText,
  ExternalLink,
  Eye,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserRequest {
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
  urgency: string;
  additional_data: any;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  request_id: string;
}

const UserRequestsManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    responded: 0,
    closed: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserRequests();
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, statusFilter, typeFilter, urgencyFilter]);

  const fetchUserRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_requests')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching user requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load user requests"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('seller_notifications')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const calculateStats = (requestsData: UserRequest[]) => {
    const stats = {
      total: requestsData.length,
      pending: requestsData.filter(r => r.status === 'pending').length,
      inProgress: requestsData.filter(r => r.status === 'in_progress').length,
      responded: requestsData.filter(r => r.status === 'responded').length,
      closed: requestsData.filter(r => r.status === 'closed').length
    };
    setStats(stats);
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (searchQuery) {
      filtered = filtered.filter(request => 
        request.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.email_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(request => request.item_type === typeFilter);
    }

    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(request => request.urgency === urgencyFilter);
    }

    setFilteredRequests(filtered);
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('seller_id', user?.id);

      if (error) throw error;

      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: newStatus } : req
      ));

      toast({
        title: "Status Updated",
        description: `Request status updated to ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating request status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update request status"
      });
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Date', 'User Name', 'Company', 'Email', 'Phone', 'Location', 
      'Request Type', 'Item Type', 'Item Name', 'Urgency', 'Status', 'Requirements'
    ];
    
    const rows = filteredRequests.map(request => [
      new Date(request.created_at).toLocaleDateString(),
      request.user_name,
      request.company_name || '',
      request.email_address,
      request.mobile_number || '',
      request.location || '',
      request.request_type,
      request.item_type,
      request.item_name || '',
      request.urgency,
      request.status,
      request.requirements || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredRequests.length} requests to CSV`
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'in_progress': return 'default';
      case 'responded': return 'outline';
      case 'closed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'outline';
      case 'medium': return 'secondary';
      case 'high': return 'default';
      case 'urgent': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return AlertTriangle;
      case 'responded': return CheckCircle;
      case 'closed': return XCircle;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Responded</p>
                <p className="text-2xl font-bold text-green-600">{stats.responded}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold text-gray-600">{stats.closed}</p>
              </div>
              <XCircle className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">User Requests</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  User Requests Management
                </CardTitle>
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, company, email, location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="robot">Robot</SelectItem>
                    <SelectItem value="spare_part">Spare Part</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                    <SelectItem value="financing">Financing</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgency</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Requests Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User Details</TableHead>
                      <TableHead>Request Info</TableHead>
                      <TableHead>Item Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((request) => {
                        const StatusIcon = getStatusIcon(request.status);
                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">{request.user_name}</span>
                                </div>
                                {request.company_name && (
                                  <div className="flex items-center gap-2">
                                    <Building className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{request.company_name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">{request.email_address}</span>
                                </div>
                                {request.mobile_number && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{request.mobile_number}</span>
                                  </div>
                                )}
                                {request.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{request.location}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="outline" className="capitalize">
                                  {request.request_type.replace('_', ' ')}
                                </Badge>
                                {request.requirements && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {request.requirements}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="secondary" className="capitalize">
                                  {request.item_type.replace('_', ' ')}
                                </Badge>
                                {request.item_name && (
                                  <p className="text-sm font-medium">{request.item_name}</p>
                                )}
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusIcon className="w-4 h-4" />
                                <Badge variant={getStatusBadgeVariant(request.status)} className="capitalize">
                                  {request.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <Badge variant={getUrgencyBadgeVariant(request.urgency)} className="capitalize">
                                {request.urgency}
                              </Badge>
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={request.status}
                                  onValueChange={(value) => updateRequestStatus(request.id, value)}
                                >
                                  <SelectTrigger className="w-[130px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="responded">Responded</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {request.mobile_number && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`tel:${request.mobile_number}`, '_self')}
                                  >
                                    <Phone className="w-4 h-4" />
                                  </Button>
                                )}
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`mailto:${request.email_address}`, '_blank')}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserRequestsManagement;