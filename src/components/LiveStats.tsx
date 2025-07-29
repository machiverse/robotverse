import { useState, useEffect } from "react";
import { Users, Settings, Package, Truck, CreditCard, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STAT_META = {
  liveUsers: {
    label: "Live Users Online",
    desc: "Registered users (all types) present in the platform",
    icon: Users,
    gradient: "from-green-500 to-emerald-600"
  },
  robotSellers: {
    label: "Robot Sellers",
    desc: "Companies or individuals offering robots for sale",
    icon: Bot,
    gradient: "from-blue-500 to-cyan-600"
  },
  partsSellers: {
    label: "Spare Parts Sellers",
    desc: "Sellers listing/exchanging robot spare parts",
    icon: Package,
    gradient: "from-purple-500 to-violet-600"
  },
  serviceProviders: {
    label: "Service Providers",
    desc: "Companies or persons offering installation, maintenance, or support",
    icon: Settings,
    gradient: "from-orange-500 to-red-600"
  },
  logisticsPartners: {
    label: "Logistics Partners",
    desc: "Verified shipping/delivery partners on the platform",
    icon: Truck,
    gradient: "from-indigo-500 to-blue-600"
  },
  financeProviders: {
    label: "Finance Providers",
    desc: "Entities offering loans, leases, or finance for robots/parts",
    icon: CreditCard,
    gradient: "from-pink-500 to-rose-600"
  }
};

// Strong typing
type StatsKeys = keyof typeof STAT_META;
interface StatsData {
  liveUsers: number;
  robotSellers: number;
  partsSellers: number;
  serviceProviders: number;
  logisticsPartners: number;
  financeProviders: number;
}

// Helper for safe extracting/normalizing all possible role fields
function parseRoles(profile: any): string[] {
  const result: string[] = [];

  // Helper to add a value or array of values
  function add(r: any) {
    if (Array.isArray(r)) result.push(...r);
    else if (typeof r === "string") result.push(r);
  }

  add(profile?.seller_roles);
  add(profile?.roles);
  add(profile?.user_type);
  add(profile?.account_type);

  return result.map((r) => (typeof r === "string" ? r.toLowerCase() : "")).filter(Boolean);
}

export default function LiveStats() {
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

    const interval = setInterval(fetchStats, 120000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, seller_roles, roles, user_type, account_type");
      if (error || !Array.isArray(profiles)) throw error || "No profile data";

      const usersSet = new Set<string>();
      let robotSellers = 0,
        partsSellers = 0,
        serviceProviders = 0,
        logisticsPartners = 0,
        financeProviders = 0;

      profiles.forEach((profile) => {
        if (profile.id) usersSet.add(profile.id);
        const roles = parseRoles(profile);
        if (
          roles.some((r) =>
            ["robot_seller", "seller", "robotseller"].includes(r)
          )
        ) robotSellers++;
        if (
          roles.some((r) =>
            [
              "parts_seller",
              "spare_parts_seller",
              "partsseller",
              "partseller",
            ].includes(r)
          )
        ) partsSellers++;
        if (
          roles.some((r) =>
            ["service_provider", "serviceprovider"].includes(r)
          )
        ) serviceProviders++;
        if (
          roles.some((r) =>
            ["logistics_provider", "logistics", "logisticspartner"].includes(r)
          )
        ) logisticsPartners++;
        if (
          roles.some((r) =>
            ["finance_provider", "finance", "financepartner"].includes(r)
          )
        ) financeProviders++;
      });

      setStats({
        liveUsers: usersSet.size,
        robotSellers,
        partsSellers,
        serviceProviders,
        logisticsPartners,
        financeProviders
      });
    } catch (error) {
      setStats({
        liveUsers: 0,
        robotSellers: 0,
        partsSellers: 0,
        serviceProviders: 0,
        logisticsPartners: 0,
        financeProviders: 0
      });
      // Optionally: show a toast or notification
      console.error("Error fetching live stats:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Live Marketplace Stats</h2>
          <p className="text-muted-foreground">
            Real-time stats from our growing robotics B2B marketplace
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(Object.keys(STAT_META) as StatsKeys[]).map((key) => {
            // @ts-ignore
            const { label, icon: Icon, gradient, desc } = STAT_META[key];
            return (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="bg-card/80 backdrop-blur-sm border-border hover:scale-105 hover:shadow-lg transition-transform duration-200">
                      <CardContent className="p-4 text-center">
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center mx-auto mb-3`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-foreground mb-1 tabular-nums">
                          {loading ? (
                            <span className="opacity-60">—</span>
                          ) : (
                            stats[key as StatsKeys].toLocaleString()
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          {label}
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-left">
                    <span className="text-base font-medium">{label}</span>
                    <div className="text-xs text-muted-foreground mt-1">{desc}</div>
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
}
