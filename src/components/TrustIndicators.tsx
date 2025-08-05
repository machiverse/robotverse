import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  CheckCircle,
  Brain,
  MapPin,
  Users,
  Clock,
  TrendingUp,
  Activity,
  Loader2,
  ShoppingCart,
  Wrench,
  Package,
  Truck,
  GraduationCap,
  CreditCard,
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

/* ───────────────────────── 1. WHY-CHOOSE BENEFITS ────────────────────────── */
const benefitCards = [
  {
    icon: ShieldCheck,
    title: "Verified Partners",
    description:
      "All sellers, service providers, and logistics partners pass rigorous verification for complete peace of mind.",
    gradient: "from-green-500 to-emerald-600",
  },
  {
    icon: ShoppingCart,
    title: "Seamless Purchase & Installation",
    description:
      "End-to-end support from quoting and ordering to on-site installation by certified engineers.",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    icon: Wrench,
    title: "Maintenance & Repair",
    description:
      "Preventive maintenance programs and on-demand repair services keep your production running 24/7.",
    gradient: "from-purple-500 to-violet-600",
  },
  {
    icon: Package,
    title: "Genuine Spare Parts",
    description:
      "Original, warranty-backed spare parts available with real-time stock visibility and fast dispatch.",
    gradient: "from-yellow-500 to-orange-600",
  },
  {
    icon: Truck,
    title: "Pan-India Logistics",
    description:
      "Door-to-door transport, customs clearance, and last-mile delivery handled by expert freight partners.",
    gradient: "from-orange-500 to-red-600",
  },
  {
    icon: GraduationCap,
    title: "Training & Certification",
    description:
      "Operator up-skilling, safety courses, and OEM-approved certification – on-site or virtual.",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    icon: CreditCard,
    title: "Finance & Insurance",
    description:
      "Flexible leasing, EMI plans, and asset insurance packages to de-risk every investment.",
    gradient: "from-indigo-500 to-blue-700",
  },
  {
    icon: Brain,
    title: "AI-Powered Matching",
    description:
      "Proprietary AI recommends optimal robots, services, and parts based on your exact production goals.",
    gradient: "from-teal-500 to-cyan-600",
  },
];

