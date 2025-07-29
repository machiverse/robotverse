import { useState, useEffect } from "react";
import { Users, Settings, Package, Truck, CreditCard, Bot, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Stat card metadata for pro-level tooltips and labels
const STAT_META = {
  liveUsers: {
    label: "Live Users Online",
    desc: "Registered users (all types) currently active in the platform",
    icon: Users,
    gradient: "from-green-500 to-emerald-600"
  },
  robotSellers: {
    label: "Robot Sellers",
    desc: "Companies or users listing industrial robots for sale",
    icon: Bot,
    gradient: "from-blue-500 to-cyan-600"
  },
  partsSellers: {
    label: "Spare Parts Sellers",
    desc: "Sellers providing spare parts inventory",
    icon: Package,
    gradient: "from-purple-500 to-violet-600"
  },
  serviceProviders: {
    label: "Service Providers",
    desc: "Companies or professionals offering maintenance or automation services",
    icon: Settings,
    gradient: "from-orange-500 to-red-600"
  },
  logisticsPartners: {
    label: "Logistics Partners",
    desc: "Verified logistics/shipping partners for robotic deliveries",
    icon: Truck,
    gradient: "from-indigo-500 to-blue-600"
  },
  financeProviders: {
    label: "Finance Providers",
    desc: "Entities offering loans, leases, or financial service products for robotics",
    icon: CreditCard,
    gradient: "from-pink-500 to-rose-600"
  }
};

type StatsKeys = keyof typeof STAT_META;

interface StatsData {
  liveUsers: number;
  robotSellers: number;
  partsSellers: number;
  serviceProviders: number;
  logisticsPartners: number;
  financeProviders: number;
}

function parseRoles(profile: any): string[] {
  // Collect all possible "roles" fields, handle strings & arrays
  const roleFields: string[] = [];
  if (Array.isArray(profile.seller_roles)) roleFields.push(...profile.seller_roles);
  else if (typeof profile.seller_roles === "string") roleFields.push(profile.seller_roles);

  if (Array.isArray(profile.roles)) roleFields.push(...profile.roles);
  else if (typeof profile.roles === "string") roleFields.push(profile.roles);

  if (profile.user_type) roleFields.push(profile.user_type);
  if (profile.account_type) roleFields.push(profile.account_type);

  return roleFields.map((r) => (typeof r === "string" ? r.toLowerCase() : "")).filter(Boolean);
}

export default function LiveStats() {
  const [stats, setStats] = useState<StatsData>({
    liveUsers: 0,
    robotSellers: 0,
    partsSellers: 0,
    serviceProviders: 0,
    logisticsPartners: 0,
    financeProviders: 0
  });
  const [loading, setLoading] = useState(true);

  // Professional: Refresh stats every 2 minutes (120,000ms)
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 120000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, account_type, user_type, seller_roles, roles");
      if (error) throw error;

      const usersSet = new Set<string>();
      let robotSellers = 0, partsSellers = 0, serviceProviders = 0, logisticsPartners = 0, financeProviders = 0;
      (profiles || []).forEach((profile) => {
        if (profile.id) usersSet.add(profile.id);
        const roles = parseRoles(profile);
        if (
          roles.some((r) =>
            ["robot_seller", "seller", "robotseller"].includes(r)
          )
        ) robotSellers++;
        if (
          roles.some((r) =>
            ["parts_seller", "spare_parts_seller", "partsseller"].includes(r)
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
      // Optionally, you can show a toast error here
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
          <p className="text-muted-foreground">Real-time stats from our growing robotics marketplace</p>
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
                          {loading ? <span className="opacity-60">—</span> : stats[key as StatsKeys].toLocaleString()}
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
export default LiveStats;