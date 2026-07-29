import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, RefreshCw, ExternalLink } from 'lucide-react';
import { useGlobalViewTracking } from '@/hooks/useGlobalViewTracking';
import { useNavigate } from 'react-router-dom';

interface TopRobotView {
  robot_id: string;
  total_views: number;
  robots: {
    id: string;
    name: string;
    model: string;
    robot_type: string;
    price: number;
    currency: string;
    location: string;
    profiles: {
      full_name: string;
      company_name: string;
    } | null;
  } | null;
}

const AdminRobotAnalytics = () => {
  const [topRobots, setTopRobots] = useState<TopRobotView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { getTopViewedRobots } = useGlobalViewTracking();
  const navigate = useNavigate();

  const fetchTopRobots = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const data = await getTopViewedRobots(20);
      setTopRobots(data);
    } catch (error) {
      console.error('Error fetching top robots:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTopRobots();
  }, []);

  const handleRefresh = () => {
    fetchTopRobots(true);
  };

  const handleViewRobot = (robotId: string) => {
    navigate(`/robot/${robotId}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalViews = topRobots.reduce((sum, robot) => sum + robot.total_views, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Robot View Analytics</h2>
          <p className="text-muted-foreground">
            Global view statistics for all robot listings
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {totalViews.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Across all robot listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {topRobots[0]?.total_views.toLocaleString() || '0'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {topRobots[0]?.robots?.name || 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {topRobots.length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              With recorded views
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Viewed Robots</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ranked by total page views from all users
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topRobots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No robot views recorded yet
              </div>
            ) : (
              topRobots.map((robot, index) => (
                <div 
                  key={robot.robot_id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">
                        {robot.robots?.name || 'Unknown Robot'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {robot.robots?.model && `Model: ${robot.robots.model}`}
                        {robot.robots?.robot_type && ` • Type: ${robot.robots.robot_type}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Seller: {robot.robots?.profiles?.company_name || robot.robots?.profiles?.full_name || 'Unknown'}
                        {robot.robots?.location && ` • Location: ${robot.robots.location}`}
                      </div>
                      {robot.robots?.price && (
                        <div className="text-sm font-medium text-foreground">
                          {robot.robots.currency} {robot.robots.price.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {robot.total_views.toLocaleString()} views
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleViewRobot(robot.robot_id)}
                      variant="ghost"
                      size="sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRobotAnalytics;