import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Zap, 
  Users, 
  Award, 
  Globe, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  Star,
  Heart,
  Brain,
  Target,
  Phone,
  Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const PlatformServices = () => {
  const navigate = useNavigate();

  const whyChooseFeatures = [
    {
      icon: Shield,
      title: "Verified Sellers",
      description: "All sellers are verified with proper documentation and quality certifications",
      gradient: "from-blue-500 to-cyan-600",
      stats: "100% Verified"
    },
    {
      icon: Zap,
      title: "AI-Powered Matching",
      description: "Advanced AI algorithms match you with the perfect robots for your needs",
      gradient: "from-purple-500 to-violet-600",
      stats: "98% Accuracy"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Connect with buyers and sellers from around the world with local support",
      gradient: "from-green-500 to-emerald-600",
      stats: "50+ Countries"
    },
    {
      icon: Clock,
      title: "24/7 Support",
      description: "Round-the-clock customer support with expert technical assistance",
      gradient: "from-orange-500 to-red-600",
      stats: "24/7 Available"
    },
    {
      icon: Award,
      title: "Quality Assurance",
      description: "Rigorous quality checks and warranty protection for all transactions",
      gradient: "from-pink-500 to-rose-600",
      stats: "100% Guaranteed"
    },
    {
      icon: TrendingUp,
      title: "Market Analytics",
      description: "Real-time market insights and pricing analytics for informed decisions",
      gradient: "from-indigo-500 to-blue-600",
      stats: "Live Data"
    }
  ];

  const platformServices = [
    {
      category: "For Buyers",
      icon: Users,
      services: [
        "🔍 Advanced Robot Search & Filtering",
        "🤖 AI-Powered Robot Recommendations", 
        "💰 Flexible Financing Options",
        "🚚 End-to-End Logistics Support",
        "🛡️ Purchase Protection & Warranty",
        "📊 Market Price Analytics"
      ],
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      category: "For Sellers", 
      icon: Target,
      services: [
        "📈 Advanced Analytics Dashboard",
        "🎯 Targeted Marketing Tools",
        "📱 Mobile-First Seller App",
        "💬 Direct Buyer Communication",
        "🔒 Secure Payment Processing",
        "🌐 Global Market Access"
      ],
      gradient: "from-green-500 to-emerald-600"
    },
    {
      category: "For Service Providers",
      icon: Star,
      services: [
        "📅 Smart Scheduling System",
        "🔧 Service Request Management", 
        "⭐ Reputation & Review System",
        "📍 Geolocation-Based Matching",
        "💼 Professional Certification",
        "📊 Performance Analytics"
      ],
      gradient: "from-purple-500 to-violet-600"
    }
  ];

  const achievements = [
    { label: "Active Users", value: "20K+", icon: Users },
    { label: "Successful Deals", value: "5K+", icon: CheckCircle },
    { label: "Customer Satisfaction", value: "98%", icon: Heart },
    { label: "Average Response Time", value: "< 2hrs", icon: Clock },
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Why Choose RobotVerse */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Why Choose RobotVerse?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            The most trusted and comprehensive platform for industrial robot trading and services
          </p>

          {/* Achievements */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <Card key={index} className="bg-card/80 backdrop-blur-sm border-border">
                  <CardContent className="p-4 text-center">
                    <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">{achievement.value}</div>
                    <div className="text-sm text-muted-foreground">{achievement.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {whyChooseFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="group bg-card/80 backdrop-blur-sm border-border hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {feature.stats}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Platform Services */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Comprehensive Platform Services</h3>
            <p className="text-lg text-muted-foreground">
              Tailored solutions for every participant in the robotics ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {platformServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index} className="bg-card/80 backdrop-blur-sm border-border">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${service.gradient} flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl text-center">{service.category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {service.services.map((item, serviceIndex) => (
                        <li key={serviceIndex} className="flex items-start gap-2 text-sm">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Contact & Support */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Business?</h3>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join thousands of businesses already benefiting from our comprehensive robotics platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="px-8"
              >
                Get Started Today
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.open('tel:+911234567890')}
                className="px-8"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Us: +91 12345 67890
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.open('mailto:support@robotverse.com')}
                className="px-8"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default PlatformServices;