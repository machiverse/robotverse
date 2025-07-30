import { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Wrench, Clock, Star, DollarSign, Calendar, MapPin, Plus, Edit, Trash2, CheckCircle, AlertCircle, Activity, Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const INDIAN_STATES = [
  /* your states */
];
const SERVICE_TYPE_OPTIONS = [
  "Installation", "Maintenance", "Repair", "Inspection", "Calibration", "Training", "Upgrades", "Consulting",
];

const ServiceProviderDashboard = ({ userProfile }: { userProfile: any }) => {
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalServices: 0, activeRequests: 0, completedJobs: 0, monthlyRevenue: 0, averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & editing state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null); // null if not editing
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    service_type: [] as string[],
    coverage: [] as string[],
    price_range: "",
    location: "",
  });

  // Fetch dashboard data
  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from("services").select("*").eq("provider_id", user!.id);

      const { data: requestsData, error: requestsError } = await supabase
        .from("service_requests")
        .select(`
          id, status, urgency, scheduled_date, completion_date, service_type, location, client_name,
          client_email, client_phone, service_id, provider_id, created_at, updated_at,
          service:services(id, name, service_type, location, price_range, coverage)
        `)
        .eq("provider_id", user!.id);

      if (servicesError) throw servicesError;
      if (requestsError) throw requestsError;

      setServices(servicesData ?? []);
      setServiceRequests(requestsData ?? []);
      const completed = (requestsData ?? []).filter((r) => r.status === "completed").length;
      const active = (requestsData ?? []).filter((r) => ["pending", "in_progress"].includes(r.status)).length;
      setDashboardStats({
        totalServices: servicesData?.length ?? 0,
        activeRequests: active,
        completedJobs: completed,
        monthlyRevenue: 0,
        averageRating: userProfile?.average_rating ?? 0,
      });
    } catch (err: any) {
      setError(`Failed to load data: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  // Toggle service type for checkbox
  function toggleServiceType(type: string) {
    setNewService((prev) => ({
      ...prev, service_type: prev.service_type.includes(type)
        ? prev.service_type.filter((t) => t !== type)
        : [...prev.service_type, type],
    }));
  }
  // Toggle coverage
  function toggleCoverage(state: string) {
    setNewService((prev) => ({
      ...prev, coverage: prev.coverage.includes(state)
        ? prev.coverage.filter((s) => s !== state)
        : [...prev.coverage, state],
    }));
  }

  // Open modal for adding new service (clears form)
  function openAddModal() {
    setEditingService(null); // no editing
    setNewService({
      name: "",
      description: "",
      service_type: [],
      coverage: [],
      price_range: "",
      location: "",
    });
    setShowAddModal(true);
  }
  // Open modal for editing service - prefill form
  function openEditModal(service: any) {
    setEditingService(service);
    setNewService({
      name: service.name || "",
      description: service.description || "",
      service_type: service.service_type ? service.service_type.split(",").map((s: string) => s.trim()) : [],
      coverage: service.coverage ? service.coverage.split(",").map((s: string) => s.trim()) : [],
      price_range: service.price_range || "",
      location: service.location || "",
    });
    setShowAddModal(true);
  }

  // Handle add or edit form submit
  async function handleSaveService() {
    if (!user) return;
    if (newService.name.trim() === "") return alert("Service name is required");
    if (newService.service_type.length === 0) return alert("Select at least one service type");
    if (newService.price_range.trim() === "") return alert("Price range is required");

    try {
      const serviceData = {
        ...newService,
        service_type: newService.service_type.join(", "),
        coverage: newService.coverage.join(", "),
        provider_id: user.id,
      };

      if (editingService) {
        // Edit existing service
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);
        if (error) return alert("Failed to update service: " + error.message);
      } else {
        // Add new service
        const { error } = await supabase.from("services").insert([serviceData]);
        if (error) return alert("Failed to add service: " + error.message);
      }

      setShowAddModal(false);
      setEditingService(null);
      setNewService({
        name:"",
        description:"",
        service_type:[],
        coverage:[],
        price_range:"",
        location:"",
      });
      fetchDashboardData();
    } catch(err) {
      alert("Error saving service: " + (err instanceof Error ? err.message : err));
    }
  }

  // Delete service
  async function handleDeleteService(serviceId: string) {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase.from("services").delete().eq("id", serviceId);
      if (error) return alert("Failed to delete service: " + error.message);

      fetchDashboardData();
    } catch (err) {
      alert("Error deleting service: " + (err instanceof Error ? err.message : err));
    }
  }

  // getBadgeVariant and getUrgencyBadge as in your code...

  function getBadgeVariant(
    status: string
  ): "default" | "destructive" | "outline" | "secondary" {
    switch (status) {
      case "pending": return "secondary";
      case "in_progress": return "default";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  }
  function getUrgencyBadge(status: string) {
    const variants = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    };
    return <Badge className={variants[status] ?? variants.medium}>{status}</Badge>;
  }

  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center text-red-600 my-20">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Header and Stats */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Service Provider Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your services and service requests
              </p>
            </div>
            <Button onClick={openAddModal} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add New Service
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Stats Cards */}
            {[
              { title: "Total Services", val: dashboardStats.totalServices, icon: Wrench, variant: "secondary", color: "text-blue-600",},
              { title: "Active Requests", val: dashboardStats.activeRequests, icon: Clock, variant: "secondary", color: "text-orange-600",},
              { title: "Completed Jobs", val: dashboardStats.completedJobs, icon: CheckCircle, variant: "outline", color: "text-green-600",},
              { title: "Monthly Revenue", val: `₹${dashboardStats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, variant: "secondary", color: "text-purple-600",},
              { title: "Average Rating", val: dashboardStats.averageRating, icon: Star, variant: "secondary", color: "text-yellow-600",},
            ].map(({ title, val, icon: Icon, variant, color }, idx) => (
              <Card key={idx}>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-muted-foreground mb-2">{title}</p>
                      <h2 className="text-xl font-semibold">{val}</h2>
                      <Badge variant={variant as any} />
                    </div>
                    <div className={`p-3 rounded-lg ${color}`}>
                      <Icon className="w-8 h-8" />
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
            {/* Service Requests Tab */}
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Activity className="inline mr-2" /> Service Requests
                  </CardTitle>
                  <CardDescription>
                    Manage incoming service requests
                  </CardDescription>
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
                        {serviceRequests.map((req: any) => (
                          <TableRow key={req.id}>
                            <TableCell>{req.client_name || "N/A"}</TableCell>
                            <TableCell>{req.service_type || "N/A"}</TableCell>
                            <TableCell>{req.scheduled_date || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={getBadgeVariant(req.status)}>
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getUrgencyBadge(req.urgency)}
                            </TableCell>
                            <TableCell>
                              <MapPin className="inline mr-1" />
                              {req.location || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" className="mr-2" onClick={() => alert(`Accept request ${req.id}`)}>Accept</Button>
                              <Button size="sm" variant="ghost" onClick={() => alert(`View details for request ${req.id}`)}>Details</Button>
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
                  <CardTitle><Wrench className="inline mr-2" /> Your Services</CardTitle>
                  <CardDescription>Your service listings</CardDescription>
                </CardHeader>
                <CardContent>
                  {services.length === 0 ? (
                    <div className="text-center text-muted-foreground py-20">
                      No services available.<br />
                      <Button onClick={openAddModal} className="mt-4">
                        <Plus className="inline mr-2" /> Add Service
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {services.map((service: any) => {
                        const serviceTypes = service.service_type ? service.service_type.split(",").map((x: string) => x.trim()) : [];
                        const coverage = service.coverage ? service.coverage.split(",").map((x: string) => x.trim()) : [];
                        return (
                          <Card key={service.id}>
                            <CardContent>
                              <div className="flex justify-between mb-2">
                                <h3 className="font-semibold">{service.name}</h3>
                                <div>
                                  <Button size="sm" variant="ghost" onClick={() => openEditModal(service)}><Edit className="w-4 h-4" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteService(service.id)}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                              </div>
                              <p className="mb-2 text-muted-foreground">{service.description}</p>
                              <div className="mb-2">
                                {serviceTypes.map(type => (
                                  <Badge key={type}>{type}</Badge>
                                ))}
                              </div>
                              <div className="mb-2 flex flex-wrap gap-1">
                                {coverage.length > 0
                                  ? coverage.map(state => (
                                      <Badge key={state} variant="outline">
                                        {state}
                                      </Badge>
                                    ))
                                  : <span className="text-xs text-muted-foreground">No coverage selected</span>}
                              </div>
                              <div className="flex justify-between items-center">
                                <span>{service.price_range}</span>
                                <div className="flex items-center text-muted-foreground text-sm">
                                  <MapPin className="mr-1" />
                                  {service.location || "N/A"}
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
          </Tabs>

          {/* Add/Edit Service Modal */}
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogContent>
              <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Service Name *"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  required
                />
                <Textarea
                  placeholder="Description"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  rows={3}
                />
                <div>
                  <label className="block mb-1 font-semibold">Select Service Types *</label>
                  <div className="max-h-36 overflow-y-auto border rounded p-2 grid grid-cols-2 gap-2">
                    {SERVICE_TYPE_OPTIONS.map((type) => (
                      <label key={type} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newService.service_type.includes(type)}
                          onChange={() => toggleServiceType(type)}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Select Coverage States *</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 grid grid-cols-3 gap-1">
                    {INDIAN_STATES.map((state) => (
                      <label key={state} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newService.coverage.includes(state)}
                          onChange={() => toggleCoverage(state)}
                        />
                        <span>{state}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Input
                  placeholder="Price Range *"
                  value={newService.price_range}
                  onChange={(e) => setNewService({ ...newService, price_range: e.target.value })}
                  required
                />
                <Input
                  placeholder="Location (City, Region)"
                  value={newService.location}
                  onChange={(e) => setNewService({ ...newService, location: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowAddModal(false);
                  setEditingService(null);
                }}>Cancel</Button>
                <Button onClick={handleSaveService}>{editingService ? "Update Service" : "Add Service"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default ServiceProviderDashboard;
