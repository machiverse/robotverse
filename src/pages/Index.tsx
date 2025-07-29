import EnhancedHeader from "@/components/EnhancedHeader";
import EnhancedHero from "@/components/EnhancedHero";
import LiveStats from "@/components/LiveStats";
import MarketplaceCategories from "@/components/MarketplaceCategories";
import TrustIndicators from "@/components/TrustIndicators";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <EnhancedHero />
      <LiveStats />
      <MarketplaceCategories />
      <TrustIndicators />
    </div>
  );
};

export default Index;