/* ───────────────────────── 2. COMPONENT ────────────────────────── */
const RobotVerseOverview = () => {
  const [stats, setStats] = useState<RealStatsData>({
    totalUsers: 0,
    verifiedUsers: 0,
    activeListings: 0,
    robotCategories: 0,
    serviceProviders: 0,
    citiesCovered: 0,
    customerSatisfaction: 0,
    lastUpdated: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ─── Fetch live marketplace numbers ─── */
  const fetchLiveStats = async () => {
    try {
      setError(null);

      const [
        profilesRes,
        robotsRes,
        servicesRes,
        partsRes,
      ] = await Promise.allSettled([
        supabase
          .from("profiles")
          .select("user_type, full_name, email, phone, company_name"),
        supabase
          .from("robots")
          .select("availability, robot_type, location")
          .eq("availability", "available"),
        supabase.from("services").select("service_type, location"),
        supabase.from("spare_parts").select("quantity").gt("quantity", 0),
      ]);

      const profiles =
        profilesRes.status === "fulfilled" ? profilesRes.value.data ?? [] : [];
      const robots =
        robotsRes.status === "fulfilled" ? robotsRes.value.data ?? [] : [];
      const services =
        servicesRes.status === "fulfilled" ? servicesRes.value.data ?? [] : [];
      const parts =
        partsRes.status === "fulfilled" ? partsRes.value.data ?? [] : [];

      const totalUsers = profiles.length;
      const verifiedUsers = profiles.filter(
        (p) => p.full_name && p.email && (p.phone || p.company_name),
      ).length;
      const activeListings = robots.length + parts.length;
      const robotCategories = new Set(
        robots.map((r) => r.robot_type).filter(Boolean),
      ).size;
      const serviceProviders =
        profiles.filter((p) => p.user_type === "service_provider").length +
        services.length;
      const uniqueCities = new Set(
        [...robots, ...services]
          .map((item) =>
            typeof item.location === "string"
              ? item.location.split(",")[0].trim()
              : "",
          )
          .filter(Boolean),
      ).size;
      const customerSatisfaction =
        totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

      setStats({
        totalUsers,
        verifiedUsers,
        activeListings,
        robotCategories,
        serviceProviders,
        citiesCovered: uniqueCities,
        customerSatisfaction,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } catch (e) {
      console.error("Live-stats error:", e);
      setError("Failed to load live statistics.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Initial + interval fetch & realtime subscription ─── */
  useEffect(() => {
    fetchLiveStats();

    const interval = setInterval(fetchLiveStats, 60_000);
    const channel = supabase
      .channel("stats_updates")
      .on("postgres_changes", { event: "*", schema: "public" }, fetchLiveStats)
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);

  /* ─── Loading / Error states ─── */
  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-muted/20 to-background">
        <div className="container mx-auto px-4 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Loading live data…</h2>
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section className="py-20 bg-gradient-to-br from-muted/20 to-background">
        <div className="container mx-auto px-4 text-center space-y-4">
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={fetchLiveStats}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  /* ─── Derived display arrays ─── */
  const networkStats = [
    {
      icon: MapPin,
      label: "Pan-India Network",
      value: stats.citiesCovered.toString(),
      unit: "cities",
    },
    {
      icon: Users,
      label: "Trusted Community",
      value: stats.totalUsers.toString(),
      unit: "users",
    },
    {
      icon: TrendingUp,
      label: "Robot Categories",
      value: stats.robotCategories.toString(),
      unit: "types",
    },
    {
      icon: Clock,
      label: "Quality Support",
      value: "24/7",
      unit: "",
    },
  ];

  const liveStats = [
    {
      label: "Active Listings",
      value: stats.activeListings.toString(),
      color: "text-green-500",
    },
    {
      label: "Verified Users",
      value: stats.verifiedUsers.toString(),
      color: "text-blue-500",
    },
    {
      label: "Service Providers",
      value: stats.serviceProviders.toString(),
      color: "text-purple-500",
    },
    {
      label: "Profile Completion",
      value: `${stats.customerSatisfaction}%`,
      color: "text-orange-500",
    },
  ];

  /* ───────────────────────── UI ───────────────────────── */
  return (
    <section className="py-20 bg-gradient-to-br from-muted/20 to-background">
      <div className="container mx-auto px-4">
        {/* ── Heading ── */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-4">
            Why Choose RobotVerse?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            One unified platform for purchasing, installing, operating,
            servicing and financing industrial robots across India.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Activity className="w-3 h-3" /> Live Data
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Updated {stats.lastUpdated}
            </Badge>
          </div>
        </div>

        {/* ── Benefit Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16">
          {benefitCards.map(({ icon: Icon, title, description, gradient }) => (
            <Card
              key={title}
              className="bg-card/80 backdrop-blur-sm border-border hover:scale-105 transition-transform duration-300"
            >
              <CardContent className="p-6 text-center">
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${gradient} flex items-center justify-center`}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Network Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {networkStats.map(({ icon: Icon, label, value, unit }) => (
            <Card
              key={label}
              className="bg-card/60 backdrop-blur-sm border-border hover:shadow-lg transition-all duration-200"
            >
              <CardContent className="p-4 text-center">
                <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
                <h4 className="font-semibold text-sm mb-1">{label}</h4>
                <div className="text-2xl font-bold text-primary font-mono">
                  {value}
                </div>
                <p className="text-xs text-muted-foreground">{unit}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Live Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {liveStats.map(({ label, value, color }) => (
            <div
              key={label}
              className="text-center p-4 bg-card/40 backdrop-blur-sm rounded-lg border border-border hover:bg-card/60 transition-colors"
            >
              <div className={`text-3xl font-bold font-mono ${color}`}>
                {value}
              </div>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-lg text-muted-foreground mb-6">
            Join{" "}
            <span className="font-semibold text-primary">
              {stats.totalUsers.toLocaleString()}
            </span>{" "}
            businesses already on RobotVerse.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Badge
              variant="secondary"
              className="px-6 py-3 text-lg cursor-pointer hover:bg-primary hover:text-primary-foreground"
            >
              Start Buying
            </Badge>
            <Badge
              variant="outline"
              className="px-6 py-3 text-lg cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary"
            >
              Start Selling
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustIndicators;
