import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Plus,
  Search,
  Filter,
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
  ShieldX,
  AlertCircle,
  UserX,
  Grid,
  List,
  Star,
  CheckCircle,
  RefreshCw,
  Settings,
  MapPin
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
  
  // State management
  const [robots, setRobots] = useState<any[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedRobots, setSelectedRobots] = useState<string[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalRobots: 0,
    activeListings: 0,
    totalRevenue: 0,
    totalViews: 0,
    avgPrice: 0,
    conversationRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRobot, setEditingRobot] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Access control
  const userType = userProfile?.user_type;
  const sellerRoles = userProfile?.seller_roles || [];
  const hasRobotSellerAccess = 
    userType === 'seller' || 
    userType === 'robot_seller' || 
    sellerRoles.includes('robot_seller');

  // Data fetching
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const { data: robotsData, error } = await supabase
        .from('robots')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const robots = robotsData || [];
      setRobots(robots);
      calculateStats(robots);
      
    } catch (error) {
      console.error('Error fetching robots:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load robot listings"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  const calculateStats = (robotData: any[]) => {
    const totalRobots = robotData.length;
    const activeListings = robotData.filter(r => r.availability === 'available').length;
    const totalRevenue = robotData.reduce((sum, r) => sum + (r.price || 0), 0);
    const avgPrice = totalRobots > 0 ? totalRevenue / totalRobots : 0;

    setDashboardStats({
      totalRobots,
      activeListings,
      totalRevenue,
      totalViews: Math.floor(Math.random() * 1000),
      avgPrice,
      conversationRate: Math.random() * 10
    });
  };

  // Filter and search logic
  const filteredAndSearchedRobots = useMemo(() => {
    let filtered = [...robots];

    if (searchQuery) {
      filtered = filtered.filter(robot => 
        robot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.robot_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(robot => robot.availability === filterStatus);
    }

    return filtered;
  }, [robots, searchQuery, filterStatus]);

  useEffect(() => {
    setFilteredRobots(filteredAndSearchedRobots);
  }, [filteredAndSearchedRobots]);

  useEffect(() => {
    if (hasRobotSellerAccess) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [hasRobotSellerAccess, fetchDashboardData]);

  // Action handlers
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

  const handleEditRobot = (robot: any) => {
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
  };

  const handleDeleteRobot = async (robotId: string) => {
    if (!hasRobotSellerAccess || !confirm('Are you sure you want to delete this robot listing?')) return;

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

  const handleSelectAll = () => {
    if (selectedRobots.length === filteredRobots.length) {
      setSelectedRobots([]);
    } else {
      setSelectedRobots(filteredRobots.map(r => r.id));
    }
  };

  // Access denied screen
  if (!hasRobotSellerAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <ShieldX className="h-5 w-5" />
              Access Restricted
            </CardTitle>
            <CardDescription className="text-red-600">
              Robot Seller permissions required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Current Status:</strong><br />
                User Type: {userType || 'Not set'}<br />
                Seller Roles: {sellerRoles.length > 0 ? sellerRoles.join(', ') : 'None'}
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/profile'}
                className="w-full"
              >
                Update Profile
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <p className="text-lg font-medium">Loading Dashboard</p>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Robots',
      value: dashboardStats.totalRobots,
      icon: Bot,
      trend: `${dashboardStats.activeListings} active`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Revenue',
      value: `₹${dashboardStats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: `Avg: ₹${Math.floor(dashboardStats.avgPrice).toLocaleString()}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Views',
      value: dashboardStats.totalViews,
      icon: Eye,
      trend: 'All listings',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Conversion Rate',
      value: `${dashboardStats.conversationRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: 'Views to inquiries',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Main Container - Responsive with proper margins */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Access Confirmation - Compact */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-700 text-sm">
            <strong>Robot Seller Access Confirmed</strong> - Welcome, {userProfile?.full_name || user?.email}
          </AlertDescription>
        </Alert>

        {/* Header Section - Responsive Layout */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Robot Seller Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your robot inventory and track performance
            </p>
          </div>
          
          {/* Action Buttons - Responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={handleAddRobot}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Robot
            </Button>
          </div>
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {stat.title}
                      </p>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <Badge variant="secondary" className="text-xs">
                        {stat.trend}
                      </Badge>
                    </div>
                    <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content - Full Width Tabs */}
        <Card className="w-full">
          <Tabs defaultValue="inventory" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 h-10">
                <TabsTrigger value="inventory" className="text-sm">
                  <Package className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Inventory</span>
                  <span className="sm:hidden">Items</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredRobots.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-sm">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Analytics</span>
                  <span className="sm:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-0">
              <TabsContent value="inventory" className="mt-0">
                <div className="p-6 space-y-4">
                  
                  {/* Search and Filter Bar - Responsive */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search robots..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
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
                      <div className="flex border rounded-md">
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="rounded-r-none"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="rounded-l-none"
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Selection Controls - Compact */}
                  {filteredRobots.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Area - Responsive */}
                  {filteredRobots.length === 0 ? (
                    <div className="text-center py-12">
                      <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {robots.length === 0 ? 'No robots in inventory' : 'No robots match your filters'}
                      </h3>
                      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        {searchQuery || filterStatus !== 'all' 
                          ? 'Try adjusting your search or filter criteria'
                          : 'Start by adding your first robot listing'
                        }
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button onClick={handleAddRobot}>
                          <Plus className="h-4 w-4 mr-2" />
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
                    <ScrollArea className="h-[600px] w-full">
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
                              <TableHead className="hidden sm:table-cell">Type</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead className="hidden md:table-cell">Status</TableHead>
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
                                    <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                                      {robot.images && robot.images.length > 0 ? (
                                        <img 
                                          src={robot.images[0]} 
                                          alt={robot.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <Bot className="h-5 w-5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{robot.name || 'Unnamed Robot'}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {robot.brand} {robot.model}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge variant="outline" className="text-xs">
                                    {robot.robot_type || 'Unknown'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  ₹{robot.price?.toLocaleString() || '0'}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Badge 
                                    variant={robot.availability === 'available' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {robot.availability || 'unknown'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-1">
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleEditRobot(robot)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleDeleteRobot(robot.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
                          {filteredRobots.map((robot) => (
                            <Card key={robot.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="relative mb-3">
                                  <Checkbox
                                    className="absolute top-2 left-2 z-10 bg-white shadow-sm"
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
                                      <Bot className="h-8 w-8 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                                <h3 className="font-semibold text-sm truncate mb-1">
                                  {robot.name || 'Unnamed Robot'}
                                </h3>
                                <p className="text-xs text-muted-foreground mb-2">
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
                                <p className="font-bold text-lg mb-3">
                                  ₹{robot.price?.toLocaleString() || '0'}
                                </p>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm" className="flex-1">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1"
                                    onClick={() => handleEditRobot(robot)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeleteRobot(robot.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="mt-0">
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Sales Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Total Revenue</p>
                            <p className="text-2xl font-bold">₹{dashboardStats.totalRevenue.toLocaleString()}</p>
                          </div>
                          <DollarSign className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Average Price</p>
                            <p className="text-2xl font-bold">₹{Math.floor(dashboardStats.avgPrice).toLocaleString()}</p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Conversion Rate</p>
                            <p className="text-sm text-muted-foreground">Views to inquiries</p>
                          </div>
                          <Badge>{dashboardStats.conversationRate.toFixed(1)}%</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Total Views</p>
                            <p className="text-sm text-muted-foreground">All listings combined</p>
                          </div>
                          <Badge variant="secondary">{dashboardStats.totalViews}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="mt-0">
                <div className="p-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dashboard Settings</CardTitle>
                      <CardDescription>Manage your dashboard preferences</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Settings panel coming soon...</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Add Robot Modal - Responsive */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Robot</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <RobotUpload onSuccess={() => {
              setShowAddForm(false);
              fetchDashboardData();
              toast({
                title: "Success!",
                description: "Robot added successfully"
              });
            }} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Robot Modal - Responsive */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Robot: {editingRobot?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {editingRobot && (
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
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RobotSellerDashboard;
