import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, TrendingUp } from 'lucide-react';
import { useUniversalViewTracking } from '@/hooks/useUniversalViewTracking';
import { useAuth } from '@/hooks/useAuth';

interface TotalViewsDisplayProps {
  className?: string;
}

const TotalViewsDisplay = ({ className = "" }: TotalViewsDisplayProps) => {
  const { user } = useAuth();
  const { getSellerAnalytics } = useUniversalViewTracking();
  const [totalViews, setTotalViews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTotalViews = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const analytics = await getSellerAnalytics(user.id);
        const total = analytics.reduce((sum, item) => sum + (item.totalViews || 0), 0);
        setTotalViews(total);
      } catch (error) {
        console.error('Error fetching total views:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTotalViews();
  }, [user, getSellerAnalytics]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
        <Eye className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            All Products
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalViewsDisplay;