import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  CheckCircle, 
  Brain, 
  MapPin,
  Users,
  Star,
  Clock,
  TrendingUp
} from "lucide-react";

const trustFeatures = [
  {
    icon: Shield,
    title: "Verified Sellers",
    description: "All sellers undergo rigorous verification. Trade with confidence knowing every partner is authentic and trustworthy.",
    gradient: "from-green-500 to-emerald-600"
  },
  {
    icon: CheckCircle,
    title: "Quality Assured",
    description: "Every machine undergoes quality inspection with detailed specifications, high-resolution images, and performance reports.",
    gradient: "from-blue-500 to-cyan-600"
  },
  {
    icon: Brain,
    title: "AI-Powered Matching",
    description: "Advanced AI algorithms analyze your requirements to find the perfect machines, parts, and services tailored to your business needs.",
    gradient: "from-purple-500 to-violet-600"
  }
];

const networkStats = [
  {
    icon: MapPin,
    label: "Pan-India Network",
    value: "0",
    description: "cities covered"
  },
  {
    icon: Users,
    label: "Trusted Community", 
    value: "0",
    description: "verified users"
  },
  {
    icon: TrendingUp,
    label: "Robot Categories",
    value: "0",
    description: "categories"
  },
  {
    icon: Clock,
    label: "Quality Support",
    value: "24/7",
    description: "assistance"
  }
];

const liveStats = [
  { label: "Active Listings", value: "0", color: "text-green-500" },
  { label: "Verified Users", value: "0", color: "text-blue-500" },
  { label: "Service Providers", value: "0", color: "text-purple-500" },
  { label: "Customer Satisfaction", value: "0%", color: "text-orange-500" }
];

const TrustIndicators = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-muted/20 to-background">
      <div className="container mx-auto px-4">
        {/* Why Choose Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why Choose RobotVerse?</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The most trusted industrial machinery marketplace in India with cutting-edge technology and verified partners
          </p>
        </div>

        {/* Trust Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {trustFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-card/80 backdrop-blur-sm border-border hover:scale-105 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {networkStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-card/60 backdrop-blur-sm border-border">
                <CardContent className="p-4 text-center">
                  <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-semibold text-sm mb-1">{stat.label}</h4>
                  <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {liveStats.map((stat, index) => (
            <div key={index} className="text-center p-4 bg-card/40 backdrop-blur-sm rounded-lg border border-border">
              <div className={`text-3xl font-bold mb-1 ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of businesses already using RobotVerse
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Badge variant="secondary" className="text-lg px-6 py-3 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              Start Buying
            </Badge>
            <Badge variant="outline" className="text-lg px-6 py-3 cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
              Start Selling
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustIndicators;