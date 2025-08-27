import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, TrendingUp, Users, Clock } from 'lucide-react';
import { useViewTracking } from '@/hooks/useViewTracking';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

interface ViewTrackingCardProps {
  category: 'robots' | 'spare_parts' | 'services' | 'logistics_services' | 'loan_products';
  title: string;
  description?: string;
}

export const ViewTrackingCard = ({ category, title, description }: ViewTrackingCardProps) => {
  const { user } = useAuth();
  const { viewStats, fetchUserItemViews, loading } = useViewTracking();
  const [recentViews, setRecentViews] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserItemViews(user.id);
    }
  }, [user, fetchUserItemViews]);

  useEffect(() => {
    // Filter recent views for this category
    const categoryViews = viewStats.recentViews.filter(view => view.target_type === category);
    setRecentViews(categoryViews.slice(0, 5));
  }, [viewStats.recentViews, category]);

  const categoryViews = viewStats.viewsByCategory[category] || 0;
  const totalViews = viewStats.totalViews;

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-600" />
            {title}
          </div>
          <Badge variant="secondary">{categoryViews}</Badge>
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* View Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{categoryViews}</div>
              <div className="text-xs text-purple-600">Category Views</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalViews}</div>
              <div className="text-xs text-blue-600">Total Views</div>
            </div>
          </div>

          {/* Recent View Activity */}
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-xs text-muted-foreground mt-2">Loading views...</p>
            </div>
          ) : recentViews.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Recent Activity
              </div>
              {recentViews.map((view, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span>Item viewed</span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(view.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No views yet</p>
            </div>
          )}

          {/* Growth Indicator */}
          {categoryViews > 0 && (
            <div className="flex items-center justify-center gap-2 p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                {Math.round((categoryViews / Math.max(totalViews, 1)) * 100)}% of total views
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};