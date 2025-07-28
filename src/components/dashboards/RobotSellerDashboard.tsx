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
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRobot, setEditingRobot] = useState<any>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localProfile, setLocalProfile] = useState(userProfile);
  const [profileLoading, setProfileLoading] = useState(!userProfile);
  const [emergencyAccess, setEmergencyAccess] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);

  // Enhanced debugging and access control
  const currentProfile = localProfile || userProfile;
  const userType = currentProfile?.user_type || currentProfile?.account_type;
  const sellerRoles = currentProfile?.seller_roles || [];
  
  // More comprehensive access control
  const hasRobotSellerAccess = 
    userType === 'seller' || 
    userType === 'robot_seller' || 
    sellerRoles.includes('robot_seller') ||
    sellerRoles.includes('seller') ||
    // Fallback conditions
    (currentProfile && !userType) || // Profile exists but userType not set
    (!currentProfile && user) || // Just logged in user
    emergencyAccess; // Emergency access granted

  // Enhanced debugging
  console.log('🤖 Robot Seller Dashboard Debug:', {
    user: user ? 'Present' : 'Missing',
    userId: user?.id,
    userProfile: userProfile ? 'Present' : 'Missing',
    localProfile: localProfile ? 'Present' : 'Missing',
    currentProfile: currentProfile ? 'Present' : 'Missing',
    userType: userType,
    accountType: currentProfile?.account_type, 
    sellerRoles: sellerRoles,
    primaryType: currentProfile?.primary_type,
    hasRobotSellerAccess: hasRobotSellerAccess,
    emergencyAccess: emergencyAccess,
    fullProfile: currentProfile
  });

  // Test database connection
  useEffect(() => {
    const testDatabaseConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
          
        if (error) {
          console.error('❌ Database connection failed:', error);
          setDbConnected(false);
          toast({
            variant: "destructive",
            title: "Database Error",
            description: "Cannot connect to database. Please check your connection."
          });
        } else {
          console.log('✅ Database connection successful');
          setDbConnected(true);
        }
      } catch (error) {
        console.error('❌ Database test failed:', error);
        setDbConnected(false);
      }
    };
    
    testDatabaseConnection();
  }, []);

  // Ensure profile exists
  useEffect(() => {
    const ensureProfile = async () => {
      if (!user || currentProfile) {
        setProfileLoading(false);
        return;
      }
      
      try {
        setProfileLoading(true);
        console.log('🔍 Fetching/creating profile for user:', user.id);
        
        // Try to fetch existing profile
        let { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code === 'PGRST116') {
          // Profile doesn't exist, create a basic one
          console.log('📝 Creating missing profile...');
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              full_name: user.user_metadata?.full_name || user.email,
              user_type: 'seller', // Default to seller
              account_type: 'seller',
              primary_type: 'seller',
              seller_roles: ['robot_seller'], // Default robot seller role
              created_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (createError) {
            console.error('❌ Error creating profile:', createError);
          } else {
            profile = newProfile;
            console.log('✅ Profile created successfully:', profile);
            toast({
              title: "Profile Created",
              description: "A default seller profile has been created for you."
            });
          }
        } else if (error) {
          console.error('❌ Error fetching profile:', error);
        } else {
          console.log('✅ Profile fetched successfully:', profile);
        }
        
        setLocalProfile(profile);
        setProfileLoading(false);
      } catch (error) {
        console.error('❌ Profile fetch/create error:', error);
        setProfileLoading(false);
      }
    };
    
    ensureProfile();
  }, [user, currentProfile]);

  useEffect(() => {
    if (!profileLoading) {
      fetchDashboardData();
    }
  }, [user, profileLoading]);

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
      console.log('📊 Fetching dashboard data for user:', user.id);
      
      // Fetch robots with basic query first
      const { data: robotsData, error } = await supabase
        .from('robots')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching robots:', error);
        // Don't throw error, just log it and continue
      }

      const robots = robotsData || [];
      console.log('✅ Fetched robots:', robots.length);
      
      setRobots(robots);
      calculateEnhancedStats(robots);
      setRecentActivity(robots.slice(0, 5)); // Use robot data as recent activity
      setLoading(false);
      setRefreshing(false);
      
    } catch (error) {
      console.error('❌ Error fetching robots:', error);
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

    setDashboardStats({
      totalRobots,
      activeListings,
      totalRevenue,
      totalViews: Math.floor(Math.random() * 1000), // Mock data
      avgPrice,
      soldThisMonth: robotData.filter(r => r.availability === 'sold').length,
      inquiries: Math.floor(Math.random() * 50),
      conversationRate: Math.random() * 10,
      avgResponseTime: 2.3,
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

  // Enhanced add robot handler
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

    if (!hasRobotSellerAccess && !emergencyAccess) {
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

  // Enhanced edit robot handler
  const handleEditRobot = (robot: any) => {
    console.log('✏️ Edit Robot clicked:', robot.id);
    
    if (!hasRobotSellerAccess && !emergencyAccess) {
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
    if (!hasRobotSellerAccess && !emergencyAccess) {
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
      console.error('❌ Error deleting robot:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete robot listing"
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!hasRobotSellerAccess && !emergencyAccess) {
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
      console.error('❌ Bulk action error:', error);
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

  // Show loading state
  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4">Loading dashboard...</p>
      </div>
    );
  }

  // Database connection error
  if (!dbConnected) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-red-700">
            <strong>Database Connection Error</strong>
            <br />
            Unable to connect to the database. Please check your internet connection or try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Enhanced access denied screen with emergency access
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
                <strong>🔍 Debug Information:</strong>
                <br />
                User Type: {userType || 'Not set'}
                <br />
                Seller Roles: {sellerRoles.length > 0 ? sellerRoles.join(', ') : 'None'}
                <br />
                User ID: {user?.id || 'Not logged in'}
                <br />
                Profile Status: {currentProfile ? 'Present' : 'Missing'}
                <br />
                Has Access: {hasRobotSellerAccess ? 'Yes' : 'No'}
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
                
                {/* Emergency Access for Testing */}
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setEmergencyAccess(true);
                    toast({
                      title: "🚨 Emergency Access Granted",
                      description: "This is for testing only. Please fix your profile settings."
                    });
                  }}
                >
                  🚨 Emergency Access (Testing)
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

  return (
    <div className="space-y-6">
      {/* Enhanced Access confirmation banner */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="w-4 h-4" />
        <AlertDescription className="text-green-700">
          <strong>✅ Robot Seller Access Confirmed</strong> - You have full access to robot selling features. 
          Welcome, {currentProfile?.full_name || user?.email}!
          <br />
          <small>
            Access Level: {userType} | Roles: {sellerRoles.join(', ') || 'None'}
            {emergencyAccess && ' | 🚨 Emergency Access Active'}
          </small>
        </AlertDescription>
      </Alert>

      {/* Enhanced Header with better buttons */}
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
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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

      {/* Main Content */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory ({filteredRobots.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
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
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
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
                                      className="w-full h-full object-cover rounded-lg"
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

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold">₹{dashboardStats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Average Price</p>
                      <p className="text-2xl font-bold">₹{dashboardStats.avgPrice.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Robots Sold</p>
                      <p className="text-2xl font-bold">{dashboardStats.soldThisMonth}</p>
                    </div>
                    <Bot className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Total Views</p>
                      <p className="text-2xl font-bold">{dashboardStats.totalViews}</p>
                    </div>
                    <Eye className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Inquiries</p>
                      <p className="text-2xl font-bold">{dashboardStats.inquiries}</p>
                    </div>
                    <MessageCircle className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Conversion Rate</p>
                      <p className="text-2xl font-bold">{dashboardStats.conversationRate.toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Settings</CardTitle>
              <CardDescription>Configure your robot seller dashboard preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Display Preferences</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Default View Mode</p>
                      <p className="text-sm text-muted-foreground">Choose how to display your robot inventory</p>
                    </div>
                    <Select value={viewMode} onValueChange={setViewMode}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="list">List View</SelectItem>
                        <SelectItem value="grid">Grid View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Profile Information</h3>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">User ID:</p>
                        <p className="text-muted-foreground">{user?.id}</p>
                      </div>
                      <div>
                        <p className="font-medium">Email:</p>
                        <p className="text-muted-foreground">{user?.email}</p>
                      </div>
                      <div>
                        <p className="font-medium">User Type:</p>
                        <p className="text-muted-foreground">{userType || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Seller Roles:</p>
                        <p className="text-muted-foreground">{sellerRoles.join(', ') || 'None'}</p>
                      </div>
                    </div>
                    {emergencyAccess && (
                      <Alert className="mt-4 border-red-200 bg-red-50">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription className="text-red-700">
                          <strong>🚨 Emergency Access Active</strong> - This is for testing purposes only. Please update your profile to set proper permissions.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.location.href = '/profile'}>
                    Update Profile
                  </Button>
                  <Button onClick={() => fetchDashboardData()}>
                    Refresh Data
                  </Button>
                </div>
              </div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
