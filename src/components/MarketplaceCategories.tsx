import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Bot,
  Package,
  Settings,
  Briefcase,
  MapPin,
  TrendingUp,
  Users,
  Clock,
  Truck,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CategoryStats {
  [key: string]: number;
}

interface MarketplaceCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  stats: CategoryStats;
  gradient: string;
  href: string;
}

const marketplaceCategoriesInitial: MarketplaceCategory[] = [
  {
    id: "robots",
    title: "Industrial Robots",
    description: "Quality industrial robots and automation",
    icon: Bot,
    stats: {
      listings: 0,
      locations: 0,
    },
    gradient: "from-primary to-primary",
    href: "/robots",
  },
  {
    id: "parts",
    title: "Spare Parts",
    description: "Genuine parts for your robots",
    icon: Package,
    stats: {
      listings: 0,
      suppliers: 0,
    },
    gradient: "from-success to-success",
    href: "/parts",
  },
  {
    id: "services",
    title: "Services",
    description: "Professional maintenance & repair",
    icon: Settings,
    stats: {
      providers: 0,
      locations: 0,
    },
    gradient: "from-primary to-primary",
    href: "/services",
  },
  {
    id: "logistics",
    title: "Logistics",
    description: "Shipping & delivery solutions",
    icon: Truck,
    stats: {
      services: 0,
      coverage: 0,
    },
    gradient: "from-orange-500 to-red-600",
    href: "/services",
  },
  {
    id: "finance",
    title: "Finance",
    description: "Flexible financing options & Insurance",
    icon: CreditCard,
    stats: {
      products: 0,
      providers: 0,
    },
    gradient: "from-primary to-primary",
    href: "/services",
  },
];

const STAT_META: Record<string, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  listings: { label: "Active listings", icon: TrendingUp },
  locations: { label: "Locations available", icon: MapPin },
  suppliers: { label: "Suppliers", icon: Users },
  providers: { label: "Service providers", icon: Settings },
  services: { label: "Logistics services", icon: Truck },
  products: { label: "Loan products", icon: CreditCard },
  opportunities: { label: "Job opportunities", icon: Briefcase },
  coverage: { label: "Coverage areas", icon: MapPin },
};

const MarketplaceCategories = () => {
  const [categoriesData, setCategoriesData] = useState(marketplaceCategoriesInitial);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          { data: robotsData, error: robotsError },
          { data: robotLocationsData, error: robotLocError },
          { data: partsData, error: partsError },
          { data: suppliersData, error: suppliersError },
          { data: serviceProvidersData, error: serviceProvError },
          { data: serviceLocationsData, error: serviceLocError },
          { data: logisticsData, error: logisticsError },
          { data: financeData, error: financeError },
        ] = await Promise.all([
          supabase.from("robots").select("id"),
          supabase.from("robots").select("location"),
          supabase.from("spare_parts").select("id"),
          supabase.from("spare_parts").select("seller_id"),
          supabase.from("services").select("provider_id"),
          supabase.from("services").select("location"),
          supabase.from("logistics_services").select("id, coverage_areas").eq("is_active", true),
          supabase.from("loan_products").select("id, provider_id").eq("is_active", true),
        ]);

        if (robotsError) console.error("Robots error:", robotsError);
        if (robotLocError) console.error("Robot locations error:", robotLocError);
        if (partsError) console.error("Parts error:", partsError);
        if (suppliersError) console.error("Suppliers error:", suppliersError);
        if (serviceProvError) console.error("Service providers error:", serviceProvError);
        if (serviceLocError) console.error("Service locations error:", serviceLocError);
        if (logisticsError) console.error("Logistics error:", logisticsError);
        if (financeError) console.error("Finance error:", financeError);

        const robotListingsCount = robotsData?.length ?? 0;
        const uniqueLocations = new Set(robotLocationsData?.map(item => item.location).filter(Boolean) ?? []);
        const robotLocationsCount = uniqueLocations.size;

        const partsListingsCount = partsData?.length ?? 0;
        const uniqueSellerIds = new Set(suppliersData?.map(item => item.seller_id) ?? []);
        const suppliersCount = uniqueSellerIds.size;

        const uniqueProviderIds = new Set(serviceProvidersData?.map(item => item.provider_id) ?? []);
        const serviceProvidersCount = uniqueProviderIds.size;
        
        const uniqueServiceLocations = new Set(serviceLocationsData?.map(item => item.location).filter(Boolean) ?? []);
        const serviceLocationsCount = uniqueServiceLocations.size;

        const logisticsServicesCount = logisticsData?.length ?? 0;
        const allCoverageAreas = logisticsData?.flatMap(service => service.coverage_areas ?? []) ?? [];
        const uniqueCoverageAreas = new Set(allCoverageAreas);
        const logisticsCoverageCount = uniqueCoverageAreas.size;

        const financeProductsCount = financeData?.length ?? 0;
        const uniqueFinanceProviders = new Set(financeData?.map(product => product.provider_id) ?? []);
        const financeProvidersCount = uniqueFinanceProviders.size;

        setCategoriesData((prev) =>
          prev.map(category => {
            switch (category.id) {
              case "robots":
                return { ...category, stats: { listings: robotListingsCount, locations: robotLocationsCount } };
              case "parts":
                return { ...category, stats: { listings: partsListingsCount, suppliers: suppliersCount } };
              case "services":
                return { ...category, stats: { providers: serviceProvidersCount, locations: serviceLocationsCount } };
              case "logistics":
                return { ...category, stats: { services: logisticsServicesCount, coverage: logisticsCoverageCount } };
              case "finance":
                return { ...category, stats: { products: financeProductsCount, providers: financeProvidersCount } };
              default:
                return category;
            }
          }),
        );
      } catch (error) {
        console.error("Failed to fetch marketplace stats:", error);
      }
    }
    fetchStats();
  }, []);

  const [primary, ...rest] = categoriesData;

  const renderStats = (category: MarketplaceCategory, dense = false) => (
    <div className={dense ? "space-y-2" : "space-y-3"}>
      {Object.entries(category.stats).map(([key, value]) => {
        const meta = STAT_META[key];
        const StatIcon = meta?.icon;
        return (
          <div key={key} className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              {StatIcon && <StatIcon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
              <span className="text-sm text-muted-foreground truncate">{meta?.label ?? key}</span>
            </div>
            <Badge variant="secondary" className="text-xs tabular" aria-label={`${value} ${key}`}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </Badge>
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="relative z-10 py-10 md:py-14 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">
          Everything You Need in One Marketplace
        </h2>
        <p className="text-base text-muted-foreground mb-6 md:mb-8">
          Buy robots and access all supporting services seamlessly
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Primary path: Industrial Robots */}
          {primary && (
            <Link
              to={primary.href}
              aria-label={primary.title}
              className="lg:col-span-2 lg:row-span-2"
            >
              <Card className="h-full bg-card border border-border hover:border-primary/50 hover:bg-accent/40 transition-colors duration-150 cursor-pointer">
                <CardContent className="p-6 md:p-8 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-5">
                    <primary.icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 text-foreground">{primary.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-md">
                    {primary.description}
                  </p>
                  <div className="max-w-sm">{renderStats(primary)}</div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Supporting categories 2x2 */}
          {rest.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.id} to={category.href} aria-label={category.title}>
                <Card className="h-full bg-card border border-border hover:border-primary/50 hover:bg-accent/40 transition-colors duration-150 cursor-pointer">
                  <CardContent className="p-5">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold mb-1 text-foreground">{category.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4">{category.description}</p>
                    {renderStats(category, true)}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MarketplaceCategories;
