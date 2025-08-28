import EnhancedHeader from "@/components/EnhancedHeader";
import EnhancedHero from "@/components/EnhancedHero";
import LiveStats from "@/components/LiveStats";
import MarketplaceCategories from "@/components/MarketplaceCategories";
import RobotListings from "@/components/RobotListings";
import WhyChooseRobotVerse from "@/components/WhyChooseRobotVerse";
import ProfessionalCategories from "@/components/ProfessionalCategories";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <EnhancedHero />
            <RobotListings />
      <MarketplaceCategories />
      <ProfessionalCategories />
      <WhyChooseRobotVerse />
    </div>
  );
};

export default Index;
