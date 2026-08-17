import { Bot, Package, Settings, Truck, CreditCard, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const ProfessionalCategories = () => {
  const categories = [
    {
      icon: Bot,
      title: "Robot Sellers",
      description: "Sell industrial robots and automation equipment",
      features: ["Product listings", "Inventory management", "Sales analytics", "Customer management"],
      gradient: "from-blue-500 to-cyan-600",
      link: "/auth?role=robot_seller"
    },
    {
      icon: Package,
      title: "Parts Sellers",
      description: "Supply spare parts and components",
      features: ["Parts catalog", "Compatibility matching", "Bulk pricing", "Quick delivery"],
      gradient: "from-purple-500 to-violet-600",
      link: "/auth?role=parts_seller"
    },
    {
      icon: Settings,
      title: "Service Providers",
      description: "Offer maintenance and installation services",
      features: ["Service scheduling", "Technical expertise", "On-site support", "Warranty coverage"],
      gradient: "from-orange-500 to-red-600",
      link: "/auth?role=service_provider"
    },
    {
      icon: Truck,
      title: "Logistics Partners",
      description: "Provide shipping and delivery solutions",
      features: ["Global shipping", "Specialized handling", "Real-time tracking", "Insurance coverage"],
      gradient: "from-indigo-500 to-blue-600",
      link: "/auth?role=logistics_provider"
    },
    {
      icon: CreditCard,
      title: "Finance Providers",
      description: "Offer loans and leasing options",
      features: ["Quick approvals", "Flexible terms", "Competitive rates", "Equipment financing"],
      gradient: "from-green-500 to-emerald-600",
      link: "/auth?role=finance_provider"
    },
    {
      icon: Users,
      title: "Buyers & End Users",
      description: "Find and purchase robotics solutions",
      features: ["Product search", "Price comparison", "Expert consultation", "Complete solutions"],
      gradient: "from-pink-500 to-rose-600",
      link: "/auth?role=buyer"
    }
  ];

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Professional Categories
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto px-4">
            Join thousands of professionals in the robotics ecosystem. Choose your role and start your journey.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link key={index} to={category.link}>
                <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50 h-full">
                  <CardContent className="p-4 md:p-6">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-r ${category.gradient} flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    
                    <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3 text-foreground group-hover:text-primary transition-colors">
                      {category.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-3 md:mb-4 leading-relaxed">
                      {category.description}
                    </p>
                    
                    <div className="space-y-2">
                      <h4 className="text-xs md:text-sm font-semibold text-foreground mb-2">Key Features:</h4>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {category.features.map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-border/50">
                      <span className="text-xs md:text-sm text-primary font-medium group-hover:underline">
                        Join as {category.title.toLowerCase()} →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
            <h3 className="text-2xl font-semibold mb-3 text-foreground">
              Ready to Get Started?
            </h3>
            <p className="text-muted-foreground mb-4">
              Join our growing community of robotics professionals
            </p>
            <Link to="/auth">
              <Badge className="text-base px-6 py-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                Register Now
              </Badge>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalCategories;