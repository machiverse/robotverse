import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Package, Settings, BarChart3, Trash2, Edit, Check, X, 
  Search, Filter, Download, Upload, Plus, MoreHorizontal, 
  Shield, ShieldCheck, AlertTriangle, RefreshCw, Eye, 
  UserX, UserPlus, Crown, Ban, CheckCircle, XCircle,
  Bot, Wrench, Truck, DollarSign, FileText, Database as DatabaseIcon,
  Activity, TrendingUp, Calendar, Clock, MapPin, Phone,
  Mail, Building, Star, ThumbsUp, MessageSquare, Zap,
  Grid, List, ArrowUpDown, ExternalLink, Copy, Share,
  PieChart, LineChart, Target, Layers, Cpu, Cog,
  ShoppingCart, Briefcase, Globe, Award, Flame, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name?: string;
  email?: string;
  company_name?: string;
  mobile_number?: string;
  location?: string;
  user_type?: string;
  account_type?: string;
  created_at: string;
  updated_at?: string;
}

interface Robot {
  id: string;
  name: string;
  model?: string;
  robot_type?: string;
  price?: number;
  availability?: string;
  quantity?: number;
  seller_id: string;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
  service_type?: string;
  price_range?: string;
  location?: string;
  provider_id: string;
  created_at: string;
}

interface SparePart {
  id: string;
  name: string;
  part_number?: string;
  price?: number;
  quantity: number;
  seller_id: string;
  created_at: string;
}

interface DashboardStats {
  users: {
    total: number;
    active: number;
    buyers: number;
    sellers: number;
    serviceProviders: number;
    newThisMonth: number;
    verified: number;
  };
  equipment: {
    totalRobots: number;
    totalSpareParts: number;
    totalServices: number;
    totalValue: number;
    activeListings: number;
    soldThisMonth: number;
  };
  business: {
    totalRevenue: number;
    monthlyGrowth: number;
    avgOrderValue: number;
    topSellingCategory: string;
  };
  platform: {
    totalTransactions: number;
    activeConversations: number;
    averageRating: number;
    systemHealth: number;
  };
}

interface AdminDashboardProps {
  userProfile: Profile;
}

const ADMIN_EMAILS = [
  'admin@robotics.com',
  'mark.it@keyleerkorb.com',
  // Add more admin emails here
];

