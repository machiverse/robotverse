import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Package, 
  Settings, 
  BarChart3, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Search,
  Shield,
  AlertTriangle,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
  Crown,
  TrendingUp,
  Activity,
  Calendar,
  Filter,
  MoreHorizontal,
  Download,
  Mail,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Add at the top:
import { UserProfile } from '@/types/user';

// Remove any local UserProfile interface definition

// Type definitions
interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  user_type?: 'buyer' | 'seller' | 'service_provider' | 'logistics_provider' | 'finance_provider';
  seller_roles?: string[];
  service_categories?: string[];
  company_name?: string;
  phone?: string;
  verification_status?: boolean;
  created_at: string;
  updated_at: string;
}

interface Robot {
  id: string;
  name: string;
  seller_id: string;
  price: number;
  currency: string;
  robot_type: string;
  availability: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Service {
  id: string;
  name: string;
  provider_id: string;
  service_type: string;
  price_range?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface SparePart {
  id: string;
  name: string;
  seller_id: string;
  price: number;
  currency: string;
  part_number?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface AdminDashboardProps {
  userProfile: UserProfile;
}

interface DashboardStats {
  totalUsers: number;
  totalRobots: number;
  totalServices: number;
  totalSpareParts: number;
  newUsersThisMonth: number;
  verifiedUsers: number;
  activeListings: number;
  totalRevenue: number;
}

// Constants
const ADMIN_EMAILS = ['mark.it@keyleerkorb.com', 'admin@robotmarketplace.com'];
const USER_TYPES = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'logistics_provider', label: 'Logistics Provider' },
  { value: 'finance_provider', label: 'Finance Provider' }
];

const AdminDashboard = ({ userProfile }: AdminDashboardProps) => {
  // State management
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRobots: 0,
    totalServices: 0,
    totalSpareParts: 0,
    newUsersThisMonth: 0,
    verifiedUsers: 0,
    activeListings: 0,
    totalRevenue: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { toast } = useToast();

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    return userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);
  }, [userProfile?.email]);

  // Filtered users based on search and filter
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || user.user_type === filterType;
      
      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, filterType]);

  // Fetch all data
  const fetchAllData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch all data in parallel
      const [usersResponse, robotsResponse, servicesResponse, sparePartsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('robots')
          .select('*, profiles(full_name, email)')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('services')
          .select('*, profiles(full_name, email)')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('spare_parts')
          .select('*, profiles(full_name, email)')
          .order('created_at', { ascending: false })
      ]);

      // Handle errors
      if (usersResponse.error) throw usersResponse.error;
      if (robotsResponse.error) throw robotsResponse.error;
      if (servicesResponse.error) throw servicesResponse.error;
      if (sparePartsResponse.error) throw sparePartsResponse.error;

      const usersData = usersResponse.data || [];
      const robotsData = robotsResponse.data || [];
      const servicesData = servicesResponse.data || [];
      const sparePartsData = sparePartsResponse.data || [];

      setUsers(usersData as UserProfile[]);
      setRobots(robotsData);
      setServices(servicesData);
      setSpareParts(sparePartsData);

      // Calculate stats
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const newUsersThisMonth = usersData.filter(user => 
        new Date(user.created_at) >= thisMonth
      ).length;
      
      // Note: verification_status doesn't exist in current schema, defaulting to 0
      const verifiedUsers = 0;
      
      const activeListings = robotsData.filter(robot => 
        robot.availability === 'available'
      ).length;
      
      const totalRevenue = robotsData.reduce((sum, robot) => sum + (robot.price || 0), 0);

      setStats({
        totalUsers: usersData.length,
        totalRobots: robotsData.length,
        totalServices: servicesData.length,
        totalSpareParts: sparePartsData.length,
        newUsersThisMonth,
        verifiedUsers,
        activeListings,
        totalRevenue
      });

      if (isRefresh) {
        toast({
          title: "Data Refreshed",
          description: "Dashboard data has been updated successfully.",
        });
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Update user
  const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));

      toast({
        title: "Success",
        description: "User updated successfully.",
      });

      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user.",
        variant: "destructive",
      });
    }
  };

  // Delete handlers with confirmation
  const handleDeleteItem = async () => {
    if (!deleteItem) return;

    try {
      const { error } = await supabase
        .from(deleteItem.type === 'robot' ? 'robots' : 
              deleteItem.type === 'service' ? 'services' : 'spare_parts')
        .delete()
        .eq('id', deleteItem.id);

      if (error) throw error;

      // Update local state
      if (deleteItem.type === 'robot') {
        setRobots(robots.filter(robot => robot.id !== deleteItem.id));
      } else if (deleteItem.type === 'service') {
        setServices(services.filter(service => service.id !== deleteItem.id));
      } else {
        setSpareParts(spareParts.filter(part => part.id !== deleteItem.id));
      }

      toast({
        title: "Success",
        description: `${deleteItem.type} deleted successfully.`,
      });

      setShowDeleteDialog(false);
      setDeleteItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: `Failed to delete ${deleteItem.type}.`,
        variant: "destructive",
      });
    }
  };

  // Initialize data on mount
  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin, fetchAllData]);

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                You don't have administrator privileges to access this dashboard.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <div>
              <p className="text-lg font-medium">Loading Admin Dashboard</p>
              <p className="text-sm text-muted-foreground">
                Fetching platform data and analytics...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="w-8 h-8 text-yellow-600" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive platform management and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Users</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.totalUsers}</div>
            <p className="text-xs text-blue-600 mt-1">
              +{stats.newUsersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Robot Listings</CardTitle>
            <Package className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.totalRobots}</div>
            <p className="text-xs text-green-600 mt-1">
              {stats.activeListings} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Services</CardTitle>
            <Settings className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.totalServices}</div>
            <p className="text-xs text-purple-600 mt-1">
              Active providers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Spare Parts</CardTitle>
            <BarChart3 className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{stats.totalSpareParts}</div>
            <p className="text-xs text-orange-600 mt-1">
              In inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifiedUsers}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(1)}% verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From all listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeListings}</div>
            <p className="text-xs text-muted-foreground">
              Available for sale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newUsersThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              New registrations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({stats.totalUsers})
          </TabsTrigger>
          <TabsTrigger value="robots" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Robots ({stats.totalRobots})
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Services ({stats.totalServices})
          </TabsTrigger>
          <TabsTrigger value="spare-parts" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Parts ({stats.totalSpareParts})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Platform Users</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage user accounts and permissions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {USER_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                            {user.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.user_type ? "default" : "secondary"}>
                          {user.user_type ? USER_TYPES.find(t => t.value === user.user_type)?.label : 'Not Set'}
                        </Badge>
                        {user.seller_roles && user.seller_roles.length > 0 && (
                          <div className="mt-1">
                            {user.seller_roles.map(role => (
                              <Badge key={role} variant="outline" className="text-xs mr-1">
                                {role.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{user.company_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={user.verification_status ? "default" : "secondary"}>
                          {user.verification_status ? (
                            <><UserCheck className="w-3 h-3 mr-1" />Verified</>
                          ) : (
                            <><UserX className="w-3 h-3 mr-1" />Unverified</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-4 w-4" />
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

        {/* Robots Tab */}
        <TabsContent value="robots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Robot Listings Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor and manage all robot listings on the platform
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Robot</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {robots.map((robot) => (
                    <TableRow key={robot.id}>
                      <TableCell>
                        <div className="font-medium">{robot.name}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{robot.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{robot.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {robot.currency} {robot.price?.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{robot.robot_type}</Badge>
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
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteItem({
                                type: 'robot',
                                id: robot.id,
                                name: robot.name
                              });
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Listings Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Oversee all service provider offerings
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price Range</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="font-medium">{service.name}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{service.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{service.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.service_type}</Badge>
                      </TableCell>
                      <TableCell>{service.price_range || 'N/A'}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(service.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteItem({
                                type: 'service',
                                id: service.id,
                                name: service.name
                              });
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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

        {/* Spare Parts Tab */}
        <TabsContent value="spare-parts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spare Parts Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor spare parts inventory across the platform
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spareParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div className="font-medium">{part.name}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{part.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{part.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {part.currency} {part.price?.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {part.part_number || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(part.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteItem({
                                type: 'spare_part',
                                id: part.id,
                                name: part.name
                              });
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>User Type</Label>
                <Select
                  value={selectedUser.user_type || ''}
                  onValueChange={(value) => 
                    setSelectedUser({...selectedUser, user_type: value as any})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="verification"
                  checked={selectedUser.verification_status || false}
                  onChange={(e) => 
                    setSelectedUser({
                      ...selectedUser, 
                      verification_status: e.target.checked
                    })
                  }
                />
                <Label htmlFor="verification">Verified User</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedUser && handleUpdateUser(selectedUser.id, {
              user_type: selectedUser.user_type,
              verification_status: selectedUser.verification_status
            })}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the {deleteItem?.type}.
            </DialogDescription>
          </DialogHeader>
          {deleteItem && (
            <Alert variant="destructive">
              <AlertDescription>
                Are you sure you want to delete <strong>"{deleteItem.name}"</strong>?
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {deleteItem?.type}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
