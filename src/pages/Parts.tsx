import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, MapPin, Search, Grid, List, Star, Loader2, Building } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { ChatButton } from "@/components/chat/ChatButton";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import SparePartQuoteModal from "@/components/forms/SparePartQuoteModal";
import { getMainCategories, getSubCategories } from "@/constants/sparePartsCategories";
import { SEOHead } from "@/components/SEOHead";
import { generateItemListSchema } from "@/utils/seoSchemas";

interface Part {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();

  // Dynamic filter states
  const [mainCategories, setMainCategories] = useState([{ value: "all", label: "All Categories" }]);
  const [subCategories, setSubCategories] = useState([{ value: "all", label: "All Sub-Categories" }]);
  const [locations, setLocations] = useState([{ value: "all", label: "All Locations" }]);

  // Fetch real parts data from Supabase
  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("spare_parts")
          .select(
            `
            *,
            profiles!spare_parts_seller_id_fkey (
              full_name,
              company_name,
              location,
              phone,
              mobile_number,
              email
            )
          `,
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Transform data to match interface
        const transformedData = data.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.main_category || item.category_tags?.[0] || "Other",
          subCategory: item.sub_category || "",
          customCategory: item.custom_category || "",
          price: item.price || 0,
          location: item.location || item.profiles?.location || "Location not specified",
          image: item.images?.[0] || "/placeholder.svg",
          partNumber: item.part_number || "N/A",
          compatibility: item.compatible_robots?.join(", ") || "Universal",
          rating: 4.5, // Default rating
          availability: "In Stock",
          quantity: item.quantity,
          seller: item.profiles || {},
          sellerId: item.seller_id,
        }));

        setParts(transformedData);
        setError(null);

        // Extract unique filter options dynamically and sort them
        const uniqueMainCategories = new Set<string>();
        const uniqueSubCategories = new Set<string>();
        const uniqueLocations = new Set<string>();

        transformedData.forEach((part) => {
          if (part.category) uniqueMainCategories.add(part.category.trim());
          if (part.subCategory) uniqueSubCategories.add(part.subCategory.trim());
          if (part.location) uniqueLocations.add(part.location.trim());
        });

        // Set main categories sorted alphabetically
        setMainCategories([
          { value: "all", label: "All Categories" },
          ...Array.from(uniqueMainCategories)
            .sort()
            .map((cat) => ({
              value: cat.toLowerCase().replace(/\s+/g, "-"),
              label: cat,
            })),
        ]);

        // Set locations sorted alphabetically
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
  }, []);

  // Update sub-categories when main category changes
  useEffect(() => {
    if (selectedMainCategory && selectedMainCategory !== "all") {
      const filteredSubCats = parts
        .filter((part) => part.category.toLowerCase().replace(/\s+/g, "-") === selectedMainCategory)
        .map((part) => part.subCategory)
        .filter((sub) => sub && sub.trim() !== "");

      const uniqueSubCats = Array.from(new Set(filteredSubCats));
      
      setSubCategories([
        { value: "all", label: "All Sub-Categories" },
        ...uniqueSubCats
          .sort()
          .map((sub) => ({
            value: sub.toLowerCase().replace(/\s+/g, "-"),
            label: sub,
          })),
      ]);
    } else {
      setSubCategories([{ value: "all", label: "All Sub-Categories" }]);
    }
  }, [selectedMainCategory, parts]);

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

    // Track button interaction
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

    try {
      // Log the contact request
      const { error: requestError } = await supabase.from("user_requests").insert({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || "Unknown User",
        company_name: user.user_metadata?.company_name || "",
        mobile_number: user.user_metadata?.phone || "",
        email_address: user.email || "",
        location: user.user_metadata?.location || "",
        request_type: "Contact Seller",
        item_type: "spare_parts",
        item_id: part.id,
        item_name: part.name,
        seller_id: part.sellerId || "",
        status: "pending",
        requirements: `User contacted seller for spare part: ${part.name}`,
      });

      if (requestError) {
        console.error("Error logging request:", requestError);
      }

      // Create notification for seller
      if (part.sellerId) {
        const { error: notificationError } = await supabase.from("seller_notifications").insert({
          seller_id: part.sellerId,
          user_id: user.id,
          type: "contact_request",
          title: "New Contact Request",
          message: `${user.user_metadata?.full_name || "A user"} wants to contact you about ${part.name}`,
          item_type: "spare_parts",
          item_id: part.id,
        });

        if (notificationError) {
          console.error("Error creating notification:", notificationError);
        }
      }
    } catch (error) {
      console.error("Error processing contact request:", error);
    }

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

    // Track button interaction
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
  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.compatibility.toLowerCase().includes(searchQuery.toLowerCase());

    // Helper to get label from value
    const getLabelFromValue = (arr: { value: string; label: string }[], val: string) => 
      arr.find((i) => i.value === val)?.label || "";

    const matchesMainCategory = 
      selectedMainCategory === "all" || 
      part.category.toLowerCase() === getLabelFromValue(mainCategories, selectedMainCategory).toLowerCase();

    const matchesSubCategory = 
      selectedSubCategory === "all" || 
      part.subCategory?.toLowerCase() === getLabelFromValue(subCategories, selectedSubCategory).toLowerCase();

    const matchesLocation =
      selectedLocation === "all" || 
      part.location.toLowerCase() === getLabelFromValue(locations, selectedLocation).toLowerCase();

    return matchesSearch && matchesMainCategory && matchesSubCategory && matchesLocation;
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
        {searchQuery || selectedMainCategory !== "all" || selectedLocation !== "all"
          ? "No parts match your current filters."
          : "Parts inventory is currently empty."}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Genuine Robot Spare Parts & Accessories | RobotVerse`}
        description="Source authentic spare parts and accessories for industrial robots from verified suppliers. Get genuine FANUC, ABB, KUKA, Yaskawa robot parts delivered to your facility."
        keywords="robot spare parts, industrial robot accessories, genuine robot parts, FANUC parts, ABB parts, KUKA parts, robot components, automation parts"
        jsonLd={generateItemListSchema(parts.slice(0, 20), "Robot Spare Parts & Accessories")}
      />
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Genuine Robot Spare Parts & Accessories
          </h1>
          <p className="text-xl text-muted-foreground">
            Source authentic spare parts and accessories from verified suppliers - delivered to your facility
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
            <Select
              value={selectedMainCategory}
              onValueChange={(value) => {
                setSelectedMainCategory(value);
                setSelectedSubCategory("all");
              }}
              disabled={loading}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Main Category" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {mainCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMainCategory !== "all" && (
              <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory} disabled={loading}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sub Category" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {subCategories.map((subCat) => (
                    <SelectItem key={subCat.value} value={subCat.value}>
                      {subCat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedLocation} onValueChange={setSelectedLocation} disabled={loading}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
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
              {filteredParts.length} {filteredParts.length === 1 ? "part" : "parts"} found
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
                <Card
                  key={part.id}
                  className="group border border-border hover:border-primary/50 hover:shadow-lg hover:bg-muted/30 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                  onClick={() => {
                    window.location.href = `/parts/${part.id}`;
                  }}
                >
                  <CardHeader>
                    {/* Small thumbnail preview image */}
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted relative mb-4">
                      {part.image && part.image !== "/placeholder.svg" ? (
                        <img
                          src={part.image}
                          alt={part.name}
                          className="w-full h-full object-contain p-2 rounded-lg group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <Package className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg">{part.name}</CardTitle>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="w-fit">
                        {part.category}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">{part.rating}</span>
                      </div>
                    </div>
                    <ViewCountDisplay targetType="spare_parts" targetId={part.id} className="mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">₹{part.price.toLocaleString()}</span>
                        <Badge variant={part.availability === "In Stock" ? "default" : "secondary"}>
                          {part.availability}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">{part.seller?.company_name || "Company Name"}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="text-sm">{part.location}</span>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-medium">Part #:</span> {part.partNumber}
                        </p>
                        <p>
                          <span className="font-medium">Compatible:</span> {part.compatibility}
                        </p>
                        <p>
                          <span className="font-medium">Quantity:</span> {part.quantity} available
                        </p>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <ChatButton
                          otherUserId={part.sellerId || ""}
                          itemId={part.id}
                          itemType="spare_part"
                          itemName={part.name}
                          variant="default"
                          className="flex-1"
                        />
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

      {/* Quote Modal */}
      <SparePartQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        part={selectedPart}
        userEmail={user?.email || ""}
        userName={user?.user_metadata?.full_name || "User"}
      />
    </div>
  );
};

export default Parts;
