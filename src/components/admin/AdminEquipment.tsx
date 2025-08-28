import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Wrench, Package, Search, Eye, Edit, Trash2, Save, X } from "lucide-react";
import { EnhancedImageUpload } from "@/components/EnhancedImageUpload";

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
  const [editingItem, setEditingItem] = useState<EquipmentDetails | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const handleEditItem = useCallback((type: 'robot' | 'service' | 'part', item: any) => {
    setEditingItem({ type, item });
    setEditFormData({ ...item });
    setShowEditDialog(true);
  }, []);

  const handleDeleteItem = useCallback(async (type: 'robot' | 'service' | 'part', item: any) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    setLoading(true);
    try {
      const tableName = type === 'robot' ? 'robots' : type === 'service' ? 'services' : 'spare_parts';
      const { error } = await supabase.from(tableName).delete().eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
      });

      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: `Failed to delete ${type}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, onRefresh]);

  const handleImageUpload = useCallback((urls: string[]) => {
    setEditFormData({ ...editFormData, images: urls });
  }, [editFormData]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;

    setLoading(true);
    try {
      const { type, item } = editingItem;
      const tableName = type === 'robot' ? 'robots' : type === 'service' ? 'services' : 'spare_parts';
      
      const { error } = await supabase
        .from(tableName)
        .update(editFormData)
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`,
      });

      setShowEditDialog(false);
      setEditingItem(null);
      setEditFormData({});
      onRefresh();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: `Failed to update ${editingItem.type}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [editingItem, editFormData, toast, onRefresh]);

  const handleCancelEdit = useCallback(() => {
    setShowEditDialog(false);
    setEditingItem(null);
    setEditFormData({});
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
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditItem(type, item); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(type, item); }}
                        disabled={loading}
                      >
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
          <Button onClick={() => editingItem ? null : handleEditItem(selectedItem.type, selectedItem.item)}>
            Edit {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        </div>
      </DialogContent>
    );
  }, [selectedItem, formatPrice, formatDate, getStatusBadge, handleCloseDetails, handleEditItem, editingItem]);

  const renderEditDialog = useCallback(() => {
    if (!editingItem) return null;

    const { type, item } = editingItem;
    const title = type === 'robot' ? 'Edit Robot' : type === 'service' ? 'Edit Service' : 'Edit Spare Part';

    return (
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'robot' && <Bot className="h-5 w-5" />}
            {type === 'service' && <Wrench className="h-5 w-5" />}
            {type === 'part' && <Package className="h-5 w-5" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            Update the details for this {type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Common fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={editFormData.price || ''}
                onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                placeholder="Enter price"
              />
            </div>
          </div>

          {/* Robot specific fields */}
          {type === 'robot' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={editFormData.model || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                    placeholder="Enter model"
                  />
                </div>
                <div>
                  <Label htmlFor="availability">Availability</Label>
                  <Select
                    value={editFormData.availability || 'available'}
                    onValueChange={(value) => setEditFormData({ ...editFormData, availability: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={editFormData.brand || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                    placeholder="Enter brand"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editFormData.location || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    placeholder="Enter location"
                  />
                </div>
              </div>
            </>
          )}

          {/* Service specific fields */}
          {type === 'service' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service_type">Service Type</Label>
                  <Input
                    id="service_type"
                    value={editFormData.service_type || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, service_type: e.target.value })}
                    placeholder="Enter service type"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editFormData.location || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    placeholder="Enter location"
                  />
                </div>
              </div>
            </>
          )}

          {/* Spare part specific fields */}
          {type === 'part' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="part_number">Part Number</Label>
                  <Input
                    id="part_number"
                    value={editFormData.part_number || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, part_number: e.target.value })}
                    placeholder="Enter part number"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={editFormData.quantity || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: parseInt(e.target.value) || 0 })}
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={editFormData.brand || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                    placeholder="Enter brand"
                  />
                </div>
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <Select
                    value={editFormData.condition || 'new'}
                    onValueChange={(value) => setEditFormData({ ...editFormData, condition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editFormData.description || ''}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          {/* Image Upload Section */}
          <div>
            <Label>Images</Label>
            <EnhancedImageUpload
              bucket="robot-images"
              maxImages={10}
              onImagesUploaded={handleImageUpload}
              initialImages={editFormData.images || []}
              enhance={true}
              title="Upload Images"
              description="Upload images or provide image URLs. Images will be automatically enhanced for better quality."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancelEdit} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }, [editingItem, editFormData, handleCancelEdit, handleSaveEdit, loading]);

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

      {/* Edit Modal */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        {renderEditDialog()}
      </Dialog>
    </div>
  );
});

AdminEquipment.displayName = 'AdminEquipment';
export default AdminEquipment;
