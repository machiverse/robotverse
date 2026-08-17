import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2, Plus, Search, RefreshCw, Database, AlertTriangle, ChevronLeft, ChevronRight, Download, Copy } from "lucide-react";

interface TableData {
  [key: string]: any;
}

interface TableInfo {
  name: string;
  columns: string[];
  data: TableData[];
  count: number;
}

const ALL_TABLES: string[] = [
  'profiles', 'robots', 'spare_parts', 'services',
  'blogs', 'community_posts', 'blog_comments', 'blog_likes', 'blog_shares', 'blog_views',
  'post_comments', 'post_likes', 'post_shares', 'comment_likes',
  'chat_sessions', 'chat_messages', 'chat_notifications', 'chat_conversations',
  'button_interactions', 'user_interactions', 'content_interactions', 'item_view_counts',
  'robot_view_counts', 'robot_ai_analysis', 'robot_reports', 'robot_custom_fields',
  'reviews', 'service_reviews', 'service_requests', 'service_appointments', 'service_categories',
  'seller_leads', 'seller_credits', 'seller_credit_transactions', 'seller_notifications', 'seller_invoices',
  'credit_packs', 'credit_transactions', 'subscription_plans', 'subscriptions',
  'crm_quotations', 'crm_accounts', 'crm_contacts', 'crm_opportunities',
  'crm_tasks', 'crm_activity_logs', 'crm_documents', 'crm_pipeline_stages',
  'deals', 'commission_invoices',
  'buyer_access_requests', 'user_requests', 'user_product_requests', 'request_assignments',
  'notifications', 'support_tickets',
  'logistics_services', 'logistics_coverage', 'logistics_fleet', 'logistics_shipments', 'coverage_areas',
  'loan_products', 'loan_schemes', 'loan_applications',
  'document_uploads', 'watchlists', 'unlocked_contacts', 'unlocked_leads',
  'razorpay_orders', 'razorpay_webhook_events', 'states',
];

const TABLE_CATEGORIES: Record<string, string[]> = {
  'Users & Profiles': ['profiles'],
  'Listings': ['robots', 'spare_parts', 'services'],
  'Content': ['blogs', 'community_posts', 'blog_comments', 'blog_likes', 'blog_shares', 'blog_views', 'post_comments', 'post_likes', 'post_shares', 'comment_likes'],
  'Chat': ['chat_sessions', 'chat_messages', 'chat_notifications', 'chat_conversations'],
  'Analytics & Tracking': ['button_interactions', 'user_interactions', 'content_interactions', 'item_view_counts', 'robot_view_counts', 'robot_ai_analysis', 'robot_reports', 'robot_custom_fields'],
  'Reviews': ['reviews', 'service_reviews'],
  'Services': ['service_requests', 'service_appointments', 'service_categories'],
  'Leads & CRM': ['seller_leads', 'crm_quotations', 'crm_accounts', 'crm_contacts', 'crm_opportunities', 'crm_tasks', 'crm_activity_logs', 'crm_documents', 'crm_pipeline_stages'],
  'Credits & Billing': ['seller_credits', 'seller_credit_transactions', 'credit_packs', 'credit_transactions', 'subscription_plans', 'subscriptions', 'seller_invoices'],
  'Deals & Commission': ['deals', 'commission_invoices'],
  'Requests': ['buyer_access_requests', 'user_requests', 'user_product_requests', 'request_assignments'],
  'Notifications': ['notifications', 'seller_notifications', 'support_tickets'],
  'Logistics': ['logistics_services', 'logistics_coverage', 'logistics_fleet', 'logistics_shipments', 'coverage_areas'],
  'Finance': ['loan_products', 'loan_schemes', 'loan_applications'],
  'Other': ['document_uploads', 'watchlists', 'unlocked_contacts', 'unlocked_leads', 'razorpay_orders', 'razorpay_webhook_events', 'states'],
};

const PAGE_SIZE = 50;

const DatabaseTableManager = () => {
  const { toast } = useToast();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRecord, setEditingRecord] = useState<TableData | null>(null);
  const [viewingRecord, setViewingRecord] = useState<TableData | null>(null);
  const [creatingRecord, setCreatingRecord] = useState<TableData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [page, setPage] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    fetchAllTableCounts();
  }, []);

  const fetchAllTableCounts = async () => {
    setLoading(true);
    const results: TableInfo[] = [];
    
    // Fetch counts in batches
    for (const tableName of ALL_TABLES) {
      try {
        const { count, error } = await (supabase
          .from(tableName as any) as any)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          results.push({ name: tableName, columns: [], data: [], count: count || 0 });
        }
      } catch { /* skip */ }
    }
    
    setTables(results);
    if (results.length > 0) {
      setSelectedTable(results[0].name);
      await fetchTableData(results[0].name, 0);
    }
    setLoading(false);
  };

  const fetchTableData = async (tableName: string, pageNum: number = 0) => {
    setTableLoading(true);
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error, count } = await supabase
        .from(tableName as any)
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        // Try without ordering
        const { data: d2, error: e2, count: c2 } = await supabase
          .from(tableName as any)
          .select('*', { count: 'exact' })
          .range(from, to);
        
        if (e2) {
          toast({ title: "Error", description: `Failed to load ${tableName}: ${e2.message}`, variant: "destructive" });
          setTableLoading(false);
          return;
        }
        const columns = d2 && d2.length > 0 ? Object.keys(d2[0]) : [];
        setTables(prev => prev.map(t => t.name === tableName ? { ...t, data: d2 || [], count: c2 || 0, columns } : t));
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
        setTables(prev => prev.map(t => t.name === tableName ? { ...t, data: data || [], count: count || 0, columns } : t));
      }
    } catch (err) {
      console.error('Error fetching table:', err);
    }
    setTableLoading(false);
  };

  const selectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(0);
    setSearchTerm("");
    fetchTableData(tableName, 0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchTableData(selectedTable, newPage);
  };

  const handleDeleteRecord = async (tableName: string, recordId: string) => {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from(tableName as any).delete().eq('id', recordId);
      if (error) {
        toast({ title: "Error", description: `Delete failed: ${error.message}`, variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: "Record deleted successfully" });
      fetchTableData(tableName, page);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete record", variant: "destructive" });
    }
  };

  const handleUpdateRecord = async (tableName: string, recordId: string, updates: TableData) => {
    try {
      const { id, created_at, updated_at, ...updateData } = updates;
      const { error } = await supabase.from(tableName as any).update(updateData).eq('id', recordId);
      if (error) {
        toast({ title: "Error", description: `Update failed: ${error.message}`, variant: "destructive" });
        return;
      }
      toast({ title: "Updated", description: "Record updated successfully" });
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      fetchTableData(tableName, page);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update record", variant: "destructive" });
    }
  };

  const handleCreateRecord = async (tableName: string, record: TableData) => {
    try {
      // Remove empty strings and auto-generated fields
      const cleanedRecord: TableData = {};
      for (const [key, value] of Object.entries(record)) {
        if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
        if (value === '' || value === null || value === undefined) continue;
        cleanedRecord[key] = value;
      }

      const { error } = await supabase.from(tableName as any).insert(cleanedRecord);
      if (error) {
        toast({ title: "Error", description: `Create failed: ${error.message}`, variant: "destructive" });
        return;
      }
      toast({ title: "Created", description: "Record created successfully" });
      setIsCreateDialogOpen(false);
      setCreatingRecord(null);
      fetchTableData(tableName, 0);
      setPage(0);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create record", variant: "destructive" });
    }
  };

  const openCreateDialog = () => {
    const tableData = getSelectedTableData();
    if (!tableData || tableData.columns.length === 0) {
      toast({ title: "No columns", description: "Load some data first to know the columns", variant: "destructive" });
      return;
    }
    const emptyRecord: TableData = {};
    tableData.columns.forEach(col => { emptyRecord[col] = ''; });
    setCreatingRecord(emptyRecord);
    setIsCreateDialogOpen(true);
  };

  const handleExportCSV = () => {
    const tableData = getSelectedTableData();
    if (!tableData || tableData.data.length === 0) return;
    const headers = tableData.columns.join(',');
    const rows = tableData.data.map(row => 
      tableData.columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    const csv = headers + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSelectedTableData = () => tables.find(t => t.name === selectedTable);

  const filteredData = useMemo(() => {
    const tableData = getSelectedTableData();
    if (!tableData) return [];
    if (!searchTerm) return tableData.data;
    return tableData.data.filter(record =>
      Object.values(record).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [tables, selectedTable, searchTerm]);

  const filteredTables = useMemo(() => {
    if (selectedCategory === "All") return tables;
    const categoryTables = TABLE_CATEGORIES[selectedCategory] || [];
    return tables.filter(t => categoryTables.includes(t.name));
  }, [tables, selectedCategory]);

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic text-xs">null</span>;
    if (typeof value === 'boolean') return <Badge variant={value ? "default" : "secondary"} className="text-xs">{value ? 'true' : 'false'}</Badge>;
    if (Array.isArray(value)) return <Badge variant="outline" className="text-xs">[{value.length}]</Badge>;
    if (typeof value === 'object') return <Badge variant="outline" className="text-xs">JSON</Badge>;
    const str = String(value);
    if (str.length > 40) return str.substring(0, 40) + '…';
    return str;
  };

  const selectedTableInfo = getSelectedTableData();
  const totalPages = selectedTableInfo ? Math.ceil(selectedTableInfo.count / PAGE_SIZE) : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">Loading all database tables...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter + Table Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5 text-primary" />
              Full Database Control
              <Badge variant="secondary">{tables.length} tables</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm" variant={selectedCategory === "All" ? "default" : "outline"}
              onClick={() => setSelectedCategory("All")}
              className="text-xs h-7"
            >All</Button>
            {Object.keys(TABLE_CATEGORIES).map(cat => (
              <Button
                key={cat} size="sm" variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
                className="text-xs h-7"
              >{cat}</Button>
            ))}
          </div>

          {/* Table buttons */}
          <div className="flex flex-wrap gap-1.5">
            {filteredTables.map((table) => (
              <Button
                key={table.name}
                variant={selectedTable === table.name ? "default" : "ghost"}
                onClick={() => selectTable(table.name)}
                className="text-xs h-7 px-2"
                size="sm"
              >
                {table.name.replace(/_/g, ' ')}
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                  {table.count}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data View */}
      {selectedTableInfo && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base font-semibold capitalize">
                {selectedTable.replace(/_/g, ' ')}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({selectedTableInfo.count} records)
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => fetchTableData(selectedTable, page)}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportCSV}>
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
                <Button size="sm" onClick={openCreateDialog} className="bg-success hover:bg-success text-primary-foreground">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Showing {filteredData.length} of {selectedTableInfo.count}
              </span>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-auto max-h-[500px]">
              {tableLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10 text-xs font-bold">#</TableHead>
                      {selectedTableInfo.columns.slice(0, 8).map((col) => (
                        <TableHead key={col} className="whitespace-nowrap text-xs font-bold">
                          {col}
                        </TableHead>
                      ))}
                      {selectedTableInfo.columns.length > 8 && (
                        <TableHead className="text-xs">+{selectedTableInfo.columns.length - 8} more</TableHead>
                      )}
                      <TableHead className="w-28 text-xs font-bold sticky right-0 bg-muted/50">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Math.min(selectedTableInfo.columns.length, 8) + 2} className="text-center py-8 text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((record, index) => (
                        <TableRow key={record.id || index} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground">{page * PAGE_SIZE + index + 1}</TableCell>
                          {selectedTableInfo.columns.slice(0, 8).map((col) => (
                            <TableCell key={col} className="max-w-40 text-xs">
                              {formatCellValue(record[col])}
                            </TableCell>
                          ))}
                          {selectedTableInfo.columns.length > 8 && (
                            <TableCell className="text-xs text-muted-foreground">…</TableCell>
                          )}
                          <TableCell className="sticky right-0 bg-background">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => { setViewingRecord(record); setIsViewDialogOpen(true); }}>
                                <Eye className="w-3.5 h-3.5 text-primary" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => { setEditingRecord({ ...record }); setIsEditDialogOpen(true); }}>
                                <Edit className="w-3.5 h-3.5 text-amber-600" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => handleDeleteRecord(selectedTable, record.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => handlePageChange(page - 1)} className="h-7">
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => handlePageChange(page + 1)} className="h-7">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Record Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              View Record — <span className="capitalize">{selectedTable.replace(/_/g, ' ')}</span>
            </DialogTitle>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-2">
              {Object.entries(viewingRecord).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-2 p-2 border rounded-lg text-sm">
                  <div className="font-medium text-foreground">{key}</div>
                  <div className="col-span-2 break-all text-muted-foreground">
                    {value === null || value === undefined ? (
                      <span className="italic">null</span>
                    ) : typeof value === 'object' ? (
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span className="flex items-center gap-1">
                        {String(value)}
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
                          onClick={() => { navigator.clipboard.writeText(String(value)); toast({ title: "Copied!" }); }}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-4 h-4 text-amber-600" />
              Edit Record — <span className="capitalize">{selectedTable.replace(/_/g, ' ')}</span>
            </DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Changes are permanent. Be careful!</span>
                </div>
              </div>
              
              {Object.entries(editingRecord).map(([key, value]) => {
                const isReadOnly = key === 'id' || key === 'created_at' || key === 'updated_at';
                return (
                  <div key={key} className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      {key}
                      {isReadOnly && <Badge variant="secondary" className="text-[10px] h-4">read-only</Badge>}
                    </label>
                    {typeof value === 'object' && value !== null ? (
                      <Textarea
                        value={JSON.stringify(value, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEditingRecord(prev => prev ? { ...prev, [key]: parsed } : null);
                          } catch { /* keep typing */ }
                        }}
                        className="font-mono text-xs"
                        rows={4}
                        disabled={isReadOnly}
                      />
                    ) : typeof value === 'boolean' ? (
                      <Select
                        value={String(value)}
                        onValueChange={(v) => setEditingRecord(prev => prev ? { ...prev, [key]: v === 'true' } : null)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">true</SelectItem>
                          <SelectItem value="false">false</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={value?.toString() || ''}
                        onChange={(e) => setEditingRecord(prev => prev ? { ...prev, [key]: e.target.value } : null)}
                        disabled={isReadOnly}
                        className="h-9 text-sm"
                      />
                    )}
                  </div>
                );
              })}
              
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => handleUpdateRecord(selectedTable, editingRecord.id, editingRecord)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Record Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-success" />
              Create Record — <span className="capitalize">{selectedTable.replace(/_/g, ' ')}</span>
            </DialogTitle>
          </DialogHeader>
          {creatingRecord && (
            <div className="space-y-3">
              <div className="bg-success/10 border border-success/30/30 p-3 rounded-lg">
                <p className="text-sm text-success dark:text-success">
                  Fill in the required fields. Auto-generated fields (id, created_at, updated_at) will be skipped.
                </p>
              </div>

              {Object.entries(creatingRecord)
                .filter(([key]) => key !== 'id' && key !== 'created_at' && key !== 'updated_at')
                .map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{key}</label>
                  <Input
                    value={value?.toString() || ''}
                    onChange={(e) => setCreatingRecord(prev => prev ? { ...prev, [key]: e.target.value } : null)}
                    placeholder={`Enter ${key}...`}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
              
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button className="bg-success hover:bg-success text-primary-foreground" onClick={() => handleCreateRecord(selectedTable, creatingRecord)}>
                  Create Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseTableManager;
