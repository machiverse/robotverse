import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { 
  Heart, 
  Package, 
  Settings, 
  Truck, 
  CreditCard, 
  Star, 
  MapPin, 
  Clock, 
  Eye,
  MessageCircle,
  Phone,
  Trash2,
  Filter,
  SortAsc,
  SortDesc
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import EnhancedHeader from "@/components/EnhancedHeader";
import { formatCurrency } from "@/utils/currency";

interface WatchlistItem {
  id: string;
  item_type: string;
  item_id: string;
  notes: string;
  priority: string;
  created_at: string;
  // Robot data
  robot?: {
    id: string;
    name: string;
    model: string;
    brand: string;
    price: number;
    currency: string;
    location: string;
    images: string[];
    condition: string;
    availability: string;
    payload_capacity: number;
    reach: number;
    profiles: {
      full_name: string;
      company_name: string;
      phone: string;
      mobile_number: string;
      email: string;
    };
  };
  // Spare part data
  sparePart?: {
    id: string;
    name: string;
    part_number: string;
    brand: string;
    price: number;
    currency: string;
    location: string;
    images: string[];
    condition: string;
    profiles: {
      full_name: string;
      company_name: string;
      phone: string;
      mobile_number: string;
      email: string;
    };
  };
  // Service data
  service?: {
    id: string;
    name: string;
    service_type: string;
    location: string;
    price_range: string;
    profiles: {
      full_name: string;
      company_name: string;
      phone: string;
      mobile_number: string;
      email: string;
    };
  };
}

const WatchlistDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'robots' | 'spare_parts' | 'services'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'price'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Fetch watchlist items
  const fetchWatchlistItems = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // First, get all watchlist items
      const { data: watchlistData, error: watchlistError } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (watchlistError) throw watchlistError;

      if (!watchlistData || watchlistData.length === 0) {
        setWatchlistItems([]);
        return;
      }

      // Then fetch related data for each item type
      const transformedItems: WatchlistItem[] = [];

      for (const item of watchlistData) {
        let itemData: any = null;

        switch (item.item_type) {
          case 'robot':
            const { data: robotData } = await supabase
              .from('robots')
              .select(`
                id, name, model, brand, price, currency, location, images, condition, availability, payload_capacity, reach,
                profiles!seller_id(full_name, company_name, phone, mobile_number, email)
              `)
              .eq('id', item.item_id)
              .single();
            itemData = { robot: robotData };
            break;

          case 'spare_part':
            const { data: sparePartData } = await supabase
              .from('spare_parts')
              .select(`
                id, name, part_number, brand, price, currency, location, images, condition,
                profiles!seller_id(full_name, company_name, phone, mobile_number, email)
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
                profiles!provider_id(full_name, company_name, phone, mobile_number, email)
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

      setWatchlistItems(transformedItems);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to load your watchlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWatchlistItems();
    }
  }, [user]);

  // Remove item from watchlist
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

  // Update priority
  const updatePriority = async (itemId: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from('watchlists')
        .update({ priority: newPriority })
        .eq('id', itemId);

      if (error) throw error;

      setWatchlistItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, priority: newPriority } : item
      ));

      toast({
        title: "Priority Updated",
        description: `Priority has been set to ${newPriority}.`,
      });
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "Error",
        description: "Failed to update priority.",
        variant: "destructive",
      });
    }
  };

  // Filter and sort items
  const filteredAndSortedItems = watchlistItems
    .filter(item => {
      if (activeTab !== 'all' && item.item_type !== activeTab.replace('_', '_')) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority as keyof typeof priorityOrder] - 
                      priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'price':
          const aPrice = a.robot?.price || a.sparePart?.price || 0;
          const bPrice = b.robot?.price || b.sparePart?.price || 0;
          comparison = aPrice - bPrice;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Get item counts
  const itemCounts = {
    all: watchlistItems.length,
    robots: watchlistItems.filter(item => item.item_type === 'robot').length,
    spare_parts: watchlistItems.filter(item => item.item_type === 'spare_part').length,
    services: watchlistItems.filter(item => item.item_type === 'service').length,
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="text-muted-foreground mb-6">Please log in to view your watchlist.</p>
          <Button onClick={() => navigate('/auth')}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Heart className="w-8 h-8 text-red-500" />
              My Watchlist
            </h1>
            <p className="text-muted-foreground mt-2">
              Keep track of robots, spare parts, and services you're interested in
            </p>
          </div>
          
          {/* Filters and Sort */}
          <div className="flex items-center gap-4">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg text-sm bg-background text-foreground font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-lg text-sm bg-background text-foreground font-medium"
            >
              <option value="date">Sort by Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="price">Sort by Price</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              All ({itemCounts.all})
            </TabsTrigger>
            <TabsTrigger value="robots" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Robots ({itemCounts.robots})
            </TabsTrigger>
            <TabsTrigger value="spare_parts" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Parts ({itemCounts.spare_parts})
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Services ({itemCounts.services})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading your watchlist...</p>
              </div>
            ) : filteredAndSortedItems.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Your watchlist is empty</h3>
                <p className="text-muted-foreground mb-6">
                  Start adding robots, spare parts, and services to keep track of items you're interested in.
                </p>
                <Button onClick={() => navigate('/robots')}>Browse Robots</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAndSortedItems.map((item) => (
                  <WatchlistItemCard
                    key={item.id}
                    item={item}
                    onRemove={() => removeFromWatchlist(item.id)}
                    onUpdatePriority={(priority) => updatePriority(item.id, priority)}
                    onNavigate={navigate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Individual watchlist item component
const WatchlistItemCard = ({ 
  item, 
  onRemove, 
  onUpdatePriority, 
  onNavigate 
}: { 
  item: WatchlistItem;
  onRemove: () => void;
  onUpdatePriority: (priority: string) => void;
  onNavigate: (path: string) => void;
}) => {
  const data = item.robot || item.sparePart || item.service;
  const profiles = data?.profiles;

  const getItemUrl = () => {
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
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {item.item_type.replace('_', ' ').toUpperCase()}
            </Badge>
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`} />
            <span className="text-xs font-medium text-foreground capitalize">{item.priority}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={item.priority}
              onChange={(e) => onUpdatePriority(e.target.value)}
              className="text-xs px-2 py-1 border rounded bg-background text-foreground font-medium"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Image */}
        {((item.robot?.images?.[0]) || (item.sparePart?.images?.[0])) && (
          <div className="aspect-[4/3] mb-4 overflow-hidden rounded-lg">
            <ResponsiveImage
              src={item.robot?.images?.[0] || item.sparePart?.images?.[0] || ''}
              alt={data?.name || ''}
              width={400}
              height={225}
              className="object-cover w-full h-full hover:scale-105 transition-transform"
            />
          </div>
        )}

        {/* Content */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg leading-tight">{data?.name}</h3>
            {item.robot && (
              <p className="text-sm text-muted-foreground">{item.robot.model}</p>
            )}
            {item.sparePart && (
              <p className="text-sm text-muted-foreground">Part: {item.sparePart.part_number}</p>
            )}
            {item.service && (
              <p className="text-sm text-muted-foreground">{item.service.service_type}</p>
            )}
          </div>

          {/* Price */}
          {(item.robot?.price || item.sparePart?.price) && (
            <div className="text-xl font-bold text-primary">
              {formatCurrency(
                item.robot?.price || item.sparePart?.price || 0,
                item.robot?.currency || item.sparePart?.currency || 'INR'
              )}
            </div>
          )}

          {item.service?.price_range && (
            <div className="text-lg font-semibold text-primary">
              {item.service.price_range}
            </div>
          )}

          {/* Location */}
          {data?.location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {data.location}
            </div>
          )}

          {/* Seller info */}
          {profiles && (
            <div className="text-sm text-muted-foreground">
              <p>{profiles.company_name || profiles.full_name}</p>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {item.notes}
            </div>
          )}

          {/* Date added */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Added {new Date(item.created_at).toLocaleDateString()}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(getItemUrl())}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            {profiles?.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:${profiles.phone}`, '_self')}
              >
                <Phone className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WatchlistDashboard;