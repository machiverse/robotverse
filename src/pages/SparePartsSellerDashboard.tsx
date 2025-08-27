import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  BarChart3,
  TrendingUp,
  DollarSign,
  Activity,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Grid,
  List,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  Download,
  Share2,
  Star
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EnhancedSparePartsForm from '@/components/EnhancedSparePartsForm';
import { formatPrice, type Currency, convertToINR, calculateTotalInINR } from '@/utils/currency';

interface SparePart {
  id: string;
  name: string;
  part_number: string;
  description?: string;
  quantity: number;
  price: number;
  currency: Currency;
  images: string[];
  compatible_robots: string[];
  category_tags: string[];
  specifications: any;
  location?: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
}

interface PartFormData {
  name: string;
  part_number: string;
  description: string;
  quantity: number;
  price: number;
  images: string[];
  compatible_robots: string[];
  category_tags: string[];
  specifications: any;
}

const SparePartsSellerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [formData, setFormData] = useState<PartFormData>({
    name: '',
    part_number: '',
    description: '',
    quantity: 1,
    price: 0,
    images: [],
    compatible_robots: [],
    category_tags: [],
    specifications: {}
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    totalValue: 0,
    avgPrice: 0,
    recentSales: 0
  });

  useEffect(() => {
    fetchSpareParts();
  }, [user]);

  useEffect(() => {
    calculateStats();
  }, [spareParts]);

  const fetchSpareParts = async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSpareParts((data || []).map(part => ({
        ...part,
        currency: (part.currency as Currency) || 'INR'
      })));
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load spare parts"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = () => {
    const total = spareParts.length;
    const inStock = spareParts.filter(part => part.quantity > 0).length;
    const outOfStock = spareParts.filter(part => part.quantity === 0).length;
    
    // Calculate total value in INR for consistent comparison
    const totalValue = calculateTotalInINR(
      spareParts.map(part => ({ 
        price: (part.price || 0) * part.quantity, 
        currency: part.currency 
      }))
    );
    
    // Calculate average price in INR
    const avgPrice = total > 0 
      ? calculateTotalInINR(
          spareParts.map(part => ({ price: part.price || 0, currency: part.currency }))
        ) / total 
      : 0;

    setStats({
      total,
      inStock,
      outOfStock,
      totalValue,
      avgPrice,
      recentSales: 0 // This would come from sales data
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const partData = {
        ...formData,
        seller_id: user.id,
        currency: 'INR'
      };

      let result;
      if (editingPart) {
        result = await supabase
          .from('spare_parts')
          .update(partData)
          .eq('id', editingPart.id)
          .select();
      } else {
        result = await supabase
          .from('spare_parts')
          .insert([partData])
          .select();
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Spare part ${editingPart ? 'updated' : 'added'} successfully`
      });

      resetForm();
      fetchSpareParts();
    } catch (error) {
      console.error('Error saving spare part:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingPart ? 'update' : 'add'} spare part`
      });
    }
  };

  const handleDelete = async (partId: string) => {
    if (!confirm('Are you sure you want to delete this spare part?')) return;

    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Spare part deleted successfully"
      });

      fetchSpareParts();
    } catch (error) {
      console.error('Error deleting spare part:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete spare part"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      part_number: '',
      description: '',
      quantity: 1,
      price: 0,
      images: [],
      compatible_robots: [],
      category_tags: [],
      specifications: {}
    });
    setEditingPart(null);
    setShowAddDialog(false);
  };

  const startEdit = (part: SparePart) => {
    setFormData({
      name: part.name,
      part_number: part.part_number,
      description: part.description || '',
      quantity: part.quantity,
      price: part.price,
      images: part.images || [],
      compatible_robots: part.compatible_robots || [],
      category_tags: part.category_tags || [],
      specifications: part.specifications || {}
    });
    setEditingPart(part);
    setShowAddDialog(true);
  };

  const filteredParts = spareParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.part_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'in_stock') return matchesSearch && part.quantity > 0;
    if (filterStatus === 'out_of_stock') return matchesSearch && part.quantity === 0;
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg">Loading spare parts dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spare Parts Dashboard</h1>
          <p className="text-muted-foreground">Manage your spare parts inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSpareParts}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Part
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPart ? 'Edit Spare Part' : 'Add New Spare Part'}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <EnhancedSparePartsForm 
                  editingPart={editingPart}
                  onSuccess={() => {
                    resetForm();
                    fetchSpareParts();
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.inStock}</div>
            <p className="text-xs text-muted-foreground">
              Available parts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Inventory worth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Math.round(stats.avgPrice).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Per part average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search parts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parts</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Parts List/Grid */}
      {filteredParts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No spare parts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first spare part'
              }
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Part
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParts.map((part) => (
            <Card key={part.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant={part.quantity > 0 ? 'default' : 'secondary'}>
                    {part.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(part)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(part.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{part.name}</CardTitle>
                <CardDescription>Part #: {part.part_number}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Quantity:</span>
                    <span className="font-medium">{part.quantity}</span>
                  </div>
                   <div className="flex justify-between">
                     <span className="text-sm text-muted-foreground">Price:</span>
                     <span className="font-medium">{formatPrice(part.price, part.currency)}</span>
                   </div>
                  {part.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {part.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-medium">{part.part_number}</TableCell>
                  <TableCell>{part.name}</TableCell>
                  <TableCell>{part.quantity}</TableCell>
                  <TableCell>{formatPrice(part.price, part.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={part.quantity > 0 ? 'default' : 'secondary'}>
                      {part.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(part)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(part.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      </div>
    </div>
  );
};

export default SparePartsSellerDashboard;