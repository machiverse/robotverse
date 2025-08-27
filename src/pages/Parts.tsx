import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, MapPin, Search, Grid, List, Star, Loader2 } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { useToast } from "@/components/ui/use-toast";

interface Part {
  id: string;
  name: string;
  category: string;
  price: number;
  location: string;
  image: string;
  partNumber: string;
  compatibility: string;
  rating: number;
  availability: string;
  quantity: number;
  seller?: {
    full_name?: string;
    company_name?: string;
    phone?: string;
    mobile_number?: string;
    email?: string;
  };
  sellerId?: string;
}

const Parts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const categories = [
    { value: "all", label: "All Parts" },
    { value: "motors", label: "Motors & Drives" },
    { value: "sensors", label: "Sensors" },
    { value: "controllers", label: "Controllers" },
    { value: "actuators", label: "Actuators" },
    { value: "cables", label: "Cables & Connectors" },
  ];

  const locations = [
    { value: "all", label: "All Locations" },
    { value: "mumbai", label: "Mumbai" },
    { value: "delhi", label: "Delhi" },
    { value: "bangalore", label: "Bangalore" },
    { value: "chennai", label: "Chennai" },
    { value: "pune", label: "Pune" },
  ];

  // Fetch real parts data from Supabase
  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('spare_parts')
          .select(`
            *,
            profiles!spare_parts_seller_id_fkey (
              full_name,
              company_name,
              location,
              phone,
              mobile_number,
              email
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Transform data to match interface
        const transformedData = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category_tags?.[0] || 'Other',
          price: item.price || 0,
          location: item.location || item.profiles?.location || 'Location not specified',
          image: item.images?.[0] || "/placeholder.svg",
          partNumber: item.part_number || 'N/A',
          compatibility: item.compatible_robots?.join(', ') || 'Universal',
          rating: 4.5, // Default rating
          availability: 'In Stock',
          quantity: item.quantity,
          seller: item.profiles || {},
          sellerId: item.seller_id
        }));
        
        setParts(transformedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching parts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load spare parts');
        setParts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, []);

  // Handle contact seller
  const handleContactSeller = (part: Part) => {
    const phone = part.seller?.phone || part.seller?.mobile_number;
    
    if (!phone) {
      toast({
        variant: "destructive",
        title: "Contact Unavailable",
        description: "Seller's phone number is not available.",
      });
      return;
    }
    
    window.open(`tel:${phone}`, '_self');
    toast({
      title: "Calling Seller",
      description: `Calling ${part.seller?.company_name || part.seller?.full_name}...`,
    });
  };

  // Filter parts based on search and selections
  const filteredParts = parts.filter((part) => {
    const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.compatibility.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
                           part.category.toLowerCase().includes(selectedCategory.toLowerCase());
    
    const matchesLocation = selectedLocation === "all" || 
                           part.location.toLowerCase() === selectedLocation.toLowerCase();

    return matchesSearch && matchesCategory && matchesLocation;
  });

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <p className="text-muted-foreground">Loading parts...</p>
    </div>
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Package className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Unable to load parts</h3>
      <p className="text-muted-foreground mb-4">{error}</p>
      <Button onClick={() => window.location.reload()} variant="outline">
        Try Again
      </Button>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Package className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No parts available</h3>
      <p className="text-muted-foreground">
        {searchQuery || selectedCategory !== "all" || selectedLocation !== "all"
          ? "No parts match your current filters."
          : "Parts inventory is currently empty."}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Robot Spare Parts</h1>
          <p className="text-xl text-muted-foreground">
            Find genuine spare parts and components for all major robot brands
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLocation} onValueChange={setSelectedLocation} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                disabled={loading}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                disabled={loading}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Results count */}
          {!loading && !error && (
            <div className="text-sm text-muted-foreground">
              {filteredParts.length} {filteredParts.length === 1 ? 'part' : 'parts'} found
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : filteredParts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Results */}
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredParts.map((part) => (
                <Card key={part.id} className="group border border-border hover:border-primary/50 hover:shadow-lg hover:bg-muted/30 transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
                  <CardHeader>
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted relative mb-4">
                      {part.image && part.image !== "/placeholder.svg" ? (
                        <img 
                          src={part.image} 
                          alt={part.name}
                          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <Package className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg">{part.name}</CardTitle>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="w-fit">
                        {part.category}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">{part.rating}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">
                          ₹{part.price.toLocaleString()}
                        </span>
                        <Badge variant={part.availability === "In Stock" ? "default" : "secondary"}>
                          {part.availability}
                        </Badge>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm">{part.location}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Part #:</span> {part.partNumber}</p>
                        <p><span className="font-medium">Compatible:</span> {part.compatibility}</p>
                        <p><span className="font-medium">Quantity:</span> {part.quantity} available</p>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <Button size="sm" className="flex-1">
                          Add to Cart
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleContactSeller(part)}
                          disabled={!part.seller?.phone && !part.seller?.mobile_number}
                        >
                          Contact Seller
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {filteredParts.length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" size="lg">
                  Load More Parts
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Parts;
