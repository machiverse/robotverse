import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Truck,
  Package,
  MapPin,
  Activity,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit,
  Eye,
  RefreshCw,
  Download,
  Settings,
  PieChart,
  TrendingUp,
  BarChart3,
  Globe,
  Building,
  User,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LogisticsServiceForm from '@/components/forms/LogisticsServiceForm';

// Example type for user profile - adjust as needed from your supabase types
interface Profile {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  location?: string;
  user_type?: string;
  primary_user_type?: string;
}

interface LogisticsProviderDashboardProps {
  userProfile: Profile;
}

interface DashboardStats {
  activeQuotes: number;
  completedDeliveries: number;
  onTimeDeliveryRate: number;
  monthlyRevenue: number;
  customerRating: number;
  serviceRequests: number;
  profileCompletion: number;
  businessVerified: boolean;
}

interface ServiceArea {
  id: string;
  area_name: string;
  coverage_radius: number;
  active: boolean;
}

const LogisticsProviderDashboard = ({ userProfile }: LogisticsProviderDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeQuotes: 0,
    completedDeliveries: 0,
    onTimeDeliveryRate: 0,
    monthlyRevenue: 0,
    customerRating: 0,
    serviceRequests: 0,
    profileCompletion: 0,
    businessVerified: false
  });

  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [logisticsServices, setLogisticsServices] = useState<any[]>([]);

  const [editingService, setEditingService] = useState<any>(null);
  const [editingArea, setEditingArea] = useState<ServiceArea | null>(null);

  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [showAddAreaForm, setShowAddAreaForm] = useState(false);

  // Check if user is logistics provider by profile type
  const userType = userProfile?.user_type || userProfile?.primary_user_type;
  const isLogisticsProvider = userType === 'logistics_provider' || userType === 'logistics';

  // Function to calculate profile completion percentage
  const calculateProfileCompletion = (profile: Profile): number => {
    if (!profile) return 0;
    const requiredFields = ['full_name', 'email', 'phone', 'company_name', 'location', 'user_type'];
    const completedFields = requiredFields.filter(field => !!profile[field as keyof Profile]);
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  // Fetch dashboard data
  const fetchRealDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setRefreshing(true);

      // Fetch shipments, services, coverage areas in parallel
      const [shipmentsResult, coverageResult, servicesResult] = await Promise.all([
        supabase.from('logistics_shipments').select('*').eq('provider_id', user.id),
        supabase.from('logistics_coverage').select('*').eq('provider_id', user.id),
        supabase.from('logistics_services').select('*').eq('provider_id', user.id)
      ]);

      const shipments = shipmentsResult.data || [];
      const coverage = coverageResult.data || [];
      const services = servicesResult.data || [];

      setLogisticsServices(services);

      const areas: ServiceArea[] = coverage.map(area => ({
        id: area.id,
        area_name: area.area_name,
        coverage_radius: 50, // Default radius as coverage_radius field doesn't exist
        active: area.is_active ?? true
      }));

      setServiceAreas(areas);

      const profileCompletion = calculateProfileCompletion(userProfile);

      // Calculate stats
      const completedDeliveries = shipments.filter(s => s.status === 'delivered').length;
      const onTimeDeliveries = shipments.filter(s =>
        s.status === 'delivered' &&
        s.actual_delivery &&
        s.estimated_delivery &&
        new Date(s.actual_delivery) <= new Date(s.estimated_delivery)
      ).length;
      const onTimeRate = completedDeliveries > 0 ? (onTimeDeliveries / completedDeliveries) * 100 : 0;

      const monthlyRevenue = shipments
        .filter(s => new Date(s.created_at).getMonth() === new Date().getMonth())
        .reduce((sum, s) => sum + (s.cost || 0), 0);

      setDashboardStats({
        activeQuotes: shipments.filter(s => s.status === 'pending').length,
        completedDeliveries,
        onTimeDeliveryRate: Math.round(onTimeRate),
        monthlyRevenue,
        customerRating: 4.5, // Placeholder
        serviceRequests: shipments.length,
        profileCompletion,
        businessVerified: Boolean(userProfile?.company_name && userProfile?.phone && userProfile?.email)
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, userProfile, toast]);

  useEffect(() => {
    if (user) {
      fetchRealDashboardData();
    }
  }, [user, fetchRealDashboardData]);

  // Handler to add new service coverage area
  const handleAddServiceArea = async (areaData: Partial<ServiceArea>) => {
    try {
      const newArea: ServiceArea = {
        id: `area_${Date.now()}`,
        area_name: areaData.area_name || '',
        coverage_radius: areaData.coverage_radius || 50,
        active: true
      };

      setServiceAreas(prev => [...prev, newArea]);
      toast({ title: 'Success', description: 'Service area added successfully' });
      setShowAddAreaForm(false);
      setActiveTab('coverage'); // Auto-switch to coverage tab
    } catch (error) {
      console.error('Error adding service area:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add service area'
      });
    }
  };

  // Badge helper for status labels
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      active: { variant: 'default' as const, label: 'Active' },
      completed: { variant: 'outline' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' }
    };
    return <Badge variant={statusConfig[status]?.variant || 'secondary'}>{statusConfig[status]?.label || 'Pending'}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading logistics dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isLogisticsProvider) {
    return (
      <div className="space-y-6">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-orange-700">
            <strong>⚠️ Logistics Provider Access Required</strong>
            <br />
            Your account type is currently "{userType || 'not set'}". Please update to "logistics_provider" type to access.
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>Become a Logistics Provider</CardTitle>
            <CardDescription>Join our network of trusted logistics partners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">What You'll Get:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Access to shipping requests</li>
                  <li>• Fleet management tools</li>
                  <li>• Route optimization</li>
                  <li>• Payment processing</li>
                  <li>• Customer ratings system</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Requirements:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Valid transport license</li>
                  <li>• Fleet registration</li>
                  <li>• Insurance coverage</li>
                  <li>• Background verification</li>
                  <li>• Service area coverage</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => window.location.href = '/profile'}>Update Profile</Button>
              <Button variant="outline" onClick={() => window.location.href = '/contact'}>Contact Support</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enhancedStatsCards = [
    {
      title: 'Profile Completion',
      value: `${dashboardStats.profileCompletion}%`,
      icon: User,
      trend: 'Setup progress',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Services',
      value: logisticsServices.filter(s => s.is_active).length,
      icon: Truck,
      trend: 'Service offerings',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Service Areas',
      value: serviceAreas.length,
      icon: MapPin,
      trend: 'Coverage locations',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Business Status',
      value: dashboardStats.businessVerified ? 'Verified' : 'Pending',
      icon: Settings,
      trend: 'Verification status',
      color: dashboardStats.businessVerified ? 'text-green-600' : 'text-yellow-600',
      bgColor: dashboardStats.businessVerified ? 'bg-green-50' : 'bg-yellow-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Access Confirmed */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="w-4 h-4" />
        <AlertDescription className="text-green-700">
          <strong>✅ Logistics Provider Access Confirmed</strong> - Welcome, {userProfile.full_name || user?.email}!
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Logistics Provider Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your logistics services, coverage areas, and profile</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchRealDashboardData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button
            onClick={() => {
              setEditingService(null);
              setShowAddServiceForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {enhancedStatsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">{stat.trend}</Badge>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Services ({logisticsServices.length})
          </TabsTrigger>
          <TabsTrigger value="coverage" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Coverage ({serviceAreas.length})
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Content */}
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Business Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardStats.profileCompletion < 100 ? (
                <>
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>Complete your profile to start receiving logistics requests</AlertDescription>
                  </Alert>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Profile Completion</span>
                      <span>{dashboardStats.profileCompletion}%</span>
                    </div>
                    <Progress value={dashboardStats.profileCompletion} className="h-2" />
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => window.location.href = '/profile'}>
                    Complete Profile Setup
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Profile Complete!</h3>
                  <p className="text-muted-foreground mb-4">You're ready to receive logistics requests</p>
                  <Button>Start Receiving Requests</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Content */}
        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Logistics Services
                  </CardTitle>
                  <CardDescription>Manage your logistics service offerings</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingService(null);
                    setShowAddServiceForm(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logisticsServices.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Services Added Yet</h3>
                  <p className="text-muted-foreground mb-4">Add your logistics services to let customers know what you offer</p>
                  <Button onClick={() => setShowAddServiceForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Service
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logisticsServices.map(service => (
                      <TableRow key={service.id}>
                        <TableCell>{service.service_name}</TableCell>
                        <TableCell>{service.service_type}</TableCell>
                        <TableCell>{service.description}</TableCell>
                        <TableCell>{getStatusBadge(service.is_active ? 'active' : 'pending')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingService(service);
                                setShowAddServiceForm(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Areas Content */}
        <TabsContent value="coverage" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Service Coverage Areas
                  </CardTitle>
                  <CardDescription>Manage your service delivery locations</CardDescription>
                </div>
                <Button onClick={() => setShowAddAreaForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Area
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {serviceAreas.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Coverage Areas</h3>
                  <p className="text-muted-foreground mb-4">Add coverage areas to let customers know where you operate</p>
                  <Button onClick={() => setShowAddAreaForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Area
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceAreas.map(area => (
                    <Card key={area.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold">{area.area_name}</h3>
                          </div>
                          <Badge variant={area.active ? "default" : "secondary"}>
                            {area.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Building className="w-3 h-3" />
                            <span>Radius: {area.coverage_radius} km</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setEditingArea(area);
                              setShowAddAreaForm(true);
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Profile Setup & Verification
              </CardTitle>
              <CardDescription>Complete and verify your profile</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Profile completion and verification UI */}

              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Profile Completion</h3>
                  <p className="text-sm text-muted-foreground">{dashboardStats.profileCompletion}% complete</p>
                </div>
                <div className="w-40 bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    style={{ width: `${dashboardStats.profileCompletion}%` }}
                    className="bg-primary h-3"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={() => window.location.href = '/profile'} className="mt-4">
                Update Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Business Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Analytics data will appear here when available.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Service Dialog */}
      <Dialog open={showAddServiceForm} onOpenChange={setShowAddServiceForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <LogisticsServiceForm
            editingService={editingService}
            onSuccess={() => {
              setShowAddServiceForm(false);
              setEditingService(null);
              fetchRealDashboardData();
              setActiveTab('coverage'); // Switch tab after add/edit service
            }}
            onCancel={() => {
              setShowAddServiceForm(false);
              setEditingService(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Coverage Area Dialog */}
      <Dialog open={showAddAreaForm} onOpenChange={setShowAddAreaForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Edit Service Area' : 'Add Service Area'}</DialogTitle>
          </DialogHeader>
          <AreaForm
            editingArea={editingArea}
            onSubmit={(data) => {
              if (editingArea) {
                // Edit existing area locally
                setServiceAreas(prev =>
                  prev.map(area => (area.id === editingArea.id ? { ...area, ...data } : area))
                );
                toast({ title: "Success", description: "Service area updated successfully" });
                setEditingArea(null);
                setShowAddAreaForm(false);
                setActiveTab('coverage');
              } else {
                handleAddServiceArea(data);
              }
            }}
            onCancel={() => {
              setShowAddAreaForm(false);
              setEditingArea(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};


// Separate component for Add/Edit Area Form for clean modularity
interface AreaFormProps {
  editingArea: ServiceArea | null;
  onSubmit: (data: Partial<ServiceArea>) => void;
  onCancel: () => void;
}
const AreaForm = ({ editingArea, onSubmit, onCancel }: AreaFormProps) => {
  const [areaName, setAreaName] = useState(editingArea?.area_name || '');
  const [radius, setRadius] = useState(editingArea?.coverage_radius || 50);

  useEffect(() => {
    setAreaName(editingArea?.area_name || '');
    setRadius(editingArea?.coverage_radius || 50);
  }, [editingArea]);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (!areaName.trim()) {
          alert('Area Name cannot be empty');
          return;
        }
        onSubmit({ area_name: areaName, coverage_radius: radius });
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="area_name">Area Name</Label>
        <Input
          id="area_name"
          value={areaName}
          onChange={e => setAreaName(e.target.value)}
          placeholder="e.g., Mumbai, Delhi NCR"
          required
        />
      </div>
      <div>
        <Label htmlFor="coverage_radius">Coverage Radius (km)</Label>
        <Input
          id="coverage_radius"
          type="number"
          min={1}
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{editingArea ? 'Update Area' : 'Add Area'}</Button>
      </div>
    </form>
  );
};

export default LogisticsProviderDashboard;
