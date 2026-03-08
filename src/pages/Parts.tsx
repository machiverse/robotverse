import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  MapPin, 
  Search, 
  Grid, 
  List, 
  Star, 
  Loader2, 
  Building,
  TrendingUp,
  Filter,
  ChevronRight,
  X
} from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { ChatButton } from "@/components/chat/ChatButton";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import SparePartQuoteModal from "@/components/forms/SparePartQuoteModal";
import { 
  SPARE_PARTS_TAXONOMY,
  getCategories,
  getSubcategoriesForCategory,
  getComponentTypesForSubcategory,
  getCategoryNameFromSlug,
  getSubcategoryNameFromSlug,
  getComponentTypeNameFromSlug,
} from "@/constants/sparePartsCategories";
import { UniversalSEOHead } from "@/components/SEO/UniversalSEOHead";
import { generateItemListSchema } from "@/utils/seo/modernSchemas";
import UserProductRequestModal from "@/components/UserProductRequestModal";

interface Part {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  componentType?: string;
  customCategory?: string;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { category: urlCategory, subcategory: urlSubcategory, componentType: urlComponentType } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isReady } = useAuthReady();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView, getItemViewCount } = useUniversalViewTracking();

  // Filter states - Three-level taxonomy
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [selectedComponentType, setSelectedComponentType] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState<"views" | "price-low" | "price-high" | "newest" | "name">("views");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Data states
  const [parts, setParts] = useState<Part[]>([]);
  const [partsWithViews, setPartsWithViews] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  // Dynamic filter options
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([
    { value: "all", label: "All Locations" },
  ]);

  // Fixed price ranges
  const priceRanges = [
    { value: "all", label: "All Prices" },
    { value: "under-5k", label: "Under ₹5,000" },
    { value: "5k-25k", label: "₹5,000 - ₹25,000" },
    { value: "25k-100k", label: "₹25,000 - ₹1,00,000" },
    { value: "100k-500k", label: "₹1,00,000 - ₹5,00,000" },
    { value: "over-500k", label: "Over ₹5,00,000" },
  ];

  // Get available subcategories based on selected category
  const availableSubcategories = useMemo(() => {
    if (selectedCategory === "all") return [];
    return getSubcategoriesForCategory(selectedCategory);
  }, [selectedCategory]);

  // Get available component types based on selected subcategory
  const availableComponentTypes = useMemo(() => {
    if (selectedCategory === "all" || selectedSubcategory === "all") return [];
    return getComponentTypesForSubcategory(selectedCategory, selectedSubcategory);
  }, [selectedCategory, selectedSubcategory]);

  // Read filters from URL path params (priority) or query params
  // Convert slugs to actual names for filtering
  useEffect(() => {
    // Path params take priority (from /spares/:category/:subcategory/:componentType routes)
    if (urlCategory) {
      // Convert slug to actual category name for dropdown display
      const categoryName = getCategoryNameFromSlug(urlCategory);
      setSelectedCategory(categoryName || urlCategory);
    } else {
      const categoryParam = searchParams.get("category");
      if (categoryParam) {
        setSelectedCategory(categoryParam);
      }
    }

    if (urlSubcategory && urlCategory) {
      // Convert slug to actual subcategory name
      const subcategoryName = getSubcategoryNameFromSlug(urlCategory, urlSubcategory);
      setSelectedSubcategory(subcategoryName || urlSubcategory);
    } else {
      const subcategoryParam = searchParams.get("subcategory");
      if (subcategoryParam) {
        setSelectedSubcategory(subcategoryParam);
      }
    }

    if (urlComponentType && urlCategory && urlSubcategory) {
      // Convert slug to actual component type name
      const componentTypeName = getComponentTypeNameFromSlug(urlCategory, urlSubcategory, urlComponentType);
      setSelectedComponentType(componentTypeName || urlComponentType);
    } else {
      const componentTypeParam = searchParams.get("componentType");
      if (componentTypeParam) {
        setSelectedComponentType(componentTypeParam);
      }
    }
  }, [urlCategory, urlSubcategory, urlComponentType, searchParams]);

  // Fetch parts data
  useEffect(() => {
    if (!isReady) return;

    const fetchParts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("spare_parts")
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
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Transform data to match interface
        const transformedData = (data || []).map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category || "Robot Parts",
          subcategory: item.main_category || "",
          componentType: item.component_type || item.sub_category || "",
          customCategory: item.custom_category || "",
          price: item.price || 0,
          location: item.location || item.profiles?.location || "Location not specified",
          image: item.images?.[0] || "/placeholder.svg",
          partNumber: item.part_number || "N/A",
          compatibility: item.compatible_robots?.join(", ") || "Universal",
          rating: 4.5,
          availability: "In Stock",
          quantity: item.quantity,
          seller: item.profiles || {},
          sellerId: item.seller_id,
        }));

        setParts(transformedData);
        setError(null);

        // Fetch view counts
        const partsWithViewCounts = await Promise.all(
          transformedData.map(async (part) => {
            const viewCount = await getItemViewCount("spare_parts", part.id);
            return { ...part, viewCount };
          })
        );
        setPartsWithViews(partsWithViewCounts);

        // Extract unique locations
        const uniqueLocations = new Set<string>();
        transformedData.forEach((part) => {
          if (part.location && part.location !== "Location not specified") {
            uniqueLocations.add(part.location.trim());
          }
        });

        setLocations([
          { value: "all", label: "All Locations" },
          ...Array.from(uniqueLocations)
            .sort()
            .map((loc) => ({
              value: loc.toLowerCase().replace(/\s+/g, "-"),
              label: loc,
            })),
        ]);
      } catch (err) {
        console.error("Error fetching parts:", err);
        setError(err instanceof Error ? err.message : "Failed to load spare parts");
        setParts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, [getItemViewCount, isReady]);

  // Handle category change - reset subcategory and component type
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedSubcategory("all");
    setSelectedComponentType("all");
  };

  // Handle subcategory change - reset component type
  const handleSubcategoryChange = (value: string) => {
    setSelectedSubcategory(value);
    setSelectedComponentType("all");
  };

  // Filter and sort parts
  const filteredParts = useMemo(() => {
    let filtered = [...partsWithViews];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((part) => 
        part.name.toLowerCase().includes(q) ||
        part.partNumber.toLowerCase().includes(q) ||
        part.compatibility.toLowerCase().includes(q)
      );
    }

    // Category filter - match against category or check if subcategory belongs to this category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((part) => {
        // Direct match on category field
        if (part.category?.toLowerCase() === selectedCategory.toLowerCase()) return true;
        // Check if the subcategory (main_category in DB) belongs to this category
        const subcats = getSubcategoriesForCategory(selectedCategory);
        return subcats.some(sub => sub.name.toLowerCase() === part.subcategory?.toLowerCase());
      });
    }

    // Subcategory filter - match against subcategory (main_category in DB)
    if (selectedSubcategory !== "all") {
      filtered = filtered.filter((part) => 
        part.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase()
      );
    }

    // Component type filter - match against componentType (sub_category or component_type in DB)
    if (selectedComponentType !== "all") {
      filtered = filtered.filter((part) => 
        part.componentType?.toLowerCase() === selectedComponentType.toLowerCase() ||
        part.componentType?.toLowerCase().includes(selectedComponentType.toLowerCase())
      );
    }

    // Location filter
    if (selectedLocation !== "all") {
      const locLabel = locations.find((l) => l.value === selectedLocation)?.label?.toLowerCase();
      filtered = filtered.filter((part) => part.location.toLowerCase() === locLabel);
    }

    // Price range filter
    if (selectedPriceRange !== "all") {
      const ranges: Record<string, [number, number]> = {
        "under-5k": [0, 5000],
        "5k-25k": [5000, 25000],
        "25k-100k": [25000, 100000],
        "100k-500k": [100000, 500000],
        "over-500k": [500000, Infinity],
      };
      const [min, max] = ranges[selectedPriceRange] || [0, Infinity];
      filtered = filtered.filter((part) => part.price >= min && part.price <= max);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "views":
          return ((b as any).viewCount || 0) - ((a as any).viewCount || 0);
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "newest":
          return 0; // Already sorted by created_at desc
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [partsWithViews, searchQuery, selectedCategory, selectedSubcategory, selectedComponentType, selectedLocation, selectedPriceRange, sortBy, locations]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSubcategory("all");
    setSelectedComponentType("all");
    setSelectedLocation("all");
    setSelectedPriceRange("all");
  };

  // Check if any filter is active
  const hasActiveFilters = 
    searchQuery || 
    selectedCategory !== "all" || 
    selectedSubcategory !== "all" || 
    selectedComponentType !== "all" || 
    selectedLocation !== "all" || 
    selectedPriceRange !== "all";

  // Handle contact seller
  const handleContactSeller = async (part: Part) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please login to contact the seller.",
      });
      return;
    }

    const phone = part.seller?.phone || part.seller?.mobile_number;

    if (!phone) {
      toast({
        variant: "destructive",
        title: "Contact Unavailable",
        description: "Seller's phone number is not available.",
      });
      return;
    }

    trackButtonClick({
      buttonName: "Contact Seller",
      buttonType: "spare_parts_contact",
      sellerId: part.sellerId,
      sellerName: part.seller?.full_name,
      sellerCompany: part.seller?.company_name,
      sellerEmail: part.seller?.email,
      sellerMobile: phone,
      sellerLocation: part.location,
      itemId: part.id,
      itemType: "spare_part",
      additionalData: {
        partName: part.name,
        partNumber: part.partNumber,
        category: part.category,
        price: part.price,
        contactMethod: "phone",
      },
    });

    window.open(`tel:${phone}`, "_self");
    toast({
      title: "Calling Seller",
      description: `Calling ${part.seller?.company_name || part.seller?.full_name}...`,
    });
  };

  // Handle request quote
  const handleRequestQuote = (part: Part) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please login to request a quote.",
      });
      return;
    }

    trackButtonClick({
      buttonName: "Request Quote",
      buttonType: "spare_parts_action",
      sellerId: part.sellerId,
      sellerName: part.seller?.full_name,
      sellerCompany: part.seller?.company_name,
      sellerEmail: part.seller?.email,
      sellerMobile: part.seller?.phone || part.seller?.mobile_number,
      sellerLocation: part.location,
      itemId: part.id,
      itemType: "spare_part",
      additionalData: {
        partName: part.name,
        partNumber: part.partNumber,
        category: part.category,
        price: part.price,
      },
    });

    setSelectedPart(part);
    setIsQuoteModalOpen(true);
  };

  const formatPrice = (price?: number) => {
    if (!price) return "Price on request";
    return `₹${price.toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
          <p className="ml-4 text-muted-foreground text-lg">Loading parts...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex flex-col justify-center items-center text-center px-4">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load parts</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UniversalSEOHead
        pageType="parts"
        title="Robot Spare Parts & Components India | Genuine Parts | RobotVerse"
        description="Shop genuine robot spare parts from verified suppliers. Servo motors, cables, controllers, teach pendants for FANUC, ABB, KUKA, Yaskawa. Fast delivery across India."
        keywords={[
          'industrial robot spare parts India',
          'robot components suppliers',
          'genuine robot parts',
          'robot replacement parts',
          'FANUC spare parts India',
          'ABB robot parts',
          'KUKA spare parts',
          'Yaskawa robot components',
          'robot servo motor',
          'robot cable harness',
          'teach pendant spare',
          'robot controller parts'
        ]}
        schemas={[generateItemListSchema(parts.slice(0, 20), "Robot Spare Parts & Accessories", "parts")]}
      />
      <EnhancedHeader />

      {/* Top title */}
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Genuine Robot Spare Parts & Accessories
        </h1>
        <p className="text-muted-foreground">
          Source authentic spare parts from verified suppliers - delivered to your facility
        </p>

        {/* Breadcrumb */}
        {(selectedCategory !== "all" || selectedSubcategory !== "all" || selectedComponentType !== "all") && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-4 flex-wrap">
            <span className="hover:text-primary cursor-pointer" onClick={() => clearFilters()}>
              Spare Parts
            </span>
            {selectedCategory !== "all" && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span 
                  className="hover:text-primary cursor-pointer" 
                  onClick={() => {
                    setSelectedSubcategory("all");
                    setSelectedComponentType("all");
                  }}
                >
                  {selectedCategory}
                </span>
              </>
            )}
            {selectedSubcategory !== "all" && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span 
                  className="hover:text-primary cursor-pointer"
                  onClick={() => setSelectedComponentType("all")}
                >
                  {selectedSubcategory}
                </span>
              </>
            )}
            {selectedComponentType !== "all" && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-primary font-medium">{selectedComponentType}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Layout: left filter, right listing */}
      <div className="container mx-auto px-4 pb-10 flex gap-6">
        {/* LEFT FILTER COLUMN (sticky) */}
        <aside className="w-72 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="w-4 h-4" />
                    Filter Parts
                  </CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search parts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* 1. Category - First filter */}
                <div>
                  <p className="text-xs font-semibold mb-1">Category</p>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {getCategories().map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Subcategory - Second filter */}
                {selectedCategory !== "all" && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Subcategory</p>
                    <Select value={selectedSubcategory} onValueChange={handleSubcategoryChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Subcategories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subcategories</SelectItem>
                        {availableSubcategories.map((sub) => (
                          <SelectItem key={sub.name} value={sub.name}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 3. Component Type - Third filter */}
                {selectedSubcategory !== "all" && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Component Type</p>
                    <Select value={selectedComponentType} onValueChange={setSelectedComponentType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Component Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Component Types</SelectItem>
                        {availableComponentTypes.map((ct) => (
                          <SelectItem key={ct.name} value={ct.name}>
                            {ct.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 4. Price Range */}
                <div>
                  <p className="text-xs font-semibold mb-1">Price Range</p>
                  <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Prices" />
                    </SelectTrigger>
                    <SelectContent>
                      {priceRanges.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Location */}
                <div>
                  <p className="text-xs font-semibold mb-1">Location</p>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* RIGHT CONTENT COLUMN */}
        <main className="flex-1 space-y-6">
          {/* Top bar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Spare Parts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* For mobile: filter + search */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search parts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {getCategories().map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCategory !== "all" && (
                    <Select value={selectedSubcategory} onValueChange={handleSubcategoryChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subcategories</SelectItem>
                        {availableSubcategories.map((sub) => (
                          <SelectItem key={sub.name} value={sub.name}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold">{filteredParts.length}</span> parts
                </div>

                <div className="flex items-center gap-4">
                  {/* Sort */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium hidden sm:inline">Sort by</span>
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="views">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Most Popular
                          </div>
                        </SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="price-low">Price Low to High</SelectItem>
                        <SelectItem value="price-high">Price High to Low</SelectItem>
                        <SelectItem value="name">Name A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View mode */}
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant={viewMode === "grid" ? "default" : "outline"}
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant={viewMode === "list" ? "default" : "outline"}
                      onClick={() => setViewMode("list")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parts listing */}
          {filteredParts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No parts match the current filters.</p>
              <p className="text-muted-foreground mb-4">Try clearing some filters or changing the search text.</p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredParts.map((part) => (
                <Card
                  key={part.id}
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(`/parts/${part.id}`)}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={part.image}
                      alt={part.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <Badge className="absolute top-2 right-2 bg-green-500/90">
                      {part.availability}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {part.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Part #: {part.partNumber}
                    </p>
                    
                    {/* Category badges */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {part.category && (
                        <Badge variant="outline" className="text-xs">
                          {part.category}
                        </Badge>
                      )}
                      {part.componentType && (
                        <Badge variant="secondary" className="text-xs">
                          {part.componentType}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{part.location}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">
                        {formatPrice(part.price)}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{part.rating}</span>
                      </div>
                    </div>

                    {part.seller?.company_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Building className="w-3 h-3" />
                        <span className="truncate">{part.seller.company_name}</span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <ChatButton
                        otherUserId={part.sellerId || ""}
                        itemType="spare_part"
                        itemId={part.id}
                        itemName={part.name}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      />
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleRequestQuote(part)}
                      >
                        Get Quote
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredParts.map((part) => (
                <Card
                  key={part.id}
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/parts/${part.id}`)}
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative w-full sm:w-48 h-48 flex-shrink-0">
                      <img
                        src={part.image}
                        alt={part.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <Badge className="absolute top-2 left-2 bg-green-500/90">
                        {part.availability}
                      </Badge>
                    </div>
                    <CardContent className="flex-1 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{part.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Part #: {part.partNumber}
                          </p>
                          
                          {/* Category badges */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {part.category && (
                              <Badge variant="outline" className="text-xs">
                                {part.category}
                              </Badge>
                            )}
                            {part.subcategory && (
                              <Badge variant="secondary" className="text-xs">
                                {part.subcategory}
                              </Badge>
                            )}
                            {part.componentType && (
                              <Badge variant="default" className="text-xs">
                                {part.componentType}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{part.location}</span>
                            </div>
                            {part.seller?.company_name && (
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                <span>{part.seller.company_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{part.rating}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Compatible with: {part.compatibility}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <span className="font-bold text-xl text-primary">
                            {formatPrice(part.price)}
                          </span>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <ChatButton
                              otherUserId={part.sellerId || ""}
                              itemType="spare_part"
                              itemId={part.id}
                              itemName={part.name}
                              variant="outline"
                              size="sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleRequestQuote(part)}
                            >
                              Get Quote
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Quote Modal */}
      <SparePartQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => {
          setIsQuoteModalOpen(false);
          setSelectedPart(null);
        }}
        part={selectedPart}
        userEmail={user?.email || ""}
        userName={user?.user_metadata?.full_name || ""}
      />
    </div>
  );
};

export default Parts;
