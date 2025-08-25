import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Bot, Wrench, Cog, FileText, MousePointer, PieChart, Activity, ShoppingCart, Briefcase, Truck, DollarSign, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ButtonTrackingDashboard from "@/components/ButtonTrackingDashboard";
import DatabaseTableManager from "@/components/DatabaseTableManager";

interface AdminDashboardProps {
  userProfile: any;
}

// Admin emails list
const ADMIN_EMAILS = [
  'mark.it@keyleerkorb.com',
  'mynameisrajan@gmail.com',
];

interface DashboardStats {
  users: {
    total: number;
    active: number;
    buyers: number;
    sellers: number;
    serviceProviders: number;
    logistics: number;
    finance: number;
    admins: number;
    newThisMonth: number;
  };
  equipment: {
    totalRobots: number;
    totalSpareParts: number;
    totalServices: number;
    totalValue: number;
    activeListings: number;
    soldThisMonth: number;
  };
}

const AdminDashboardFixed = ({ userProfile }: AdminDashboardProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [robots, setRobots] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    users: { total: 0, active: 0, buyers: 0, sellers: 0, serviceProviders: 0, logistics: 0, finance: 0, admins: 0, newThisMonth: 0 },
    equipment: { totalRobots: 0, totalSpareParts: 0, totalServices: 0, totalValue: 0, activeListings: 0, soldThisMonth: 0 }
  });

  // Enhanced admin access check
  const checkAdminAccess = (): boolean => {
    if (userProfile?.email && ADMIN_EMAILS.includes(userProfile.email)) {
      return true;
    }
    if (userProfile?.account_type === 'admin') {
      return true;
    }
    return false;
  };

  const isAdmin = checkAdminAccess();

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        usersResult,
        robotsResult, 
        servicesResult,
        sparePartsResult,
        documentsResult
      ] = await Promise.allSettled([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('robots').select('*').order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('created_at', { ascending: false }),
        supabase.from('spare_parts').select('*').order('created_at', { ascending: false }),
        supabase.from('document_uploads').select('*').order('uploaded_at', { ascending: false })
      ]);

      // Process results
      if (usersResult.status === 'fulfilled' && usersResult.value.data) {
        setUsers(usersResult.value.data);
      }
      if (robotsResult.status === 'fulfilled' && robotsResult.value.data) {
        setRobots(robotsResult.value.data);
      }
      if (servicesResult.status === 'fulfilled' && servicesResult.value.data) {
        setServices(servicesResult.value.data);
      }
      if (sparePartsResult.status === 'fulfilled' && sparePartsResult.value.data) {
        setSpareParts(sparePartsResult.value.data);
      }
      if (documentsResult.status === 'fulfilled' && documentsResult.value.data) {
        setDocuments(documentsResult.value.data);
      }

      // Calculate stats after data is loaded
      setTimeout(() => calculateStats(), 100);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    // Enhanced real-time user stats from actual data
    const totalUsers = users.length;
    
    // Better user categorization based on actual data
    const buyers = users.filter(u => 
      u.user_type === 'buyer' || 
      u.account_type === 'buyer' ||
      u.primary_user_type === 'buyer' ||
      (u.user_roles && u.user_roles.includes('buyer'))
    ).length;
    
    const sellers = users.filter(u => 
      ['robot_seller', 'parts_seller', 'seller', 'spare_parts_seller'].includes(u.user_type || '') || 
      u.account_type === 'seller' ||
      ['robot_seller', 'spare_parts_seller'].includes(u.primary_user_type as string) ||
      (u.user_roles && (u.user_roles.includes('robot_seller') || u.user_roles.includes('spare_parts_seller')))
    ).length;
    
    const serviceProviders = users.filter(u => 
      u.user_type === 'service_provider' || 
      u.account_type === 'service' ||
      u.primary_user_type === 'service_provider' ||
      (u.user_roles && u.user_roles.includes('service_provider'))
    ).length;
    
    const logisticsProviders = users.filter(u => 
      u.user_type === 'logistics_provider' || 
      u.account_type === 'logistics' ||
      u.primary_user_type === 'logistics_provider' ||
      (u.user_roles && u.user_roles.includes('logistics_provider'))
    ).length;
    
    const financeProviders = users.filter(u => 
      u.user_type === 'finance_provider' || 
      u.account_type === 'finance' ||
      u.primary_user_type === 'finance_provider' ||
      (u.user_roles && u.user_roles.includes('finance_provider'))
    ).length;
    
    const admins = users.filter(u => 
      u.account_type === 'admin' ||
      (u.user_roles && u.user_roles.includes('admin'))
    ).length;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newThisMonth = users.filter(u => {
      const createdDate = new Date(u.created_at);
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
    }).length;

    // Real equipment stats from database
    const totalRobots = robots.length;
    const totalSpareParts = spareParts.length;
    const totalServices = services.length;
    const robotValue = robots.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
    const partsValue = spareParts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const totalValue = robotValue + partsValue;
    const activeRobots = robots.filter(r => r.availability === 'available').length;
    const activeParts = spareParts.filter(p => (p.quantity || 0) > 0).length;
    const activeListings = activeRobots + activeParts + services.length;
    
    // Calculate sold items this month
    const soldRobots = robots.filter(r => r.availability === 'sold').length;
    const soldParts = spareParts.filter(p => (p.quantity || 0) === 0).length;
    const soldThisMonth = soldRobots + soldParts;

    setDashboardStats({
      users: {
        total: totalUsers,
        active: users.filter(u => u.registration_complete).length,
        buyers,
        sellers,
        serviceProviders,
        newThisMonth,
        logistics: logisticsProviders,
        finance: financeProviders,
        admins
      },
      equipment: {
        totalRobots,
        totalSpareParts,
        totalServices,
        totalValue,
        activeListings,
        soldThisMonth
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">You need administrator privileges to access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive platform management and analytics</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{dashboardStats.users.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Buyers</p>
                <p className="text-2xl font-bold">{dashboardStats.users.buyers}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sellers</p>
                <p className="text-2xl font-bold">{dashboardStats.users.sellers}</p>
              </div>
              <Briefcase className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-bold">{dashboardStats.users.serviceProviders}</p>
              </div>
              <Wrench className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Logistics</p>
                <p className="text-2xl font-bold">{dashboardStats.users.logistics}</p>
              </div>
              <Truck className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Finance</p>
                <p className="text-2xl font-bold">{dashboardStats.users.finance}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="button-tracking" className="flex items-center gap-2">
            <MousePointer className="w-4 h-4" />
            Tracking
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Robots:</span>
                    <span className="font-semibold">{dashboardStats.equipment.totalRobots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Parts:</span>
                    <span className="font-semibold">{dashboardStats.equipment.totalSpareParts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Services:</span>
                    <span className="font-semibold">{dashboardStats.equipment.totalServices}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Value:</span>
                    <span className="font-semibold">₹{dashboardStats.equipment.totalValue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Active Users:</span>
                    <span className="font-semibold">{dashboardStats.users.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New This Month:</span>
                    <span className="font-semibold text-green-600">{dashboardStats.users.newThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admin Users:</span>
                    <span className="font-semibold text-red-600">{dashboardStats.users.admins}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Database Management Tab */}
        <TabsContent value="database" className="mt-6">
          <div className="mb-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-800">Database Management</h3>
                    <p className="text-sm text-red-600">View, edit, and delete all database records. Use with caution!</p>
                  </div>
                  <Database className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
          <DatabaseTableManager />
        </TabsContent>

        {/* Button Tracking Tab */}
        <TabsContent value="button-tracking" className="mt-6">
          <div className="mb-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-800">Button Interaction Tracking</h3>
                    <p className="text-sm text-blue-600">Real-time tracking of all user button clicks across the platform</p>
                  </div>
                  <MousePointer className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
          <ButtonTrackingDashboard />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span className="text-sm text-muted-foreground">Buyers</span>
                    <div className="text-right">
                      <span className="font-semibold text-green-600">{dashboardStats.users.buyers}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({dashboardStats.users.total > 0 ? ((dashboardStats.users.buyers / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span className="text-sm text-muted-foreground">Sellers</span>
                    <div className="text-right">
                      <span className="font-semibold text-purple-600">{dashboardStats.users.sellers}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({dashboardStats.users.total > 0 ? ((dashboardStats.users.sellers / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span className="text-sm text-muted-foreground">Service Providers</span>
                    <div className="text-right">
                      <span className="font-semibold text-orange-600">{dashboardStats.users.serviceProviders}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({dashboardStats.users.total > 0 ? ((dashboardStats.users.serviceProviders / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span className="text-sm text-muted-foreground">Logistics</span>
                    <div className="text-right">
                      <span className="font-semibold text-cyan-600">{dashboardStats.users.logistics}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({dashboardStats.users.total > 0 ? ((dashboardStats.users.logistics / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span className="text-sm text-muted-foreground">Finance</span>
                    <div className="text-right">
                      <span className="font-semibold text-emerald-600">{dashboardStats.users.finance}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({dashboardStats.users.total > 0 ? ((dashboardStats.users.finance / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Robots</span>
                    <span className="font-semibold">{robots.filter(r => r.availability === 'available').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sold Robots</span>
                    <span className="font-semibold text-green-600">{robots.filter(r => r.availability === 'sold').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Parts in Stock</span>
                    <span className="font-semibold">{spareParts.filter(p => (p.quantity || 0) > 0).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Services</span>
                    <span className="font-semibold">{services.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Completed Profiles</span>
                    <span className="font-semibold text-green-600">{users.filter(u => u.registration_complete).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboardFixed;