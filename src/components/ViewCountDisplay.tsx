import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useGlobalViewTracking } from '@/hooks/useGlobalViewTracking';

interface ViewCountDisplayProps {
  targetType: string;
  targetId: string;
  className?: string;
}

const ViewCountDisplay = ({ targetType, targetId, className = "" }: ViewCountDisplayProps) => {
  const { getRobotViewCount } = useGlobalViewTracking();
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViewCount = async () => {
      if (!targetId || targetType !== 'robots') return;
      setLoading(true);
      try {
        const count = await getRobotViewCount(targetId);
        setViewCount(count);
      } catch (error) {
        console.error('Error fetching view count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchViewCount();
    
    // Set up interval to refresh count every 30 seconds
    const interval = setInterval(fetchViewCount, 30000);
    
    return () => clearInterval(interval);
  }, [targetId, targetType, getRobotViewCount]);

  if (loading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Eye className="w-4 h-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground animate-pulse">...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Eye className="w-4 h-4 text-foreground" />
      <Badge variant="secondary" className="text-xs font-medium bg-background/90 backdrop-blur-sm text-foreground border border-border/50">
        {viewCount} views
      </Badge>
    </div>
  );
};

export default ViewCountDisplay;
