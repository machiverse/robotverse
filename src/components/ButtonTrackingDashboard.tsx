import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Download, RefreshCw, Activity, Users, MousePointer, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ButtonInteraction {
  id: string;
  user_id: string;
  user_name: string;
  seller_id?: string;
  seller_name?: string;
  button_name: string;
  button_type: string;
  page_url: string;
  item_id?: string;
  item_type?: string;
  additional_data: any;
  created_at: string;
}

interface ButtonTrackingStats {
  totalClicks: number;
  uniqueUsers: number;
  topButtons: Array<{ button_name: string; count: number }>;
  topSellers: Array<{ seller_name: string; count: number }>;
}

const ButtonTrackingDashboard: React.FC = () => {
  const { toast } = useToast();
  const [interactions, setInteractions] = useState<ButtonInteraction[]>([]);
  const [filteredInteractions, setFilteredInteractions] = useState<ButtonInteraction[]>([]);
  const [stats, setStats] = useState<ButtonTrackingStats>({
    totalClicks: 0,
    uniqueUsers: 0,
    topButtons: [],
    topSellers: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterButtonType, setFilterButtonType] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');

  useEffect(() => {
    fetchButtonInteractions();
  }, []);

  useEffect(() => {
    filterInteractions();
  }, [interactions, searchTerm, filterButtonType, filterDateRange]);

  const fetchButtonInteractions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('button_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      setInteractions(data || []);
      calculateStats(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch button interactions"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ButtonInteraction[]) => {
    const totalClicks = data.length;
    const uniqueUsers = new Set(data.map(d => d.user_id)).size;

    // Top buttons
    const buttonCounts: { [key: string]: number } = {};
    data.forEach(item => {
      buttonCounts[item.button_name] = (buttonCounts[item.button_name] || 0) + 1;
    });

    const topButtons = Object.entries(buttonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([button_name, count]) => ({ button_name, count }));

    // Top sellers contacted
    const sellerCounts: { [key: string]: number } = {};
    data.filter(item => item.seller_name).forEach(item => {
      if (item.seller_name) {
        sellerCounts[item.seller_name] = (sellerCounts[item.seller_name] || 0) + 1;
      }
    });

    const topSellers = Object.entries(sellerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([seller_name, count]) => ({ seller_name, count }));

    setStats({
      totalClicks,
      uniqueUsers,
      topButtons,
      topSellers
    });
  };

  const filterInteractions = () => {
    let filtered = [...interactions];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.user_name?.toLowerCase().includes(term) ||
        item.seller_name?.toLowerCase().includes(term) ||
        item.button_name?.toLowerCase().includes(term) ||
        item.button_type?.toLowerCase().includes(term)
      );
    }

    // Button type filter
    if (filterButtonType !== 'all') {
      filtered = filtered.filter(item => item.button_type === filterButtonType);
    }

    // Date range filter
    if (filterDateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (filterDateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(item => new Date(item.created_at) >= cutoffDate);
    }

    setFilteredInteractions(filtered);
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'User Name', 'Button Name', 'Button Type', 'Seller Name', 'Item Type', 'Page URL'].join(','),
      ...filteredInteractions.map(item => [
        new Date(item.created_at).toLocaleDateString(),
        item.user_name || '',
        item.button_name || '',
        item.button_type || '',
        item.seller_name || '',
        item.item_type || '',
        item.page_url || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `button-interactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getButtonTypeColor = (type: string) => {
    const colors = {
      contact: "bg-blue-100 text-blue-800",
      navigation: "bg-green-100 text-green-800",
      analysis: "bg-purple-100 text-purple-800",
      social: "bg-orange-100 text-orange-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const uniqueButtonTypes = [...new Set(interactions.map(i => i.button_type))];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</p>
              </div>
              <MousePointer className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Users</p>
                <p className="text-2xl font-bold">{stats.uniqueUsers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Button</p>
                <p className="text-lg font-bold">{stats.topButtons[0]?.button_name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{stats.topButtons[0]?.count || 0} clicks</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Most Contacted</p>
                <p className="text-lg font-bold truncate">{stats.topSellers[0]?.seller_name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{stats.topSellers[0]?.count || 0} contacts</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Button Interactions
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchButtonInteractions}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, seller, or button name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterButtonType} onValueChange={setFilterButtonType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Button Types</SelectItem>
                {uniqueButtonTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDateRange} onValueChange={setFilterDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredInteractions.length} of {interactions.length} interactions
          </div>

          {/* Interactions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Button</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Page</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInteractions.map((interaction) => (
                  <TableRow key={interaction.id}>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(interaction.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(interaction.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{interaction.user_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{interaction.button_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getButtonTypeColor(interaction.button_type)}>
                        {interaction.button_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {interaction.seller_name || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {interaction.item_type || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground truncate max-w-48">
                        {interaction.page_url}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ButtonTrackingDashboard;