import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Bot, MapPin, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EnhancedHeader from "@/components/EnhancedHeader";

// Swiper for carousel
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const Robots = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all available robots
  useEffect(() => {
    const fetchRobots = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("robots")
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              full_name,
              company_name,
              phone,
              mobile_number
            )
          `)
          .eq("availability", "available")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRobots(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load robots");
      } finally {
        setLoading(false);
      }
    };
    fetchRobots();
  }, []);

  // Format price
  const formatPrice = (price: number, currency: string) => {
    const symbol =
      currency === "USD" ? "$" :
      currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  // Contact seller
  const handleContactSeller = (robot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = robot.profiles?.phone || robot.profiles?.mobile_number;
    if (!phone) {
      alert("Contact information not available for this seller");
      return;
    }
    const phoneNumber = phone.replace(/\D/g, "");
    const message = `Hi! I'm interested in your robot: ${robot.name} (${robot.model}). Can you please provide more details?`;
    window.open(
      `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  // Group by company
  const robotsByCompany = robots.reduce((acc: any, robot) => {
    const company = robot.profiles?.company_name || "Unknown Company";
    if (!acc[company]) acc[company] = [];
    acc[company].push(robot);
    return acc;
  }, {});

  const uniqueCompanyRobots = Object.keys(robotsByCompany).map(
    (company) => robotsByCompany[company][0]
  );

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-8">

        {/* Page Heading */}
        <h1 className="text-4xl font-bold mb-2">Industrial Robots</h1>
        <p className="text-lg text-muted-foreground mb-4">
          Discover and purchase cutting-edge industrial robots for your automation needs.
        </p>

        {/* Total available robots */}
        <div className="mb-6 text-primary font-semibold">
          Total Available Robots: {robots.length}
        </div>

        {/* Loading and Error Handling */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : uniqueCompanyRobots.length === 0 ? (
          <p>No robots found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {uniqueCompanyRobots.map((robot) => {
              const companyName = robot.profiles?.company_name || "Unknown Company";

              return (
                <Card key={robot.id} className="hover:shadow-lg transition-shadow">
                  {/* Main image + title */}
                  <CardHeader 
                    className="cursor-pointer" 
                    onClick={() => navigate(`/robots/${robot.id}`)}
                  >
                    <div className="w-full h-60 bg-muted rounded-lg overflow-hidden">
                      {robot.images?.length > 0 ? (
                        <img
                          src={`${robot.images[0]}?q=80&auto=format`}
                          alt={robot.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Bot className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="mt-2">{robot.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">{companyName}</div>
                  </CardHeader>

                  {/* Details & Actions */}
                  <CardContent>
                    {/* Price & type */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-bold text-primary">
                        {robot.price ? formatPrice(robot.price, robot.currency) : "Price on Request"}
                      </span>
                      <Badge variant="outline">{robot.robot_type}</Badge>
                    </div>

                    {robot.model && <p className="text-sm">Model: {robot.model}</p>}
                    {robot.year_manufactured && <p className="text-sm">Year: {robot.year_manufactured}</p>}

                    <p className="text-sm flex items-center mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {robot.location || "Location not specified"}
                    </p>

                    {/* Tags */}
                    {robot.category_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {robot.category_tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button variant="outline" onClick={() => navigate(`/robots/${robot.id}`)}>
                        Details
                      </Button>
                      {!user ? (
                        <Button asChild variant="outline">
                          <a href="https://robotverse.in/auth">Sign in to Contact</a>
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={(e) => handleContactSeller(robot, e)}>
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Contact
                        </Button>
                      )}
                    </div>

                    {/* Carousel of other robots from same company */}
                    {robotsByCompany[companyName].length > 1 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">
                          Other Robots from {companyName}
                        </h4>
                        <Swiper
                          modules={[Autoplay, Navigation]}
                          autoplay={{ delay: 5000, disableOnInteraction: false }}
                          navigation
                          spaceBetween={10}
                          slidesPerView={2.2}
                        >
                          {robotsByCompany[companyName]
                            .filter((r) => r.id !== robot.id)
                            .map((r) => (
                              <SwiperSlide key={r.id}>
                                <div
                                  className="w-full h-28 bg-muted rounded-lg overflow-hidden cursor-pointer"
                                  onClick={() => navigate(`/robots/${r.id}`)}
                                >
                                  {r.images?.length > 0 ? (
                                    <img
                                      src={`${r.images[0]}?q=80&auto=format`}
                                      alt={r.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Bot className="w-12 h-12 text-muted-foreground" />
                                  )}
                                </div>
                              </SwiperSlide>
                            ))}
                        </Swiper>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

          </div>
        )}
      </div>
    </div>
  );
};

export default Robots;
