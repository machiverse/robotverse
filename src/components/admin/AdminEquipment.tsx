import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bot, Wrench, Package, Search, Eye, Edit, Trash2 } from "lucide-react";

interface AdminEquipmentProps {
  robots: any[];
  services: any[];
  spareParts: any[];
  onRefresh: () => void;
}

interface EquipmentDetails {
  type: 'robot' | 'service' | 'part';
  item: any;
}

const AdminEquipment = React.memo(({ robots, services, spareParts, onRefresh }: AdminEquipmentProps) => {
  const [activeTab, setActiveTab] = useState<'robots' | 'services' | 'parts'>('robots');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<EquipmentDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const filteredData = useMemo(() => {
    const filterBySearch = (items: any[], searchKey: string) => {
      return items.filter(item => 
        item[searchKey]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    };

    return {
      robots: filterBySearch(robots, 'name'),
      services: filterBySearch(services, 'title'),
      parts: filterBySearch(spareParts, 'name')
    };
  }, [robots, services, spareParts, searchTerm]);

  const handleItemClick = useCallback((type: 'robot' | 'service' | 'part', item: any) => {
    setSelectedItem({ type, item });
    setShowDetails(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setShowDetails(false);
    setSelectedItem(null);
  }, []);

  const formatPrice = useCallback((price: number | string) => {
    const numPrice = Number(price);
    return isNaN(numPrice) ? 'N/A' : `₹${numPrice.toLocaleString()}`;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const getStatusBadge = useCallback((item: any, type: string) => {
    if (type === 'robot') {
      return (
        <Badge variant={item.availability === 'available' ? 'default' : 'secondary'}>
          {item.availability || 'Unknown'}
        </Badge>
      );
    }
    if (type === 'part') {
      const quantity = item.quantity || 0;
      return (
        <Badge variant={quantity > 0 ? 'default' : 'destructive'}>
          {quantity > 0 ? `${quantity} in stock` : 'Out of stock'}
        </Badge>
      );
    }
    return <Badge variant="default">Active</Badge>;
  }, []);

  const renderEquipmentTable = useCallback((data: any[], type: 'robot' | 'service' | 'part') => {
    const getColumns = () => {
      switch (type) {
        case 'robot':
          return ['Name', 'Model', 'Price', 'Status', 'Created', 'Actions'];
        case 'service':
          return ['Title', 'Category', 'Price', 'Status', 'Created', 'Actions'];
        case 'part':
          return ['Name', 'Category', 'Price', 'Stock', 'Created', 'Actions'];
        default:
          return [];
      }
    };

    const renderRow = (item: any) => {
      switch (type) {
        case 'robot':
          return (
            <>
              <TableCell className="font-medium">{item.name || 'Unnamed Robot'}</TableCell>
              <TableCell>{item.model || 'N/A'}</TableCell>
              <TableCell>{formatPrice(item.price)}</TableCell>
              <TableCell>{getStatusBadge(item, 'robot')}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(item.created_at)}</TableCell>
            </>
          );
        case 'service':
          return (
            <>
              <TableCell className="font-medium">{item.title || 'Unnamed Service'}</TableCell>
              <TableCell>{item.category || 'N/A'}</TableCell>
              <TableCell>{formatPrice(item.price)}</TableCell>
              <TableCell>{getStatusBadge(item, 'service')}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(item.created_at)}</TableCell>
            </>
          );
        case 'part':
          return (
            <>
              <TableCell className="font-medium">{item.name || 'Unnamed Part'}</TableCell>
              <TableCell>{item.category || 'N/A'}</TableCell>
              <TableCell>{formatPrice(item.price)}</TableCell>
              <TableCell>{getStatusBadge(item, 'part')}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(item.created_at)}</TableCell>
            </>
          );
        default:
          return null;
      }
    };

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {getColumns().map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={getColumns().length} className="text-center py-8 text-muted-foreground">
                  No {type}s found
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleItemClick(type, item)}
                >
                  {renderRow(item)}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleItemClick(type, item); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  }, [handleItemClick, formatPrice, formatDate, getStatusBadge]);

  const renderDetailsModal = useCallback(() => {
    if (!selectedItem) return null;

    const { type, item } = selectedItem;
    const title = type === 'robot' ? item.name : type === 'service' ? item.title : item.name;

    return (
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'robot' && <Bot className="h-5 w-5" />}
            {type === 'service' && <Wrench className="h-5 w-5" />}
            {type === 'part' && <Package className="h-5 w-5" />}
            {title || `${type.charAt(0).toUpperCase() + type.slice(1)} Details`}
          </DialogTitle>
          <DialogDescription>
            Detailed information about this {type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID</label>
              <p className="text-sm">{item.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Price</label>
              <p className="text-sm font-semibold">{formatPrice(item.price)}</p>
            </div>
          </div>

          {type === 'robot' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Model</label>
                  <p className="text-sm">{item.model || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Availability</label>
                  <p className="text-sm">{getStatusBadge(item, 'robot')}</p>
                </div>
              </div>
              {item.specifications && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Specifications</label>
                  <p className="text-sm">{item.specifications}</p>
                </div>
              )}
            </>
          )}

          {type === 'service' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="text-sm">{item.category || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <p className="text-sm">{item.duration || 'N/A'}</p>
                </div>
              </div>
            </>
          )}

          {type === 'part' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="text-sm">{item.category || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stock</label>
                  <p className="text-sm">{item.quantity || 0} units</p>
                </div>
              </div>
            </>
          )}

          {item.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm">{item.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{formatDate(item.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm">{formatDate(item.updated_at || item.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCloseDetails}>
            Close
          </Button>
          <Button>
            Edit {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        </div>
      </DialogContent>
    );
  }, [selectedItem, formatPrice, formatDate, getStatusBadge, handleCloseDetails]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Equipment Management</h2>
          <p className="text-muted-foreground">Manage robots, spare parts, and services</p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className={`cursor-pointer transition-colors ${activeTab === 'robots' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveTab('robots')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Robots ({robots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Manage robot listings and specifications</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${activeTab === 'parts' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveTab('parts')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Spare Parts ({spareParts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Manage spare parts inventory</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${activeTab === 'services' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveTab('services')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Services ({services.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Manage service offerings</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {activeTab === 'robots' && <Bot className="h-5 w-5" />}
            {activeTab === 'services' && <Wrench className="h-5 w-5" />}
            {activeTab === 'parts' && <Package className="h-5 w-5" />}
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} 
            ({activeTab === 'robots' ? filteredData.robots.length : 
              activeTab === 'services' ? filteredData.services.length : 
              filteredData.parts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === 'robots' && renderEquipmentTable(filteredData.robots, 'robot')}
          {activeTab === 'services' && renderEquipmentTable(filteredData.services, 'service')}
          {activeTab === 'parts' && renderEquipmentTable(filteredData.parts, 'part')}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        {renderDetailsModal()}
      </Dialog>
    </div>
  );
});

AdminEquipment.displayName = 'AdminEquipment';
export default AdminEquipment;
