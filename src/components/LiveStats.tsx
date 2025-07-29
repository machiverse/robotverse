import { useState, useEffect } from "react";
import { Users, Settings, Package, Truck, CreditCard, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface StatsData {
  liveUsers: number;
  robotSellers: number;
  partsSellers: number;
  serviceProviders: number;
  logisticsPartners: number;
  financeProviders: number;
}

const LiveStats = () => {
  const [stats, setStats] = useState<StatsData>({
    liveUsers: 0,
    robotSellers: 0,
    partsSellers: 0,
    serviceProviders: 0,
    logisticsPartners: 0,
    financeProviders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch user statistics
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('account_type, seller_roles');

        if (error) throw error;

        const statsData: StatsData = {
          liveUsers: profiles?.length || 0,
          robotSellers: 0,
          partsSellers: 0,
          serviceProviders: 0,
          logisticsPartners: 0,
          financeProviders: 0,
        };

        // Count different types of users based on actual data
        if (profiles) {
          profiles.forEach(profile => {
            if (profile.account_type === 'seller' && profile.seller_roles) {
              if (profile.seller_roles.includes('robot_seller')) {
                statsData.robotSellers++;
              }
              if (profile.seller_roles.includes('spare_parts_seller')) {
                statsData.partsSellers++;
              }
              if (profile.seller_roles.includes('service_provider')) {
                statsData.serviceProviders++;
              }
            } else if (profile.account_type === 'logistics') {
              statsData.logisticsPartners++;
            } else if (profile.account_type === 'finance') {
              statsData.financeProviders++;
            }
          });
        }

        setStats(statsData);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Remove periodic updates - no mock data
  }, []);

  const statItems = [
    {
      icon: Users,
      label: "Live Users Online",
      value: stats.liveUsers,
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Bot,
      label: "Robot Sellers",
      value: stats.robotSellers,
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: Package,
      label: "Spare Parts Sellers",
      value: stats.partsSellers,
      gradient: "from-purple-500 to-violet-600",
    },
    {
      icon: Settings,
      label: "Service Providers",
      value: stats.serviceProviders,
      gradient: "from-orange-500 to-red-600",
    },
    {
      icon: Truck,
      label: "Logistics Partners",
      value: stats.logisticsPartners,
      gradient: "from-indigo-500 to-blue-600",
    },
    {
      icon: CreditCard,
      label: "Finance Providers",
      value: stats.financeProviders,
      gradient: "from-pink-500 to-rose-600",
    },
  ];

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-card/80 backdrop-blur-sm border-border animate-pulse">
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 bg-muted rounded mx-auto mb-2"></div>
                  <div className="h-6 bg-muted rounded mb-1"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
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
          <p className="text-muted-foreground">Real-time data from our growing community</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="bg-card/80 backdrop-blur-sm border-border hover:scale-105 transition-transform duration-200">
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${item.gradient} flex items-center justify-center mx-auto mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {item.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {item.label}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LiveStats;