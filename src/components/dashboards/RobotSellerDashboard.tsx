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
  Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import RobotUpload from '@/components/RobotUpload';

interface RobotSellerDashboardProps {
  userProfile: any;
}

const RobotSellerDashboard = ({ userProfile }: RobotSellerDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Check user permissions
  const userType = userProfile?.user_type;
  const sellerRoles = userProfile?.seller_roles || [];
  const isRobotSeller = userType === 'seller' && sellerRoles.includes('robot_seller');
  const hasRobotSellerAccess = isRobotSeller || userType === 'robot_seller';

  useEffect(() => {
    if (hasRobotSellerAccess) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user, hasRobotSellerAccess]);

  useEffect(() => {
    filterAndSortRobots();
  }, [robots, searchQuery, filterStatus, sortBy, sortOrder]);

  const fetchDashboardData = async () => {
    if (!user || !hasRobotSellerAccess) return;
    
    try {
      setRefreshing(true);
      
      // Fetch robots with enhanced data
      const { data: robotsData, error } = await supabase
        .from('robots')
        .select(`
          *,
          robot_views (count),
          robot_inquiries (count, status),
          robot_favorites (count)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Since robot_activity table doesn't exist, we'll use robot data for recent activity
      const activity = robotsData?.slice(0, 10) || [];

      setRobots(robotsData || []);
      setRecentActivity(activity || []);
      calculateEnhancedStats(robotsData || []);
      setLoading(false);
      setRefreshing(false);
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
    const totalViews = robotData.reduce((sum, r) => sum + (r.robot_views?.count || 0), 0);
    const totalInquiries = robotData.reduce((sum, r) => sum + (r.robot_inquiries?.count || 0), 0);
    const conversationRate = totalViews > 0 ? (totalInquiries / totalViews) * 100 : 0;
    
    // Find top performing robot
    const topPerforming = robotData.reduce((top, robot) => {
      const currentViews = robot.robot_views?.count || 0;
      const topViews = top?.robot_views?.count || 0;
      return currentViews > topViews ? robot : top;
    }, null);

    setDashboardStats({
      totalRobots,
      activeListings,
      totalRevenue,
      totalViews,
      avgPrice,
      soldThisMonth: 0, // TODO: Implement from orders
      inquiries: totalInquiries,
      conversationRate,
      avgResponseTime: 2.3, // TODO: Calculate from actual data
      topPerforming
    });
  };

  const filterAndSortRobots = () => {
    let filtered = [...robots];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(robot => 
        robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.robot_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(robot => robot.availability === filterStatus);
    }

    // Apply sorting
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

        case 'status-change':
          // Implementation for bulk status change
          toast({
            title: "Coming Soon",
            description: "Bulk status change functionality will be available soon"
          });
          break;

        case 'export':
          // Export selected robots
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
      robot.name,
      robot.robot_type,
      robot.brand || '',
      robot.model || '',
      robot.price || '',
      robot.availability,
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

  const handleAddRobot = () => {
    if (!hasRobotSellerAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need robot seller permissions to add listings"
      });
      return;
    }
    setShowAddForm(true);
  };

  // Access denied screen for non-robot sellers
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
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Current Status:</strong>
                <br />
                User Type: {userType || 'Not set'}
                <br />
                Seller Roles: {sellerRoles.length > 0 ? sellerRoles.join(', ') : 'None'}
                <br />
                <br />
                <strong>Required Access:</strong> Robot Seller permissions
              </AlertDescription>
            </Alert>

            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-red-700">To access this dashboard, you need to:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Have user type set as 'Seller'</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Include 'robot_seller' in your seller roles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Complete your seller profile setup</span>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview section remains the same */}
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="w-6 h-6" />
              Robot Seller Dashboard Preview
            </CardTitle>
            <CardDescription>
              This is what you'll see once you have robot seller access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Robot Listings', icon: Bot },
                { title: 'Revenue Tracking', icon: DollarSign },
                { title: 'Sales Analytics', icon: TrendingUp },
                { title: 'Performance Metrics', icon: BarChart3 }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="p-4 border rounded-lg bg-muted/50">
                    <Icon className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="font-medium text-muted-foreground">{feature.title}</p>
                  </div>
                );
              })}
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
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+5%'
    },
    {
      title: 'Total Revenue',
      value: `₹${dashboardStats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: `Avg: ₹${dashboardStats.avgPrice.toLocaleString()}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+12%'
    },
    {
      title: 'Total Views',
      value: dashboardStats.totalViews,
      icon: Eye,
      trend: 'All listings',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+8%'
    },
    {
      title: 'Conversion Rate',
      value: `${dashboardStats.conversationRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: 'Views to inquiries',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+3%'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Access confirmation banner */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="w-4 h-4" />
        <AlertDescription className="text-green-700">
          <strong>Robot Seller Access Confirmed</strong> - You have full access to robot selling features. 
          Welcome, {userProfile?.full_name || user?.email}!
        </AlertDescription>
      </Alert>

      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
            disabled={!hasRobotSellerAccess}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowBulkDialog(true)}
            disabled={!hasRobotSellerAccess || selectedRobots.length === 0}
          >
            <Settings className="w-4 h-4 mr-2" />
            Bulk Actions
          </Button>
          <Button 
            onClick={handleAddRobot}
            disabled={!hasRobotSellerAccess}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Robot
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
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {stat.trend}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-green-600">
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

      {/* Top Performing Robot Banner */}
      {dashboardStats.topPerforming && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Top Performing Robot</h3>
                <p className="text-sm text-blue-700">
                  {dashboardStats.topPerforming.name} - {dashboardStats.topPerforming.robot_views?.count || 0} views
                </p>
              </div>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Main Content */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

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
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="robot_type">Type</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
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
                  <h3 className="text-lg font-semibold mb-2">No robots found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'Start by adding your first robot listing'
                    }
                  </p>
                  <Button 
                    onClick={handleAddRobot}
                    disabled={!hasRobotSellerAccess}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Robot
                  </Button>
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
                          <TableHead>Views</TableHead>
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
                                      className="w-full h-full object-cover rounded-lg"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <Bot className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium">{robot.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {robot.brand} {robot.model}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{robot.robot_type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              ₹{robot.price?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={robot.availability === 'available' ? 'default' : 'secondary'}
                              >
                                {robot.availability}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{robot.robot_views?.count || 0}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(robot.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  disabled={!hasRobotSellerAccess}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteRobot(robot.id)}
                                  disabled={!hasRobotSellerAccess}
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
                    // Grid View
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredRobots.map((robot) => (
                        <Card key={robot.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="relative">
                              <Checkbox
                                className="absolute top-2 left-2 z-10 bg-white"
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
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Bot className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            <h3 className="font-semibold truncate mb-1">{robot.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {robot.brand} {robot.model}
                            </p>
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                {robot.robot_type}
                              </Badge>
                              <Badge 
                                variant={robot.availability === 'available' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {robot.availability}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-bold text-lg">₹{robot.price?.toLocaleString()}</p>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Eye className="w-3 h-3" />
                                <span>{robot.robot_views?.count || 0}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1">
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

        {/* Enhanced Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Sales Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                    <div>
                      <p className="font-medium">This Month Sales</p>
                      <p className="text-2xl font-bold">₹{dashboardStats.soldThisMonth.toLocaleString()}</p>
                      <p className="text-sm text-green-600">+12% from last month</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50">
                    <div>
                      <p className="font-medium">Average Price</p>
                      <p className="text-2xl font-bold">₹{dashboardStats.avgPrice.toLocaleString()}</p>
                      <p className="text-sm text-blue-600">Across all listings</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Conversion Rate</p>
                      <p className="text-sm text-muted-foreground">Views to inquiries</p>
                      <Progress value={dashboardStats.conversationRate} className="mt-2" />
                    </div>
                    <Badge className="ml-4">{dashboardStats.conversationRate.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Response Time</p>
                      <p className="text-sm text-muted-foreground">Average inquiry response</p>
                    </div>
                    <Badge variant="secondary">{dashboardStats.avgResponseTime}h</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Total Inquiries</p>
                      <p className="text-sm text-muted-foreground">From all listings</p>
                    </div>
                    <Badge>{dashboardStats.inquiries}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Enhanced Performance Tab */}
        <TabsContent value="performance" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Robot Performance Ranking</CardTitle>
                <CardDescription>Top performing robots by views and inquiries</CardDescription>
              </CardHeader>
              <CardContent>
                {robots.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No performance data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {robots
                      .sort((a, b) => (b.robot_views?.count || 0) - (a.robot_views?.count || 0))
                      .slice(0, 5)
                      .map((robot, index) => (
                        <div key={robot.id} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold">#{index + 1}</span>
                          </div>
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
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
                          <div className="flex-1">
                            <p className="font-medium">{robot.name}</p>
                            <p className="text-sm text-muted-foreground">{robot.robot_type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{robot.robot_views?.count || 0} views</p>
                            <p className="text-sm text-muted-foreground">
                              {robot.robot_inquiries?.count || 0} inquiries
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-pink-50">
                  <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="font-bold text-2xl">{dashboardStats.totalViews}</p>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-red-50">
                  <MessageCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="font-bold text-2xl">{dashboardStats.inquiries}</p>
                  <p className="text-sm text-muted-foreground">Total Inquiries</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-gradient-to-r from-green-50 to-teal-50">
                  <Star className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-bold text-2xl">4.8</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* New Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Track recent activities on your robot listings</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                      <Badge variant="secondary">{activity.time}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Seller Preferences</CardTitle>
                <CardDescription>Manage your selling preferences and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Get notified about inquiries</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Auto-renewal</p>
                    <p className="text-sm text-muted-foreground">Automatically renew listings</p>
                  </div>
                  <Checkbox />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Price Alerts</p>
                    <p className="text-sm text-muted-foreground">Get market price updates</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your seller account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Seller Rating</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">4.8/5 (24 reviews)</span>
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(userProfile?.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Verification Status</p>
                  <Badge className="mt-1">Verified Seller</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
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
                onClick={() => handleBulkAction('status-change')}
                className="justify-start"
              >
                <Package className="w-4 h-4 mr-2" />
                Change Status
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
      {showAddForm && hasRobotSellerAccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotSellerDashboard;
