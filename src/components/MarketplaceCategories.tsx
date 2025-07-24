import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Package, 
  Settings, 
  Briefcase,
  MapPin,
  TrendingUp,
  Users,
  Clock
} from "lucide-react";

const marketplaceCategories = [
  {
    id: "machinery",
    title: "Used Machinery",
    description: "Quality pre-owned industrial equipment",
    icon: Bot,
    stats: {
      listings: 2,
      locations: 2
    },
    gradient: "from-blue-500 to-cyan-600",
    href: "/marketplace/machinery"
  },
  {
    id: "parts",
    title: "Spare Parts",
    description: "Genuine parts for your machines",
    icon: Package,
    stats: {
      listings: 1,
      suppliers: "Multiple"
    },
    gradient: "from-green-500 to-emerald-600",
    href: "/marketplace/parts"
  },
  {
    id: "services",
    title: "Services",
    description: "Professional maintenance & repair",
    icon: Settings,
    stats: {
      requests: 1,
      providers: 0
    },
    gradient: "from-purple-500 to-violet-600",
    href: "/marketplace/services"
  },
  {
    id: "jobwork",
    title: "Job Work",
    description: "Outsource manufacturing needs",
    icon: Briefcase,
    stats: {
      opportunities: "1,200+",
      coverage: "Pan-India"
    },
    gradient: "from-orange-500 to-red-600",
    href: "/marketplace/jobwork"
  }
];

const MarketplaceCategories = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Explore Our Marketplace</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find everything you need for your industrial operations with real-time inventory and location data
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {marketplaceCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card 
                key={category.id}
                className="group bg-card/80 backdrop-blur-sm border-border hover:scale-105 hover:shadow-glow transition-all duration-300 cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${category.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                  <p className="text-muted-foreground mb-4">{category.description}</p>
                  
                  <div className="space-y-3">
                    {Object.entries(category.stats).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {key === 'listings' && <TrendingUp className="w-4 h-4 text-primary" />}
                          {key === 'locations' && <MapPin className="w-4 h-4 text-primary" />}
                          {key === 'suppliers' && <Users className="w-4 h-4 text-primary" />}
                          {key === 'requests' && <Clock className="w-4 h-4 text-primary" />}
                          {key === 'providers' && <Settings className="w-4 h-4 text-primary" />}
                          {key === 'opportunities' && <Briefcase className="w-4 h-4 text-primary" />}
                          {key === 'coverage' && <MapPin className="w-4 h-4 text-primary" />}
                          <span className="text-sm text-muted-foreground capitalize">
                            {key === 'listings' ? 'Active listings' : 
                             key === 'locations' ? 'locations available' :
                             key === 'suppliers' ? 'suppliers' :
                             key === 'requests' ? 'Active requests' :
                             key === 'providers' ? 'service providers' :
                             key === 'opportunities' ? 'Job opportunities' :
                             key === 'coverage' ? 'coverage' : key}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </Badge>
                      </div>
                    ))}
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

export default MarketplaceCategories;