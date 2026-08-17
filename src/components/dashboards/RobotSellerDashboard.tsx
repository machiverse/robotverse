import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Package,
  Activity,
  BarChart3,
  Upload,
  Download,
  Image as ImageIcon,
  ShieldX,
  AlertCircle,
  UserX,
  Grid,
  List,
  Copy,
  Star,
  Calendar,
  Clock,
  Users,
  MessageCircle,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  RefreshCw,
  Settings,
  FileText,
  Camera,
  MapPin,
  Zap,
  Heart
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useViewTracking } from '@/hooks/useViewTracking';
import RobotUpload from '@/components/RobotUpload';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ViewAnalyticsDashboard } from '@/components/analytics/ViewAnalyticsDashboard';
import WatchlistSection from '@/components/WatchlistSection';
import CRMLeadsView from '@/components/crm/CRMLeadsView';
import QuoteRequestsSection from '@/components/dashboards/QuoteRequestsSection';
import SellerAssignedRequests from '@/components/SellerAssignedRequests';
import { FileQuestion } from 'lucide-react';

interface RobotSellerDashboardProps {
  userProfile: any;
}

const RobotSellerDashboard = ({ userProfile }: RobotSellerDashboardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { viewStats, fetchUserItemViews, loading: viewsLoading } = useViewTracking();
  const [robots, setRobots] = useState<any[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedRobots, setSelectedRobots] = useState<string[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalRobots: 0,
    activeListings: 0,
    totalRevenue: 0,
    totalViews: 0,
    avgPrice: 0,
    soldThisMonth: 0,
    inquiries: 0,
    conversationRate: 0,
    avgResponseTime: 0,
    topPerforming: null as any
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRobot, setEditingRobot] = useState<any>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userType = userProfile?.user_type;
  const sellerRoles = userProfile?.seller_roles || [];
  
  const hasRobotSellerAccess = 
    userType === 'seller' || 
    userType === 'robot_seller' || 
    sellerRoles.includes('robot_seller') ||
    sellerRoles.includes('seller');

  console.log('🤖 Robot Seller Dashboard Debug:', {
    userType,
    sellerRoles,
    hasRobotSellerAccess,
    userProfile: userProfile ? 'Present' : 'Missing',
    userId: user?.id
  });

  useEffect(() => {
    fetchDashboardData();
    if (user) {
      fetchUserItemViews(user.id);
    }
  }, [user, fetchUserItemViews]);

  useEffect(() => {
    filterAndSortRobots();
  }, [robots, searchQuery, filterStatus, sortBy, sortOrder]);

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setRefreshing(true);
      
      const { data: robotsData, error } = await supabase
        .from('robots')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching robots:', error);
      }

      const robots = robotsData || [];
      setRobots(robots);
      calculateEnhancedStats(robots);
      setRecentActivity(robots.slice(0, 5));
      setLoading(false);
      setRefreshing(false);
      
      console.log('✅ Fetched robots:', robots.length);
    } catch (error) {
      console.error('Error fetching robots:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load robot listings"
      });
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateEnhancedStats = (robotData: any[]) => {
    const totalRobots = robotData.length;
    const activeListings = robotData.filter(r => r.availability === 'available').length;
    const totalRevenue = robotData.reduce((sum, r) => sum + (r.price || 0), 0);
    const avgPrice = totalRobots > 0 ? totalRevenue / totalRobots : 0;

    // Debug view stats
    console.log('📊 View Stats Debug:', {
      totalViews: viewStats.totalViews,
      robotViews: viewStats.viewsByCategory.robots,
      viewsByCategory: viewStats.viewsByCategory,
      recentViews: viewStats.recentViews.length
    });

    setDashboardStats({
      totalRobots,
      activeListings,
      totalRevenue,
      totalViews: viewStats.viewsByCategory.robots || 0,
      avgPrice,
      soldThisMonth: robotData.filter(r => {
        const soldDate = new Date(r.updated_at);
        const now = new Date();
        return r.availability === 'sold' && 
               soldDate.getMonth() === now.getMonth() && 
               soldDate.getFullYear() === now.getFullYear();
      }).length,
      inquiries: 0, // Will be calculated from user_requests table when available
      conversationRate: 0, // Will be calculated from actual interactions
      avgResponseTime: 0, // Will be calculated from actual response data
      topPerforming: robotData[0] || null
    });
  };

  const filterAndSortRobots = () => {
    let filtered = [...robots];

    if (searchQuery) {
      filtered = filtered.filter(robot => 
        robot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.robot_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(robot => robot.availability === filterStatus);
    }

    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'price') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRobots(filtered);
  };

  const handleAddRobot = () => {
    console.log('🚀 Add Robot clicked - Access:', hasRobotSellerAccess);
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Logged In",
        description: "Please log in to add robot listings"
      });
      return;
    }

    if (!hasRobotSellerAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need robot seller permissions to add listings"
      });
      return;
    }
    
    setShowAddForm(true);
    console.log('✅ Opening add form');
  };

  const handleEditRobot = (robot: any) => {
    console.log('✏️ Edit Robot clicked:', robot.id);
    
    if (!hasRobotSellerAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to edit robot listings"
      });
      return;
    }

    setEditingRobot(robot);
    setShowEditForm(true);
    console.log('✅ Opening edit form for:', robot.name);
  };

  const handleDeleteRobot = async (robotId: string) => {
    if (!hasRobotSellerAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to delete robot listings"
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this robot listing?')) return;

    try {
      const { error } = await supabase
        .from('robots')
        .delete()
        .eq('id', robotId)
        .eq('seller_id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Robot listing deleted successfully"
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting robot:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete robot listing"
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!hasRobotSellerAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to perform bulk operations"
      });
      return;
    }

    if (selectedRobots.length === 0) {
      toast({
        variant: "destructive",
        title: "No Selection",
        description: "Please select robots to perform bulk operations"
      });
      return;
    }

    try {
      switch (action) {
        case 'delete':
          if (!confirm(`Delete ${selectedRobots.length} selected robots?`)) return;
          
          const { error } = await supabase
            .from('robots')
            .delete()
            .in('id', selectedRobots)
            .eq('seller_id', user?.id);

          if (error) throw error;
          
          toast({
            title: "Success",
            description: `${selectedRobots.length} robots deleted successfully`
          });
          break;

        case 'export':
          const selectedRobotsData = robots.filter(r => selectedRobots.includes(r.id));
          const csvContent = convertToCSV(selectedRobotsData);
          downloadCSV(csvContent, 'selected-robots.csv');
          
          toast({
            title: "Success",
            description: `${selectedRobots.length} robots exported successfully`
          });
          break;

        default:
          toast({
            title: "Coming Soon",
            description: `Bulk ${action} functionality will be available soon`
          });
      }

      setSelectedRobots([]);
      setShowBulkDialog(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to perform bulk ${action}`
      });
    }
  };

  const convertToCSV = (data: any[]) => {
    const headers = ['Name', 'Type', 'Brand', 'Model', 'Price', 'Status', 'Created'];
    const rows = data.map(robot => [
      robot.name || '',
      robot.robot_type || '',
      robot.brand || '',
      robot.model || '',
      robot.price || '',
      robot.availability || '',
      new Date(robot.created_at).toLocaleDateString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSelectAll = () => {
    if (selectedRobots.length === filteredRobots.length) {
      setSelectedRobots([]);
    } else {
      setSelectedRobots(filteredRobots.map(r => r.id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4">Loading dashboard...</p>
      </div>
    );
  }

  if (!hasRobotSellerAccess) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <ShieldX className="w-6 h-6" />
              Access Restricted - Robot Seller Dashboard
            </CardTitle>
            <CardDescription className="text-red-600">
              You need robot seller permissions to access this dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Debug Information:</strong>
                <br />
                User Type: {userType || 'Not set'}
                <br />
                Seller Roles: {sellerRoles.length > 0 ? sellerRoles.join(', ') : 'None'}
                <br />
                User ID: {user?.id || 'Not logged in'}
                <br />
                Profile Status: {userProfile ? 'Present' : 'Missing'}
              </AlertDescription>
            </Alert>

            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-red-700">To access this dashboard, you need ONE of:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>User type set as 'seller'</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>User type set as 'robot_seller'</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>'robot_seller' in your seller roles array</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/profile'}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  Update Profile
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard'}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  Go to Main Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => fetchDashboardData()}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  Retry Access
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enhancedStatsCards = [
    {
      title: 'Total Robots',
      value: dashboardStats.totalRobots,
      icon: Bot,
      trend: `${dashboardStats.activeListings} active`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: '+5%'
    },
    {
      title: 'Total Revenue',
      value: `₹${dashboardStats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: `Avg: ₹${dashboardStats.avgPrice.toLocaleString()}`,
      color: 'text-success',
      bgColor: 'bg-success/10',
      change: '+12%'
    },
    {
      title: 'Robot Views',
  value: viewStats?.viewsByCategory?.robots ?? 0,
  icon: Eye,
  trend: 'Views on your robot listings',
  color: 'text-primary',
  bgColor: 'bg-primary/10',
  change: viewsLoading ? '...' : '+8%'
    },
    {
      title: 'Conversion Rate',
      value: `${dashboardStats.conversationRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: 'Views to inquiries',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+3%'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent">
            Robot Seller Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your robot inventory and track performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleBulkAction('export')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowBulkDialog(true)}
            disabled={selectedRobots.length === 0}
          >
            <Settings className="w-4 h-4 mr-2" />
            Bulk Actions ({selectedRobots.length})
          </Button>
          <Button 
            onClick={handleAddRobot}
            className="bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Robot
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
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {stat.trend}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-success">
                        {stat.change}
                      </Badge>
                    </div>
                  </div>
                  <div className={`w-14 h-14 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-12">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory ({filteredRobots.length})
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Lead Manager
          </TabsTrigger>
          <TabsTrigger value="user-requests" className="flex items-center gap-2">
            <FileQuestion className="w-4 h-4" />
            User Requests
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="watchlist" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Watchlist
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* User Requests Tab */}
        <TabsContent value="user-requests" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="w-5 h-5" />
                Assigned User Requests
              </CardTitle>
              <CardDescription>
                User requests assigned to you by admin. Submit quotations and solutions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SellerAssignedRequests categoryFilter="robot" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Manager Tab */}
        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Lead Manager
                  </CardTitle>
                  <CardDescription>
                    View product viewers, unlock buyer details, start chat, WhatsApp, email, call, send quotations, and track follow-ups
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <CRMLeadsView categoryFilter="robot" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Robot Inventory ({filteredRobots.length})
                  </CardTitle>
                  <CardDescription>Manage your robot listings and inventory</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search robots..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
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
              </div>
            </CardHeader>
            <CardContent>
              {filteredRobots.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {robots.length === 0 ? 'No robots in inventory' : 'No robots match your filters'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'Start by adding your first robot listing'
                    }
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={handleAddRobot}
                      className="bg-gradient-to-r from-primary to-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Robot
                    </Button>
                    {(searchQuery || filterStatus !== 'all') && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSearchQuery('');
                          setFilterStatus('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Selection Controls */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedRobots.length === filteredRobots.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm font-medium">
                        {selectedRobots.length > 0 
                          ? `${selectedRobots.length} selected`
                          : 'Select all'
                        }
                      </span>
                    </div>
                    {selectedRobots.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkAction('export')}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkDialog(true)}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Actions
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Robot List/Grid */}
                  {viewMode === 'list' ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedRobots.length === filteredRobots.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Robot</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRobots.map((robot) => (
                          <TableRow key={robot.id} className="hover:bg-muted/50">
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
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                                  {robot.images && robot.images.length > 0 ? (
                                     <img 
                                       src={robot.images[0]} 
                                       alt={robot.name}
                                       className="w-full h-full object-contain rounded-lg bg-muted"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <Bot className="w-6 h-6 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{robot.name || 'Unnamed Robot'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {robot.brand} {robot.model}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{robot.robot_type || 'Unknown'}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              ₹{robot.price?.toLocaleString() || '0'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={robot.availability === 'available' ? 'default' : 'secondary'}
                              >
                                {robot.availability || 'unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(robot.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" title="View Details">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditRobot(robot)}
                                  title="Edit Robot"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteRobot(robot.id)}
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
                      {filteredRobots.map((robot) => (
                        <Card key={robot.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="relative">
                              <Checkbox
                                className="absolute top-2 left-2 z-10 bg-card"
                                checked={selectedRobots.includes(robot.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedRobots([...selectedRobots, robot.id]);
                                  } else {
                                    setSelectedRobots(selectedRobots.filter(id => id !== robot.id));
                                  }
                                }}
                              />
                              <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                {robot.images && robot.images.length > 0 ? (
                                  <img 
                                   src={robot.images[0]} 
                                   alt={robot.name}
                                   className="w-full h-full object-contain rounded-lg bg-muted"
                                  />
                                ) : (
                                  <Bot className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            <h3 className="font-semibold truncate mb-1">{robot.name || 'Unnamed Robot'}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {robot.brand} {robot.model}
                            </p>
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                {robot.robot_type || 'Unknown'}
                              </Badge>
                              <Badge 
                                variant={robot.availability === 'available' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {robot.availability || 'unknown'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-bold text-lg">₹{robot.price?.toLocaleString() || '0'}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleEditRobot(robot)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteRobot(robot.id)}
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-success to-success text-primary-foreground border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-success text-sm font-medium">Total Revenue</p>
                      <p className="text-3xl font-bold mt-1">₹{dashboardStats.totalRevenue.toLocaleString()}</p>
                      <p className="text-success text-xs mt-2">From {dashboardStats.totalRobots} listings</p>
                    </div>
                    <div className="bg-card/20 p-3 rounded-xl">
                      <DollarSign className="w-8 h-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary to-primary text-primary-foreground border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-primary text-sm font-medium">Average Price</p>
                      <p className="text-3xl font-bold mt-1">₹{Math.round(dashboardStats.avgPrice).toLocaleString()}</p>
                      <p className="text-primary text-xs mt-2">Per robot listing</p>
                    </div>
                    <div className="bg-card/20 p-3 rounded-xl">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary to-primary text-primary-foreground border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-primary text-sm font-medium">Robot Views</p>
                      <p className="text-3xl font-bold mt-1">{viewStats.viewsByCategory.robots || 0}</p>
                      <p className="text-primary text-xs mt-2">Views on robot listings</p>
                    </div>
                    <div className="bg-card/20 p-3 rounded-xl">
                      <Eye className="w-8 h-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-primary-foreground border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Active Listings</p>
                      <p className="text-3xl font-bold mt-1">{dashboardStats.activeListings}</p>
                      <p className="text-orange-200 text-xs mt-2">Available now</p>
                    </div>
                    <div className="bg-card/20 p-3 rounded-xl">
                      <Package className="w-8 h-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Views Analytics Card */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
                <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/10">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                    Views Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary to-primary dark:from-primary/20 dark:to-primary/20">
                      <div>
                        <p className="font-medium text-primary dark:text-primary">Robot Views</p>
                        <p className="text-2xl font-bold text-primary">{viewStats.viewsByCategory.robots || 0}</p>
                      </div>
                      <Bot className="w-10 h-10 text-primary" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary/20 text-center">
                        <p className="text-xs text-primary dark:text-primary font-medium">This Week</p>
                        <p className="text-xl font-bold text-primary dark:text-primary">{Math.floor((viewStats.viewsByCategory.robots || 0) * 0.3)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-success/10 dark:bg-success/20 text-center">
                        <p className="text-xs text-success dark:text-success font-medium">This Month</p>
                        <p className="text-xl font-bold text-success dark:text-success">{viewStats.viewsByCategory.robots || 0}</p>
                      </div>
                    </div>

                    {viewStats.recentViews.length > 0 ? (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          Recent Activity
                        </h4>
                        <div className="space-y-2 max-h-36 overflow-y-auto">
                          {viewStats.recentViews.slice(0, 5).map((view, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                              <span className="text-sm capitalize flex-1">{view.target_type.replace('_', ' ')}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(view.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-6 text-center border-2 border-dashed border-primary/30 dark:border-primary/30 rounded-xl bg-primary/10/50 dark:bg-primary/10">
                        <Eye className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-medium text-primary dark:text-primary">No views yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Upload products to start tracking</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Insights Card */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
                <CardHeader className="border-b bg-gradient-to-r from-success/10 to-success/10">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <Activity className="w-5 h-5 text-success" />
                    </div>
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Listing Completion</span>
                        <span className="text-sm font-bold text-success">
                          {dashboardStats.totalRobots > 0 ? Math.min(100, Math.round((dashboardStats.activeListings / dashboardStats.totalRobots) * 100)) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={dashboardStats.totalRobots > 0 ? (dashboardStats.activeListings / dashboardStats.totalRobots) * 100 : 0} 
                        className="h-2 bg-success/10"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">View to Inquiry Rate</span>
                        <span className="text-sm font-bold text-primary">
                          {viewStats.viewsByCategory.robots > 0 ? Math.round((dashboardStats.inquiries / viewStats.viewsByCategory.robots) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={viewStats.viewsByCategory.robots > 0 ? (dashboardStats.inquiries / viewStats.viewsByCategory.robots) * 100 : 0}
                        className="h-2 bg-primary/10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Top Performer</span>
                        </div>
                        <p className="text-sm font-semibold truncate">
                          {dashboardStats.topPerforming?.name || 'No data'}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-rose-500" />
                          <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Sold This Month</span>
                        </div>
                        <p className="text-2xl font-bold text-rose-600">{dashboardStats.soldThisMonth}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Watchlist Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="shadow-lg border-0">
                  <CardHeader className="border-b bg-gradient-to-r from-red-500/10 to-pink-500/10">
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Heart className="w-5 h-5 text-red-500" />
                      </div>
                      My Watchlist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <WatchlistSection 
                      title=""
                      limit={6}
                      showHeader={false}
                    />
                  </CardContent>
                </Card>
              </div>
              
              {/* Quick Actions */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-primary to-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary-foreground">
                    <Zap className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start bg-card/20 hover:bg-card/30 text-primary-foreground border-0"
                    onClick={() => navigate('/robots')}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Explore Robots
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start bg-card/20 hover:bg-card/30 text-primary-foreground border-0"
                    onClick={() => navigate('/parts')}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Find Parts
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start bg-card/20 hover:bg-card/30 text-primary-foreground border-0"
                    onClick={() => navigate('/watchlist')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View All Saved
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start bg-card/20 hover:bg-card/30 text-primary-foreground border-0"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Robot
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="watchlist" className="mt-6">
          <WatchlistSection 
            title="My Watchlist" 
            showHeader={true}
            compact={false}
            showActions={true}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Settings panel coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Performing actions on {selectedRobots.length} selected robots
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleBulkAction('export')}
                className="justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Selected
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBulkAction('delete')}
                className="justify-start text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Robot Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Add New Robot</h2>
                <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6">
              <RobotUpload onSuccess={() => {
                setShowAddForm(false);
                fetchDashboardData();
                toast({
                  title: "Success!",
                  description: "Robot added successfully"
                });
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Robot Form Modal */}
      {showEditForm && editingRobot && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Edit Robot: {editingRobot.name}</h2>
                <Button variant="ghost" onClick={() => {
                  setShowEditForm(false);
                  setEditingRobot(null);
                }}>
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6">
              <RobotUpload 
                editMode={true}
                robotData={editingRobot}
                onSuccess={() => {
                  setShowEditForm(false);
                  setEditingRobot(null);
                  fetchDashboardData();
                  toast({
                    title: "Success!",
                    description: "Robot updated successfully"
                  });
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotSellerDashboard;
