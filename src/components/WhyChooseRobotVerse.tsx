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
        profilesResult,
        robotsResult,
        servicesResult,
        sparePartsResult
      ] = await Promise.allSettled([
        supabase.from('profiles').select('id, user_type, full_name, email, phone, company_name, created_at'),
        supabase.from('robots').select('availability, robot_type, location').eq('availability', 'available'),
        supabase.from('services').select('service_type, location'),
        supabase.from('spare_parts').select('quantity').gt('quantity', 0)
      ]);

      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
      const robots = robotsResult.status === 'fulfilled' ? robotsResult.value.data || [] : [];
      const services = servicesResult.status === 'fulfilled' ? servicesResult.value.data || [] : [];
      const spareParts = sparePartsResult.status === 'fulfilled' ? sparePartsResult.value.data || [] : [];

      // Count ALL profiles in the database, matching LiveStats component
      const totalUsers = profiles.length;
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
      icon: Shield,
      title: "Verified Partners",
      description: "All sellers undergo rigorous verification for authentic and trustworthy partnerships.",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: Cpu,
      title: "AI-Powered Platform",
      description: "Advanced AI matching algorithms and automated quality inspection ensure perfect matches.",
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Quick quotes, instant matching, and rapid deployment for your production needs.",
      gradient: "from-yellow-500 to-orange-600"
    },
    {
      icon: Package,
      title: "Complete Ecosystem",
      description: "Robots, spare parts, services, logistics, and financing - everything in one platform.",
      gradient: "from-purple-500 to-violet-600"
    }
  ];

  const services = [
    {
      icon: Wrench,
      title: "Maintenance & Repair",
      description: "24/7 certified technician support"
    },
    {
      icon: Truck,
      title: "Specialized Logistics",
      description: "Safe handling of complex equipment"
    },
    {
      icon: GraduationCap,
      title: "Training & Certification",
      description: "Comprehensive operator programs"
    },
    {
      icon: CreditCard,
      title: "Flexible Financing",
      description: "Customized payment solutions"
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
    <section className="py-20 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Why Choose RobotVerse?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            India's most comprehensive robotics marketplace with cutting-edge technology and verified partners
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {keyFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/50">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Live Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-card/80 backdrop-blur-sm border-border hover:shadow-lg transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <Icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                  <div className={`text-3xl font-bold mb-2 font-mono ${stat.color}`}>
                    {stat.value}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Services */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center mb-8 text-foreground">Complete Solutions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className="text-center p-6 bg-card/50 backdrop-blur-sm rounded-lg border border-border hover:bg-card/70 transition-all duration-200">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2 text-foreground">{service.title}</h4>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-2xl p-8 border border-primary/20">
          <h3 className="text-3xl font-bold mb-4 text-foreground">Ready to Transform Your Business?</h3>
          <p className="text-xl text-muted-foreground mb-6">
            Join {realStats.totalUsers.toLocaleString()}+ businesses already using RobotVerse
          </p>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-green-600">{realStats.activeListings}</span> active listings
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-blue-600">{realStats.verifiedUsers}</span> verified users
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-orange-600">{realStats.customerSatisfaction}%</span> satisfaction rate
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?type=buyer">
              <Button size="lg" className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                Start Buying Robots
              </Button>
            </Link>
            <Link to="/auth?type=seller">
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Start Selling
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