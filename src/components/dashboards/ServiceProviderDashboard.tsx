import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Wrench,
  Clock,
  Star,
  DollarSign,
  Calendar,
  User,
  MapPin,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Activity,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const SERVICE_TYPE_OPTIONS = [
  "Installation",
  "Maintenance",
  "Repair",
  "Inspection",
  "Calibration",
  "Training",
  "Upgrades",
  "Consulting"
];

interface ServiceProviderDashboardProps {
  userProfile: any;
}

const ServiceProviderDashboard = ({ userProfile }: ServiceProviderDashboardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalServices: 0,
    activeRequests: 0,
    completedJobs: 0,
    monthlyRevenue: 0,
    averageRating: 4.8
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states for Add Service
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    service_type: [] as string[],
    coverage: [] as string[],
    price_range: '',
    location: ''
  });

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch services of this provider
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id);

      // Fetch service requests for this provider with embedded client/profile and service info
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select(`
          *,
          client:profiles!service_requests_client_id_fkey (id, full_name),
          service:services (id, name, service_type, price_range, location)
        `)
        .eq('provider_id', user.id);

      if (servicesError) throw servicesError;
      if (requestsError) throw requestsError;

      setServices(servicesData || []);
      setServiceRequests(requestsData || []);

      // Calculate stats
      const completed = (requestsData || []).filter((r: any) => r.status === 'completed').length;
      const active = (requestsData || []).filter((r: any) => ['pending', 'in_progress'].includes(r.status)).length;

      // Calculate current month's revenue from completed requests (assuming amount_paid exists)
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthlyRevenue = (requestsData || [])
        .filter((r: any) => r.status === 'completed' && r.completed_at && new Date(r.completed_at) >= monthStart)
        .reduce((sum: number, r: any) => sum + (r.amount_paid ?? 0), 0);

      setDashboardStats({
        totalServices: servicesData?.length ?? 0,
        activeRequests: active,
        completedJobs: completed,
        monthlyRevenue,
        averageRating: userProfile?.average_rating ?? 4.8
      });

      setLoading(false);
    } catch (err: any) {
      setError('Failed to load dashboard data: ' + (err.message ?? String(err)));
      setLoading(false);
    }
  };

  // Toggle multi-select of service types
  const toggleServiceType = (type: string) => {
    setNewService((prev) => {
      const exists = prev.service_type.includes(type);
      const newTypes = exists
        ? prev.service_type.filter((t) => t !== type)
        : [...prev.service_type, type];
      return { ...prev, service_type: newTypes };
    });
  };

  // Toggle multi-select of coverage states
  const toggleCoverageState = (state: string) => {
    setNewService((prev) => {
      const exists = prev.coverage.includes(state);
      const newCoverage = exists
        ? prev.coverage.filter((s) => s !== state)
        : [...prev.coverage, state];
      return { ...prev, coverage: newCoverage };
    });
  };

  // Add new service submit handler
  const handleAddService = async () => {
    if (!user) return;
    if (!newService.name.trim()) return alert('Please enter Service Name');
    if (newService.service_type.length === 0) return alert('Select at least one Service Type');
    if (!newService.price_range.trim()) return alert('Please enter Price Range');

    try {
      const { error } = await supabase.from('services').insert([{
        ...newService,
        provider_id: user.id
      }]);
      if (error) return alert('Failed to add service: ' + error.message);

      setShowAddModal(false);
      setNewService({ name: '', description: '', service_type: [], coverage: [], price_range: '', location: '' });
      fetchDashboardData();
    } catch (err) {
      alert('Error adding service: ' + String(err));
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: string; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      in_progress: { variant: 'default', label: 'In Progress' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const config: Record<string, { color: string; label: string }> = {
      low: { color: 'bg-green-100 text-green-800', label: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      high: { color: 'bg-red-100 text-red-800', label: 'High' }
    };
    const c = config[urgency] || config.medium;
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Service Provider Dashboard</h1>
            <p className="text-muted-foreground">Manage your services and client requests</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Add New Service
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { title: 'Total Services', value: dashboardStats.totalServices, icon: Wrench, trend: 'Listed', color: 'text-blue-600' },
            { title: 'Active Requests', value: dashboardStats.activeRequests, icon: Clock, trend: 'Pending', color: 'text-orange-600' },
            { title: 'Completed Jobs', value: dashboardStats.completedJobs, icon: CheckCircle, trend: 'All time', color: 'text-green-600' },
            { title: 'Monthly Revenue', value: `₹${dashboardStats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, trend: 'This month', color: 'text-purple-600' },
            { title: 'Average Rating', value: dashboardStats.averageRating, icon: Star, trend: 'Customer rating', color: 'text-yellow-600' }
          ].map(({title, value, icon: Icon, trend, color}, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                    <Badge variant="secondary">{trend}</Badge>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="requests">Service Requests</TabsTrigger>
            <TabsTrigger value="services">My Services</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Service Request Queue
                </CardTitle>
                <CardDescription>Manage incoming requests and assignments</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceRequests.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground">
                    <Clock className="mx-auto mb-4 w-12 h-12" />
                    No service requests
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceRequests.map(req => (
                        <TableRow key={req.id}>
                          <TableCell>{req.client?.full_name ?? '---'}</TableCell>
                          <TableCell>{req.service?.service_type ?? req.service_type ?? '---'}</TableCell>
                          <TableCell>{req.scheduled_date ?? '---'}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell>{getUrgencyBadge(req.urgency)}</TableCell>
                          <TableCell className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" /> {req.service?.location ?? req.location ?? '---'}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">Accept</Button>{' '}
                            <Button size="sm" variant="ghost">Details</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" /> My Services
                </CardTitle>
                <CardDescription>Manage your services and pricing</CardDescription>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground">
                    <Wrench className="mx-auto mb-4 w-12 h-12" />
                    No services listed
                    <br />
                    <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                      <Plus className="w-4 h-4 mr-2 inline" /> Add Your First Service
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map(service => {
                      const serviceTypes: string[] = Array.isArray(service.service_type) ? service.service_type : [service.service_type];
                      const coverageStates: string[] = Array.isArray(service.coverage) ? service.coverage : [];

                      return (
                        <Card key={service.id} className="hover:shadow-lg transition-shadow">
                          <CardContent>
                            <div className="flex justify-between mb-2">
                              <h3 className="font-semibold text-lg">{service.name}</h3>
                              <div>
                                <Button size="sm" variant="ghost" className="mr-2">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="mb-2 text-sm text-muted-foreground">{service.description ?? ''}</p>
                            <div className="mb-2">
                              {serviceTypes.map(type => (
                                <Badge key={type} className="mr-1 mb-1" variant="secondary">{type}</Badge>
                              ))}
                            </div>
                            <div className="mb-2">
                              {coverageStates.length > 0 ? coverageStates.map(state => (
                                <Badge key={state} className="mr-1 mb-1" variant="outline">{state}</Badge>
                              )) : <span className="text-xs text-muted-foreground">No coverage selected</span>}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-bold">{service.price_range ?? 'N/A'}</span>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="mr-1" size={14} /> {service.location ?? '---'}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Calendar (Coming Soon)
                </CardTitle>
                <CardDescription>View and manage your schedule</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Calendar className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Calendar integration coming soon.</p>
                <Button variant="outline" onClick={() => alert('Calendar feature not implemented yet.')}>View Schedule</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Analytics content can be developed further */}
                <p className="mb-4 text-muted-foreground">Analytics and charts coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>

      {/* Add Service Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Add New Service</DialogTitle>
          <div className="space-y-4 mb-4">
            <Input
              placeholder="Service Name *"
              value={newService.name}
              onChange={e => setNewService(s => ({ ...s, name: e.target.value }))}
              required
            />
            <Textarea
              placeholder="Description"
              value={newService.description}
              onChange={e => setNewService(s => ({ ...s, description: e.target.value }))}
              rows={3}
            />
            <div>
              <label className="block font-semibold mb-1">Select Service Types *</label>
              <div className="max-h-36 overflow-auto flex flex-wrap gap-2 border rounded p-2">
                {SERVICE_TYPE_OPTIONS.map(type => (
                  <label key={type} className="flex items-center cursor-pointer space-x-2">
                    <input
                      type="checkbox"
                      checked={newService.service_type.includes(type)}
                      onChange={() => {
                        const selected = new Set(newService.service_type);
                        if (selected.has(type)) {
                          selected.delete(type);
                        } else {
                          selected.add(type);
                        }
                        setNewService(s => ({ ...s, service_type: Array.from(selected)}));
                      }}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Select Coverage States *</label>
              <div className="max-h-36 overflow-auto flex flex-wrap gap-2 border rounded p-2">
                {INDIAN_STATES.map(state => (
                  <label key={state} className="flex items-center cursor-pointer space-x-2">
                    <input
                      type="checkbox"
                      checked={newService.coverage.includes(state)}
                      onChange={() => {
                        const selected = new Set(newService.coverage);
                        if (selected.has(state)) {
                          selected.delete(state);
                        } else {
                          selected.add(state);
                        }
                        setNewService(s => ({ ...s, coverage: Array.from(selected)}));
                      }}
                    />
                    <span>{state}</span>
                  </label>
                ))}
              </div>
            </div>
            <Input
              placeholder="Price Range *"
              value={newService.price_range}
              onChange={e => setNewService(s => ({ ...s, price_range: e.target.value }))}
              required
            />
            <Input
              placeholder="Location (City or Region)"
              value={newService.location}
              onChange={e => setNewService(s => ({ ...s, location: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddService}>Add Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServiceProviderDashboard;
