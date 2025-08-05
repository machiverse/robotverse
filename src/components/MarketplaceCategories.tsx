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
  icon: any;
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
      requests: 0,
      providers: 0,
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
    description: "Flexible financing options",
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
        // === Robots ===
        const { data: robotsData, error: robotsError } = await supabase
          .from("robots")
          .select("id");
        if (robotsError) throw robotsError;
        const robotListingsCount = robotsData?.length ?? 0;

        // Count distinct locations for robots
        const { data: robotLocationsData, error: robotLocError } = await supabase
          .from("robots")
          .select("location");
        if (robotLocError) throw robotLocError;
        const uniqueLocations = new Set(robotLocationsData?.map(item => item.location).filter(Boolean) || []);
        const robotLocationsCount = uniqueLocations.size;

        // === Spare Parts ===
        const { data: partsData, error: partsError } = await supabase
          .from("spare_parts")
          .select("id");
        if (partsError) throw partsError;
        const partsListingsCount = partsData?.length ?? 0;

        // Suppliers count (distinct sellers from spare_parts)
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("spare_parts")
          .select("seller_id");
        if (suppliersError) throw suppliersError;
        const uniqueSellerIds = new Set(suppliersData?.map(item => item.seller_id) || []);
        const suppliersCount = uniqueSellerIds.size;

        // === Services ===
        const { data: serviceRequestsData, error: serviceReqError } = await supabase
          .from("service_requests")
          .select("id");
        if (serviceReqError) throw serviceReqError;
        const activeRequestsCount = serviceRequestsData?.length ?? 0;

        // Service Providers count (distinct providers from services)
        const { data: serviceProvidersData, error: serviceProvError } = await supabase
          .from("services")
          .select("provider_id");
        if (serviceProvError) throw serviceProvError;
        const uniqueProviderIds = new Set(serviceProvidersData?.map(item => item.provider_id) || []);
        const serviceProvidersCount = uniqueProviderIds.size;

        // === Logistics ===
        const { data: logisticsData, error: logisticsError } = await supabase
          .from("logistics_services")
          .select("id, coverage_areas")
          .eq("is_active", true);
        if (logisticsError) throw logisticsError;
        const logisticsServicesCount = logisticsData?.length ?? 0;

        // Count total coverage areas
        const allCoverageAreas = logisticsData?.flatMap(service => service.coverage_areas || []) || [];
        const uniqueCoverageAreas = new Set(allCoverageAreas);
        const logisticsCoverageCount = uniqueCoverageAreas.size;

        // === Finance ===
        const { data: financeData, error: financeError } = await supabase
          .from("loan_products")
          .select("id, provider_id")
          .eq("is_active", true);
        if (financeError) throw financeError;
        const financeProductsCount = financeData?.length ?? 0;

        // Finance Providers count (distinct providers from loan_products)
        const uniqueFinanceProviders = new Set(financeData?.map(product => product.provider_id) || []);
        const financeProvidersCount = uniqueFinanceProviders.size;

        // Update categoriesData state with fetched counts
        setCategoriesData((prev) =>
          prev.map((category) => {
            if (category.id === "robots") {
              return {
                ...category,
                stats: { listings: robotListingsCount, locations: robotLocationsCount },
              };
            }
            if (category.id === "parts") {
              return {
                ...category,
                stats: { listings: partsListingsCount, suppliers: suppliersCount },
              };
            }
            if (category.id === "services") {
              return {
                ...category,
                stats: { requests: activeRequestsCount, providers: serviceProvidersCount },
              };
            }
            if (category.id === "logistics") {
              return {
                ...category,
                stats: { services: logisticsServicesCount, coverage: logisticsCoverageCount },
              };
            }
            if (category.id === "finance") {
              return {
                ...category,
                stats: { products: financeProductsCount, providers: financeProvidersCount },
              };
            }
            return category;
          }),
        );
      } catch (error) {
        console.error("Failed to fetch marketplace stats:", error);
      }
    }
    fetchStats();
  }, []);

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {categoriesData.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.id} to={category.href} tabIndex={0} aria-label={category.title}>
                <Card
                  className="group bg-card/80 backdrop-blur-sm border-border hover:scale-105 hover:shadow-glow transition-all duration-300 cursor-pointer"
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${category.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>

                    <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                    <p className="text-muted-foreground mb-4">{category.description}</p>

                    <div className="space-y-3">
                      {Object.entries(category.stats).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {key === "listings" && <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "locations" && <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "suppliers" && <Users className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "requests" && <Clock className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "providers" && <Settings className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "services" && <Truck className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "products" && <CreditCard className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "opportunities" && <Briefcase className="w-4 h-4 text-primary" aria-hidden="true" />}
                            {key === "coverage" && <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />}
                            <span className="text-sm text-muted-foreground capitalize">
                              {key === "listings"
                                ? "Active listings"
                                : key === "locations"
                                ? "locations available"
                                : key === "suppliers"
                                ? "suppliers"
                                : key === "requests"
                                ? "Active requests"
                                : key === "providers"
                                ? "service providers"
                                : key === "services"
                                ? "logistics services"
                                : key === "products"
                                ? "loan products"
                                : key === "opportunities"
                                ? "Job opportunities"
                                : key === "coverage"
                                ? "coverage areas"
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