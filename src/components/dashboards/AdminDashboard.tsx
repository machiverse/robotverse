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
type UserTypeEnum = Database['public']['Enums']['user_type_enum'];

interface AdminDashboardProps {
  userProfile: Profile;
}

// SOLUTION 1: Hardcoded Admin Emails (Quick Fix)
const ADMIN_EMAILS = [
  'mark.it@keyleerkorb.com',
  // Add more admin emails here as needed
];

// SOLUTION 2: Admin User IDs (if you know the user ID)
const ADMIN_USER_IDS = [
  // Add admin user IDs here if known
];

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
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: string, id: string, name: string} | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');

  const { toast } = useToast();

  // FIXED: Enhanced admin access check
  const checkAdminAccess = (): boolean => {
    // Method 1: Check email against admin list
    if (userProfile?.email && ADMIN_EMAILS.includes(userProfile.email)) {
      console.log('✅ Admin access granted via email:', userProfile.email);
      return true;
    }

    // Method 2: Check user ID against admin list
    if (userProfile?.user_id && ADMIN_USER_IDS.includes(userProfile.user_id)) {
      console.log('✅ Admin access granted via user ID:', userProfile.user_id);
      return true;
    }

    // Method 3: Check account_type field (if you want to use this)
    if (userProfile?.account_type === 'admin') {
      console.log('✅ Admin access granted via account_type');
      return true;
    }

    // Method 4: Check if user has special admin flag in profile
    // You could add a custom field to profiles table
    if ((userProfile as any)?.is_admin === true) {
      console.log('✅ Admin access granted via is_admin flag');
      return true;
    }

    // Method 5: Fallback - check if user is the first user (for development)
    if (userProfile?.email === 'mark.it@keyleerkorb.com') {
      console.log('✅ Admin access granted - specific admin email');
      return true;
    }

    console.log('❌ Admin access denied for:', userProfile?.email || userProfile?.user_id);
    return false;
  };

  const isAdmin = checkAdminAccess();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch all users
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
      // Only update fields that are valid for the Profile type
      const updateData: Partial<Profile> = {};
      
      // Copy valid fields
      if (userData.full_name !== undefined) updateData.full_name = userData.full_name;
      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.company_name !== undefined) updateData.company_name = userData.company_name;
      if (userData.phone !== undefined) updateData.phone = userData.phone;
      if (userData.location !== undefined) updateData.location = userData.location;
      
      // Handle user_type with enum validation
      if (userData.user_type) {
        const validUserTypes: UserTypeEnum[] = [
          'buyer', 'robot_seller', 'parts_seller', 
          'service_provider', 'logistics_provider', 'finance_provider'
        ];
        
        if (validUserTypes.includes(userData.user_type as UserTypeEnum)) {
          updateData.user_type = userData.user_type as UserTypeEnum;
          updateData.primary_user_type = userData.user_type as UserTypeEnum;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === editingUser.id ? { ...user, ...updateData } : user
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
      // Validate the new type against enum
      const validUserTypes: UserTypeEnum[] = [
        'buyer', 'robot_seller', 'parts_seller', 
        'service_provider', 'logistics_provider', 'finance_provider'
      ];
      
      if (!validUserTypes.includes(newType as UserTypeEnum)) {
        toast({
          title: "Invalid Type",
          description: `${newType} is not a valid user type`,
          variant: "destructive",
        });
        return;
      }

      const userType = newType as UserTypeEnum;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          user_type: userType, 
          primary_user_type: userType 
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { 
          ...user, 
          user_type: userType, 
          primary_user_type: userType 
        } : user
      ));
      
      toast({
        title: "Success",
        description: `User type changed to ${userType}`,
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

  // Delete functions for other entities
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

  // Bulk operations and other functions...
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

  // Enhanced access denied screen with debug info
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
                <h3 className="font-semibold text-red-700 mb-2">🔍 Debug Information:</h3>
                <div className="text-sm space-y-1 text-gray-700">
                  <p><strong>User Email:</strong> {userProfile?.email || 'Not available'}</p>
                  <p><strong>User ID:</strong> {userProfile?.user_id || 'Not available'}</p>
                  <p><strong>User Type:</strong> {userProfile?.user_type || 'Not set'}</p>
                  <p><strong>Primary Type:</strong> {userProfile?.primary_user_type || 'Not set'}</p>
                  <p><strong>Account Type:</strong> {userProfile?.account_type || 'Not set'}</p>
                  <p><strong>Admin Emails List:</strong> {ADMIN_EMAILS.join(', ')}</p>
                  <p><strong>Is in Admin List:</strong> {ADMIN_EMAILS.includes(userProfile?.email || '') ? '✅ Yes' : '❌ No'}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-700 mb-2">🛠️ How to Fix:</h3>
                <div className="text-sm space-y-2 text-blue-700">
                  <p><strong>Option 1:</strong> Your email is already in the admin list if you're mark.it@keyleerkorb.com</p>
                  <p><strong>Option 2:</strong> Add your email to the ADMIN_EMAILS array in the code</p>
                  <p><strong>Option 3:</strong> Set account_type to 'admin' in your profile</p>
                  <p><strong>Option 4:</strong> Add 'admin' to the user_type_enum in the database</p>
                </div>
              </div>

              <div className="flex gap-3">
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
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
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

  const getUserTypeColor = (userType: string | null) => {
    if (!userType) return 'bg-gray-100 text-gray-800';
    
    const colors: Record<string, string> = {
      buyer: 'bg-blue-100 text-blue-800',
      robot_seller: 'bg-green-100 text-green-800',
      parts_seller: 'bg-yellow-100 text-yellow-800',
      service_provider: 'bg-purple-100 text-purple-800',
      logistics_provider: 'bg-orange-100 text-orange-800',
      finance_provider: 'bg-indigo-100 text-indigo-800'
    };
    return colors[userType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Admin Access Confirmed Banner */}
      <div className="mb-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <Crown className="w-5 h-5" />
              <span className="font-semibold">✅ Admin Access Confirmed</span>
              <span className="text-sm">- Welcome, {userProfile?.full_name || userProfile?.email}</span>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Stats Cards */}
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

      {/* Search Controls */}
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
      </div>

      {/* Users Table */}
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
                      {ADMIN_EMAILS.includes(user.email || '') && (
                        <Badge className="bg-red-100 text-red-800 text-xs mt-1">
                          <Crown className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getUserTypeColor(user.user_type)}>
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
                          <SelectItem value="robot_seller">Robot Seller</SelectItem>
                          <SelectItem value="parts_seller">Parts Seller</SelectItem>
                          <SelectItem value="service_provider">Service Provider</SelectItem>
                          <SelectItem value="logistics_provider">Logistics</SelectItem>
                          <SelectItem value="finance_provider">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget({type: 'user', id: user.id, name: user.full_name || user.email || 'User'});
                          setShowDeleteDialog(true);
                        }}
                        disabled={ADMIN_EMAILS.includes(user.email || '')} // Prevent deleting admin users
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

      {/* Edit User Dialog */}
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
                  onValueChange={(value: UserTypeEnum) => {
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
                    <SelectItem value="robot_seller">Robot Seller</SelectItem>
                    <SelectItem value="parts_seller">Parts Seller</SelectItem>
                    <SelectItem value="service_provider">Service Provider</SelectItem>
                    <SelectItem value="logistics_provider">Logistics Provider</SelectItem>
                    <SelectItem value="finance_provider">Finance Provider</SelectItem>
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
                    case 'user':
                      handleDeleteUser(deleteTarget.id);
                      break;
                    case 'robot':
                      handleDeleteRobot(deleteTarget.id);
                      break;
                    case 'service':
                      handleDeleteService(deleteTarget.id);
                      break;
                    case 'part':
                      handleDeleteSparePart(deleteTarget.id);
                      break;
                  }
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

export default AdminDashboard;
