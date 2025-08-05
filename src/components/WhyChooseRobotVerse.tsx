import { useState, useEffect } from "react";
import { Check, Shield, Users, Globe, Zap, HeartHandshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const WhyChooseRobotVerse = () => {
  // State for stats
  const [verifiedSellers, setVerifiedSellers] = useState<number | null>(null);
  const [robotModels, setRobotModels] = useState<number | null>(null);
  const [customerSatisfaction, setCustomerSatisfaction] = useState<number | null>(null); // e.g., percentage

  useEffect(() => {
    async function fetchStats() {
      try {
        // Count of unique verified sellers (assuming 'sellers' table or unique sellers in robots/spare_parts tables)
        const { data: sellersData, error: sellersError } = await supabase
          .from("sellers")
          .select("id", { count: "exact" });
        if (sellersError) throw sellersError;
        setVerifiedSellers(sellersData ? sellersData.length : 0);

        // Count of robot models (assuming 'robots' table)
        const { data: robotsData, error: robotsError } = await supabase
          .from("robots")
          .select("id", { count: "exact" });
        if (robotsError) throw robotsError;
        setRobotModels(robotsData ? robotsData.length : 0);

        // Example for customer satisfaction: average rating from 'reviews' table (with `rating` column 0-100)
        const { data: ratingsData, error: ratingsError, count } = await supabase
          .from("customer_reviews")
          .select("rating", { count: "exact" })
          .is("rating", "not", null);
        if (ratingsError) throw ratingsError;
        if (ratingsData && ratingsData.length > 0) {
          const avgRating =
            ratingsData.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingsData.length;
          setCustomerSatisfaction(Math.round(avgRating));
        } else {
          setCustomerSatisfaction(null);
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
        // Fallback or keep null
      }
    }

    fetchStats();
  }, []);

  // Benefits data stays the same with your gradients/icons
  const benefits = [
    {
      icon: Shield,
      title: "Verified Partners",
      description:
        "All sellers, service providers, and logistics partners are thoroughly verified for quality assurance.",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Globe,
      title: "Global Reach",
      description:
        "Access to international markets with comprehensive logistics and shipping solutions.",
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: Zap,
      title: "Fast Processing",
      description:
        "Quick loan approvals, instant quotes, and rapid response times for all your robotics needs.",
      gradient: "from-yellow-500 to-orange-600",
    },
    {
      icon: Users,
      title: "Expert Network",
      description:
        "Connect with industry experts, experienced technicians, and reliable service providers.",
      gradient: "from-purple-500 to-violet-600",
    },
    {
      icon: HeartHandshake,
      title: "End-to-End Solutions",
      description:
        "From purchase to installation, maintenance, and financing - we cover everything.",
      gradient: "from-pink-500 to-rose-600",
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Why Choose RobotVerse?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your trusted partner for industrial automation solutions with comprehensive support ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border-border/50"
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${benefit.gradient} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Key Statistics */}
        <div className="bg-card rounded-2xl p-8 border border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">
                {/* Show count or spinner */}
                {verifiedSellers !== null ? verifiedSellers.toLocaleString() : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Verified Sellers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">
                {robotModels !== null ? robotModels.toLocaleString() : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Robot Models</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Support Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">
                {customerSatisfaction !== null ? `${customerSatisfaction}%` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseRobotVerse;
