import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { Heart, Eye, Trash2, ArrowRight, Package, Bot, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface WatchlistItem {
  id: string;
  item_type: string;
  item_id: string;
  notes: string;
  priority: string;
  created_at: string;
  robot?: any;
  sparePart?: any;
  service?: any;
}

interface WatchlistSectionProps {
  title?: string;
  limit?: number;
  showHeader?: boolean;
  className?: string;
  compact?: boolean;
  showActions?: boolean;
}

const WatchlistSection = ({ 
  title = "My Watchlist", 
  limit = 6, 
  showHeader = true,
  className = "",
  compact = false,
  showActions = true
}: WatchlistSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWatchlistItems();
    }
  }, [user]);

  const fetchWatchlistItems = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get watchlist items
      console.log('Fetching watchlist for user:', user.id);
      const { data: watchlistData, error: watchlistError } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      console.log('Watchlist query result:', { watchlistData, watchlistError });

      if (watchlistError) throw watchlistError;

      if (!watchlistData || watchlistData.length === 0) {
        console.log('No watchlist items found for user');
        setWatchlistItems([]);
        return;
      }

      // Fetch related data for each item
      const transformedItems: WatchlistItem[] = [];

      console.log('Processing', watchlistData.length, 'watchlist items');

      for (const item of watchlistData) {
        let itemData: any = null;

        console.log('Processing item:', item);

        switch (item.item_type) {
          case 'robot':
            console.log('Fetching robot data for:', item.item_id);
            const { data: robotData, error: robotError } = await supabase
              .from('robots')
              .select(`
                id, name, model, brand, price, currency, location, images, condition, availability,
                profiles!seller_id(full_name, company_name)
              `)
              .eq('id', item.item_id)
              .single();
            console.log('Robot query result:', { robotData, robotError });
            itemData = { robot: robotData };
            break;

          case 'spare_part':
            const { data: sparePartData } = await supabase
              .from('spare_parts')
              .select(`
                id, name, part_number, brand, price, currency, images, condition,
                profiles!seller_id(full_name, company_name)
              `)
              .eq('id', item.item_id)
              .single();
            itemData = { sparePart: sparePartData };
            break;

          case 'service':
            const { data: serviceData } = await supabase
              .from('services')
              .select(`
                id, name, service_type, location, price_range,
                profiles!provider_id(full_name, company_name)
              `)
              .eq('id', item.item_id)
              .single();
            itemData = { service: serviceData };
            break;
        }

        if (itemData) {
          transformedItems.push({
            ...item,
            ...itemData
          });
        }
      }

      console.log('Final transformed items:', transformedItems);
      setWatchlistItems(transformedItems);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setWatchlistItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Removed from Watchlist",
        description: "Item has been removed from your watchlist.",
      });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from watchlist.",
        variant: "destructive",
      });
    }
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'robot':
        return <Bot className="w-4 h-4 text-primary" />;
      case 'spare_part':
        return <Package className="w-4 h-4 text-success" />;
      case 'service':
        return <Wrench className="w-4 h-4 text-primary" />;
      default:
        return <Heart className="w-4 h-4" />;
    }
  };

  const getItemUrl = (item: WatchlistItem) => {
    switch (item.item_type) {
      case 'robot':
        return `/robots/${item.item_id}`;
      case 'spare_part':
        return `/parts#${item.item_id}`;
      case 'service':
        return `/services#${item.item_id}`;
      default:
        return '#';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-success';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading watchlist...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {watchlistItems.length} items
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/watchlist')}
              className="h-8 px-2 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              View All
            </Button>
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        {watchlistItems.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/robots')}
            >
              Browse Items
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {watchlistItems.map((item) => {
              const data = item.robot || item.sparePart || item.service;
              const profiles = data?.profiles;
              
              return (
                <div 
                  key={item.id} 
                  className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer ${compact ? 'p-2' : ''}`}
                  onClick={() => navigate(getItemUrl(item))}
                >
                  {/* Item Icon & Priority */}
                  <div className="flex items-center gap-2">
                    <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} bg-primary/20 rounded-full flex items-center justify-center`}>
                      {getItemIcon(item.item_type)}
                    </div>
                    {!compact && (
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`} />
                    )}
                  </div>

                  {/* Image */}
                  {(data?.images?.[0]) && (
                    <div className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} overflow-hidden rounded-lg flex-shrink-0`}>
                      <ResponsiveImage
                        aspectRatio="custom"
                        containerClassName="w-full h-full"
                        src={data.images[0]}
                        alt={data.name || ''}
                        width={compact ? 40 : 48}
                        height={compact ? 40 : 48}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'} truncate`}>{data?.name}</p>
                    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
                      <Badge variant="outline" className={`${compact ? 'text-xs py-0 px-1' : 'text-xs py-0 px-1'}`}>
                        {item.item_type.replace('_', ' ')}
                      </Badge>
                      {data?.price && (
                        <span>₹{data.price.toLocaleString()}</span>
                      )}
                      {profiles?.company_name && !compact && (
                        <span>• {profiles.company_name}</span>
                      )}
                    </div>
                    {compact && item.notes && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{item.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {showActions && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(getItemUrl(item));
                        }}
                        className={`${compact ? 'h-6 px-1' : 'h-8 px-2'}`}
                      >
                        <ArrowRight className={`${compact ? 'w-2 h-2' : 'w-3 h-3'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(item.id);
                        }}
                        className={`${compact ? 'h-6 px-1' : 'h-8 px-2'} text-red-500 hover:text-red-700`}
                      >
                        <Trash2 className={`${compact ? 'w-2 h-2' : 'w-3 h-3'}`} />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            
            {watchlistItems.length >= limit && (
              <div className="text-center pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/watchlist')}
                  className="text-xs"
                >
                  View All {watchlistItems.length}+ Items
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WatchlistSection;