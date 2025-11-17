import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  CheckCircle, 
  Brain, 
  MapPin,
  Users,
  Star,
  Clock,
  TrendingUp,
  Activity,
  Loader2,
  RefreshCw,
  Cpu,
  Zap,
  HeartHandshake,
  Truck,
  Package,
  Wrench,
  GraduationCap,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface RealStatsData {
  totalUsers: number;
  verifiedUsers: number;
  activeListings: number;
  robotCategories: number;
  serviceProviders: number;
  citiesCovered: number;
  customerSatisfaction: number;
  lastUpdated: string;
}

const WhyChooseRobotVerse = () => {
  const [realStats, setRealStats] = useState<RealStatsData>({
    totalUsers: 0,
    verifiedUsers: 0,
    activeListings: 0,
    robotCategories: 0,
    serviceProviders: 0,
    citiesCovered: 0,
    customerSatisfaction: 0,
    lastUpdated: ''
  });
  
  const [loading, setLoading] = useState(true);

  const fetchRealData = async () => {
    try {
      const [
        totalProfilesResult,
        profilesResult,
        robotsResult,
        servicesResult,
        sparePartsResult
      ] = await Promise.allSettled([
        supabase.rpc('get_total_profiles_count'),
        supabase.from('profiles').select('user_type, full_name, email, phone, company_name'),
        supabase.from('robots').select('availability, robot_type, location').eq('availability', 'available'),
        supabase.from('services').select('service_type, location'),
        supabase.from('spare_parts').select('quantity').gt('quantity', 0)
      ]);

      const totalUsers = totalProfilesResult.status === 'fulfilled' ? totalProfilesResult.value.data || 0 : 0;
      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
      const robots = robotsResult.status === 'fulfilled' ? robotsResult.value.data || [] : [];
      const services = servicesResult.status === 'fulfilled' ? servicesResult.value.data || [] : [];
      const spareParts = sparePartsResult.status === 'fulfilled' ? sparePartsResult.value.data || [] : [];

      // Use the total count from the database function
      const verifiedUsers = profiles.filter(p => 
        p.full_name && p.email && (p.phone || p.company_name)
      ).length;
      
      const activeListings = robots.length + spareParts.length;
      const robotTypes = new Set(robots.map(r => r.robot_type).filter(Boolean));
      const robotCategories = robotTypes.size;
      const serviceProviders = profiles.filter(p => p.user_type === 'service_provider').length + services.length;
      
      const allLocations = [
        ...robots.map(r => r.location),
        ...services.map(s => s.location)
      ].filter(Boolean);
      
      const uniqueCities = new Set(
        allLocations
          .map(loc => typeof loc === 'string' ? loc.split(',')[0].trim() : '')
          .filter(Boolean)
      );
      const citiesCovered = uniqueCities.size;
      const customerSatisfaction = totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

      setRealStats({
        totalUsers,
        verifiedUsers,
        activeListings,
        robotCategories,
        serviceProviders,
        citiesCovered,
        customerSatisfaction,
        lastUpdated: new Date().toLocaleTimeString()
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData();
    const interval = setInterval(fetchRealData, 60000);
    return () => clearInterval(interval);
  }, []);

  const keyFeatures = [
    {
      icon: Package,
      title: "One-Stop Platform",
      description: "Purchase robots, spare parts, get services, arrange logistics, and secure financing - all from a single trusted marketplace.",
      gradient: "from-purple-500 to-violet-600"
    },
    {
      icon: Shield,
      title: "Verified Sellers & Partners",
      description: "Every seller, service provider, logistics partner, and financier is thoroughly verified for your peace of mind.",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: Cpu,
      title: "Smart AI Matching",
      description: "Our AI connects you with the perfect robot, the right spare parts, and the best service providers for your needs.",
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      icon: Zap,
      title: "Fast & Seamless",
      description: "From browsing to delivery and installation - experience a streamlined buying journey with real-time tracking.",
      gradient: "from-yellow-500 to-orange-600"
    }
  ];

  const services = [
    {
      icon: Wrench,
      title: "Installation & Maintenance",
      description: "Professional setup, 24/7 support & AMC"
    },
    {
      icon: Truck,
      title: "Safe Delivery & Handling",
      description: "Specialized logistics for robots"
    },
    {
      icon: GraduationCap,
      title: "Operator Training",
      description: "Expert training & certification programs"
    },
    {
      icon: CreditCard,
      title: "Easy Financing Options",
      description: "Flexible EMI & loan solutions"
    }
  ];

  const statsCards = [
    {
      icon: Users,
      label: "Trusted Users",
      value: realStats.totalUsers.toString(),
      color: "text-blue-600"
    },
    {
      icon: CheckCircle,
      label: "Active Listings",
      value: realStats.activeListings.toString(),
      color: "text-green-600"
    },
    {
      icon: MapPin,
      label: "Cities Covered",
      value: realStats.citiesCovered.toString(),
      color: "text-purple-600"
    },
    {
      icon: TrendingUp,
      label: "Robot Categories",
      value: realStats.robotCategories.toString(),
      color: "text-orange-600"
    }
  ];

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading marketplace insights...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 lg:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Complete End-to-End Solution for Buyers
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-4 md:mb-6 px-4">
            From robot purchase to delivery, installation, training, maintenance, and financing – everything you need in one trusted platform
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Updated: {realStats.lastUpdated}
            </Badge>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-12 lg:mb-16">
          {keyFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/50">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Live Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-8 md:mb-12 lg:mb-16">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-card/80 backdrop-blur-sm border-border hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3 md:p-4 lg:p-6 text-center">
                  <Icon className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 md:mb-3 ${stat.color}`} />
                  <div className={`text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2 font-mono ${stat.color}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Services */}
        <div className="mb-8 md:mb-12 lg:mb-16">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-foreground">Supporting Services Included</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className="text-center p-4 md:p-6 bg-card/50 backdrop-blur-sm rounded-lg border border-border hover:bg-card/70 transition-all duration-200">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <h4 className="text-sm md:text-base font-semibold mb-2 text-foreground">{service.title}</h4>
                  <p className="text-xs md:text-sm text-muted-foreground">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-xl md:rounded-2xl p-6 md:p-8 border border-primary/20">
          <h3 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-foreground">Start Your Automation Journey Today</h3>
          <p className="text-base md:text-lg text-muted-foreground mb-4 md:mb-6 px-4">
            Join {realStats.totalUsers.toLocaleString()}+ businesses buying robots with complete end-to-end support
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8 text-xs sm:text-sm">
            <div className="text-muted-foreground">
              <span className="font-semibold text-green-600">{realStats.activeListings}</span> active listings
            </div>
            <div className="hidden sm:block w-px h-4 bg-border"></div>
            <div className="text-muted-foreground">
              <span className="font-semibold text-blue-600">{realStats.verifiedUsers}</span> verified users
            </div>
            <div className="hidden sm:block w-px h-4 bg-border"></div>
            <div className="text-muted-foreground">
              <span className="font-semibold text-orange-600">{realStats.customerSatisfaction}%</span> satisfaction rate
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <Link to="/robots" className="w-full sm:w-auto">
              <Button size="lg" className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 w-full sm:w-auto h-10 md:h-11 text-sm md:text-base">
                Browse Robots Now
              </Button>
            </Link>
            <Link to="/auth?type=buyer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full sm:w-auto h-10 md:h-11 text-sm md:text-base">
                Register as Buyer
              </Button>
            </Link>
          </div>
        </div>

        {/* Real-time Status */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 text-sm text-muted-foreground bg-card/30 backdrop-blur-sm px-6 py-3 rounded-full border border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time updates</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>{realStats.verifiedUsers} verified</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span>{realStats.customerSatisfaction}% satisfaction</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseRobotVerse;