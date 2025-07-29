import EnhancedHeader from "@/components/EnhancedHeader";
import EnhancedHero from "@/components/EnhancedHero";
import RobotListings from "@/components/RobotListings";
import MarketplaceCategories from "@/components/MarketplaceCategories";
import PlatformServices from "@/components/PlatformServices";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <EnhancedHero />
      <RobotListings />
      <MarketplaceCategories />
      <PlatformServices />
    </div>
  );
};

export default Index;
