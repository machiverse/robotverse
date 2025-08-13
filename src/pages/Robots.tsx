import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Bot, MapPin, MessageCircle, Eye, Building, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EnhancedHeader from "@/components/EnhancedHeader";

// Swiper Carousel
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules"; 
import "swiper/swiper-bundle.min.css"; // ✅ full CSS bundle for all modules

interface Robot {
  id: string;
  name: string;
  model?: string;
  robot_type: string;
  price: number;
  currency: string;
  images: string[];
  category_tags: string[];
  quantity: number;
  location?: string;
  state?: string;
  year_manufactured?: number;
  payload_capacity?: number;
  training_included?: boolean;
  condition?: string;
  profiles: {
    company_name?: string;
    full_name?: string;
    phone?: string;
    mobile_number?: string;
    email?: string;
    user_type?: string;
  };
  availability: string;
  created_at: string;
  description?: string;
}

const Robots = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch robots on mount
  useEffect(() => {
    const fetchRobots = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("robots")
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              company_name,
              full_name,
              phone,
              mobile_number,
              email,
              user_type
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

  // Format prices according to currency with symbol
  const formatPrice = (price: number, currency: string) => {
    if (!price) return 'Price on request';
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  // Contact seller handler
  const handleContactSeller = (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      window.location.href = 'https://robotverse.in/auth';
      return;
    }

    const phone = robot.profiles?.phone || robot.profiles?.mobile_number;
    if (!phone) {
      alert("Contact information not available for this seller");
      return;
    }

    const phoneNumber = phone.replace(/\D/g, "");
    const message = `Hi! I'm interested in your robot: ${robot.name} (${robot.model}). Can you please provide more details?`;

    const choice = window.confirm(
      "Contact via:\n\nOK = WhatsApp\nCancel = Phone Call"
    );

    if (choice) {
      window.open(`https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.location.href = `tel:+91${phoneNumber}`;
    }
  };

  // Group robots by company for unique listing
  const robotsByCompany = robots.reduce<Record<string, Robot[]>>((acc, robot) => {
    const company = robot.profiles?.company_name || "Unknown Company";
    if (!acc[company]) acc[company] = [];
    acc[company].push(robot);
    return acc;
  }, {});

  // Get one representative robot per company for main cards
  const uniqueCompanyRobots = Object.keys(robotsByCompany).map(
    (company) => robotsByCompany[company][0]
  );

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-2">Industrial Robots</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Discover cutting-edge industrial robots from verified sellers worldwide
        </p>

        {/* Total available robots count */}
        <div className="mb-6 text-primary font-semibold text-lg">
          Total Available Robots: {robots.length}
        </div>

        {/* Loading / Error */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600 font-semibold">
            {error}
          </div>
        ) : uniqueCompanyRobots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No robots available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {uniqueCompanyRobots.map(robot => {
              const companyName = robot.profiles?.company_name || "Unknown Company";
              const companyRobots = robotsByCompany[companyName];

              return (
                <Card key={robot.id} className="hover:shadow-xl transition-shadow">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => navigate(`/robots/${robot.id}`)}
                  >
                    {/* Image container fixed size */}
                    <div className="relative w-full h-60 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                      {robot.images?.length ? (
                        <img
                          src={`${robot.images[0]}?q=80&auto=format`}
                          alt={robot.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Bot className="w-16 h-16 text-muted-foreground" />
                      )}
                      {robot.condition && (
                        <Badge className="absolute top-3 left-3 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {robot.condition.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="mt-3 text-lg font-semibold line-clamp-1">
                      {robot.name}
                    </CardTitle>

                    <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                      <span>{companyName}</span>
                      <span>Qty: {robot.quantity}</span>
                    </div>
                  </CardHeader>

                  <CardContent>

                    <div className="space-y-2">

                      {/* Price and Robot Type Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-2xl font-bold text-primary">
                          <span className="mr-1">₹</span>
                          {robot.price ? robot.price.toLocaleString() : 'N/A'}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {robot.robot_type}
                        </Badge>
                      </div>

                      {/* Model, Year Manufactured */}
                      <div className="text-sm text-muted-foreground">
                        {robot.model && <div>Model: {robot.model}</div>}
                        {robot.year_manufactured && <div>Year: {robot.year_manufactured}</div>}
                      </div>

                      {/* Location */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{robot.location || 'Location not specified'}</span>
                      </div>

                      {/* Description */}
                      {robot.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {robot.description}
                        </p>
                      )}

                      {/* Category Tags */}
                      {robot.category_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {robot.category_tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Seller Info */}
                      <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          <span className="line-clamp-1">{companyName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/robots/${robot.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>

                        {!user ? (
                          <Button asChild variant="outline">
                            <a href="https://robotverse.in/auth" className="flex items-center justify-center">
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Sign in to Contact
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={(e) => handleContactSeller(robot, e)}
                            disabled={!robot.profiles?.phone && !robot.profiles?.mobile_number}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Contact
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Carousel of other robots from the same company */}
                    {companyRobots.length > 1 && (
                      <div className="mt-6">
                        <h4 className="mb-2 font-semibold text-sm">Other robots from {companyName}</h4>
                        <Swiper
                          modules={[Autoplay, Navigation]}
                          autoplay={{ delay: 5000, disableOnInteraction: false }}
                          navigation
                          slidesPerView={3}
                          spaceBetween={12}
                        >
                          {companyRobots
                            .filter(r => r.id !== robot.id)
                            .map(r => (
                              <SwiperSlide key={r.id}>
                                <div
                                  onClick={() => navigate(`/robots/${r.id}`)}
                                  className="cursor-pointer w-full h-40 rounded-lg overflow-hidden shadow-sm"
                                  style={{ minWidth: '160px' }}
                                >
                                  {r.images?.length ? (
                                    <img
                                      src={`${r.images[0]}?q=80&auto=format`}
                                      alt={r.name}
                                      className="w-full h-full object-cover rounded-lg"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Bot className="w-16 h-16 text-muted-foreground m-auto" />
                                  )}
                                  <div className="p-1 text-xs font-medium line-clamp-1 text-center mt-1">
                                    {r.name}
                                  </div>
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
