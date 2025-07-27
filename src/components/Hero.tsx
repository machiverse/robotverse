import { Button } from "@/components/ui/button";
import { Bot, Zap, Shield, Globe } from "lucide-react";
import industrialRobotHero from "@/assets/industrial-robot-hero.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-hero overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={industrialRobotHero} 
          alt="Industrial robot automation factory" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-6">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">The Future of Robotics is Here</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Welcome to{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              RoboNexus
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">
            Buy, Sell & Support Industrial Robots with Spare Parts, Services, Logistics & Finance – All in One Place
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button variant="hero" size="lg" className="text-lg px-8 py-6">
              <Bot className="w-5 h-5" />
              Join RoboNexus
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              Explore Marketplace
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="flex items-center space-x-3 bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Fast Trading</h3>
                <p className="text-sm text-muted-foreground">Instant connections</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Secure Platform</h3>
                <p className="text-sm text-muted-foreground">Verified users</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Global Network</h3>
                <p className="text-sm text-muted-foreground">Worldwide reach</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;