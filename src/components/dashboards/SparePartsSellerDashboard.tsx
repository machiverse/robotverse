import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Activity,
  BarChart3,
  Upload,
  Download,
  ShieldX,
  AlertCircle,
  Grid,
  List,
  Star,
  Calendar,
  Clock,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SpareParts from '@/components/SpareParts';

interface SparePartsSellerDashboardProps {
  userProfile: any;
}

const SparePartsSellerDashboard = ({ userProfile }: SparePartsSellerDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [filteredSpareParts, setFilteredSpareParts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [dashboardStats, setDashboardStats] = useState({
    totalParts: 0,
    activeListings: 0,
    totalValue: 0,
    totalViews: 0,
    avgPrice: 0,
    soldThisMonth: 0,
    inquiries: 0,
    popularCategories: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userType = userProfile?.user_type;
  const sellerRoles = userProfile?.seller_roles || [];
  
  const hasSparePartsSellerAccess = 
    userType === 'seller' || 
    userType === 'spare_parts_seller' || 
    sellerRoles.includes('spare_parts_seller') ||
    sellerRoles.includes('parts_seller') ||
    sellerRoles.includes('seller');

  console.log('🔧 Spare Parts Seller Dashboard Debug:', {
    userType,
    sellerRoles,
    hasSparePartsSellerAccess,
    userProfile: userProfile ? 'Present' : 'Missing',
    userId: user?.id
  });

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    filterAndSortSpareParts();
  }, [spareParts, searchQuery, filterStatus, sortBy, sortOrder]);

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setRefreshing(true);
      
      const { data: sparePartsData, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching spare parts:', error);
      }

      const parts = sparePartsData || [];
      setSpareParts(parts);
      calculateStats(parts);
      setLoading(false);
      setRefreshing(false);
      
      console.log('✅ Fetched spare parts:', parts.length);
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load spare parts listings"
      });
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (partsData: any[]) => {
    const totalParts = partsData.length;
    const activeListings = partsData.filter(p => p.quantity > 0).length;
    const totalValue = partsData.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0);
    const avgPrice = totalParts > 0 ? partsData.reduce((sum, p) => sum + (p.price || 0), 0) / totalParts : 0;

    // Get popular categories
    const categoryCount: { [key: string]: number } = {};
    partsData.forEach(part => {
      part.category_tags?.forEach((tag: string) => {
        categoryCount[tag] = (categoryCount[tag] || 0) + 1;
      });
    });
    
    const popularCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    setDashboardStats({
      totalParts,
      activeListings,
      totalValue,
      totalViews: Math.floor(Math.random() * 500),
      avgPrice,
      soldThisMonth: Math.floor(Math.random() * 10),
      inquiries: Math.floor(Math.random() * 25),
      popularCategories
    });
  };

  const filterAndSortSpareParts = () => {
    let filtered = [...spareParts];

    if (searchQuery) {
      filtered = filtered.filter(part => 
        part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.category_tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filterStatus === 'available') {
      filtered = filtered.filter(part => part.quantity > 0);
    } else if (filterStatus === 'out_of_stock') {
      filtered = filtered.filter(part => part.quantity === 0);
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

    setFilteredSpareParts(filtered);
  };

  const handleAddSparePart = () => {
    console.log('🚀 Add Spare Part clicked - Access:', hasSparePartsSellerAccess);
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Logged In",
        description: "Please log in to add spare parts listings"
      });
      return;
    }

    if (!hasSparePartsSellerAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need spare parts seller permissions to add listings"
      });
      return;
    }
    
    setShowAddForm(true);
    console.log('✅ Opening add form');
  };

  const handleDeleteSparePart = async (partId: string) => {
    if (!hasSparePartsSellerAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to delete spare parts listings"
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this spare part listing?')) return;

    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', partId)
        .eq('seller_id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Spare part listing deleted successfully"
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting spare part:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete spare part listing"
      });
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

  if (!hasSparePartsSellerAccess) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <ShieldX className="w-6 h-6" />
              Access Restricted - Spare Parts Seller Dashboard
            </CardTitle>
            <CardDescription className="text-red-600">
              You need spare parts seller permissions to access this dashboard
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
                  <span>'spare_parts_seller' in your seller roles array</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>'parts_seller' in your seller roles array</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Parts',
      value: dashboardStats.totalParts,
      icon: Package,
      trend: `${dashboardStats.activeListings} in stock`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Inventory Value',
      value: `₹${dashboardStats.totalValue.toLocaleString()}`,
      icon: DollarSign,
      trend: `Avg: ₹${Math.round(dashboardStats.avgPrice).toLocaleString()}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Views',
      value: dashboardStats.totalViews,
      icon: Eye,
      trend: 'This month',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Inquiries',
      value: dashboardStats.inquiries,
      icon: Activity,
      trend: 'Pending responses',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-8 h-8" />
            Spare Parts Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your spare parts inventory and listings</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
          >
            {refreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
          <Button onClick={handleAddSparePart} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Spare Part
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.trend}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="listings">Listings Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Listings Management */}
        <TabsContent value="listings" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Spare Parts Listings</CardTitle>
              <CardDescription>
                Manage your spare parts inventory and listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search parts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parts</SelectItem>
                    <SelectItem value="available">In Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Spare Parts Table */}
              {viewMode === 'list' ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part Name</TableHead>
                        <TableHead>Part Number</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSpareParts.map((part) => (
                        <TableRow key={part.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              {part.images?.[0] && (
                                <img 
                                  src={part.images[0]} 
                                  alt={part.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium">{part.name}</p>
                                <p className="text-sm text-muted-foreground">{part.description?.slice(0, 50)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{part.part_number || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={part.quantity > 0 ? 'default' : 'secondary'}>
                              {part.quantity} units
                            </Badge>
                          </TableCell>
                          <TableCell>₹{part.price?.toLocaleString() || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {part.category_tags?.slice(0, 2).map((tag: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {(part.category_tags?.length || 0) > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(part.category_tags?.length || 0) - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
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
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteSparePart(part.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSpareParts.map((part) => (
                    <Card key={part.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        {part.images?.[0] ? (
                          <img 
                            src={part.images[0]} 
                            alt={part.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-12 h-12 text-muted-foreground" />
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2">{part.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {part.description?.slice(0, 100)}
                        </p>
                        <div className="flex justify-between items-center">
                          <Badge variant={part.quantity > 0 ? 'default' : 'secondary'}>
                            {part.quantity} units
                          </Badge>
                          <span className="font-bold">₹{part.price?.toLocaleString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Performance</CardTitle>
              <CardDescription>Track your spare parts business performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Popular Categories */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Popular Categories</h3>
                  <div className="space-y-2">
                    {dashboardStats.popularCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>{category.category}</span>
                        <Badge>{category.count} parts</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{dashboardStats.soldThisMonth}</div>
                    <div className="text-sm text-muted-foreground">Parts Sold This Month</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      ₹{Math.round(dashboardStats.avgPrice).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Part Price</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>Monitor stock levels and manage inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Low Stock Alert */}
                {spareParts.filter(part => part.quantity <= 5 && part.quantity > 0).length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {spareParts.filter(part => part.quantity <= 5 && part.quantity > 0).length} parts are running low on stock
                    </AlertDescription>
                  </Alert>
                )}

                {/* Out of Stock Alert */}
                {spareParts.filter(part => part.quantity === 0).length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {spareParts.filter(part => part.quantity === 0).length} parts are out of stock
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-center py-8 text-muted-foreground">
                  Advanced inventory management features coming soon...
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Spare Part Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Spare Part</DialogTitle>
          </DialogHeader>
          <SpareParts />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SparePartsSellerDashboard;