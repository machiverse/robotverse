import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Edit, Eye, MoreHorizontal, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useNavigate } from "react-router-dom";

const MyRobots = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getItemViewCount } = useUniversalViewTracking();
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase
        .from('robots')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const robotsWithViews = await Promise.all(
        (data || []).map(async (robot) => {
          const viewCount = await getItemViewCount('robots', robot.id);
          return { ...robot, views: viewCount };
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
      inquiries: Math.floor(totalViews * 0.05) // Estimate 5% inquiry rate
    });
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Robot
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Listings
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Robot listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Listings
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Views
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              All time views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inquiries
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inquiries}</div>
            <p className="text-xs text-muted-foreground">
              Estimated inquiries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Robot Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Robot Listings</CardTitle>
          <CardDescription>
            Your current robot inventory and their performance
          </CardDescription>
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
              <Button onClick={() => navigate('/dashboard?tab=seller')}>
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
                            <DropdownMenuItem onClick={() => navigate('/dashboard?tab=seller')}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Listing
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
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
    </div>
  );
};

export default MyRobots;