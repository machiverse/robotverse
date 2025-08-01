import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  List,
  Grid,
  Package,
  CheckCircle,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EnhancedHeader from '@/components/EnhancedHeader';

// SparePart interface defining the part object shape
interface SparePart {
  id: string;
  name: string;
  part_number: string;
  description?: string;
  quantity: number;
  price: number;
  currency: string;
  images: string[];
  compatible_robots: string[];
  category_tags: string[];
  specifications: Record<string, any>;
  location?: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
}

// Form data shape used for add/edit
interface PartFormData {
  id?: string;
  name: string;
  part_number: string;
  description: string;
  quantity: number;
  price: number;
  images: string[];
  compatible_robots: string[];
  category_tags: string[];
  specifications: Record<string, any>;
  location?: string;
}

const SparePartsSellerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State to hold spare parts fetched from Supabase
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search query and filter status states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // View mode toggle state: 'list' or 'grid'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Dialog/form states for add/edit spare parts
  const [showDialog, setShowDialog] = useState(false);
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
    specifications: {},
    location: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  // Stats for inventory overview
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    totalValue: 0,
    avgPrice: 0,
  });

  // Fetch parts when user changes (or on mount if user exists)
  useEffect(() => {
    if (user) fetchSpareParts();
    else {
      setSpareParts([]);
      setLoading(false);
    }
  }, [user]);

  // Recalculate stats whenever spare parts data changes
  useEffect(() => {
    calculateStats();
  }, [spareParts]);

  // Function to fetch spare parts from Supabase
  const fetchSpareParts = async (): Promise<void> => {
    if (!user) return;
    
    try {
      setLoading(true);
      setRefreshing(true);
      const { data, error } = await supabase
        .from<SparePart>('spare_parts')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSpareParts(data || []);
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load spare parts',
        description: 'Please try again later',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate inventory stats for the dashboard cards
  const calculateStats = (): void => {
    const total = spareParts.length;
    const inStock = spareParts.filter(part => part.quantity > 0).length;
    const outOfStock = spareParts.filter(part => part.quantity === 0).length;
    const totalValue = spareParts.reduce((acc, part) => acc + (part.price * part.quantity), 0);
    const avgPrice = total > 0 ? spareParts.reduce((acc, part) => acc + part.price, 0) / total : 0;

    setStats({ total, inStock, outOfStock, totalValue, avgPrice });
  };

  // Update form field values
  const updateFormData = (field: keyof PartFormData, value: any): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Reset and close form dialog
  const resetForm = (): void => {
    setEditingPart(null);
    setFormData({
      name: '',
      part_number: '',
      description: '',
      quantity: 1,
      price: 0,
      images: [],
      compatible_robots: [],
      category_tags: [],
      specifications: {},
      location: '',
    });
    setShowDialog(false);
  };

  // Open form dialog with existing part data for editing
  const startEdit = (part: SparePart): void => {
    setEditingPart(part);
    setFormData({
      id: part.id,
      name: part.name,
      part_number: part.part_number,
      description: part.description || '',
      quantity: part.quantity,
      price: part.price,
      images: part.images || [],
      compatible_robots: part.compatible_robots || [],
      category_tags: part.category_tags || [],
      specifications: part.specifications || {},
      location: part.location || '',
    });
    setShowDialog(true);
  };

  // Handle submission of add/edit form
  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not logged in',
        description: 'Please log in to manage spare parts',
      });
      return;
    }
    
    setFormLoading(true);

    try {
      const partToSave: Partial<SparePart> = {
        name: formData.name,
        part_number: formData.part_number,
        description: formData.description,
        quantity: formData.quantity,
        price: formData.price,
        images: formData.images,
        compatible_robots: formData.compatible_robots,
        category_tags: formData.category_tags,
        specifications: formData.specifications,
        location: formData.location,
        seller_id: user.id,
        currency: 'INR',
      };

      if (editingPart) {
        const { error } = await supabase
          .from('spare_parts')
          .update(partToSave)
          .eq('id', editingPart.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Spare part updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('spare_parts')
          .insert([partToSave]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Spare part added successfully',
        });
      }

      resetForm();
      fetchSpareParts();
    } catch (error) {
      console.error('Error saving spare part:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save spare part',
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Confirm and delete spare part
  const handleDelete = async (partId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this spare part?')) return;

    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Spare part deleted successfully',
      });
      fetchSpareParts();
    } catch (error) {
      console.error('Error deleting spare part:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete spare part',
      });
    }
  };

  // Filter and search spare parts before display
  const filteredParts = spareParts.filter(part => {
    const matchesSearch =
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.part_number.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === 'in_stock') return matchesSearch && part.quantity > 0;
    if (filterStatus === 'out_of_stock') return matchesSearch && part.quantity === 0;
    return matchesSearch;
  });

  // Show loading UI when fetching parts
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-lg font-semibold">Loading spare parts dashboard...</p>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <EnhancedHeader />
      <div className="space-y-6 p-6 max-w-6xl mx-auto">
        {/* Header and controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Spare Parts Dashboard</h1>
            <p className="text-muted-foreground">Manage your spare parts inventory</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSpareParts}
              disabled={refreshing}
              aria-label="Refresh spare parts list"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Add part dialog trigger */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  aria-label="Add a new spare part"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Part
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPart ? 'Edit Spare Part' : 'Add New Spare Part'}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Part Number & Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="part_number">Part Number *</Label>
                      <Input
                        id="part_number"
                        required
                        disabled={formLoading}
                        value={formData.part_number}
                        onChange={(e) => updateFormData('part_number', e.target.value)}
                        placeholder="E.g., RB-001-ARM"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Part Name *</Label>
                      <Input
                        id="name"
                        required
                        disabled={formLoading}
                        value={formData.name}
                        onChange={(e) => updateFormData('name', e.target.value)}
                        placeholder="E.g., Robot Arm Joint"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      disabled={formLoading}
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      rows={3}
                      placeholder="Detailed description of the spare part..."
                    />
                  </div>

                  {/* Quantity & Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min={0}
                        required
                        disabled={formLoading}
                        value={formData.quantity}
                        onChange={(e) => updateFormData('quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (₹) *</Label>
                      <Input
                        id="price"
                        type="number"
                        min={0}
                        step="0.01"
                        required
                        disabled={formLoading}
                        value={formData.price}
                        onChange={(e) => updateFormData('price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      disabled={formLoading}
                      value={formData.location}
                      onChange={(e) => updateFormData('location', e.target.value)}
                      placeholder="Warehouse or shelf location"
                    />
                  </div>

                  {/* Compatible Robots */}
                  <div className="space-y-2">
                    <Label htmlFor="compatible_robots">Compatible Robots (comma separated)</Label>
                    <Input
                      id="compatible_robots"
                      disabled={formLoading}
                      value={formData.compatible_robots.join(', ')}
                      onChange={(e) =>
                        updateFormData(
                          'compatible_robots',
                          e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        )
                      }
                      placeholder="Model1, Model2, Model3"
                    />
                  </div>

                  {/* Category Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="category_tags">Category Tags (comma separated)</Label>
                    <Input
                      id="category_tags"
                      disabled={formLoading}
                      value={formData.category_tags.join(', ')}
                      onChange={(e) =>
                        updateFormData(
                          'category_tags',
                          e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        )
                      }
                      placeholder="arm, joint, electronics"
                    />
                  </div>

                  {/* Images placeholder (can extend with file upload UI) */}
                  <div className="space-y-2">
                    <Label>Images</Label>
                    <p className="text-sm text-muted-foreground">Image upload integration can be added here.</p>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setShowDialog(false);
                      }}
                      disabled={formLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? 'Saving...' : editingPart ? 'Update Part' : 'Add Part'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Inventory items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Stock</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.inStock}</div>
              <p className="text-xs text-muted-foreground">Available parts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <Badge variant="secondary" className="rounded px-2 py-1">{stats.outOfStock}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.outOfStock}</div>
              <p className="text-xs text-muted-foreground">Unavailable parts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Inventory worth</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.avgPrice.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Average per part</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap flex-1 max-w-lg md:max-w-none">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search parts by name or part number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-3"
                aria-label="Search spare parts"
              />
            </div>

            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as 'all' | 'in_stock' | 'out_of_stock')}
              aria-label="Filter spare parts by stock status"
            >
              <SelectTrigger className="w-48">
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
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              aria-label="List view mode"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view mode"
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Parts display */}
        {filteredParts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No spare parts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first spare part'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <Button onClick={() => setShowDialog(true)}>
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
                      <Button size="sm" variant="ghost" onClick={() => startEdit(part)} aria-label={`Edit part ${part.name}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(part.id)} aria-label={`Delete part ${part.name}`}>
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
                      <span className="font-medium">₹{part.price.toLocaleString()}</span>
                    </div>
                    {part.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{part.description}</p>
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
                    <TableCell>₹{part.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={part.quantity > 0 ? 'default' : 'secondary'}>
                        {part.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(part)} aria-label={`Edit part ${part.name}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(part.id)} aria-label={`Delete part ${part.name}`}>
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
