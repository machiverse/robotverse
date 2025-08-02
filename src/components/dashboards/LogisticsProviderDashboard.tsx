import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  Star,
  DollarSign,
  Navigation,
  Users,
  Activity,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  Settings,
  Shield,
  PhoneCall,
  Mail,
  Calendar,
  Route,
  Fuel,
  Wrench,
  AlertCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  Globe,
  Building,
  User
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database as SupabaseDatabase } from "@/integrations/supabase/types";

type Profile = SupabaseDatabase['public']['Tables']['profiles']['Row'];
type UserTypeEnum = SupabaseDatabase['public']['Enums']['user_type_enum'];

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
  
  // States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
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
  const [recentInquiries, setRecentInquiries] = useState<any[]>([]);
  const [serviceCapabilities, setServiceCapabilities] = useState<string[]>([]);
  
  // Modal states
  const [showAddAreaForm, setShowAddAreaForm] = useState(false);
  const [editingArea, setEditingArea] = useState<ServiceArea | null>(null);

  // Enhanced access check for logistics providers
  const userType = userProfile?.user_type || userProfile?.primary_user_type;
  const isLogisticsProvider = userType === 'logistics_provider';

  console.log('🚛 Logistics Dashboard Debug:', {
    userType,
    isLogisticsProvider,
    userProfile: userProfile ? 'Present' : 'Missing',
    userId: user?.id
  });

  useEffect(() => {
    if (user) {
      fetchRealDashboardData();
    }
  }, [user]);

  const fetchRealDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setRefreshing(true);
      
      // Calculate real profile completion using existing fields
      const profileCompletion = calculateProfileCompletion(userProfile);
      
      // Fetch real logistics data from database
      const [shipmentsResult, fleetResult, coverageResult] = await Promise.all([
        supabase.from('logistics_shipments').select('*').eq('provider_id', user.id),
        supabase.from('logistics_fleet').select('*').eq('provider_id', user.id),
        supabase.from('logistics_coverage').select('*').eq('provider_id', user.id)
      ]);

      const shipments = shipmentsResult.data || [];
      const fleet = fleetResult.data || [];
      const coverage = coverageResult.data || [];

      // Calculate real service capabilities based on actual data
      const capabilities: string[] = [];
      
      // Add capabilities based on fleet data
      if (fleet.length > 0) {
        const vehicleTypes = [...new Set(fleet.map(v => v.vehicle_type))];
        vehicleTypes.forEach(type => capabilities.push(`${type} Transport`));
      }
      
      // Add capabilities based on coverage data
      if (coverage.length > 0) {
        capabilities.push(`${coverage.length} Coverage Areas`);
      }
      
      // Add basic capabilities from profile
      if (userProfile?.company_name) capabilities.push('Commercial Transport');
      if (userProfile?.phone) capabilities.push('Phone Support');
      if (userProfile?.email) capabilities.push('Email Communication');
      
      setServiceCapabilities(capabilities);
      
      // Set real service areas from database
      const areas: ServiceArea[] = coverage.map(area => ({
        id: area.id,
        area_name: area.area_name,
        coverage_radius: 50, // Default radius
        active: area.is_active
      }));
      
      setServiceAreas(areas);
      
      // Calculate real stats based on database data
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

      const realStats: DashboardStats = {
        activeQuotes: shipments.filter(s => s.status === 'pending').length,
        completedDeliveries,
        onTimeDeliveryRate: Math.round(onTimeRate),
        monthlyRevenue,
        customerRating: 4.5, // TODO: Calculate from reviews when table exists
        serviceRequests: shipments.length,
        profileCompletion,
        businessVerified: !!(userProfile?.company_name && userProfile?.phone && userProfile?.email)
      };
      
      setDashboardStats(realStats);
      
      // Set recent inquiries from shipments data
      setRecentInquiries(shipments.slice(0, 5));
      
      console.log('✅ Fetched real logistics data:', realStats);
      
    } catch (error) {
      console.error('Error fetching logistics dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, userProfile, toast]);

  const calculateProfileCompletion = (profile: any): number => {
    if (!profile) return 0;
    
    // Use actual fields that exist in the profiles table
    const requiredFields = [
      'full_name', 'email', 'phone', 'company_name', 
      'location', 'user_type'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = profile[field];
      return value && value !== '' && value !== null && value !== undefined;
    });
    
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  const handleAddServiceArea = async (areaData: Partial<ServiceArea>) => {
    try {
      // For now, we'll just add to the local state since we don't have a dedicated table
      // In the future, you can create a service_areas table linked to the user
      const newArea: ServiceArea = {
        id: `area_${Date.now()}`,
        area_name: areaData.area_name || '',
        coverage_radius: areaData.coverage_radius || 50,
        active: true
      };
      
      setServiceAreas(prev => [...prev, newArea]);

      toast({
        title: "Success",
        description: "Service area added successfully"
      });
      
      setShowAddAreaForm(false);
    } catch (error) {
      console.error('Error adding service area:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add service area"
      });
    }
  };

  // Enhanced stats cards with real data focus
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
      title: 'Service Areas',
      value: serviceAreas.length,
      icon: MapPin,
      trend: 'Coverage locations',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Capabilities',
      value: serviceCapabilities.length,
      icon: Truck,
      trend: 'Service types',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Business Status',
      value: dashboardStats.businessVerified ? 'Verified' : 'Pending',
      icon: Shield,
      trend: 'Verification status',
      color: dashboardStats.businessVerified ? 'text-green-600' : 'text-yellow-600',
      bgColor: dashboardStats.businessVerified ? 'bg-green-50' : 'bg-yellow-50'
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      active: { variant: 'default' as const, label: 'Active' },
      completed: { variant: 'outline' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

  // Access control
  if (!isLogisticsProvider) {
    return (
      <div className="space-y-6">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-orange-700">
            <strong>⚠️ Logistics Provider Access Required</strong>
            <br />
            Your account type is currently "{userType || 'not set'}". To access the logistics provider dashboard, 
            please update your profile to "logistics_provider" type.
            <br />
            <small>User ID: {user?.id} | Profile: {userProfile ? 'Present' : 'Missing'}</small>
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
              <Button onClick={() => window.location.href = '/profile'}>
                Update Profile
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/contact'}>
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Access Confirmed Banner */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="w-4 h-4" />
        <AlertDescription className="text-green-700">
          <strong>✅ Logistics Provider Access Confirmed</strong> - Welcome to your logistics dashboard, {userProfile?.full_name || user?.email}!
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Logistics Provider Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your logistics services, coverage areas, and business operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => fetchRealDashboardData()}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button onClick={() => setShowAddAreaForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Service Area
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {enhancedStatsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {stat.trend}
                    </Badge>
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

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="coverage" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Coverage ({serviceAreas.length})
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Profile Setup
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Business Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardStats.profileCompletion < 100 ? (
                  <div className="space-y-4">
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription className="text-blue-700">
                        Complete your profile to start receiving logistics requests
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Profile Completion</span>
                        <span>{dashboardStats.profileCompletion}%</span>
                      </div>
                      <Progress value={dashboardStats.profileCompletion} className="h-2" />
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = '/profile'}
                    >
                      Complete Profile Setup
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Profile Complete!</h3>
                    <p className="text-muted-foreground mb-4">
                      You're ready to receive logistics requests
                    </p>
                    <Button>Start Receiving Requests</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Service Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceCapabilities.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Complete your profile to show service capabilities
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = '/profile'}
                    >
                      Update Profile
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {serviceCapabilities.map((capability, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">{capability}</span>
                        </div>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Service Requests & Bookings
              </CardTitle>
              <CardDescription>Manage incoming logistics requests</CardDescription>
            </CardHeader>
            <CardContent>
              {recentInquiries.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Service Requests Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete your profile to start receiving logistics requests from customers
                  </p>
                  <div className="space-y-2">
                    <Button onClick={() => window.location.href = '/profile'}>
                      Complete Profile Setup
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Profile completion: {dashboardStats.profileCompletion}%
                    </p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInquiries.map((inquiry) => (
                      <TableRow key={inquiry.id}>
                        <TableCell className="font-medium">{inquiry.id}</TableCell>
                        <TableCell>{inquiry.client_name}</TableCell>
                        <TableCell>{inquiry.service_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span className="text-sm">
                              {inquiry.pickup} → {inquiry.delivery}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3" />
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

        {/* Coverage Areas Tab */}
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
                  <p className="text-muted-foreground mb-4">
                    Add service areas to let customers know where you operate
                  </p>
                  <Button onClick={() => setShowAddAreaForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Area
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceAreas.map((area) => (
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
                            <Navigation className="w-3 h-3" />
                            <span>Radius: {area.coverage_radius} km</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3" />
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

        {/* Profile Setup Tab */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Profile Setup & Verification
              </CardTitle>
              <CardDescription>Complete your logistics provider profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Profile Completion</h3>
                    <p className="text-sm text-muted-foreground">
                      {dashboardStats.profileCompletion}% complete
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="w-20 bg-muted rounded-full h-2 mb-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${dashboardStats.profileCompletion}%` }}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = '/profile'}
                    >
                      Update Profile
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Business Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Company Name:</span>
                        <span className={userProfile?.company_name ? 'text-green-600' : 'text-red-600'}>
                          {userProfile?.company_name ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Contact Info:</span>
                        <span className={userProfile?.phone && userProfile?.email ? 'text-green-600' : 'text-red-600'}>
                          {userProfile?.phone && userProfile?.email ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span className={userProfile?.location ? 'text-green-600' : 'text-red-600'}>
                          {userProfile?.location ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Service Status
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Business Verified:</span>
                        <span className={dashboardStats.businessVerified ? 'text-green-600' : 'text-red-600'}>
                          {dashboardStats.businessVerified ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service Areas:</span>
                        <span className={serviceAreas.length > 0 ? 'text-green-600' : 'text-red-600'}>
                          {serviceAreas.length > 0 ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Capabilities:</span>
                        <span className={serviceCapabilities.length > 0 ? 'text-green-600' : 'text-red-600'}>
                          {serviceCapabilities.length > 0 ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Business Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-8">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Analytics will be available once you start receiving service requests
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-8">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Performance data will appear as you complete deliveries
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Service Area Dialog */}
      <Dialog open={showAddAreaForm} onOpenChange={setShowAddAreaForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Service Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="area_name">Area Name</Label>
              <Input
                id="area_name"
                placeholder="e.g., Mumbai, Delhi NCR, Bangalore"
              />
            </div>
            <div>
              <Label htmlFor="coverage_radius">Coverage Radius (km)</Label>
              <Input
                id="coverage_radius"
                type="number"
                placeholder="50"
                defaultValue="50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddAreaForm(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                const areaName = (document.getElementById('area_name') as HTMLInputElement)?.value;
                const coverageRadius = parseInt((document.getElementById('coverage_radius') as HTMLInputElement)?.value || '50');
                if (areaName) {
                  handleAddServiceArea({ area_name: areaName, coverage_radius: coverageRadius, active: true });
                }
              }}>
                Add Area
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogisticsProviderDashboard;
