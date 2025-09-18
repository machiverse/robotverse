import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ViewCountDisplayProps {
  targetType: 'robots' | 'blogs' | 'community_posts';
  targetId: string;
  className?: string;
}

const ViewCountDisplay = ({ targetType, targetId, className = "" }: ViewCountDisplayProps) => {
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViewCount = async () => {
      if (!targetId) return;
      setLoading(true);
      try {
        let count = 0;
        
        switch (targetType) {
          case 'robots':
            const { data: robotCount, error: robotError } = await supabase
              .rpc('get_robot_view_count', { p_robot_id: targetId });
            if (robotError) throw robotError;
            count = robotCount || 0;
            break;
            
          case 'blogs':
            const { data: blog, error: blogError } = await supabase
              .from('blogs')
              .select('view_count')
              .eq('id', targetId)
              .maybeSingle();
            if (blogError) throw blogError;
            count = blog?.view_count || 0;
            break;
            
          case 'community_posts':
            const { data: post, error: postError } = await supabase
              .from('community_posts')
              .select('view_count')
              .eq('id', targetId)
              .maybeSingle();
            if (postError) throw postError;
            count = post?.view_count || 0;
            break;
        }
        
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
  }, [targetId, targetType]);

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
