import EnhancedHeader from "@/components/EnhancedHeader";
import EnhancedHero from "@/components/EnhancedHero";
import LiveStats from "@/components/LiveStats";
import MarketplaceCategories from "@/components/MarketplaceCategories";
import RobotListings from "@/components/RobotListings";
import WhyChooseRobotVerse from "@/components/WhyChooseRobotVerse";
import ProfessionalCategories from "@/components/ProfessionalCategories";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/utils/seoSchemas";

const Index = () => {
  const jsonLd = [
    generateOrganizationSchema(),
    generateWebsiteSchema()
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="RobotVerse - Buy & Sell Industrial Robots | Automation Equipment Marketplace India"
        description="India's #1 marketplace for industrial robots. Buy FANUC, ABB, KUKA, Yaskawa robots with warranty. Get spare parts, automation services, financing & logistics support."
        keywords="industrial robots India, buy robots online, FANUC robots, ABB robots, KUKA robots, Yaskawa robots, robot marketplace, automation equipment, robot spare parts, robot services"
        ogType="website"
        ogImage="/og-image.jpg"
        jsonLd={jsonLd}
      />
      <EnhancedHeader />
      <EnhancedHero />
            <RobotListings />
      <MarketplaceCategories />
      <ProfessionalCategories />
      <WhyChooseRobotVerse />
      <Footer />
    </div>
  );
};

export default Index;
