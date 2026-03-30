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
  Wrench, Clock, Star, DollarSign, Calendar, MapPin, Plus, Edit, Trash2, CheckCircle, Activity, Loader2, Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useViewTracking } from '@/hooks/useViewTracking';
// WatchlistSection imported below
import { useReviews } from '@/hooks/useReviews';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { StarRating } from '@/components/reviews/StarRating';
import CRMLeadsView from '@/components/crm/CRMLeadsView';
import QuoteRequestsSection from '@/components/dashboards/QuoteRequestsSection';
import SellerAssignedRequests from '@/components/SellerAssignedRequests';
import CommissionDealsSection from '@/components/dashboards/CommissionDealsSection';
import SentQuotationsTab from '@/components/crm/SentQuotationsTab';
import WatchlistSection from '@/components/WatchlistSection';
import { FileText, FileQuestion, Handshake, Users, Heart } from 'lucide-react';

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands",
  "Chandigarh","Dadra and Nagar Haveli","Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];
const SERVICE_TYPE_OPTIONS = [
  "Installation", "Maintenance", "Repair", "Inspection", "Calibration", "Training", "Upgrades", "Consulting",
];

function ServiceProviderReviews({ userId }: { userId?: string }) {
  const { reviews, loading, averageRating, totalReviews } = useReviews();
  const myReviews = reviews.filter(r => r.reviewed_user_id === userId);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          My Reviews & Ratings
        </CardTitle>
        <CardDescription>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <StarRating rating={myReviews.length > 0 ? myReviews.reduce((s, r) => s + r.overall_rating, 0) / myReviews.length : 0} size="md" showValue />
            </div>
            <span className="text-sm">{myReviews.length} reviews received</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : myReviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No reviews received yet.</p>
        ) : (
          <div className="space-y-3">
            {myReviews.map(review => (
              <ReviewCard key={review.id} review={review} showItemType />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ServiceProviderDashboard = ({ userProfile, isCommissionSeller }: { userProfile: any; isCommissionSeller?: boolean }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { viewStats, fetchUserItemViews } = useViewTracking();
  const [services, setServices] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalServices: 0, activeRequests: 0, completedJobs: 0, monthlyRevenue: 0, averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & editing state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    service_type: [] as string[],
    coverage: [] as string[],
    price_range: "",
    location: "",
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchUserItemViews(user.id);
    }
  }, [user, fetchUserItemViews]);

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

  function toggleServiceType(type: string) {
    setNewService((prev) => ({
      ...prev, service_type: prev.service_type.includes(type)
        ? prev.service_type.filter((t) => t !== type)
        : [...prev.service_type, type],
    }));
  }

  function toggleAllServiceTypes() {
    setNewService((prev) => ({
      ...prev, 
      service_type: prev.service_type.length === SERVICE_TYPE_OPTIONS.length 
        ? [] 
        : [...SERVICE_TYPE_OPTIONS]
    }));
  }

  function toggleCoverage(state: string) {
    setNewService((prev) => ({
      ...prev, coverage: prev.coverage.includes(state)
        ? prev.coverage.filter((s) => s !== state)
        : [...prev.coverage, state],
    }));
  }

  function toggleAllCoverageStates() {
    setNewService((prev) => ({
      ...prev, 
      coverage: prev.coverage.length === INDIAN_STATES.length 
        ? [] 
        : [...INDIAN_STATES]
    }));
  }

  function openAddModal() {
    setEditingService(null);
    setNewService({ name: "", description: "", service_type: [], coverage: [], price_range: "", location: "" });
    setShowAddModal(true);
  }

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
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);
        if (error) return alert("Failed to update service: " + error.message);
      } else {
        const { error } = await supabase.from("services").insert([serviceData]);
        if (error) return alert("Failed to add service: " + error.message);
      }

      setShowAddModal(false);
      setEditingService(null);
      setNewService({ name: "", description: "", service_type: [], coverage: [], price_range: "", location: "" });
      fetchDashboardData();
    } catch (err) {
      alert("Error saving service: " + (err instanceof Error ? err.message : err));
    }
  }

  async function handleDeleteService(serviceId: number | string) {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const { error } = await supabase.from("services").delete().eq("id", String(serviceId));
      if (error) return alert("Failed to delete service: " + error.message);
      fetchDashboardData();
    } catch (err) {
      alert("Error deleting service: " + (err instanceof Error ? err.message : err));
    }
  }

  function getBadgeVariant(status: string): "default" | "destructive" | "outline" | "secondary" {
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
        <div className="space-y-6 px-4 md:px-0 max-w-7xl mx-auto">
          {/* Header and Stats */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Service Provider Dashboard</h1>
              <p className="text-muted-foreground">Manage your services and service requests</p>
            </div>
            <Button onClick={openAddModal} className="flex items-center gap-2" size="lg" variant="secondary">
              <Plus className="w-5 h-5" /> Add New Service
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[ 
              { title: "Service Views", val: viewStats.viewsByCategory.services || 0, icon: Eye, variant: "secondary", color: "text-purple-600" },
              { title: "Total Services", val: dashboardStats.totalServices, icon: Wrench, variant: "secondary", color: "text-blue-600" },
              { title: "Active Requests", val: dashboardStats.activeRequests, icon: Clock, variant: "secondary", color: "text-orange-600" },
              { title: "Completed Jobs", val: dashboardStats.completedJobs, icon: CheckCircle, variant: "outline", color: "text-green-600" },
              { title: "Monthly Revenue", val: `₹${dashboardStats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, variant: "secondary", color: "text-purple-600" },
              { title: "Average Rating", val: dashboardStats.averageRating, icon: Star, variant: "secondary", color: "text-yellow-600" },
            ].map(({ title, val, icon: Icon, variant, color }, idx) => (
              <Card key={idx} className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">{title}</p>
                      <h2 className="text-2xl font-semibold">{val}</h2>
                      <Badge variant={variant as any} className="mt-1" />
                    </div>
                    <div className={`p-3 rounded-lg ${color}`}>
                      <Icon className="w-8 h-8" aria-hidden="true" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Tabs */}
          <Tabs defaultValue="services" className="mt-6">
            <TabsList className="grid grid-cols-8">
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="quote-requests">Quote Requests</TabsTrigger>
              <TabsTrigger value="leads">Lead Manager</TabsTrigger>
              <TabsTrigger value="user-requests">User Requests</TabsTrigger>
              <TabsTrigger value="requests">Service Requests</TabsTrigger>
              <TabsTrigger value="reviews">My Reviews</TabsTrigger>
              <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
              <TabsTrigger value="calendar" disabled>Calendar</TabsTrigger>
            </TabsList>

            {/* User Requests Tab */}
            <TabsContent value="user-requests">
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileQuestion className="w-5 h-5" />
                    Assigned User Requests
                  </CardTitle>
                  <CardDescription>
                    User requests assigned to you. Submit quotations and solutions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SellerAssignedRequests categoryFilter="service" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quote Requests Tab */}
            <TabsContent value="quote-requests">
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Quote Requests
                  </CardTitle>
                  <CardDescription>
                    View and manage quote requests from buyers for your services. Unlock buyer details, start conversations, and convert to leads.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <QuoteRequestsSection sellerId={user!.id} itemType="service" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lead Manager Tab */}
            <TabsContent value="leads">
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Lead Manager
                  </CardTitle>
                  <CardDescription>
                    View product viewers, unlock buyer details, start chat, WhatsApp, email, call, send quotations, and track follow-ups
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <CRMLeadsView categoryFilter="service" />
                </CardContent>
              </Card>
            </TabsContent>
            {/* Service Requests Tab */}
            <TabsContent value="requests">
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Activity className="w-5 h-5 text-primary" aria-hidden="true" /> Service Requests
                  </CardTitle>
                  <CardDescription>Manage incoming service requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {serviceRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-24 text-lg">No service requests</p>
                  ) : (
                    <Table className="shadow-sm rounded-lg overflow-hidden border border-gray-200">
                      <TableHeader className="bg-gray-50">
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
                          <TableRow key={req.id} className="hover:bg-gray-100 cursor-pointer" tabIndex={0} role="button" aria-label={`Request from ${req.client_name}`}>
                            <TableCell>{req.client_name || "N/A"}</TableCell>
                            <TableCell className="capitalize">{req.service_type || "N/A"}</TableCell>
                            <TableCell>{req.scheduled_date || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={getBadgeVariant(req.status)} className="capitalize">
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{getUrgencyBadge(req.urgency)}</TableCell>
                            <TableCell className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <MapPin className="inline w-4 h-4" aria-hidden="true" />
                              <span>{req.location || "N/A"}</span>
                            </TableCell>
                            <TableCell className="space-x-2">
                              <Button 
                                size="sm" 
                                className="bg-green-600 text-white hover:bg-green-700"
                                aria-label={`Accept request ${req.id}`}
                                onClick={() => alert(`Accept request ${req.id}`)}>
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                aria-label={`View details for request ${req.id}`}
                                onClick={() => alert(`View details for request ${req.id}`)}>
                                Details
                              </Button>
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
              <Card className="mt-6 border border-gray-200 rounded-lg shadow-sm">
                <CardHeader className="px-6 py-4">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Wrench className="w-6 h-6 text-primary" aria-hidden="true" /> Your Services
                  </CardTitle>
                  <CardDescription className="text-muted-foreground px-0">Manage and edit your active service listings</CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  {services.length === 0 ? (
                    <div className="text-center text-muted-foreground py-24 text-lg">
                      No services available.<br />
                      <Button onClick={openAddModal} className="mt-4" size="lg" variant="secondary">
                        <Plus className="inline mr-2" /> Add Service
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {services.map((service: any) => {
                        const serviceTypes = service.service_type ? service.service_type.split(",").map((x: string) => x.trim()) : [];
                        const coverage = service.coverage ? service.coverage.split(",").map((x: string) => x.trim()) : [];
                        return (
                          <Card
                            key={service.id}
                            className="border border-gray-200 rounded-lg shadow-sm transition-shadow hover:shadow-lg"
                            aria-label={`Service: ${service.name}`}
                          >
                            <CardContent className="p-5">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-semibold text-primary">{service.name}</h3>
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm" variant="ghost" aria-label={`Edit ${service.name}`}
                                    onClick={() => openEditModal(service)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </Button>
                                  <Button
                                    size="sm" variant="ghost" aria-label={`Delete ${service.name}`}
                                    onClick={() => handleDeleteService(service.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </Button>
                                </div>
                              </div>
                              <p className="mb-4 text-gray-600 text-sm min-h-[3rem]">{service.description}</p>
                              <div className="mb-3 flex flex-wrap gap-2">
                                {serviceTypes.map((type) => (
                                  <Badge key={type} variant="outline" className="text-xs font-medium">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                              <div className="mb-3 flex flex-wrap gap-2">
                                {coverage.length > 0 ? (
                                  coverage.map((state) => (
                                    <Badge key={state} variant="secondary" className="text-xs font-medium">
                                      {state}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">No coverage selected</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center mt-6">
                                <span className="font-semibold text-lg text-primary">{service.price_range}</span>
                                <div className="flex items-center space-x-1 text-gray-500 text-sm">
                                  <MapPin className="w-4 h-4" aria-hidden="true" />
                                  <span>{service.location || "N/A"}</span>
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

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <ServiceProviderReviews userId={user?.id} />
            </TabsContent>

            {/* Watchlist Tab */}
            <TabsContent value="watchlist">
              <WatchlistSection 
                title="My Watchlist" 
                showHeader={true}
                compact={false}
                showActions={true}
              />
            </TabsContent>
          </Tabs>

          {/* Add/Edit Service Modal */}
          <Dialog open={showAddModal} onOpenChange={() => { setShowAddModal(false); setEditingService(null); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                {editingService ? "Edit Service" : "Add New Service"}
              </DialogTitle>
              <div className="space-y-6 mt-6">
                {/* Basic Information Section */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="text-lg font-semibold text-primary">Basic Information</h3>
                  <Input
                    placeholder="Service Name *"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    required
                    autoFocus
                    className="font-medium"
                  />
                  <Textarea
                    placeholder="Description (Describe your service in detail)"
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Service Types Section */}
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">Service Types *</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleAllServiceTypes}
                      className="text-sm"
                    >
                      {newService.service_type.length === SERVICE_TYPE_OPTIONS.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Choose the types of services you provide</p>
                  <div className="max-h-36 overflow-y-auto border rounded-lg p-3 bg-background">
                    <div className="grid grid-cols-2 gap-3">
                      {SERVICE_TYPE_OPTIONS.map((type) => (
                        <label key={type} className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={newService.service_type.includes(type)}
                            onChange={() => toggleServiceType(type)}
                            className="w-4 h-4 text-primary border-2 rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {newService.service_type.length} of {SERVICE_TYPE_OPTIONS.length} service types
                  </p>
                </div>

                {/* Coverage States Section */}
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">Coverage States</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleAllCoverageStates}
                      className="text-sm"
                    >
                      {newService.coverage.length === INDIAN_STATES.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Select the states where you provide services</p>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-background">
                    <div className="grid grid-cols-2 gap-2">
                      {INDIAN_STATES.map((state) => (
                        <label key={state} className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={newService.coverage.includes(state)}
                            onChange={() => toggleCoverage(state)}
                            className="w-4 h-4 text-primary border-2 rounded focus:ring-primary"
                          />
                          <span className="text-sm">{state}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {newService.coverage.length} of {INDIAN_STATES.length} states
                  </p>
                </div>

                {/* Pricing & Location Section */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="text-lg font-semibold text-primary">Pricing & Location</h3>
                  <Input
                    placeholder="Price Range * (e.g., ₹1000-5000/hour)"
                    value={newService.price_range}
                    onChange={(e) => setNewService({ ...newService, price_range: e.target.value })}
                    required
                    className="font-medium"
                  />
                  <Input
                    placeholder="Primary Location (City, Region)"
                    value={newService.location}
                    onChange={(e) => setNewService({ ...newService, location: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-3 pt-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => { setShowAddModal(false); setEditingService(null); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveService}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={!newService.name.trim() || newService.service_type.length === 0 || !newService.price_range.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {editingService ? "Update Service" : "Add Service"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default ServiceProviderDashboard;