import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Store, Wrench, Settings } from "lucide-react";

interface UserTypeSelectorProps {
  onSelect: (type: 'buyer' | 'seller' | 'service' | 'parts') => void;
}

const UserTypeSelector = ({ onSelect }: UserTypeSelectorProps) => {
  const userTypes = [
    {
      id: 'buyer' as const,
      title: 'Robot Buyer',
      description: 'Browse and purchase robots from verified sellers',
      icon: ShoppingCart,
      features: ['Access to marketplace', 'Verified sellers', 'Secure payments', 'Product reviews']
    },
    {
      id: 'seller' as const,
      title: 'Robot Seller',
      description: 'Sell your robots to a global marketplace',
      icon: Store,
      features: ['List your robots', 'Global reach', 'Analytics dashboard', 'Seller protection']
    },
    {
      id: 'service' as const,
      title: 'Service Provider',
      description: 'Offer robotics services and maintenance',
      icon: Wrench,
      features: ['Service listings', 'Client management', 'Scheduling tools', 'Rating system']
    },
    {
      id: 'parts' as const,
      title: 'Spare Parts Provider',
      description: 'Supply robot parts and components',
      icon: Settings,
      features: ['Parts catalog', 'Inventory management', 'Compatibility guide', 'Bulk orders']
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your Role in{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">RobotVerse</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select your user type to access tailored features and dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {userTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Card 
                key={type.id} 
                className="bg-gradient-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow cursor-pointer group"
                onClick={() => onSelect(type.id)}
              >
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/30 transition-colors">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{type.title}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {type.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {type.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="neon" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                  >
                    Select Role
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UserTypeSelector;