import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Edit, Eye, MoreHorizontal, Loader2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import RobotUpload from "@/components/RobotUpload";

const MyRobots = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getItemViewCount } = useUniversalViewTracking();
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRobot, setEditingRobot] = useState<any | null>(null);
  const [deletingRobot, setDeletingRobot] = useState<any | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalViews: 0,
    inquiries: 0
  });

  useEffect(() => {
    if (user) {
      fetchRobots();
    }
  }, [user]);

  const fetchRobots = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('robots')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const robotsWithViews = await Promise.all(
        (data || []).map(async (robot) => {
          try {
            const viewCount = await getItemViewCount('robots', robot.id);
            return { ...robot, views: viewCount || 0 };
          } catch (error) {
            console.error(`Error fetching view count for robot ${robot.id}:`, error);
            return { ...robot, views: 0 };
          }
        })
      );

      setRobots(robotsWithViews);
      calculateStats(robotsWithViews);
    } catch (error) {
      console.error('Error fetching robots:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (robotData: any[]) => {
    const total = robotData.length;
    const active = robotData.filter(r => r.availability === 'available').length;
    const totalViews = robotData.reduce((sum, r) => sum + (r.views || 0), 0);
    
    setStats({
      total,
      active,
      totalViews,
      inquiries: Math.floor(totalViews * 0.05)
    });
  };

  const handleDelete = async () => {
    if (!deletingRobot || !user) return;
    try {
      const { error } = await supabase
        .from('robots')
        .delete()
        .eq('id', deletingRobot.id)
        .eq('seller_id', user.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Robot listing removed successfully.' });
      setDeletingRobot(null);
      fetchRobots();
    } catch (error: any) {
      console.error('Error deleting robot:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete robot.' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'sold': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Robots</h1>
          <p className="text-muted-foreground">
            Manage your robot listings and track performance
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Robot
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Robot listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">All time views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inquiries}</div>
            <p className="text-xs text-muted-foreground">Estimated inquiries</p>
          </CardContent>
        </Card>
      </div>

      {/* Robot Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Robot Listings</CardTitle>
          <CardDescription>Your current robot inventory and their performance</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading robots...</span>
            </div>
          ) : robots.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No robots found</h3>
              <p className="text-muted-foreground mb-4">You haven't added any robot listings yet.</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Robot
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {robots.map((robot) => (
                <div key={robot.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-16 bg-muted rounded-lg flex items-center justify-center">
                    {robot.images && robot.images[0] ? (
                      <img 
                        src={robot.images[0]} 
                        alt={robot.name}
                        className="w-full h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <Bot className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{robot.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {robot.model && `Model: ${robot.model}`}
                          {robot.robot_type && ` | Type: ${robot.robot_type}`}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm font-medium">
                            ₹{robot.price ? robot.price.toLocaleString() : 'Price not set'}
                          </span>
                          <Badge className={getStatusColor(robot.availability || 'available')}>
                            {(robot.availability || 'available').charAt(0).toUpperCase() + 
                             (robot.availability || 'available').slice(1)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm">
                          <div className="font-medium">{robot.views || 0} views</div>
                          <div className="text-muted-foreground">
                            {Math.floor((robot.views || 0) * 0.05)} inquiries
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingRobot(robot)}>
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
                            <DropdownMenuItem onClick={() => navigate(`/robot/${robot.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingRobot(robot)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Listing
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletingRobot(robot)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Listing
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Robot Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Robot Listing</DialogTitle>
          </DialogHeader>
          <RobotUpload
            onSuccess={() => {
              setShowAddDialog(false);
              fetchRobots();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Robot Dialog */}
      <Dialog open={!!editingRobot} onOpenChange={(open) => !open && setEditingRobot(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Robot Listing</DialogTitle>
          </DialogHeader>
          {editingRobot && (
            <RobotUpload
              editMode
              robotData={editingRobot}
              onSuccess={() => {
                setEditingRobot(null);
                fetchRobots();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRobot} onOpenChange={(open) => !open && setDeletingRobot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this robot listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingRobot?.name}" and cannot be undone.
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

export default MyRobots;
