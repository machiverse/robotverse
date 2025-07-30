import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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

  // States
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

  // Modal & Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    service_type: [] as string[],
    coverage: [] as string[],
    price_range: '',
    location: ''
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch services for current provider
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user!.id);

      // Fetch service requests for current provider
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select(
          `id,
           status,
           urgency,
           scheduled_date,
           completed_at,
           amount_paid,
           client:profiles!service_requests_client_id_fkey(id, full_name),
           service:services(id, name, service_type, coverage, price_range, location)`
        )
        .eq('provider_id', user!.id);

      if (servicesError) throw servicesError;
      if (requestsError) throw requestsError;

      setServices(servicesData ?? []);
      setServiceRequests(requestsData ?? []);

      // Calculate stats
      const completedCount = (requestsData ?? []).filter(r => r.status === 'completed').length;
      const activeCount = (requestsData ?? []).filter(r => ['pending', 'in_progress'].includes(r.status)).length;

      // Calculate monthly revenue (sum amount_paid for completed jobs this month)
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthRevenue = (requestsData ?? []).reduce((sum, r) => {
        if (r.status === 'completed' && r.completed_at && new Date(r.completed_at) >= monthStart) {
          return sum + (r.amount_paid ?? 0);
        }
        return sum;
      }, 0);

      setDashboardStats({
        totalServices: servicesData?.length ?? 0,
        activeRequests: activeCount,
        completedJobs: completedCount,
        monthlyRevenue: monthRevenue,
        averageRating: userProfile?.average_rating ?? 4.8
      });
    } catch (e: any) {
      setError(`Failed to load data: ${e.message ?? e.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  // Toggle multi-select for service types
  function toggleServiceType(type: string) {
    setNewService(prev => {
      const updated = prev.service_type.includes(type)
        ? prev.service_type.filter(t => t !== type)
        : [...prev.service_type, type];
      return { ...prev, service_type: updated };
    });
  }

  // Toggle multi-select for coverage states
  function toggleCoverageState(state: string) {
    setNewService(prev => {
      const updated = prev.coverage.includes(state)
        ? prev.coverage.filter(s => s !== state)
        : [...prev.coverage, state];
      return { ...prev, coverage: updated };
    });
  }

  // Add Service Handler
  async function handleAddService() {
    if (!user) return;
    if (!newService.name.trim()) {
      alert('Service name is required.');
      return;
    }
    if (!newService.service_type.length) {
      alert('Select at least one service type.');
      return;
    }
    if (!newService.price_range.trim()) {
      alert('Price range is required.');
      return;
    }

    const insertData = {
      ...newService,
      service_type: newService.service_type.join(', '),  // Storing as comma separated string
      coverage: newService.coverage.join(', '),          // Same for coverage
      provider_id: user.id,
    };

    try {
      const { error } = await supabase.from('services').insert([insertData]);
      if (error) {
        alert(`Failed to add service: ${error.message}`);
        return;
      }
      setShowAddModal(false);
      setNewService({ name: '', description: '', service_type: [], coverage: [], price_range: '', location: '' });
      fetchDashboardData();
    } catch (err) {
      alert(`Error adding service: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function getBadgeVariant(status: string): 'default' | 'destructive' | 'outline' | 'secondary' {
    switch (status) {
      case 'pending': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  }

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center text-red-600 my-20">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Service Provider Dashboard</h1>
              <p className="text-muted-foreground">Manage your services and client requests</p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add New Service
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                title: 'Total Services',
                val: dashboardStats.totalServices,
                icon: Wrench,
                variant: 'secondary',
                color: 'text-blue-600',
              },
              {
                title: 'Active Requests',
                val: dashboardStats.activeRequests,
                icon: Clock,
                variant: 'secondary',
                color: 'text-orange-600',
              },
              {
                title: 'Completed Jobs',
                val: dashboardStats.completedJobs,
                icon: CheckCircle,
                variant: 'outline',
                color: 'text-green-600',
              },
              {
                title: 'Monthly Revenue',
                val: `₹${dashboardStats.monthlyRevenue.toLocaleString()}`,
                icon: DollarSign,
                variant: 'secondary',
                color: 'text-purple-600',
              },
              {
                title: 'Average Rating',
                val: dashboardStats.averageRating,
                icon: Star,
                variant: 'secondary',
                color: 'text-yellow-600',
              },
            ].map((item, i) => (
              <Card key={i}>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-muted-foreground mb-2">{item.title}</p>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-semibold">{item.val}</h2>
                        <Badge variant={item.variant as any} className={item.color}>
                          {/* Optionally place trend or extra text */}
                        </Badge>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg ${item.color}`}>
                      <item.icon className="w-8 h-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="services">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Requests Tab */}
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Activity className="inline mr-2" /> Service Requests
                  </CardTitle>
                  <CardDescription>Manage your incoming requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {serviceRequests.length === 0 ? (
                    <div className="text-center text-muted-foreground py-20">
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
                            <TableCell>{req.client?.full_name ?? 'N/A'}</TableCell>
                            <TableCell>{req.service?.service_type ?? 'N/A'}</TableCell>
                            <TableCell>{req.scheduled_date ?? 'N/A'}</TableCell>
                            <TableCell>{getBadgeVariant(req.status) && <Badge variant={getBadgeVariant(req.status)}>{req.status}</Badge>}</TableCell>
                            <TableCell>{getBadgeVariant(req.urgency) && <Badge>{req.urgency}</Badge>}</TableCell>
                            <TableCell><MapPin className="inline mr-1" />{req.service?.location ?? 'N/A'}</TableCell>
                            <TableCell>
                              <Button size="sm" className="mr-2" onClick={() => alert('Accept request: ' + req.id)}>Accept</Button>
                              <Button size="sm" variant="ghost" onClick={() => alert('View details: ' + req.id)}>Details</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Wrench className="inline mr-2" /> Your Services
                  </CardTitle>
                  <CardDescription>Your service offerings</CardDescription>
                </CardHeader>
                <CardContent>
                  {services.length === 0 ? (
                    <div className="text-center text-muted-foreground py-20">
                      No services listed
                      <br />
                      <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                        <Plus className="inline mr-2" /> Add your first service
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {services.map(service => {
                        const serviceTypesList = Array.isArray(service.service_type)
                          ? service.service_type
                          : typeof service.service_type === 'string'
                          ? service.service_type.split(',').map((s: string) => s.trim())
                          : [];

                        const coverageList = Array.isArray(service.coverage)
                          ? service.coverage
                          : typeof service.coverage === 'string'
                          ? service.coverage.split(',').map((s: string) => s.trim())
                          : [];

                        return (
                          <Card key={service.id}>
                            <CardContent>
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-lg">{service.name}</h3>
                                <div className="space-x-2">
                                  <Button size="sm" variant="ghost" onClick={() => alert(`Edit service ${service.id}`)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => alert(`Delete service ${service.id}`)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="mb-2 text-muted-foreground">{service.description ?? ''}</p>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {serviceTypesList.map(type => (
                                  <Badge key={type} variant="secondary">{type}</Badge>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {coverageList.length > 0 ? coverageList.map(state => (
                                  <Badge key={state} variant="outline">{state}</Badge>
                                )) : (
                                  <span className="text-xs text-muted-foreground">No coverage selected</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-bold">{service.price_range ?? 'N/A'}</span>
                                <div className="flex items-center text-muted-foreground text-sm">
                                  <MapPin className="mr-1" /> {service.location ?? 'N/A'}
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

            {/* Calendar Tab */}
            <TabsContent value="calendar">
              <Card>
                <CardHeader>
                  <CardTitle><Calendar className="inline mr-2"/> Calendar (Coming Soon)</CardTitle>
                  <CardDescription>Manage your calendar</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground my-10">Feature coming soon</p>
                  <Button onClick={() => alert('Calendar feature not yet implemented')}>View Calendar</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Analytics coming soon.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Add Service Modal */}
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogContent>
              <DialogTitle>Add a New Service</DialogTitle>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Service Name *"
                  value={newService.name}
                  onChange={e => setNewService({...newService, name: e.target.value})}
                  required
                />
                <Textarea
                  placeholder="Description"
                  value={newService.description}
                  onChange={e => setNewService({...newService, description: e.target.value})}
                />
                <div>
                  <label className="block mb-1 font-semibold">Service Types *</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 flex flex-wrap gap-2">
                    {SERVICE_TYPE_OPTIONS.map(type => (
                      <label key={type} className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newService.service_type.includes(type)}
                          onChange={() => toggleServiceType(type)}
                          className="mr-2"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-semibold">Coverage States (Select all) *</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 flex flex-wrap gap-2">
                    {INDIAN_STATES.map(state => (
                      <label key={state} className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newService.coverage.includes(state)}
                          onChange={() => toggleCoverageState(state)}
                          className="mr-2"
                        />
                        {state}
                      </label>
                    ))}
                  </div>
                </div>

                <Input
                  placeholder="Price Range *"
                  value={newService.price_range}
                  onChange={e => setNewService({...newService, price_range: e.target.value})}
                  required
                />

                <Input
                  placeholder="Location (City, Region)"
                  value={newService.location}
                  onChange={e => setNewService({...newService, location: e.target.value})}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button onClick={handleAddService}>Add Service</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
};

export default ServiceProviderDashboard;
