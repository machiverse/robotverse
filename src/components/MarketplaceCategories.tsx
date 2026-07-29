import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/router-compat";
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
    gradient: "from-blue-500 to-cyan-600",
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
    gradient: "from-green-500 to-emerald-600",
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
    gradient: "from-purple-500 to-violet-600",
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
    gradient: "from-indigo-500 to-purple-600",
    href: "/services",
  },
];

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

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-3 md:mb-4 text-center bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Everything You Need in One Marketplace
        </h2>
        <p className="text-center text-base md:text-lg text-muted-foreground mb-8 md:mb-12 max-w-3xl mx-auto px-4">
          Buy robots and access all supporting services seamlessly
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          {categoriesData.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.id}
                to={category.href}
                aria-label={category.title}
                tabIndex={0}
                className="group"
              >
                <Card className="border border-border/50 bg-card p-6 text-center hover:shadow-xl transition-all duration-300 cursor-pointer">
                  <CardContent className="p-0">
                    <div
                      className={`w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-r ${category.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">{category.title}</h3>
                    <p className="text-sm text-muted-foreground mb-6">{category.description}</p>

                    <div className="space-y-3">
                      {Object.entries(category.stats).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {key === "listings" && <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "locations" && <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "suppliers" && <Users className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "providers" && <Settings className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "services" && <Truck className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "products" && <CreditCard className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "opportunities" && <Briefcase className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "coverage" && <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />}
                            <span className="text-sm text-muted-foreground capitalize">
                              {key === "listings"
                                ? "Active listings"
                                : key === "locations"
                                ? "Locations available"
                                : key === "suppliers"
                                ? "Suppliers"
                                : key === "providers"
                                ? "Service providers"
                                : key === "services"
                                ? "Logistics services"
                                : key === "products"
                                ? "Loan products"
                                : key === "opportunities"
                                ? "Job opportunities"
                                : key === "coverage"
                                ? "Coverage areas"
                                : key}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs" aria-label={`${value} ${key}`}>
                            {typeof value === "number" ? value.toLocaleString() : value}
                          </Badge>
                        </div>
                      ))}
                    </div>
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
