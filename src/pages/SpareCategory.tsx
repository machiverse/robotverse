import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { Loader2, Grid, List, Search, MapPin, Phone, ChevronRight, Home, Package } from "lucide-react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import EnhancedHeader from "@/components/EnhancedHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { SPARE_PARTS_MENU, getMenuInfo, findMenuForCategory } from "@/constants/sparePartsCategories";

const SpareCategory = () => {
  const { menu, category } = useParams<{ menu?: string; category?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackButtonClick } = useButtonTracking();

  // Decode params
  const menuName = menu ? decodeURIComponent(menu).replace(/-/g, ' ') : '';
  const categoryName = category ? decodeURIComponent(category).replace(/-/g, ' ') : '';

  // Find menu info
  const menuInfo = menuName ? getMenuInfo(menuName as any) : null;
  const actualMenu = categoryName && !menuName ? findMenuForCategory(categoryName) : menuName;

  // Determine display title
  const displayTitle = categoryName || menuName || 'Spare Parts';
  const formattedTitle = displayTitle.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter options
  const [locations, setLocations] = useState([{ value: "all", label: "All Locations" }]);
  const [subCategories, setSubCategories] = useState([{ value: "all", label: "All Sub-Categories" }]);

  // Fetch spare parts
  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("spare_parts")
          .select(`
            *,
            profiles!spare_parts_seller_id_fkey (
              user_id, full_name, company_name, phone, mobile_number, email, location
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Filter by category/menu
        let filteredData = data || [];
        
        if (categoryName) {
          // Filter by specific category
          filteredData = filteredData.filter(part => {
            const partMainCat = part.main_category?.toLowerCase() || '';
            const partSubCategory = part.sub_category?.toLowerCase() || '';
            const searchCat = categoryName.toLowerCase();
            return partMainCat.includes(searchCat) || partSubCategory.includes(searchCat) || 
                   searchCat.includes(partMainCat) || searchCat.includes(partSubCategory);
          });
        } else if (menuName) {
          // Filter by menu (get all categories under this menu)
          const menuData = SPARE_PARTS_MENU[menuName as keyof typeof SPARE_PARTS_MENU];
          if (menuData) {
            const menuCategories = Object.keys(menuData.categories).map(c => c.toLowerCase());
            filteredData = filteredData.filter(part => {
              const partMainCat = part.main_category?.toLowerCase() || '';
              return menuCategories.some(mc => partMainCat.includes(mc) || mc.includes(partMainCat));
            });
          }
        }

        setParts(filteredData);

        // Extract unique locations and sub-categories
        const uniqueLocations = new Set<string>();
        const uniqueSubCats = new Set<string>();
        
        filteredData.forEach(part => {
          if (part.location) uniqueLocations.add(part.location.trim());
          if (part.profiles?.location) uniqueLocations.add(part.profiles.location.trim());
          if (part.sub_category) uniqueSubCats.add(part.sub_category.trim());
        });

        setLocations([
          { value: "all", label: "All Locations" },
          ...Array.from(uniqueLocations).filter(Boolean).sort().map(loc => ({ 
            value: loc.toLowerCase().replace(/\s+/g, "-"), 
            label: loc 
          }))
        ]);

        setSubCategories([
          { value: "all", label: "All Sub-Categories" },
          ...Array.from(uniqueSubCats).filter(Boolean).sort().map(cat => ({ 
            value: cat.toLowerCase().replace(/\s+/g, "-"), 
            label: cat 
          }))
        ]);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load spare parts");
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, [menuName, categoryName]);

  // Filter parts
  const filteredParts = parts.filter(part => {
    const matchesSearch = !searchQuery || 
      part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = selectedLocation === "all" || 
      part.location?.toLowerCase().replace(/\s+/g, "-") === selectedLocation ||
      part.profiles?.location?.toLowerCase().replace(/\s+/g, "-") === selectedLocation;

    const matchesSubCategory = selectedSubCategory === "all" || 
      part.sub_category?.toLowerCase().replace(/\s+/g, "-") === selectedSubCategory;

    return matchesSearch && matchesLocation && matchesSubCategory;
  });

  const formatPrice = (price: number, currency: string = 'INR') => {
    if (!price) return "Price on request";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  const handleContactSeller = async (part: any) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to contact sellers.", variant: "destructive" });
      return;
    }

    const phone = part.profiles?.phone || part.profiles?.mobile_number;
    if (!phone) {
      toast({ title: "Contact Unavailable", description: "Seller's phone number is not available.", variant: "destructive" });
      return;
    }

    await trackButtonClick({
      buttonName: "Contact Seller",
      buttonType: "spare_part_contact",
      sellerId: part.seller_id,
      sellerName: part.profiles?.full_name,
      sellerCompany: part.profiles?.company_name,
      sellerMobile: phone,
      itemId: part.id,
      itemType: "spare_part",
      additionalData: { partName: part.name, category: part.category }
    });

    window.open(`tel:${phone}`, "_self");
  };

  // Get category description
  const getCategoryDescription = () => {
    if (menuInfo) {
      return menuInfo.description;
    }
    return `Browse ${formattedTitle} from verified sellers. Quality spare parts with warranty and fast delivery.`;
  };

  // Build breadcrumb
  const breadcrumbs = [
    { label: "Home", path: "/" },
    { label: "Spare Parts", path: "/spares" },
  ];
  if (menuName && !categoryName) {
    breadcrumbs.push({ label: formattedTitle, path: `/spares/${menu}` });
  } else if (categoryName) {
    if (actualMenu) {
      breadcrumbs.push({ label: actualMenu, path: `/spares/${encodeURIComponent(actualMenu.toLowerCase().replace(/\s+/g, '-'))}` });
    }
    breadcrumbs.push({ label: formattedTitle, path: `/spares/${menu || ''}/${category}` });
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${formattedTitle} | Robot Spare Parts | RobotVerse`}
        description={`Buy ${formattedTitle.toLowerCase()} for industrial robots. ${getCategoryDescription()} Compare prices and specifications.`}
        keywords={`${formattedTitle}, robot spare parts, ${formattedTitle} for sale, industrial robot parts`}
        canonical={category ? `/spares/${menu}/${category}` : `/spares/${menu}`}
      />

      <EnhancedHeader />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground flex-wrap">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.path} className="flex items-center">
              {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="hover:text-primary flex items-center">
                  {index === 0 && <Home className="w-4 h-4 mr-1" />}
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-hero border-b border-border">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-primary mr-3" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                {formattedTitle}
              </h1>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {getCategoryDescription()}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {filteredParts.length} {filteredParts.length === 1 ? 'part' : 'parts'} available
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-8 bg-card border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, part number, brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {subCategories.length > 1 && (
                <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                  <SelectTrigger><SelectValue placeholder="Sub-Category" /></SelectTrigger>
                  <SelectContent>
                    {subCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredParts.length} of {parts.length} parts
              </p>
              <div className="flex space-x-2">
                <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
                  <Grid className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading {formattedTitle}...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No {formattedTitle} Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedLocation !== "all" || selectedSubCategory !== "all"
                ? "Try adjusting your filters."
                : `No ${formattedTitle.toLowerCase()} are currently available.`}
            </p>
            <Button variant="outline" onClick={() => navigate('/spares')}>Browse All Spare Parts</Button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
            {filteredParts.map((part) => (
              <Card 
                key={part.id} 
                className="group bg-card border-border hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => navigate(`/parts/${part.id}`)}
              >
                <div className="relative aspect-square overflow-hidden">
                  <ResponsiveImage
                    src={part.images?.[0] || "/placeholder.svg"}
                    alt={part.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {part.condition && (
                    <Badge className="absolute top-2 left-2 bg-primary/90">{part.condition}</Badge>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{part.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{part.brand} - {part.part_number}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(part.price, part.currency)}
                    </span>
                    {part.quantity && (
                      <Badge variant="outline">{part.quantity} in stock</Badge>
                    )}
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="truncate">{part.location || part.profiles?.location || 'Location not specified'}</span>
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleContactSeller(part)}
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/parts/${part.id}`)}>
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpareCategory;
