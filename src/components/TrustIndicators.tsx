import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

const trustFeatures = [
  {
    icon: Shield,
    title: "Verified Sellers",
    description: "All sellers undergo rigorous verification. Trade with confidence knowing every partner is authentic and trustworthy.",
    gradient: "from-green-500 to-emerald-600"
  },
  {
    icon: CheckCircle,
    title: "Quality Assured", 
    description: "Every machine undergoes quality inspection with detailed specifications, high-resolution images, and performance reports.",
    gradient: "from-blue-500 to-cyan-600"
  },
  {
    icon: Brain,
    title: "AI-Powered Matching",
    description: "Advanced AI algorithms analyze your requirements to find the perfect machines, parts, and services tailored to your business needs.",
    gradient: "from-purple-500 to-violet-600"
  }
];

const TrustIndicators = () => {
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
  const [error, setError] = useState<string | null>(null);

  const fetchRealData = async () => {
    try {
      setError(null);
      
      // Fetch all data in parallel - using only confirmed column names
      const [
        profilesResult,
        robotsResult,
        servicesResult,
        sparePartsResult
      ] = await Promise.allSettled([
        supabase.from('profiles').select('user_type, full_name, email, phone, company_name, created_at'),
        supabase.from('robots').select('availability, robot_type, location').eq('availability', 'available'),
        supabase.from('services').select('service_type, location'),
        supabase.from('spare_parts').select('quantity').gt('quantity', 0)
      ]);

      // Process results
      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
      const robots = robotsResult.status === 'fulfilled' ? robotsResult.value.data || [] : [];
      const services = servicesResult.status === 'fulfilled' ? servicesResult.value.data || [] : [];
      const spareParts = sparePartsResult.status === 'fulfilled' ? sparePartsResult.value.data || [] : [];

      // Calculate real statistics using existing fields
      const totalUsers = profiles.length;
      
      // Calculate verified users based on profile completeness (using existing fields)
      const verifiedUsers = profiles.filter(p => 
        p.full_name && 
        p.email && 
        (p.phone || p.company_name) // Consider verified if they have name, email, and either phone or company
      ).length;
      
      const activeListings = robots.length + spareParts.length;
      
      // Count unique robot categories
      const robotTypes = new Set(robots.map(r => r.robot_type).filter(Boolean));
      const robotCategories = robotTypes.size;

      // Count service providers using actual user_type field
      const serviceProviders = profiles.filter(p => p.user_type === 'service_provider').length + services.length;

      // Count unique cities/locations (extract from available location fields)
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

      // Calculate customer satisfaction based on profile completion rate
      const customerSatisfaction = totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

      const statsData: RealStatsData = {
        totalUsers,
        verifiedUsers,
        activeListings,
        robotCategories,
        serviceProviders,
        citiesCovered,
        customerSatisfaction,
        lastUpdated: new Date().toLocaleTimeString()
      };

      setRealStats(statsData);
      console.log('📊 Real Trust Indicators Data:', statsData);

    } catch (error) {
      console.error('Error fetching trust indicators data:', error);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData();

    // Set up real-time updates every 60 seconds
    const interval = setInterval(fetchRealData, 60000);

    // Set up real-time subscription for data changes
    const subscription = supabase
      .channel('trust_indicators_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' }, 
        () => {
          console.log('👤 Profile change detected, updating trust indicators...');
          fetchRealData();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'robots' },
        () => {
          console.log('🤖 Robot change detected, updating trust indicators...');
          fetchRealData();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        () => {
          console.log('🔧 Service change detected, updating trust indicators...');
          fetchRealData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  // Real network stats with actual data
  const networkStats = [
    {
      icon: MapPin,
      label: "Pan-India Network",
      value: realStats.citiesCovered.toString(),
      description: "cities covered"
    },
    {
      icon: Users,
      label: "Trusted Community", 
      value: realStats.totalUsers.toString(),
      description: "registered users"
    },
    {
      icon: TrendingUp,
      label: "Robot Categories",
      value: realStats.robotCategories.toString(),
      description: "categories"
    },
    {
      icon: Clock,
      label: "Quality Support",
      value: "24/7",
      description: "assistance"
    }
  ];

  // Real live stats with actual data
  const liveStats = [
    { 
      label: "Active Listings", 
      value: realStats.activeListings.toString(), 
      color: "text-green-500" 
    },
    { 
      label: "Verified Users", 
      value: realStats.verifiedUsers.toString(), 
      color: "text-blue-500" 
    },
    { 
      label: "Service Providers", 
      value: realStats.serviceProviders.toString(), 
      color: "text-purple-500" 
    },
    { 
      label: "Profile Completion", 
      value: `${realStats.customerSatisfaction}%`, 
      color: "text-orange-500" 
    }
  ];

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-muted/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Loading Trust Indicators</h2>
            <p className="text-muted-foreground">Fetching real-time marketplace data...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 bg-gradient-to-br from-muted/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">⚠️ Error Loading Data</div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={fetchRealData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-muted/20 to-background">
      <div className="container mx-auto px-4">
        {/* Why Choose Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why Choose RobotVerse?</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The most trusted industrial machinery marketplace in India with cutting-edge technology and verified partners
          </p>
          {/* Real-time data indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Updated: {realStats.lastUpdated}
            </Badge>
          </div>
        </div>

        {/* Trust Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {trustFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-card/80 backdrop-blur-sm border-border hover:scale-105 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Network Stats - Now with Real Data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {networkStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-card/60 backdrop-blur-sm border-border hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4 text-center">
                  <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-semibold text-sm mb-1">{stat.label}</h4>
                  <div className="text-2xl font-bold text-primary mb-1 font-mono">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Live Stats - Now with Real Data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {liveStats.map((stat, index) => (
            <div key={index} className="text-center p-4 bg-card/40 backdrop-blur-sm rounded-lg border border-border hover:bg-card/60 transition-all duration-200">
              <div className={`text-3xl font-bold mb-1 font-mono ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced CTA Section with Real Stats */}
        <div className="text-center mt-16">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-xl text-muted-foreground mb-4">
            Join {realStats.totalUsers.toLocaleString()} businesses already using RobotVerse
          </p>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-green-500">{realStats.activeListings}</span> active listings
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-blue-500">{realStats.verifiedUsers}</span> verified users
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-orange-500">{realStats.customerSatisfaction}%</span> completion rate
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Badge variant="secondary" className="text-lg px-6 py-3 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              Start Buying
            </Badge>
            <Badge variant="outline" className="text-lg px-6 py-3 cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
              Start Selling
            </Badge>
          </div>
        </div>

        {/* Real-time Update Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 text-sm text-muted-foreground bg-card/30 backdrop-blur-sm px-6 py-3 rounded-full border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time data updates every minute</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{realStats.citiesCovered} cities covered</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>{realStats.robotCategories} robot types</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustIndicators;
