import { useState, useEffect } from "react";
import { Users, Settings, Package, Truck, CreditCard, Bot, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatsData {
  liveUsers: number;
  robotSellers: number;
  partsSellers: number;
  serviceProviders: number;
  logisticsPartners: number;
  financeProviders: number;
}

const iconInfo = {
  liveUsers: {
    label: "Live Users Online",
    desc: "Registered users (all types) currently active in the platform"
  },
  robotSellers: {
    label: "Robot Sellers",
    desc: "Companies/individuals offering robot listings for sale"
  },
  partsSellers: {
    label: "Spare Parts Sellers",
    desc: "Sellers providing spare parts inventory"
  },
  serviceProviders: {
    label: "Service Providers",
    desc: "Companies offering maintenance, repair, or installation"
  },
  logisticsPartners: {
    label: "Logistics Partners",
    desc: "Verified logistics/shipping partners for robotics deals"
  },
  financeProviders: {
    label: "Finance Providers",
    desc: "Entities offering loans, leases, or financial services"
  }
};

const statItems = [
  {
    key: "liveUsers",
    icon: Users,
    gradient: "from-green-500 to-emerald-600",
  },
  {
    key: "robotSellers",
    icon: Bot,
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    key: "partsSellers",
    icon: Package,
    gradient: "from-purple-500 to-violet-600",
  },
  {
    key: "serviceProviders",
    icon: Settings,
    gradient: "from-orange-500 to-red-600",
  },
  {
    key: "logisticsPartners",
    icon: Truck,
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    key: "financeProviders",
    icon: CreditCard,
    gradient: "from-pink-500 to-rose-600",
  },
];

const getUnique = (arr: any[], field: string) => [...new Set(arr.map((x) => x[field]).filter(Boolean))];

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
    fetchStats();
    const interval = setInterval(fetchStats, 120000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    setLoading(true);

    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, account_type, user_type, seller_roles, roles");

      if (error) throw error;

      // Count unique live users (registered, regardless of type)
      const uniqueUserIds = getUnique(profiles, "id");
      const liveUsers = uniqueUserIds.length;

      // Prepare role counters
      let robotSellers = 0, partsSellers = 0, serviceProviders = 0, logisticsPartners = 0, financeProviders = 0;

      profiles.forEach((profile) => {
        // Normalize all role fields
        const { account_type, user_type, seller_roles, roles } = profile;

        const rolesMerged: string[] = [
          ...(Array.isArray(seller_roles) ? seller_roles : seller_roles ? [seller_roles] : []),
          ...(Array.isArray(roles) ? roles : roles ? [roles] : []),
          ...(user_type ? [user_type] : []),
          ...(account_type ? [account_type] : []),
        ]
          .flat()
          .map((r) => (typeof r === "string" ? r.toLowerCase() : ""))
          .filter(Boolean);

        if (
          rolesMerged.some((r) =>
            ["robot_seller", "seller", "robotseller"].includes(r)
          )
        ) {
          robotSellers++;
        }
        if (
          rolesMerged.some((r) =>
            ["parts_seller", "spare_parts_seller", "partsseller"].includes(r)
          )
        ) {
          partsSellers++;
        }
        if (
          rolesMerged.some((r) =>
            ["service_provider", "serviceprovider"].includes(r)
          )
        ) {
          serviceProviders++;
        }
        if (
          rolesMerged.some((r) =>
            ["logistics_provider", "logistics", "logisticspartner"].includes(r)
          )
        ) {
          logisticsPartners++;
        }
        if (
          rolesMerged.some((r) =>
            ["finance_provider", "finance", "financepartner"].includes(r)
          )
        ) {
          financeProviders++;
        }
      });

      setStats({
        liveUsers,
        robotSellers,
        partsSellers,
        serviceProviders,
        logisticsPartners,
        financeProviders,
      });
    } catch (error) {
      // If there's a DB error, show zeros rather than crash the page.
      setStats({
        liveUsers: 0,
        robotSellers: 0,
        partsSellers: 0,
        serviceProviders: 0,
        logisticsPartners: 0,
        financeProviders: 0,
      });
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Live Marketplace Stats</h2>
          <p className="text-muted-foreground">Real-time data from our growing B2B robotics marketplace</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statItems.map((item) => {
            const Icon = item.icon;
            const key = item.key as keyof StatsData;
            return (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="bg-card/80 backdrop-blur-sm border-border hover:scale-105 hover:shadow-lg transition-transform duration-200">
                      <CardContent className="p-4 text-center">
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-r ${item.gradient} flex items-center justify-center mx-auto mb-3`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-foreground mb-1 tabular-nums">
                          {loading ? <span className="opacity-60">—</span> : stats[key].toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          {iconInfo[key].label}
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-left">
                    <span className="text-base font-medium">{iconInfo[key].label}</span>
                    <div className="text-xs text-muted-foreground mt-1">{iconInfo[key].desc}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground text-center mt-8">
          Stats update every 2 minutes · Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </section>
  );
};

export default LiveStats;
