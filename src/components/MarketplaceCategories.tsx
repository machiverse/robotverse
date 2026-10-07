import { useState, useEffect } from "react";
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
import { PixelArrow } from "@/components/hero/HeroConsole";
import robotsPhoto from "@/assets/hero-pick-place.jpg";
import { BevelBox, SectionHead, pad2 } from "@/components/console/ConsoleUI";

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

  const renderStats = (category: MarketplaceCategory) => (
    <dl className="divide-y divide-border border-t border-border">
      {Object.entries(category.stats).map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-3 py-2">
          <dt className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {STAT_META[key]?.label ?? key}
          </dt>
          <dd className="font-mono text-sm tabular-nums text-foreground" aria-label={`${value} ${key}`}>
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </dd>
        </div>
      ))}
    </dl>
  );

  const cardLink =
    "group block h-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <section className="relative z-10 border-t border-border bg-background py-14 md:py-20">
      <div className="container mx-auto px-4">
        <SectionHead
          index="003"
          label="Ecosystem"
          title="Everything you need in one marketplace"
          subtitle="Buy robots and reach every supporting service from one place."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
          {/* Primary path: Industrial Robots */}
          {primary && (
            <Link to={primary.href} aria-label={primary.title} className={`${cardLink} sm:col-span-2 lg:row-span-2`}>
              <BevelBox className="h-full" cut={16} innerClassName="flex flex-col p-6 md:p-8">
                <div className="relative -mx-6 -mt-6 mb-6 aspect-[16/7] overflow-hidden border-b border-border md:-mx-8 md:-mt-8">
                  <img
                    src={robotsPhoto}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-[70%_center] transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-4 top-4 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-foreground md:left-6 md:top-6">01</span>
                  <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center bg-primary text-primary-foreground md:bottom-6 md:right-6">
                    <primary.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="text-2xl font-semibold uppercase tracking-[-0.02em] text-foreground md:text-3xl">
                  {primary.title}
                </h3>
                <p className="mb-8 mt-2 max-w-md text-sm text-muted-foreground md:text-base">{primary.description}</p>
                <div className="mt-auto max-w-sm">{renderStats(primary)}</div>
                <span className="mt-6 inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] text-foreground transition-colors duration-150 group-hover:text-primary">
                  <PixelArrow /> Browse robots
                </span>
              </BevelBox>
            </Link>
          )}

          {/* Supporting categories */}
          {rest.map((category, i) => {
            const Icon = category.icon;
            return (
              <Link key={category.id} to={category.href} aria-label={category.title} className={cardLink}>
                <BevelBox className="h-full" innerClassName="flex flex-col p-5">
                  <div className="mb-6 flex items-start justify-between">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{pad2(i + 2)}</span>
                    <span className="flex h-9 w-9 items-center justify-center border border-border text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="flex items-center justify-between gap-2 text-base font-semibold uppercase tracking-[-0.01em] text-foreground">
                    {category.title}
                    <PixelArrow className="text-muted-foreground transition-colors duration-150 group-hover:text-primary" />
                  </h3>
                  <p className="mb-5 mt-1 text-xs text-muted-foreground">{category.description}</p>
                  <div className="mt-auto">{renderStats(category)}</div>
                </BevelBox>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MarketplaceCategories;
