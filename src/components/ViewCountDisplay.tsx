import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useViewTracking } from '@/hooks/useViewTracking';

interface ViewCountDisplayProps {
  targetType: string;
  targetId: string;
  className?: string;
}

export const ViewCountDisplay = ({ targetType, targetId, className = "" }: ViewCountDisplayProps) => {
  const { getItemViewCount } = useViewTracking();
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViewCount = async () => {
      try {
        setLoading(true);
        const count = await getItemViewCount(targetType, targetId);
        setViewCount(count);
      } catch (error) {
        console.error('Error fetching view count:', error);
      } finally {
        setLoading(false);
      }
    };

    if (targetId && targetType) {
      fetchViewCount();
    }
  }, [targetId, targetType, getItemViewCount]);

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
      <Eye className="w-4 h-4 text-muted-foreground" />
      <Badge variant="outline" className="text-xs">
        {viewCount} views
      </Badge>
    </div>
  );
};