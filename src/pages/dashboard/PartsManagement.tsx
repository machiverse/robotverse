import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Edit, MoreHorizontal, AlertTriangle, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, type Currency } from '@/utils/currency';

interface SparePart {
  id: string;
  name: string;
  part_number: string;
  price: number;
  currency: Currency;
  quantity: number;
  category_tags: string[];
  created_at: string;
}

const PartsManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0
  });

  useEffect(() => {
    if (user) {
      fetchParts();
    }
  }, [user]);

  useEffect(() => {
    calculateStats();
  }, [parts]);

  const fetchParts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setParts((data || []).map(part => ({
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
    }
  };

  const calculateStats = () => {
    const total = parts.length;
    const inStock = parts.filter(part => part.quantity > 10).length;
    const lowStock = parts.filter(part => part.quantity > 0 && part.quantity <= 10).length;
    const outOfStock = parts.filter(part => part.quantity === 0).length;

    setStats({ total, inStock, lowStock, outOfStock });
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= 10) return 'low_stock';
    return 'in_stock';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-100 text-green-700';
      case 'low_stock': return 'bg-yellow-100 text-yellow-700';
      case 'out_of_stock': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'low_stock' || status === 'out_of_stock') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-4 text-lg">Loading spare parts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spare Parts Management</h1>
          <p className="text-muted-foreground">
            Manage your spare parts inventory and track orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchParts}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New Part
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Parts
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total parts in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              In Stock
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inStock}</div>
            <p className="text-xs text-muted-foreground">
              Well stocked items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">
              Need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Out of Stock
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outOfStock}</div>
            <p className="text-xs text-muted-foreground">
              Unavailable items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Parts Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Parts Inventory</CardTitle>
          <CardDescription>
            Current spare parts stock and order information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No spare parts found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first spare part
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Part
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {parts.map((part) => {
                const status = getStockStatus(part.quantity);
                return (
                  <div key={part.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h4 className="font-medium">{part.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Part #: {part.part_number || 'N/A'}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm font-medium">
                            {formatPrice(part.price || 0, part.currency)}
                          </span>
                          {part.category_tags && part.category_tags.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                              Category: {part.category_tags[0]}
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            Added: {new Date(part.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">Stock: {part.quantity}</div>
                        <Badge className={`${getStatusColor(status)} flex items-center gap-1`}>
                          {getStatusIcon(status)}
                          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Part
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Package className="h-4 w-4 mr-2" />
                            Update Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Remove Part
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartsManagement;