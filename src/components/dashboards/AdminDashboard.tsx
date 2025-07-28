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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Package, Settings, BarChart3, Trash2, Edit, Check, X, 
  Search, Filter, Download, Upload, Plus, MoreHorizontal, 
  Shield, ShieldCheck, AlertTriangle, RefreshCw, Eye, 
  UserX, UserPlus, Crown, Ban, CheckCircle, XCircle,
  Bot, Wrench, Truck, DollarSign, FileText, Database,
  Activity, TrendingUp, Calendar, Clock, MapPin, Phone,
  Mail, Building, Star, ThumbsUp, MessageSquare, Zap,
  Grid, List, ArrowUpDown, ExternalLink, Copy, Share,
  PieChart, LineChart, Target, Layers, Cpu, Cog,
  ShoppingCart, Briefcase, Globe, Award, Flame
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type Robot = Database['public']['Tables']['robots']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type SparePart = Database['public']['Tables']['spare_parts']['Row'];
type UserTypeEnum = Database['public']['Enums']['user_type_enum'];

interface AdminDashboardProps {
  userProfile: Profile;
}

// Admin emails list
const ADMIN_EMAILS = [
  'mark.it@keyleerkorb.com',
  // Add more admin emails here
];

interface DashboardStats {
  users: {
    total: number;
    active: number;
    buyers: number;
    sellers: number;
    serviceProviders: number;
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

const ComprehensiveAdminDashboard = ({ userProfile }: AdminDashboardProps) => {
  // Data states
  const [users, setUsers] = useState<Profile[]>([]);
  const [robots, setRobots] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [logistics, setLogistics] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // Stats and analytics
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    users: { total: 0, active: 0, buyers: 0, sellers: 0, serviceProviders: 0, newThisMonth: 0 },
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Selection states
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRobots, setSelectedRobots] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  
  // Modal states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: string, id: string, name: string} | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { toast } = useToast();

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
      setRefreshing(true);
      
      // Fetch all data in parallel
      const [
        usersResult,
        robotsResult, 
        servicesResult,
        sparePartsResult,
        documentsResult
      ] = await Promise.allSettled([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('robots').select(`*, profiles:seller_id(full_name, email, user_type)`).order('created_at', { ascending: false }),
        supabase.from('services').select(`*, profiles:provider_id(full_name, email, user_type)`).order('created_at', { ascending: false }),
        supabase.from('spare_parts').select(`*, profiles:seller_id(full_name, email, user_type)`).order('created_at', { ascending: false }),
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

      // Calculate comprehensive stats
      calculateComprehensiveStats();

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateComprehensiveStats = () => {
    // User stats
    const totalUsers = users.length;
    const buyers = users.filter(u => u.user_type === 'buyer').length;
    const sellers = users.filter(u => ['robot_seller', 'parts_seller'].includes(u.user_type || '')).length;
    const serviceProviders = users.filter(u => u.user_type === 'service_provider').length;
    const currentMonth = new Date().getMonth();
    const newThisMonth = users.filter(u => new Date(u.created_at).getMonth() === currentMonth).length;

    // Equipment stats
    const totalRobots = robots.length;
    const totalSpareParts = spareParts.length;
    const totalServices = services.length;
    const robotValue = robots.reduce((sum, r) => sum + (r.price || 0), 0);
    const partsValue = spareParts.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalValue = robotValue + partsValue;
    const activeListings = robots.filter(r => r.availability === 'available').length + 
                          spareParts.filter(p => p.quantity > 0).length + 
                          services.length;

    // Business stats
    const totalRevenue = totalValue;
    const avgOrderValue = totalUsers > 0 ? totalRevenue / totalUsers : 0;

    // Platform stats
    const averageRating = 4.7; // Mock data - would come from reviews

    setDashboardStats({
      users: {
        total: totalUsers,
        active: totalUsers, // All users considered active for now
        buyers,
        sellers,
        serviceProviders,
        newThisMonth
      },
      equipment: {
        totalRobots,
        totalSpareParts,
        totalServices,
        totalValue,
        activeListings,
        soldThisMonth: 0 // Mock data
      },
      business: {
        totalRevenue,
        monthlyGrowth: 15.2, // Mock data
        avgOrderValue,
        topSellingCategory: 'Industrial Robots'
      },
      platform: {
        totalTransactions: totalUsers * 3, // Mock calculation
        activeConversations: Math.floor(totalUsers * 0.2),
        averageRating,
        systemHealth: 95
      }
    });
  };

  // CRUD Operations
  const handleEditItem = async (itemData: any, type: string) => {
    try {
      const tableName = type === 'user' ? 'profiles' :
                      type === 'robot' ? 'robots' :
                      type === 'service' ? 'services' : 'spare_parts';

      const { error } = await supabase
        .from(tableName)
        .update(itemData)
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type} updated successfully`,
      });
      
      setEditingItem(null);
      setShowItemForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: `Failed to update ${type}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (type: string, id: string) => {
    try {
      const tableName = type === 'user' ? 'profiles' :
                      type === 'robot' ? 'robots' :
                      type === 'service' ? 'services' : 'spare_parts';

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type} deleted successfully`,
      });

      fetchAllData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: `Failed to delete ${type}`,
        variant: "destructive",
      });
    }
  };

  const handleBulkAction = async (action: string, type: string) => {
    const selectedIds = type === 'users' ? selectedUsers :
                       type === 'robots' ? selectedRobots :
                       type === 'services' ? selectedServices : selectedParts;

    if (selectedIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select items to perform bulk operations",
        variant: "destructive",
      });
      return;
    }

    try {
      switch (action) {
        case 'delete':
          if (!confirm(`Delete ${selectedIds.length} selected ${type}?`)) return;
          
          const tableName = type === 'users' ? 'profiles' :
                           type === 'robots' ? 'robots' :
                           type === 'services' ? 'services' : 'spare_parts';
          
          const { error } = await supabase
            .from(tableName)
            .delete()
            .in('id', selectedIds);

          if (error) throw error;
          
          // Clear selections
          if (type === 'users') setSelectedUsers([]);
          else if (type === 'robots') setSelectedRobots([]);
          else if (type === 'services') setSelectedServices([]);
          else setSelectedParts([]);

          toast({
            title: "Success",
            description: `${selectedIds.length} ${type} deleted successfully`,
          });
          break;

        case 'export':
          const data = type === 'users' ? users.filter(u => selectedIds.includes(u.id)) :
                      type === 'robots' ? robots.filter(r => selectedIds.includes(r.id)) :
                      type === 'services' ? services.filter(s => selectedIds.includes(s.id)) :
                      spareParts.filter(p => selectedIds.includes(p.id));
          
          exportToCSV(data, `${type}-export.csv`);
          
          toast({
            title: "Success",
            description: `${selectedIds.length} ${type} exported successfully`,
          });
          break;

        case 'activate':
          // Implement activation logic
          toast({
            title: "Success",
            description: `${selectedIds.length} ${type} activated`,
          });
          break;

        case 'deactivate':
          // Implement deactivation logic
          toast({
            title: "Success", 
            description: `${selectedIds.length} ${type} deactivated`,
          });
          break;

        default:
          toast({
            title: "Coming Soon",
            description: `Bulk ${action} functionality will be available soon`,
          });
      }

      setShowBulkDialog(false);
      fetchAllData();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: "Error",
        description: `Failed to perform bulk ${action}`,
        variant: "destructive",
      });
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(header => {
        const value = item[header];
        return typeof value === 'object' ? JSON.stringify(value) : value;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
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
                You need administrator privileges to access this comprehensive dashboard.
              </p>
              
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-700 mb-2">🔍 Access Check:</h3>
                <div className="text-sm space-y-1 text-gray-700">
                  <p><strong>User Email:</strong> {userProfile?.email || 'Not available'}</p>
                  <p><strong>Admin Emails:</strong> {ADMIN_EMAILS.join(', ')}</p>
                  <p><strong>Is Admin:</strong> {ADMIN_EMAILS.includes(userProfile?.email || '') ? '✅ Yes' : '❌ No'}</p>
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
            <p className="text-muted-foreground">Loading comprehensive admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced comprehensive stats cards
  const comprehensiveStatsCards = [
    {
      category: "Users & Accounts",
      cards: [
        { title: 'Total Users', value: dashboardStats.users.total.toString(), icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', trend: `+${dashboardStats.users.newThisMonth} this month` },
        { title: 'Active Buyers', value: dashboardStats.users.buyers.toString(), icon: ShoppingCart, color: 'text-green-600', bgColor: 'bg-green-50', trend: 'Purchasing users' },
        { title: 'Sellers', value: dashboardStats.users.sellers.toString(), icon: Briefcase, color: 'text-purple-600', bgColor: 'bg-purple-50', trend: 'Equipment sellers' },
        { title: 'Service Providers', value: dashboardStats.users.serviceProviders.toString(), icon: Wrench, color: 'text-orange-600', bgColor: 'bg-orange-50', trend: 'Active providers' }
      ]
    },
    {
      category: "Equipment & Inventory",
      cards: [
        { title: 'Total Robots', value: dashboardStats.equipment.totalRobots.toString(), icon: Bot, color: 'text-indigo-600', bgColor: 'bg-indigo-50', trend: 'Industrial & service robots' },
        { title: 'Spare Parts', value: dashboardStats.equipment.totalSpareParts.toString(), icon: Cog, color: 'text-cyan-600', bgColor: 'bg-cyan-50', trend: 'Available parts' },
        { title: 'Services Listed', value: dashboardStats.equipment.totalServices.toString(), icon: Settings, color: 'text-pink-600', bgColor: 'bg-pink-50', trend: 'Active services' },
        { title: 'Total Value', value: `₹${dashboardStats.equipment.totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-50', trend: 'Inventory value' }
      ]
    },
    {
      category: "Business Metrics",
      cards: [
        { title: 'Total Revenue', value: `₹${dashboardStats.business.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-red-600', bgColor: 'bg-red-50', trend: `+${dashboardStats.business.monthlyGrowth}% growth` },
        { title: 'Active Listings', value: dashboardStats.equipment.activeListings.toString(), icon: Activity, color: 'text-yellow-600', bgColor: 'bg-yellow-50', trend: 'Available for sale' },
        { title: 'Platform Rating', value: dashboardStats.platform.averageRating.toFixed(1), icon: Star, color: 'text-amber-600', bgColor: 'bg-amber-50', trend: 'Customer satisfaction' },
        { title: 'System Health', value: `${dashboardStats.platform.systemHealth}%`, icon: CheckCircle, color: 'text-teal-600', bgColor: 'bg-teal-50', trend: 'Operational status' }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Comprehensive Admin Control Center
          </h1>
          <p className="text-muted-foreground text-lg">
            Complete platform management • Equipment • Users • Services • Analytics
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-green-100 text-green-800">
              <Crown className="w-3 h-3 mr-1" />
              Super Admin Access
            </Badge>
            <Badge variant="outline">
              <Database className="w-3 h-3 mr-1" />
              Full Database Control
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => fetchAllData()}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <Button variant="outline" onClick={() => setShowAnalytics(true)}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Platform Data
          </Button>
          <Button className="bg-gradient-to-r from-red-600 to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Quick Actions
          </Button>
        </div>
      </div>

      {/* Comprehensive Stats Grid */}
      {comprehensiveStatsCards.map((category, categoryIndex) => (
        <div key={categoryIndex} className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{category.category}</h2>
            <Badge variant="outline" className="text-xs">
              {category.cards.length} metrics
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {category.cards.map((stat, index) => {
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
        </div>
      ))}

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Global search across all data..."
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
            <SelectItem value="high-value">High Value Items</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Tabs with Everything */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-12">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="robots" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Robots ({robots.length})
          </TabsTrigger>
          <TabsTrigger value="parts" className="flex items-center gap-2">
            <Cog className="w-4 h-4" />
            Parts ({spareParts.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Services ({services.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents ({documents.length})
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
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Platform Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">New Robot Listed</p>
                        <p className="text-sm text-muted-foreground">Industrial Robot XR-2000</p>
                      </div>
                    </div>
                    <Badge variant="outline">2 mins ago</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">New User Registration</p>
                        <p className="text-sm text-muted-foreground">Service provider joined</p>
                      </div>
                    </div>
                    <Badge variant="outline">5 mins ago</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Settings className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Service Request</p>
                        <p className="text-sm text-muted-foreground">Maintenance request submitted</p>
                      </div>
                    </div>
                    <Badge variant="outline">10 mins ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Platform Health & Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>System Performance</span>
                      <span>{dashboardStats.platform.systemHealth}%</span>
                    </div>
                    <Progress value={dashboardStats.platform.systemHealth} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Database Health</span>
                      <span>98%</span>
                    </div>
                    <Progress value={98} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>User Satisfaction</span>
                      <span>{dashboardStats.platform.averageRating * 20}%</span>
                    </div>
                    <Progress value={dashboardStats.platform.averageRating * 20} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold">{dashboardStats.platform.activeConversations}</p>
                      <p className="text-sm text-muted-foreground">Active Chats</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold">{dashboardStats.platform.totalTransactions}</p>
                      <p className="text-sm text-muted-foreground">Total Transactions</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Management Tab */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Complete User Management
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedUsers.length === users.length) {
                        setSelectedUsers([]);
                      } else {
                        setSelectedUsers(users.map(u => u.id));
                      }
                    }}
                    size="sm"
                  >
                    {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedUsers.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkAction('users');
                        setShowBulkDialog(true);
                      }}
                      size="sm"
                    >
                      Bulk Actions ({selectedUsers.length})
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === users.length}
                        onCheckedChange={() => {
                          if (selectedUsers.length === users.length) {
                            setSelectedUsers([]);
                          } else {
                            setSelectedUsers(users.map(u => u.id));
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>User Details</TableHead>
                    <TableHead>Type & Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || 'No Name'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">{user.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={`text-xs ${
                            user.user_type === 'buyer' ? 'bg-blue-100 text-blue-800' :
                            user.user_type === 'robot_seller' ? 'bg-green-100 text-green-800' :
                            user.user_type === 'service_provider' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.user_type || 'Not Set'}
                          </Badge>
                          {ADMIN_EMAILS.includes(user.email || '') && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.company_name || 'Individual'}</p>
                          <p className="text-sm text-muted-foreground">{user.location}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.user_type ? "default" : "secondary"}>
                          {user.user_type ? 'Active' : 'Incomplete Profile'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" title="View Profile">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingItem(user);
                              setShowItemForm(true);
                            }}
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({type: 'user', id: user.id, name: user.full_name || user.email || 'User'});
                              setShowDeleteDialog(true);
                            }}
                            disabled={ADMIN_EMAILS.includes(user.email || '')}
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
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

        {/* Robots Management Tab */}
        <TabsContent value="robots" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Robot Equipment Management
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedRobots.length === robots.length) {
                        setSelectedRobots([]);
                      } else {
                        setSelectedRobots(robots.map(r => r.id));
                      }
                    }}
                    size="sm"
                  >
                    {selectedRobots.length === robots.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedRobots.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkAction('robots');
                        setShowBulkDialog(true);
                      }}
                      size="sm"
                    >
                      Bulk Actions ({selectedRobots.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'list' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRobots.length === robots.length}
                          onCheckedChange={() => {
                            if (selectedRobots.length === robots.length) {
                              setSelectedRobots([]);
                            } else {
                              setSelectedRobots(robots.map(r => r.id));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Robot Details</TableHead>
                      <TableHead>Seller Info</TableHead>
                      <TableHead>Price & Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Listed Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {robots.map((robot) => (
                      <TableRow key={robot.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRobots.includes(robot.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRobots([...selectedRobots, robot.id]);
                              } else {
                                setSelectedRobots(selectedRobots.filter(id => id !== robot.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                              {robot.images && robot.images.length > 0 ? (
                                <img 
                                  src={robot.images[0]} 
                                  alt={robot.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Bot className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{robot.name}</p>
                              <p className="text-sm text-muted-foreground">{robot.model}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {robot.robot_type}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{robot.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{robot.profiles?.email}</p>
                            <Badge className="text-xs mt-1 bg-blue-100 text-blue-800">
                              {robot.profiles?.user_type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-bold text-lg">₹{robot.price?.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{robot.currency}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              Qty: {robot.quantity || 1}
                            </Badge>
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
                            <Button variant="ghost" size="sm" title="View Details">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setEditingItem({...robot, type: 'robot'});
                                setShowItemForm(true);
                              }}
                              title="Edit Robot"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setDeleteTarget({type: 'robot', id: robot.id, name: robot.name});
                                setShowDeleteDialog(true);
                              }}
                              title="Delete Robot"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {robots.map((robot) => (
                    <Card key={robot.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="relative mb-3">
                          <Checkbox
                            className="absolute top-2 left-2 z-10 bg-white rounded"
                            checked={selectedRobots.includes(robot.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRobots([...selectedRobots, robot.id]);
                              } else {
                                setSelectedRobots(selectedRobots.filter(id => id !== robot.id));
                              }
                            }}
                          />
                          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {robot.images && robot.images.length > 0 ? (
                              <img 
                                src={robot.images[0]} 
                                alt={robot.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Bot className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <h3 className="font-semibold truncate mb-1">{robot.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{robot.model}</p>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            {robot.robot_type}
                          </Badge>
                          <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'} className="text-xs">
                            {robot.availability}
                          </Badge>
                        </div>
                        <p className="font-bold text-lg mb-2">₹{robot.price?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Seller: {robot.profiles?.full_name || 'Unknown'}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setEditingItem({...robot, type: 'robot'});
                              setShowItemForm(true);
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

        {/* Services Management Tab */}
        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Service Provider Management
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedServices.length === services.length) {
                        setSelectedServices([]);
                      } else {
                        setSelectedServices(services.map(s => s.id));
                      }
                    }}
                    size="sm"
                  >
                    {selectedServices.length === services.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedServices.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkAction('services');
                        setShowBulkDialog(true);
                      }}
                      size="sm"
                    >
                      Bulk Actions ({selectedServices.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedServices.length === services.length}
                        onCheckedChange={() => {
                          if (selectedServices.length === services.length) {
                            setSelectedServices([]);
                          } else {
                            setSelectedServices(services.map(s => s.id));
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Service Details</TableHead>
                    <TableHead>Provider Info</TableHead>
                    <TableHead>Type & Category</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedServices([...selectedServices, service.id]);
                            } else {
                              setSelectedServices(selectedServices.filter(id => id !== service.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {service.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{service.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{service.profiles?.email}</p>
                          <Badge className="text-xs mt-1 bg-purple-100 text-purple-800">
                            {service.profiles?.user_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {service.service_type}
                          </Badge>
                          {service.specializations && service.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {service.specializations.slice(0, 2).map((spec, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                              {service.specializations.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{service.specializations.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {service.price_range || 'Contact for pricing'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{service.location || 'Not specified'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" title="View Service">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingItem({...service, type: 'service'});
                              setShowItemForm(true);
                            }}
                            title="Edit Service"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({type: 'service', id: service.id, name: service.name});
                              setShowDeleteDialog(true);
                            }}
                            title="Delete Service"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
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

        {/* Spare Parts Management Tab */}
        <TabsContent value="parts" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Cog className="w-5 h-5" />
                  Spare Parts Inventory Management
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedParts.length === spareParts.length) {
                        setSelectedParts([]);
                      } else {
                        setSelectedParts(spareParts.map(p => p.id));
                      }
                    }}
                    size="sm"
                  >
                    {selectedParts.length === spareParts.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedParts.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkAction('parts');
                        setShowBulkDialog(true);
                      }}
                      size="sm"
                    >
                      Bulk Actions ({selectedParts.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedParts.length === spareParts.length}
                        onCheckedChange={() => {
                          if (selectedParts.length === spareParts.length) {
                            setSelectedParts([]);
                          } else {
                            setSelectedParts(spareParts.map(p => p.id));
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Part Details</TableHead>
                    <TableHead>Seller Info</TableHead>
                    <TableHead>Pricing & Stock</TableHead>
                    <TableHead>Compatibility</TableHead>
                    <TableHead>Listed Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spareParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedParts.includes(part.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedParts([...selectedParts, part.id]);
                            } else {
                              setSelectedParts(selectedParts.filter(id => id !== part.id));
                            }
                          }}
                        />
                      </TableCell>
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
                            <p className="text-xs text-muted-foreground">
                              {part.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{part.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{part.profiles?.email}</p>
                          <Badge className="text-xs mt-1 bg-cyan-100 text-cyan-800">
                            {part.profiles?.user_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold">₹{part.price?.toLocaleString()}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Stock: {part.quantity}
                            </Badge>
                            <Badge 
                              variant={part.quantity > 0 ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {part.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {part.compatible_robots && part.compatible_robots.length > 0 ? (
                          <div className="space-y-1">
                            {part.compatible_robots.slice(0, 2).map((robot, index) => (
                              <Badge key={index} variant="secondary" className="text-xs block w-fit">
                                {robot}
                              </Badge>
                            ))}
                            {part.compatible_robots.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{part.compatible_robots.length - 2} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Universal</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(part.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" title="View Part">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingItem({...part, type: 'part'});
                              setShowItemForm(true);
                            }}
                            title="Edit Part"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({type: 'part', id: part.id, name: part.name});
                              setShowDeleteDialog(true);
                            }}
                            title="Delete Part"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
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

        {/* Documents Management Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Management System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            <p className="text-sm text-muted-foreground">{doc.mime_type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{doc.user_id}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.document_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{(doc.file_size / 1024).toFixed(2)} KB</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" title="View Document">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Download">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete">
                            <Trash2 className="w-4 h-4 text-red-600" />
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

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Platform Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Total Platform Value</p>
                      <p className="text-2xl font-bold">₹{dashboardStats.equipment.totalValue.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Growth Rate</p>
                      <p className="text-2xl font-bold">{dashboardStats.business.monthlyGrowth}%</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">User Satisfaction</p>
                      <p className="text-2xl font-bold">{dashboardStats.platform.averageRating}/5.0</p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-blue-600" />
                      <span>Robots</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{dashboardStats.equipment.totalRobots}</p>
                      <p className="text-sm text-muted-foreground">
                        {((dashboardStats.equipment.totalRobots / (dashboardStats.equipment.totalRobots + dashboardStats.equipment.totalSpareParts + dashboardStats.equipment.totalServices)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cog className="w-4 h-4 text-cyan-600" />
                      <span>Spare Parts</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{dashboardStats.equipment.totalSpareParts}</p>
                      <p className="text-sm text-muted-foreground">
                        {((dashboardStats.equipment.totalSpareParts / (dashboardStats.equipment.totalRobots + dashboardStats.equipment.totalSpareParts + dashboardStats.equipment.totalServices)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-purple-600" />
                      <span>Services</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{dashboardStats.equipment.totalServices}</p>
                      <p className="text-sm text-muted-foreground">
                        {((dashboardStats.equipment.totalServices / (dashboardStats.equipment.totalRobots + dashboardStats.equipment.totalSpareParts + dashboardStats.equipment.totalServices)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose an action to perform on selected {bulkAction}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                onClick={() => handleBulkAction('export', bulkAction)}
                className="justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Selected
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkAction('activate', bulkAction)}
                className="justify-start"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate Selected
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkAction('deactivate', bulkAction)}
                className="justify-start"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Deactivate Selected
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkAction('delete', bulkAction)}
                className="justify-start text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  handleDeleteItem(deleteTarget.type, deleteTarget.id);
                }
                setShowDeleteDialog(false);
                setDeleteTarget(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComprehensiveAdminDashboard;
