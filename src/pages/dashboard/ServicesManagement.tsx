import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, Edit, MoreHorizontal, CheckCircle, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ServiceListing from "@/components/ServiceListing";

const ServicesManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeServices: 0,
    totalBookings: 0,
    avgRating: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [deletingService, setDeletingService] = useState<any | null>(null);

  useEffect(() => {
    if (user) {
      fetchServices();
      fetchServiceRequests();
    }
  }, [user]);

  const fetchServices = async () => {
    if (!user) return;

    try {
      const { data: servicesData, error } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id);

      if (error) {
        console.error('Error fetching services:', error);
        return;
      }

      setServices(servicesData || []);
      const activeServices = servicesData?.length || 0;
      setStats(prev => ({ ...prev, activeServices }));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceRequests = async () => {
    if (!user) return;

    try {
      const { data: requestsData, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('provider_id', user.id);

      if (error) {
        console.error('Error fetching service requests:', error);
        return;
      }

      const totalBookings = requestsData?.length || 0;
      const completedBookings = requestsData?.filter(req => req.status === 'completed').length || 0;
      
      setStats(prev => ({ 
        ...prev, 
        totalBookings,
        avgRating: 4.8,
        revenue: completedBookings * 200
      }));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async () => {
    if (!deletingService || !user) return;
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', deletingService.id)
        .eq('provider_id', user.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Service removed successfully.' });
      setDeletingService(null);
      fetchServices();
    } catch (error: any) {
      console.error('Error deleting service:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete service.' });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services Management</h1>
          <p className="text-muted-foreground">
            Manage your service offerings and track bookings
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Service
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeServices}</div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}</div>
            <p className="text-xs text-muted-foreground">⭐⭐⭐⭐⭐</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Estimated total</p>
          </CardContent>
        </Card>
      </div>

      {/* Services List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Services</CardTitle>
          <CardDescription>Manage your service offerings and performance</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No services created yet</p>
              <p className="text-sm">Add your first service to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Wrench className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-muted-foreground">Service Type: {service.service_type}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-medium">{service.price_range || 'Price on request'}</span>
                        <span className="text-sm text-muted-foreground">
                          Location: {service.location || 'Not specified'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {service.description?.substring(0, 100)}{service.description?.length > 100 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">Active</div>
                      <Badge className="bg-green-100 text-green-700">Available</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditingService(service)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingService(service)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Service
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingService(service)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Service
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Service Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>
          <ServiceListing
            onSuccess={() => {
              setShowAddDialog(false);
              fetchServices();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          {editingService && (
            <ServiceListing
              editingService={editingService}
              onSuccess={() => {
                setEditingService(null);
                fetchServices();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingService} onOpenChange={(open) => !open && setDeletingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingService?.name}" and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServicesManagement;
