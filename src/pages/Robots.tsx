import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth";
import { Loader2, Bot, Search, Grid, List, X } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const Robots = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // Data & UI states
  const [robots, setRobots] = useState<any[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<any[]>([]);
  const [categories, setCategories] = useState([{ value: "all", label: "All Categories" }]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fullscreen Image Modal
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Fetch robots and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("robots")
          .select(`
            *,
            profiles:profiles!robots_seller_id_fkey (
              user_id,
              full_name,
              company_name,
              phone,
              mobile_number,
              email
            )
          `)
          .eq("availability", "available")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const robotsData = data || [];

        setRobots(robotsData);
        setFilteredRobots(robotsData);

        // Extract and sort unique categories A-Z
        const uniqueCategories = new Set<string>();
        robotsData.forEach((robot: any) => {
          if (robot.robot_type) uniqueCategories.add(robot.robot_type);
          if (robot.category_tags && Array.isArray(robot.category_tags)) {
            robot.category_tags.forEach((tag: string) => tag && uniqueCategories.add(tag));
          }
        });
        const sortedCategories = Array.from(uniqueCategories)
          .sort((a, b) => a.localeCompare(b))
          .map(cat => ({
            value: cat.toLowerCase().replace(/\s+/g, "-"),
            label: cat,
          }));

        setCategories([{ value: "all", label: "All Categories" }, ...sortedCategories]);
      } catch (e: any) {
        console.error(e);
        setError("Failed to load robots.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter robots when category or search query changes
  useEffect(() => {
    let filtered = [...robots];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((robot: any) => (
        robot.name.toLowerCase().includes(q) ||
        robot.model.toLowerCase().includes(q) ||
        robot.robot_type.toLowerCase().includes(q) ||
        (robot.category_tags?.some((tag: string) => tag.toLowerCase().includes(q)) ?? false)
      ));
    }

    if (selectedCategory !== "all") {
      const selectedCatLabel = categories.find(c => c.value === selectedCategory)?.label.toLowerCase() ?? "";
      filtered = filtered.filter((robot: any) => (
        robot.robot_type.toLowerCase() === selectedCatLabel ||
        robot.category_tags?.some((tag: string) => tag.toLowerCase() === selectedCatLabel)
      ));
    }

    // Sort filtered robots alphabetically by name A-Z
    filtered.sort((a: any, b: any) => a.name.localeCompare(b.name));

    setFilteredRobots(filtered);
  }, [robots, selectedCategory, searchQuery, categories]);

  // Group filtered robots by category for display
  const categoryGroups = filteredRobots.reduce<Record<string, any[]>>((acc, robot) => {
    const category = robot.robot_type || "Others";
    if (!acc[category]) acc[category] = [];
    acc[category].push(robot);
    return acc;
  }, {});

  const formatPrice = (price: number, currency: string) => {
    if (!price) return "Price on request";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return symbol + price.toLocaleString();
  };

  // Handle seller contact (WhatsApp or phone call)
  const handleContactSeller = (robot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to contact sellers",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    const phone = robot.profiles?.phone || robot.profiles?.mobile_number;
    if (!phone) {
      toast({
        title: "Contact info not available",
        description: "Seller contact information is missing",
        variant: "destructive",
      });
      return;
    }

    const number = phone.replace(/\D/g, "");
    const message = `Hello, I'm interested in your robot: ${robot.name} (${robot.model}). Could you please provide more details?`;

    if (window.confirm("Contact via WhatsApp? OK for WhatsApp, Cancel for Phone Call")) {
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
    } else {
      window.location.href = `tel:+${number}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
          <p className="text-lg text-muted-foreground">Loading robots...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex flex-col items-center justify-center text-center">
          <Bot className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-red-600 text-xl mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-6">Industrial Robots</h1>

        {/* Filters */}
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, model, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory} className="w-56">
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Category-wise robot list */}
        {Object.keys(categoryGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <Bot className="w-16 h-16 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No robots match your filter criteria.</p>
          </div>
        ) : (
          Object.keys(categoryGroups).sort((a, b) => a.localeCompare(b)).map(category => (
            <section key={category} className="mb-12">
              <h2 className="text-2xl font-semibold mb-4 capitalize">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryGroups[category].map((robot: any) => (
                  <Card
                    key={robot.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/robots/${robot.id}`)}
                  >
                    <img
                      src={robot.images?.[0]}
                      alt={robot.name}
                      className="w-full max-h-60 object-contain rounded-t-md"
                      loading="lazy"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <CardContent>
                      <CardHeader>
                        <CardTitle>{robot.name}</CardTitle>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-muted-foreground">{robot.model}</p>
                          <p className="font-bold">{formatPrice(robot.price, robot.currency)}</p>
                        </div>
                      </CardHeader>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className="flex items-center text-muted-foreground">
                          <Map className="mr-1" /> <span>{robot.location}</span>
                        </div>
                        <Badge variant={robot.condition ? 'default' : 'secondary'}>{robot.condition || 'Unknown'}</Badge>
                      </div>
                      <div className="flex justify-between mt-4">
                        <Button size="sm" variant="outline" onClick={(e) => handleContactSeller(robot, e)}>Contact</Button>
                        <Button size="sm" variant="secondary" onClick={() => setFullscreenImage(robot.images?.[0] || '')}>View Image</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}

        {/* Fullscreen image dialog */}
        {fullscreenImage && (
          <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
            <DialogContent className="p-0 max-w-7xl max-h-[90vh]">
              <div className="relative flex justify-center items-center bg-black p-4 rounded-md">
                <img src={fullscreenImage} alt="Full Size" className="max-w-full max-h-[80vh] object-contain" />
                <Button
                  variant="ghost"
                  className="absolute top-4 right-4 text-white"
                  onClick={() => setFullscreenImage(null)}
                  aria-label="Close Image"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

export default Robots;
