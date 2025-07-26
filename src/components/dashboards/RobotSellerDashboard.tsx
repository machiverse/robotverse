import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Image as ImageIcon
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [dashboardStats, setDashboardStats] = useState({
    totalRobots: 0,
    activeListings: 0,
    totalRevenue: 0,
    totalViews: 0,
    avgPrice: 0,
    soldThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchRobots();
  }, [user]);

  useEffect(() => {
    filterRobots();
  }, [robots, searchQuery, filterStatus]);

  const fetchRobots = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('robots')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRobots(data || []);
      calculateStats(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching robots:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load robot listings"
      });
      setLoading(false);
    }
  };

  const calculateStats = (robotData: any[]) => {
    const totalRobots = robotData.length;
    const activeListings = robotData.filter(r => r.availability === 'available').length;
    const totalRevenue = robotData.reduce((sum, r) => sum + (r.price || 0), 0);
    const avgPrice = totalRobots > 0 ? totalRevenue / totalRobots : 0;

    setDashboardStats({
      totalRobots,
      activeListings,
      totalRevenue,
      totalViews: 0, // TODO: Implement views tracking
      avgPrice,
      soldThisMonth: 0 // TODO: Implement sales tracking
    });
  };

  const filterRobots = () => {
    let filtered = robots;

    if (searchQuery) {
      filtered = filtered.filter(robot => 
        robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.robot_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(robot => robot.availability === filterStatus);
    }

    setFilteredRobots(filtered);
  };

  const handleDeleteRobot = async (robotId: string) => {
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

      fetchRobots();
    } catch (error) {
      console.error('Error deleting robot:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete robot listing"
      });
    }
  };

  const handleBulkAction = (action: string) => {
    // TODO: Implement bulk actions
    toast({
      title: "Coming Soon",
      description: `Bulk ${action} functionality will be available soon`
    });
  };

  const statsCards = [
    {
      title: 'Total Robots',
      value: dashboardStats.totalRobots,
      icon: Bot,
      trend: `${dashboardStats.activeListings} active`,
      color: 'text-blue-600'
    },
    {
      title: 'Total Revenue',
      value: `₹${dashboardStats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: `Avg: ₹${dashboardStats.avgPrice.toLocaleString()}`,
      color: 'text-green-600'
    },
    {
      title: 'This Month',
      value: dashboardStats.soldThisMonth,
      icon: TrendingUp,
      trend: 'Units sold',
      color: 'text-purple-600'
    },
    {
      title: 'Total Views',
      value: dashboardStats.totalViews,
      icon: Eye,
      trend: 'All listings',
      color: 'text-orange-600'
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Robot Seller Dashboard</h1>
          <p className="text-muted-foreground">Manage your robot inventory and sales</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleBulkAction('export')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => handleBulkAction('import')}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Robot
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <CardTitle>Robot Inventory</CardTitle>
                  <CardDescription>Manage your robot listings</CardDescription>
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
                  <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
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
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Robot
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableRow key={robot.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
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
                              <p className="text-sm text-muted-foreground">{robot.model}</p>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(robot.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteRobot(robot.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
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
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">This Month</p>
                      <p className="text-2xl font-bold">₹{dashboardStats.soldThisMonth.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Average Price</p>
                      <p className="text-2xl font-bold">₹{dashboardStats.avgPrice.toLocaleString()}</p>
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
                    <div>
                      <p className="font-medium">Conversion Rate</p>
                      <p className="text-sm text-muted-foreground">Views to inquiries</p>
                    </div>
                    <Badge>2.5%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Response Time</p>
                      <p className="text-sm text-muted-foreground">Average inquiry response</p>
                    </div>
                    <Badge variant="secondary">2.3h</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Robot Performance</CardTitle>
              <CardDescription>See which robots are performing best</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Performance analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
              <CardDescription>Manage multiple listings at once</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" onClick={() => handleBulkAction('price-update')}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Bulk Price Update
                </Button>
                <Button variant="outline" onClick={() => handleBulkAction('status-change')}>
                  <Package className="w-4 h-4 mr-2" />
                  Status Change
                </Button>
                <Button variant="outline" onClick={() => handleBulkAction('image-management')}>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Image Management
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Robot Form Modal */}
      {showAddForm && (
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
                fetchRobots();
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotSellerDashboard;