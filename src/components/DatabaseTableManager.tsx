import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2, Plus, Search, RefreshCw, Database, AlertTriangle } from "lucide-react";

interface TableData {
  [key: string]: any;
}

interface TableInfo {
  name: string;
  columns: string[];
  data: TableData[];
  count: number;
}

const DatabaseTableManager = () => {
  const { toast } = useToast();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRecord, setEditingRecord] = useState<TableData | null>(null);
  const [viewingRecord, setViewingRecord] = useState<TableData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Define all tables we want to manage
  const managedTables = [
    'profiles',
    'robots', 
    'spare_parts',
    'services',
    'logistics_services',
    'loan_products',
    'loan_schemes',
    'service_requests',
    'loan_applications',
    'button_interactions',
    'user_interactions',
    'document_uploads',
    'coverage_areas',
    'logistics_coverage',
    'logistics_fleet',
    'logistics_shipments',
    'service_appointments',
    'service_reviews',
    'robot_ai_analysis'
  ] as const;

  useEffect(() => {
    fetchAllTableData();
  }, []);

  const fetchAllTableData = async () => {
    try {
      setLoading(true);
      const tablePromises = managedTables.map(async (tableName) => {
        try {
          const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .limit(100);

          if (error) {
            console.error(`Error fetching ${tableName}:`, error);
            return null;
          }

          // Get column names from first record
          const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

          return {
            name: tableName,
            columns,
            data: data || [],
            count: count || 0
          };
        } catch (err) {
          console.error(`Error with table ${tableName}:`, err);
          return null;
        }
      });

      const results = await Promise.all(tablePromises);
      const validTables = results.filter(Boolean) as TableInfo[];
      setTables(validTables);
      
      if (validTables.length > 0) {
        setSelectedTable(validTables[0].name);
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
      toast({
        title: "Error",
        description: "Failed to load database tables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshTableData = async (tableName: string) => {
    try {
      const { data, error, count } = await supabase
        .from(tableName as any)
        .select('*', { count: 'exact' })
        .limit(100);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to refresh ${tableName}`,
          variant: "destructive",
        });
        return;
      }

      const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
      
      setTables(prev => prev.map(table => 
        table.name === tableName 
          ? { ...table, data: data || [], count: count || 0, columns }
          : table
      ));
    } catch (error) {
      console.error('Error refreshing table:', error);
    }
  };

  const handleDeleteRecord = async (tableName: string, recordId: string) => {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', recordId);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to delete record: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Record deleted successfully",
      });

      // Refresh the table data
      refreshTableData(tableName);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRecord = async (tableName: string, recordId: string, updates: TableData) => {
    try {
      // Remove id from updates to avoid conflict
      const { id, ...updateData } = updates;
      
      const { error } = await supabase
        .from(tableName as any)
        .update(updateData)
        .eq('id', recordId);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to update record: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Record updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingRecord(null);
      refreshTableData(tableName);
    } catch (error) {
      console.error('Error updating record:', error);
      toast({
        title: "Error",
        description: "Failed to update record",
        variant: "destructive",
      });
    }
  };

  const getSelectedTableData = () => {
    return tables.find(table => table.name === selectedTable);
  };

  const filteredData = () => {
    const tableData = getSelectedTableData();
    if (!tableData || !searchTerm) return tableData?.data || [];
    
    return tableData.data.filter(record =>
      Object.values(record).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">null</span>;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return 'JSON Object';
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
            <span>Loading database tables...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedTableInfo = getSelectedTableData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Table Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {tables.map((table) => (
              <Button
                key={table.name}
                variant={selectedTable === table.name ? "default" : "outline"}
                onClick={() => setSelectedTable(table.name)}
                className="text-xs"
              >
                {table.name}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {table.count}
                </Badge>
              </Button>
            ))}
          </div>

          {selectedTableInfo && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshTableData(selectedTable)}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredData().length} of {selectedTableInfo.count} records
                </div>
              </div>

              <div className="border rounded-lg overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectedTableInfo.columns.map((column) => (
                        <TableHead key={column} className="whitespace-nowrap">
                          {column}
                        </TableHead>
                      ))}
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData().map((record, index) => (
                      <TableRow key={record.id || index}>
                        {selectedTableInfo.columns.map((column) => (
                          <TableCell key={column} className="max-w-48">
                            {formatCellValue(record[column])}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewingRecord(record);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingRecord(record);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRecord(selectedTable, record.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Record Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Record - {selectedTable}</DialogTitle>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-4">
              {Object.entries(viewingRecord).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-4 p-3 border rounded">
                  <div className="font-medium text-sm">{key}</div>
                  <div className="col-span-2 text-sm break-all">
                    {value === null || value === undefined ? (
                      <span className="text-muted-foreground italic">null</span>
                    ) : typeof value === 'object' ? (
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      String(value)
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Record - {selectedTable}</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Warning</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Be careful when editing database records. Invalid data may cause application errors.
                </p>
              </div>
              
              {Object.entries(editingRecord).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium">{key}</label>
                  {typeof value === 'object' ? (
                    <Textarea
                      value={JSON.stringify(value, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEditingRecord(prev => prev ? { ...prev, [key]: parsed } : null);
                        } catch (err) {
                          // Invalid JSON, keep as string for now
                        }
                      }}
                      className="font-mono text-xs"
                      rows={5}
                    />
                  ) : (
                    <Input
                      value={value?.toString() || ''}
                      onChange={(e) => setEditingRecord(prev => 
                        prev ? { ...prev, [key]: e.target.value } : null
                      )}
                      disabled={key === 'id' || key === 'created_at' || key === 'updated_at'}
                    />
                  )}
                </div>
              ))}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateRecord(selectedTable, editingRecord.id, editingRecord)}
                >
                  Save Changes
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
