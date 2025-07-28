import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Package, Settings, BarChart3, Trash2, Edit, Check, X, 
  Search, Filter, Download, Upload, Plus, MoreHorizontal, 
  Shield, ShieldCheck, AlertTriangle, RefreshCw, Eye, 
  UserX, UserPlus, Crown, Ban, CheckCircle, XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type Robot = Database['public']['Tables']['robots']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type SparePart = Database['public']['Tables']['spare_parts']['Row'];

interface AdminDashboardProps {
  userProfile: Profile;
}

const AdminDashboard = ({ userProfile }: AdminDashboardProps) => {
  // Data states
  const [users, setUsers] = useState<Profile[]>([]);
  const [robots, setRobots] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('users');
  
  // Selection states
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRobots, setSelectedRobots] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  
  // Modal states
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editingRobot, setEditingRobot] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: string, id: string, name: string} | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');

  const { toast } = useToast();

  // Check admin access
  const isAdmin = userProfile?.user_type === 'admin' || userProfile?.primary_user_type === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch all users with better error handling
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch all robots with seller info
      const { data: robotsData, error: robotsError } = await supabase
        .from('robots')
        .select(`
          *,
          profiles:seller_id(full_name, email, user_type)
        `)
        .order('created_at', { ascending: false });

      // Fetch all services with provider info
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          profiles:provider_id(full_name, email, user_type)
        `)
        .order('created_at', { ascending: false });

      // Fetch all spare parts with seller info
      const { data: sparePartsData, error: sparePartsError } = await supabase
        .from('spare_parts')
        .select(`
          *,
          profiles:seller_id(full_name, email, user_type)
        `)
        .order('created_at', { ascending: false });

      if (usersError) console.error('Users error:', usersError);
      if (robotsError) console.error('Robots error:', robotsError);
      if (servicesError) console.error('Services error:', servicesError);
      if (sparePartsError) console.error('Spare parts error:', sparePartsError);

      setUsers(usersData || []);
      setRobots(robotsData || []);
      setServices(servicesData || []);
      setSpareParts(sparePartsData || []);

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

  // User Management Functions
  const handleEditUser = async (userData: Partial<Profile>) => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', editingUser.id);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === editingUser.id ? { ...user, ...userData } : user
      ));
      
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      
      setEditingUser(null);
      setShowUserForm(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.filter(user => user.id !== userId));
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleChangeUserType = async (userId: string, newType: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: newType, primary_user_type: newType })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, user_type: newType, primary_user_type: newType } : user
      ));
      
      toast({
        title: "Success",
        description: `User type changed to ${newType}`,
      });
    } catch (error) {
      console.error('Error changing user type:', error);
      toast({
        title: "Error",
        description: "Failed to change user type",
        variant: "destructive",
      });
    }
  };

  // Robot Management Functions
  const handleEditRobot = async (robotData: Partial<Robot>) => {
    if (!editingRobot) return;

    try {
      const { error } = await supabase
        .from('robots')
        .update(robotData)
        .eq('id', editingRobot.id);

      if (error) throw error;

      setRobots(robots.map(robot => 
        robot.id === editingRobot.id ? { ...robot, ...robotData } : robot
      ));
      
      toast({
        title: "Success",
        description: "Robot updated successfully",
      });
      
      setEditingRobot(null);
    } catch (error) {
      console.error('Error updating robot:', error);
      toast({
        title: "Error",
        description: "Failed to update robot",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRobot = async (robotId: string) => {
    try {
      const { error } = await supabase
        .from('robots')
        .delete()
        .eq('id', robotId);

      if (error) throw error;

      setRobots(robots.filter(robot => robot.id !== robotId));
      toast({
        title: "Success",
        description: "Robot listing deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting robot:', error);
      toast({
        title: "Error",
        description: "Failed to delete robot listing",
        variant: "destructive",
      });
    }
  };

  // Service Management Functions
  const handleDeleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      setServices(services.filter(service => service.id !== serviceId));
      toast({
        title: "Success",
        description: "Service listing deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: "Failed to delete service listing",
        variant: "destructive",
      });
    }
  };

  // Spare Part Management Functions
  const handleDeleteSparePart = async (partId: string) => {
    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;

      setSpareParts(spareParts.filter(part => part.id !== partId));
      toast({
        title: "Success",
        description: "Spare part listing deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting spare part:', error);
      toast({
        title: "Error",
        description: "Failed to delete spare part listing",
        variant: "destructive",
      });
    }
  };

  // Bulk Operations
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
          const tableName = type === 'users' ? 'profiles' :
                          type === 'robots' ? 'robots' :
                          type === 'services' ? 'services' : 'spare_parts';
          
          const { error } = await supabase
            .from(tableName)
            .delete()
            .in('id', selectedIds);

          if (error) throw error;

          // Update local state
          if (type === 'users') {
            setUsers(users.filter(user => !selectedIds.includes(user.id)));
            setSelectedUsers([]);
          } else if (type === 'robots') {
            setRobots(robots.filter(robot => !selectedIds.includes(robot.id)));
            setSelectedRobots([]);
          } else if (type === 'services') {
            setServices(services.filter(service => !selectedIds.includes(service.id)));
            setSelectedServices([]);
          } else {
            setSpareParts(spareParts.filter(part => !selectedIds.includes(part.id)));
            setSelectedParts([]);
          }

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

        default:
          toast({
            title: "Coming Soon",
            description: `Bulk ${action} functionality will be available soon`,
          });
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: "Error",
        description: `Failed to perform bulk ${action}`,
        variant: "destructive",
      });
    }

    setShowBulkDialog(false);
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

  const handleSelectAll = (type: string) => {
    const currentSelected = type === 'users' ? selectedUsers :
                           type === 'robots' ? selectedRobots :
                           type === 'services' ? selectedServices : selectedParts;
    
    const allItems = type === 'users' ? users :
                    type === 'robots' ? robots :
                    type === 'services' ? services : spareParts;

    const setSelected = type === 'users' ? setSelectedUsers :
                       type === 'robots' ? setSelectedRobots :
                       type === 'services' ? setSelectedServices : setSelectedParts;

    if (currentSelected.length === allItems.length) {
      setSelected([]);
    } else {
      setSelected(allItems.map(item => item.id));
    }
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
            <p className="text-red-600 mb-4">
              You need administrator privileges to access this dashboard.
            </p>
            <p className="text-sm text-muted-foreground">
              Current user type: {userProfile?.user_type || 'Not set'}
            </p>
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

  // Filter data based on search
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRobots = robots.filter(robot =>
    robot.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    robot.robot_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    robot.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServices = services.filter(service =>
    service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.service_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredParts = spareParts.filter(part =>
    part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.part_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserTypeColor = (userType: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      buyer: 'bg-blue-100 text-blue-800',
      seller: 'bg-green-100 text-green-800',
      robot_seller: 'bg-green-100 text-green-800',
      parts_seller: 'bg-yellow-100 text-yellow-800',
      service_provider: 'bg-purple-100 text-purple-800',
      logistics_provider: 'bg-orange-100 text-orange-800',
      finance_provider: 'bg-indigo-100 text-indigo-800'
    };
    return colors[userType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Admin Control Panel
          </h1>
          <p className="text-muted-foreground">Complete platform management and control</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => fetchAllData()}
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

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedUsers.length} selected
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Robot Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{robots.length}</div>
            <p className="text-xs text-muted-foreground">
              ₹{robots.reduce((sum, r) => sum + (r.price || 0), 0).toLocaleString()} total value
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedServices.length} selected
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spare Parts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{spareParts.length}</div>
            <p className="text-xs text-muted-foreground">
              ₹{spareParts.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()} total value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
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
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="seller">Sellers</SelectItem>
            <SelectItem value="buyer">Buyers</SelectItem>
            <SelectItem value="service_provider">Service Providers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="robots" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Robots ({filteredRobots.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Services ({filteredServices.length})
          </TabsTrigger>
          <TabsTrigger value="spare-parts" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Parts ({filteredParts.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSelectAll('users')}
                    size="sm"
                  >
                    {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
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
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length}
                        onCheckedChange={() => handleSelectAll('users')}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
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
                        <div>
                          <p className="font-medium">{user.full_name || 'No Name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getUserTypeColor(user.user_type || '')}>
                          {user.user_type || 'Not Set'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.company_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={user.user_type ? "default" : "secondary"}>
                          {user.user_type ? 'Active' : 'Incomplete'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user);
                              setShowUserForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Select onValueChange={(value) => handleChangeUserType(user.id, value)}>
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue placeholder="Change Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="buyer">Buyer</SelectItem>
                              <SelectItem value="seller">Seller</SelectItem>
                              <SelectItem value="service_provider">Service Provider</SelectItem>
                              <SelectItem value="logistics_provider">Logistics</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({type: 'user', id: user.id, name: user.full_name || user.email || 'User'});
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

        {/* Robots Tab */}
        <TabsContent value="robots" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Robot Listings Management</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSelectAll('robots')}
                    size="sm"
                  >
                    {selectedRobots.length === filteredRobots.length ? 'Deselect All' : 'Select All'}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRobots.length === filteredRobots.length}
                        onCheckedChange={() => handleSelectAll('robots')}
                      />
                    </TableHead>
                    <TableHead>Robot</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRobots.map((robot) => (
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
                        <div>
                          <p className="font-medium">{robot.name}</p>
                          <p className="text-sm text-muted-foreground">{robot.model}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {robot.profiles?.full_name || robot.profiles?.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {robot.currency} {robot.price?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{robot.robot_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'}>
                          {robot.availability}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRobot(robot)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({type: 'robot', id: robot.id, name: robot.name});
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
              <div className="flex items-center justify-between">
                <CardTitle>Service Listings Management</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSelectAll('services')}
                    size="sm"
                  >
                    {selectedServices.length === filteredServices.length ? 'Deselect All' : 'Select All'}
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
                        checked={selectedServices.length === filteredServices.length}
                        onCheckedChange={() => handleSelectAll('services')}
                      />
                    </TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price Range</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
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
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {service.profiles?.full_name || service.profiles?.email || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.service_type}</Badge>
                      </TableCell>
                      <TableCell>{service.price_range || 'Contact for pricing'}</TableCell>
                      <TableCell>{service.location || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingService(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({type: 'service', id: service.id, name: service.name});
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
              <div className="flex items-center justify-between">
                <CardTitle>Spare Parts Management</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSelectAll('parts')}
                    size="sm"
                  >
                    {selectedParts.length === filteredParts.length ? 'Deselect All' : 'Select All'}
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
                        checked={selectedParts.length === filteredParts.length}
                        onCheckedChange={() => handleSelectAll('parts')}
                      />
                    </TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => (
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
                        <div>
                          <p className="font-medium">{part.name}</p>
                          <p className="text-sm text-muted-foreground">{part.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {part.profiles?.full_name || part.profiles?.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {part.currency} {part.price?.toLocaleString()}
                      </TableCell>
                      <TableCell>{part.part_number || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPart(part)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({type: 'part', id: part.id, name: part.name});
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

      {/* User Edit Dialog */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.full_name || editingUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  defaultValue={editingUser?.full_name || ''}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({...editingUser, full_name: e.target.value});
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={editingUser?.email || ''}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({...editingUser, email: e.target.value});
                    }
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user_type">User Type</Label>
                <Select
                  value={editingUser?.user_type || ''}
                  onValueChange={(value) => {
                    if (editingUser) {
                      setEditingUser({...editingUser, user_type: value, primary_user_type: value});
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="robot_seller">Robot Seller</SelectItem>
                    <SelectItem value="parts_seller">Parts Seller</SelectItem>
                    <SelectItem value="service_provider">Service Provider</SelectItem>
                    <SelectItem value="logistics_provider">Logistics Provider</SelectItem>
                    <SelectItem value="finance_provider">Finance Provider</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  defaultValue={editingUser?.company_name || ''}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({...editingUser, company_name: e.target.value});
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUserForm(false)}>
                Cancel
              </Button>
              <Button onClick={() => editingUser && handleEditUser(editingUser)}>
                Save Changes
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
                  switch (deleteTarget.type) {