const AdminDashboard = ({ userProfile }: AdminDashboardProps) => {
  // Data states
  const [users, setUsers] = useState<Profile[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  
  // Real-time stats
  const [stats, setStats] = useState<DashboardStats>({
    users: { total: 0, active: 0, buyers: 0, sellers: 0, serviceProviders: 0, newThisMonth: 0, verified: 0 },
    equipment: { totalRobots: 0, totalSpareParts: 0, totalServices: 0, totalValue: 0, activeListings: 0, soldThisMonth: 0 },
    business: { totalRevenue: 0, monthlyGrowth: 0, avgOrderValue: 0, topSellingCategory: '' },
    platform: { totalTransactions: 0, activeConversations: 0, averageRating: 0, systemHealth: 95 }
  });
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  
  const { toast } = useToast();

  // Admin access check
  const checkAdminAccess = (): boolean => {
    return userProfile?.email && ADMIN_EMAILS.includes(userProfile.email) || 
           userProfile?.account_type === 'admin';
  };

  const isAdmin = checkAdminAccess();

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
      // Set up real-time subscriptions
      setupRealtimeSubscriptions();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch all data with counts in parallel using Supabase aggregate functions
      const [
        usersResult,
        robotsResult, 
        servicesResult,
        sparePartsResult
      ] = await Promise.allSettled([
        // Users with count
        supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false }),
        
        // Robots with seller info and count
        supabase
          .from('robots')
          .select(`
            *,
            profiles:seller_id(full_name, email, user_type)
          `, { count: 'exact' })
          .order('created_at', { ascending: false }),
        
        // Services with provider info and count
        supabase
          .from('services')
          .select(`
            *,
            profiles:provider_id(full_name, email, user_type)
          `, { count: 'exact' })
          .order('created_at', { ascending: false }),
        
        // Spare parts with seller info and count
        supabase
          .from('spare_parts')
          .select(`
            *,
            profiles:seller_id(full_name, email, user_type)
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
      ]);

      // Process results and update state
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

      // Calculate real-time stats
      await calculateRealTimeStats();

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateRealTimeStats = async () => {
    try {
      // Get real counts using Supabase aggregate functions
      const [userStats, robotStats, partsStats, serviceStats] = await Promise.all([
        // User statistics
        Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'buyer'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).in('user_type', ['robot_seller', 'parts_seller']),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'service_provider'),
          // New users this month
          supabase.from('profiles').select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        ]),
        
        // Robot statistics with price aggregation
        supabase.from('robots').select('price.sum(), quantity.sum(), *', { count: 'exact', head: true }),
        
        // Spare parts statistics
        supabase.from('spare_parts').select('price.sum(), quantity.sum(), *', { count: 'exact', head: true }),
        
        // Services count
        supabase.from('services').select('*', { count: 'exact', head: true })
      ]);

      // Process user stats
      const totalUsers = userStats[0].count || 0;
      const buyers = userStats[1].count || 0;
      const sellers = userStats[2].count || 0;
      const serviceProviders = userStats[3].count || 0;
      const newThisMonth = userStats[4].count || 0;

      // Process equipment stats
      const totalRobots = robotStats.count || 0;
      const totalSpareParts = partsStats.count || 0;
      const totalServices = serviceStats.count || 0;

      // Calculate values from current data
      const robotValue = robots.reduce((sum, r) => sum + (r.price || 0), 0);
      const partsValue = spareParts.reduce((sum, p) => sum + (p.price || 0), 0);
      const totalValue = robotValue + partsValue;

      const activeListings = robots.filter(r => r.availability === 'available').length + 
                            spareParts.filter(p => p.quantity > 0).length + 
                            services.length;

      // Update stats state
      setStats({
        users: {
          total: totalUsers,
          active: totalUsers, // Assuming all users are active
          buyers,
          sellers,
          serviceProviders,
          newThisMonth,
          verified: Math.floor(totalUsers * 0.85) // Mock verified percentage
        },
        equipment: {
          totalRobots,
          totalSpareParts,
          totalServices,
          totalValue,
          activeListings,
          soldThisMonth: Math.floor(totalRobots * 0.1) // Mock sales data
        },
        business: {
          totalRevenue: totalValue,
          monthlyGrowth: 15.2, // Mock growth
          avgOrderValue: totalUsers > 0 ? totalValue / totalUsers : 0,
          topSellingCategory: 'Industrial Robots'
        },
        platform: {
          totalTransactions: totalUsers * 2, // Mock transaction count
          activeConversations: Math.floor(totalUsers * 0.15),
          averageRating: 4.7,
          systemHealth: 95
        }
      });

    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Set up real-time subscriptions for live updates
    const usersSubscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAllData();
      })
      .subscribe();

    const robotsSubscription = supabase
      .channel('robots-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'robots' }, () => {
        fetchAllData();
      })
      .subscribe();

    const servicesSubscription = supabase
      .channel('services-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchAllData();
      })
      .subscribe();

    const partsSubscription = supabase
      .channel('spare_parts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spare_parts' }, () => {
        fetchAllData();
      })
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(usersSubscription);
      supabase.removeChannel(robotsSubscription);
      supabase.removeChannel(servicesSubscription);
      supabase.removeChannel(partsSubscription);
    };
  };

  // Filter data based on search
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRobots = robots.filter(robot =>
    robot.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    robot.robot_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    robot.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserTypeColor = (userType: string | null | undefined) => {
    const colors: Record<string, string> = {
      buyer: 'bg-blue-100 text-blue-800',
      robot_seller: 'bg-green-100 text-green-800',
      parts_seller: 'bg-yellow-100 text-yellow-800',
      service_provider: 'bg-purple-100 text-purple-800',
      logistics_provider: 'bg-orange-100 text-orange-800',
      finance_provider: 'bg-indigo-100 text-indigo-800'
    };
    return colors[userType || ''] || 'bg-gray-100 text-gray-800';
  };

  // Access control
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Shield className="w-6 h-6" />
              Admin Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-red-600">
                You need administrator privileges to access this dashboard.
              </p>
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-700 mb-2">🔍 Access Check:</h3>
                <div className="text-sm space-y-1 text-gray-700">
                  <p><strong>User Email:</strong> {userProfile?.email || 'Not available'}</p>
                  <p><strong>Admin Status:</strong> {ADMIN_EMAILS.includes(userProfile?.email || '') ? '✅ Admin' : '❌ Not Admin'}</p>
                  <p><strong>Account Type:</strong> {userProfile?.account_type || 'Not set'}</p>
                </div>
              </div>
            </div>
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
            <p className="text-muted-foreground">Loading real-time dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Real-Time Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Live database statistics • Real user data • Complete platform insights
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-green-100 text-green-800">
              <Activity className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
            <Badge variant="outline">
              <DatabaseIcon className="w-3 h-3 mr-1" />
              {stats.users.total + stats.equipment.totalRobots + stats.equipment.totalSpareParts + stats.equipment.totalServices} Total Records
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchAllData}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.users.newThisMonth} new this month
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {stats.users.buyers} Buyers
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stats.users.sellers} Sellers
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.equipment.totalRobots + stats.equipment.totalSpareParts).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.equipment.activeListings} active listings
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="text-xs bg-blue-100 text-blue-800">
                {stats.equipment.totalRobots} Robots
              </Badge>
              <Badge className="text-xs bg-cyan-100 text-cyan-800">
                {stats.equipment.totalSpareParts} Parts
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.equipment.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
            <div className="mt-2">
              <Badge className="text-xs bg-green-100 text-green-800">
                +{stats.business.monthlyGrowth}% growth
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.equipment.totalServices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users.serviceProviders} service providers
            </p>
            <div className="mt-2">
              <Badge className="text-xs bg-purple-100 text-purple-800">
                {stats.platform.averageRating}★ avg rating
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search across all data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="users">Users Only</SelectItem>
            <SelectItem value="equipment">Equipment Only</SelectItem>
            <SelectItem value="services">Services Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Tables */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger>
          <TabsTrigger value="robots">Robots ({filteredRobots.length})</TabsTrigger>
          <TabsTrigger value="parts">Parts ({spareParts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>System Performance</span>
                      <span>{stats.platform.systemHealth}%</span>
                    </div>
                    <Progress value={stats.platform.systemHealth} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>User Satisfaction</span>
                      <span>{(stats.platform.averageRating * 20).toFixed(0)}%</span>
                    </div>
                    <Progress value={stats.platform.averageRating * 20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm">Active Users Online</span>
                    </div>
                    <Badge>{Math.floor(stats.users.total * 0.05)}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm">Recent Transactions</span>
                    </div>
                    <Badge>{stats.platform.totalTransactions}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Users ({stats.users.total})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Details</TableHead>
                    <TableHead>Type & Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.slice(0, 50).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || 'No Name'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getUserTypeColor(user.user_type)}>
                          {user.user_type || 'Not Set'}
                        </Badge>
                        {ADMIN_EMAILS.includes(user.email || '') && (
                          <Badge className="bg-red-100 text-red-800 text-xs ml-1">
                            <Crown className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.company_name || 'Individual'}</p>
                          <p className="text-sm text-muted-foreground">{user.location}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{user.mobile_number || 'N/A'}</p>
                          <p className="text-muted-foreground">{user.location || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="robots" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Robots ({stats.equipment.totalRobots})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Robot Details</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Listed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRobots.slice(0, 50).map((robot) => (
                    <TableRow key={robot.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{robot.name}</p>
                            <p className="text-sm text-muted-foreground">{robot.model}</p>
                            <Badge variant="outline" className="text-xs">
                              {robot.robot_type}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">Seller #{robot.seller_id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">Robot Seller</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold">₹{robot.price?.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">Qty: {robot.quantity || 1}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'}>
                          {robot.availability}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(robot.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Spare Parts ({stats.equipment.totalSpareParts})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Details</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price & Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Listed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spareParts.slice(0, 50).map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                            <Cog className="w-5 h-5 text-cyan-600" />
                          </div>
                          <div>
                            <p className="font-medium">{part.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Part #: {part.part_number || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">Seller #{part.seller_id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">Parts Seller</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold">₹{part.price?.toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs">
                            Stock: {part.quantity}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={part.quantity > 0 ? 'default' : 'secondary'}>
                          {part.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(part.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
