import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Package, Plus, Search, Edit, Trash2, RefreshCw, Download,
  Grid, List, CheckCircle, BarChart3, DollarSign,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SparePartsUpload from '@/components/SpareParts'; // You need to create this form (like RobotUpload)

const SparePartsSellerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [filteredParts, setFilteredParts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    total: 0, inStock: 0, totalValue: 0, avgPrice: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);

  useEffect(() => {
    fetchSpareParts();
  }, [user]);

  useEffect(() => {
    // Filter/search logic
    let filtered = [...spareParts];
    if (searchQuery) {
      filtered = filtered.filter(part =>
        part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.part_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterStatus === 'in_stock') filtered = filtered.filter(p => p.quantity > 0);
    if (filterStatus === 'out_of_stock') filtered = filtered.filter(p => p.quantity === 0);
    setFilteredParts(filtered);
  }, [spareParts, searchQuery, filterStatus]);
  
  useEffect(() => {
    // Stats calculation
    const total = spareParts.length;
    const inStock = spareParts.filter(p => p.quantity > 0).length;
    const totalValue = spareParts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const avgPrice = total ? spareParts.reduce((sum, p) => sum + (p.price || 0), 0) / total : 0;
    setDashboardStats({ total, inStock, totalValue, avgPrice });
  }, [spareParts]);

  const fetchSpareParts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setRefreshing(true);
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSpareParts(data || []);
    } catch (e) {
      console.error('Error fetching spare parts:', e);
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

  const handleAddPart = () => setShowAddForm(true);
  const handleEditPart = (part: any) => {
    setEditingPart(part);
    setShowEditForm(true);
  };
  const handleDeletePart = async (partId: string) => {
    if (!confirm('Delete this spare part?')) return;
    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', partId)
        .eq('seller_id', user?.id);
      if (error) throw error;
      toast({ title: "Success", description: "Part deleted" });
      fetchSpareParts();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete part" });
    }
  };

  // --- Header and Stats Cards ---
  const statsCards = [
    {
      title: "Total Parts",
      value: dashboardStats.total,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: `${dashboardStats.inStock} in stock`,
      change: '+5%',
    },
    {
      title: "Total Value",
      value: `₹${dashboardStats.totalValue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: `Avg: ₹${dashboardStats.avgPrice.toLocaleString()}`,
      change: '+4%',
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="w-4 h-4" />
        <AlertDescription className="text-green-700">
          <strong>Welcome{user?.user_metadata?.full_name && `, ${user.user_metadata.full_name}`}!</strong>
        </AlertDescription>
      </Alert>

      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Spare Parts Seller Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your spare part inventory and track performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSpareParts} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button
            onClick={handleAddPart}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Spare Part
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">{stat.trend}</Badge>
                      <Badge variant="outline" className="text-xs text-green-600">{stat.change}</Badge>
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

      {/* Inventory Table/Grid with Filters */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search parts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-md px-3 py-2 ml-2">
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <div className="flex border rounded-lg ml-2">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
                <List className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}>
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        {/* List/Grid views */}
        {filteredParts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {spareParts.length === 0 ? 'No spare parts in inventory' : 'No spare parts match your filters'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by adding your first spare part listing'}
              </p>
              <Button
                onClick={handleAddPart}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Spare Part
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredParts.map(part => (
              <Card key={part.id} className="hover:shadow-lg transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {part.images?.length > 0 ? (
                        <img src={part.images[0]} alt={part.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="truncate">
                      <span className="font-medium">{part.name || 'Unnamed Part'}</span>
                      <span className="block text-xs text-muted-foreground">{part.part_number}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant={part.quantity > 0 ? "default" : "secondary"}>
                      {part.quantity > 0 ? "In Stock" : "Out of Stock"}
                    </Badge>
                    <span className="font-bold text-lg">₹{part.price?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditPart(part)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeletePart(part.id)}>
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
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
                  <TableHead>Part Name</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map(part => (
                  <TableRow key={part.id}>
                    <TableCell>{part.name}</TableCell>
                    <TableCell>{part.part_number}</TableCell>
                    <TableCell>{part.quantity}</TableCell>
                    <TableCell>₹{part.price?.toLocaleString() || '0'}</TableCell>
                    <TableCell>
                      <Badge variant={part.quantity > 0 ? "default" : "secondary"}>
                        {part.quantity > 0 ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEditPart(part)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePart(part.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Add Spare Part Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Add Spare Part</h2>
                <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6">
              <SparePartsUpload
                onSuccess={() => {
                  setShowAddForm(false);
                  fetchSpareParts();
                  toast({ title: 'Success!', description: 'Spare part added.' });
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Spare Part Modal */}
      {showEditForm && editingPart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Edit Spare Part: {editingPart.name}</h2>
                <Button variant="ghost" onClick={() => { setShowEditForm(false); setEditingPart(null); }}>
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6">
              <SparePartsUpload
                editMode={true}
                partData={editingPart}
                onSuccess={() => {
                  setShowEditForm(false);
                  setEditingPart(null);
                  fetchSpareParts();
                  toast({ title: 'Success!', description: 'Spare part updated.' });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SparePartsSellerDashboard;
