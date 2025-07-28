import { useState, useEffect } from "react";
import { Users, Settings, Package, Truck, CreditCard, Bot, TrendingUp, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatsData {
  liveUsers: number;
  robotSellers: number;
  partsSellers: number;
  serviceProviders: number;
  logisticsPartners: number;
  financeProviders: number;
  totalUsers: number;
  activeRobots: number;
  lastUpdated: string;
}

const LiveStats = () => {
  const [stats, setStats] = useState<StatsData>({
    liveUsers: 0,
    robotSellers: 0,
    partsSellers: 0,
    serviceProviders: 0,
    logisticsPartners: 0,
    financeProviders: 0,
    totalUsers: 0,
    activeRobots: 0,
    lastUpdated: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRealStats = async () => {
    try {
      setError(null);
      
      // Fetch all profiles and robots in parallel
      const [profilesResult, robotsResult] = await Promise.allSettled([
        supabase.from('profiles').select('user_type, seller_roles, created_at'),
        supabase.from('robots').select('availability').eq('availability', 'available')
      ]);

      // Process profiles data
      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
      const robots = robotsResult.status === 'fulfilled' ? robotsResult.value.data || [] : [];

      // Calculate real statistics
      const statsData: StatsData = {
        liveUsers: profiles.length, // Total registered users
        robotSellers: 0,
        partsSellers: 0,
        serviceProviders: 0,
        logisticsPartners: 0,
        financeProviders: 0,
        totalUsers: profiles.length,
        activeRobots: robots.length,
        lastUpdated: new Date().toLocaleTimeString(),
      };

      // Count users by type and roles
      profiles.forEach((profile) => {
        const userType = profile.user_type;
        const sellerRoles = profile.seller_roles || [];

        // Count by user_type
        switch (userType) {
          case 'robot_seller':
          case 'seller':
            statsData.robotSellers++;
            break;
          case 'parts_seller':
            statsData.partsSellers++;
            break;
          case 'service_provider':
            statsData.serviceProviders++;
            break;
          case 'logistics_provider':
            statsData.logisticsPartners++;
            break;
          case 'finance_provider':
            statsData.financeProviders++;
            break;
        }

        // Also count by seller_roles (additional counting)
        if (Array.isArray(sellerRoles)) {
          sellerRoles.forEach((role) => {
            switch (role) {
              case 'robot_seller':
                if (userType !== 'robot_seller' && userType !== 'seller') {
                  statsData.robotSellers++;
                }
                break;
              case 'parts_seller':
                if (userType !== 'parts_seller') {
                  statsData.partsSellers++;
                }
                break;
              case 'service_provider':
                if (userType !== 'service_provider') {
                  statsData.serviceProviders++;
                }
                break;
              case 'logistics_provider':
                if (userType !== 'logistics_provider') {
                  statsData.logisticsPartners++;
                }
                break;
              case 'finance_provider':
                if (userType !== 'finance_provider') {
                  statsData.financeProviders++;
                }
                break;
            }
          });
        }
      });

      console.log('📊 Real LiveStats calculated:', statsData);
      setStats(statsData);

    } catch (error) {
      console.error('Error fetching real stats:', error);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealStats();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchRealStats, 30000);

    // Set up real-time subscription for profile changes
    const subscription = supabase
      .channel('profiles_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' }, 
        () => {
          console.log('👤 Profile change detected, updating stats...');
          fetchRealStats();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'robots' },
        () => {
          console.log('🤖 Robot change detected, updating stats...');
          fetchRealStats();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const statItems = [
    {
      icon: Users,
      label: "Total Users",
      value: stats.totalUsers,
      gradient: "from-green-500 to-emerald-600",
      description: "Registered members"
    },
    {
      icon: Bot,
      label: "Robot Sellers",
      value: stats.robotSellers,
      gradient: "from-blue-500 to-cyan-600",
      description: "Active sellers"
    },
    {
      icon: Package,
      label: "Parts Sellers",
      value: stats.partsSellers,
      gradient: "from-purple-500 to-violet-600",
      description: "Components suppliers"
    },
    {
      icon: Settings,
      label: "Service Providers",
      value: stats.serviceProviders,
      gradient: "from-orange-500 to-red-600",
      description: "Maintenance experts"
    },
    {
      icon: Truck,
      label: "Logistics Partners",
      value: stats.logisticsPartners,
      gradient: "from-indigo-500 to-blue-600",
      description: "Shipping solutions"
    },
    {
      icon: CreditCard,
      label: "Finance Partners",
      value: stats.financeProviders,
      gradient: "from-pink-500 to-rose-600",
      description: "Funding options"
    },
  ];

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Live Marketplace Stats</h2>
            <p className="text-muted-foreground">Loading real-time data...</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-card/80 backdrop-blur-sm border-border animate-pulse">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-muted rounded-full mx-auto mb-3"></div>
                  <div className="h-8 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2 text-red-600">Error Loading Stats</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={fetchRealStats}
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
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Live Marketplace Stats</h2>
          <p className="text-muted-foreground mb-2">Real-time data from our growing community</p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              {stats.activeRobots} Active Robots
            </Badge>
            <Badge variant="outline" className="text-xs">
              Last updated: {stats.lastUpdated}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card 
                key={index} 
                className="bg-card/80 backdrop-blur-sm border-border hover:scale-105 transition-all duration-200 hover:shadow-lg"
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${item.gradient} flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1 font-mono">
                    {item.value.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Real-time Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm px-6 py-3 rounded-full border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time updates every 30 seconds</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span>{stats.activeRobots} robots available</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{stats.totalUsers} total members</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveStats;
