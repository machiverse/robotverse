import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  TrendingUp,
  BarChart3,
  Filter,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';
import { useUniversalViewTracking, ViewAnalytics, ItemType } from '@/hooks/useUniversalViewTracking';
import { useAuth } from '@/hooks/useAuth';

interface ViewAnalyticsDashboardProps {
  sellerId?: string;
  className?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

// Simple chart components to replace recharts
const SimpleBarChart = ({ data }: { data: any[] }) => (
  <div className="flex items-end justify-center gap-2 h-64 p-4">
    {data.map((item, index) => (
      <div key={index} className="flex flex-col items-center gap-1">
        <div 
          className="bg-primary rounded-t-sm min-w-[40px] flex items-end justify-center"
          style={{ 
            height: `${Math.max((item.views / Math.max(...data.map(d => d.views))) * 200, 10)}px` 
          }}
        >
          <span className="text-primary-foreground text-xs font-medium mb-1">
            {item.views}
          </span>
        </div>
        <span className="text-xs text-center max-w-[60px] truncate">
          {item.name}
        </span>
      </div>
    ))}
  </div>
);

const SimplePieChart = ({ data }: { data: any[] }) => {
  const total = data.reduce((sum, item) => sum + item.views, 0);
  
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm">{item.name}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 text-center">
        {data.map((item, index) => (
          <div key={index} className="p-2 border rounded">
            <div className="font-semibold">{item.views}</div>
            <div className="text-xs text-muted-foreground">
              {((item.views / total) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  robots: 'Robots',
  spare_parts: 'Spare Parts',
  services: 'Services',
  logistics_services: 'Logistics',
  loan_products: 'Finance'
};

export const ViewAnalyticsDashboard = ({ sellerId, className = "" }: ViewAnalyticsDashboardProps) => {
  const { user } = useAuth();
  const { getSellerAnalytics, getTopViewedItems, loading } = useUniversalViewTracking();
  const [analytics, setAnalytics] = useState<ViewAnalytics[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<ViewAnalytics[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'views' | 'name' | 'date'>('views');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const currentSellerId = sellerId || user?.id;

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!currentSellerId) return;
    
    try {
      const data = await getSellerAnalytics(currentSellerId, dateRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentSellerId, dateRange]);

  // Filter and sort analytics
  useEffect(() => {
    let filtered = analytics;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.itemType === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'views':
          comparison = a.totalViews - b.totalViews;
          break;
        case 'name':
          comparison = a.itemName.localeCompare(b.itemName);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredAnalytics(filtered);
  }, [analytics, selectedCategory, sortBy, sortOrder]);

  // Calculate statistics
  const totalViews = analytics.reduce((sum, item) => sum + item.totalViews, 0);
  const avgViews = analytics.length > 0 ? Math.round(totalViews / analytics.length) : 0;
  const topItem = analytics.length > 0 ? analytics[0] : null;
  const categoryStats = analytics.reduce((acc, item) => {
    acc[item.itemType] = (acc[item.itemType] || 0) + item.totalViews;
    return acc;
  }, {} as Record<string, number>);

  // Prepare chart data
  const chartData = Object.entries(categoryStats).map(([type, views]) => ({
    name: ITEM_TYPE_LABELS[type as ItemType] || type,
    views,
    fill: COLORS[Object.keys(categoryStats).indexOf(type) % COLORS.length]
  }));

  const topItemsChart = filteredAnalytics.slice(0, 5).map(item => ({
    name: item.itemName.length > 15 ? item.itemName.substring(0, 15) + '...' : item.itemName,
    views: item.totalViews
  }));

  const handleSort = (newSortBy: 'views' | 'name' | 'date') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const getCategoryBadgeVariant = (type: ItemType) => {
    switch (type) {
      case 'robots': return 'default';
      case 'spare_parts': return 'secondary';
      case 'services': return 'outline';
      case 'logistics_services': return 'destructive';
      case 'loan_products': return 'default';
      default: return 'outline';
    }
  };

  if (loading && analytics.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading analytics...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">View Statistics</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAnalytics}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {analytics.length} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgViews}</div>
            <p className="text-xs text-muted-foreground">
              Per item
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topItem?.totalViews || 0}</div>
            <p className="text-xs text-muted-foreground">
              {topItem?.itemName || 'No items'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(categoryStats).length}</div>
            <p className="text-xs text-muted-foreground">
              Active categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Views by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Items</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={topItemsChart} />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Detailed View Statistics</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(ITEM_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Item Name
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Model</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('views')}
                >
                  <div className="flex items-center gap-1">
                    Total Views
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Listed Date
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalytics.map((item) => (
                <TableRow key={`${item.itemType}-${item.itemId}`}>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell>
                    <Badge variant={getCategoryBadgeVariant(item.itemType)}>
                      {ITEM_TYPE_LABELS[item.itemType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.itemModel || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{item.totalViews}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAnalytics.length === 0 && (
            <div className="text-center py-8">
              <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No analytics data</h3>
              <p className="text-muted-foreground">
                {analytics.length === 0 
                  ? "Add some items to start tracking views"
                  : "No items match your current filters"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};