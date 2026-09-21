import EnhancedHeader from "@/components/EnhancedHeader";
import AutomationStudioBanner from "@/components/AutomationStudioBanner";
import EnhancedHero from "@/components/EnhancedHero";
import HomeRobotListings from "@/components/HomeRobotListings";
import ShopByBrand from "@/components/ShopByBrand";
import MarketplaceCategories from "@/components/MarketplaceCategories";
import WhyChooseRobotVerse from "@/components/WhyChooseRobotVerse";
import CitiesCoveredMap from "@/components/CitiesCoveredMap";
import Footer from "@/components/Footer";
import { HomepageTestimonials } from "@/components/reviews/HomepageTestimonials";
import { UniversalSEOHead } from "@/components/SEO/UniversalSEOHead";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateLocalBusinessSchema,
} from "@/utils/seo/modernSchemas";

const Index = () => {
  // Homepage schemas
  const homeSchemas = [generateOrganizationSchema(), generateWebSiteSchema(), generateLocalBusinessSchema()];

  return (
    <div className="min-h-screen bg-background">
      <UniversalSEOHead
        pageType="home"
        title="RobotVerse | Buy & Sell Used Industrial Robots in India - FANUC, ABB, KUKA, Yaskawa"
        description="India's marketplace for new, used, and refurbished industrial robots, spare parts, financing, logistics, and automation services. Browse verified FANUC, ABB, KUKA, and Yaskawa robots by brand, payload, reach, and application."
        keywords={[
          "industrial robots marketplace India",
          "buy industrial robots online",
          "sell industrial robots India",
          "used industrial robots for sale",
          "FANUC robots India",
          "ABB robots India",
          "KUKA robots India",
          "Yaskawa robots India",
          "robot spare parts India",
          "robot automation equipment",
          "industrial automation marketplace",
          "robot trading platform India",
          "refurbished industrial robots",
          "robot financing India",
          "robot logistics India",
        ]}
        ogTitle="RobotVerse | Buy & Sell Used Industrial Robots in India - FANUC, ABB, KUKA, Yaskawa"
        ogDescription="India's marketplace for new, used, and refurbished industrial robots, spare parts, financing, logistics, and automation services. Browse verified FANUC, ABB, KUKA, and Yaskawa robots by brand, payload, reach, and application."
        schemas={homeSchemas}
      />
      <AutomationStudioBanner />
      <EnhancedHeader />
      <EnhancedHero />
      <HomeRobotListings />
      <ShopByBrand />
      <MarketplaceCategories />
      <CitiesCoveredMap />
      <WhyChooseRobotVerse />
      <HomepageTestimonials />
      <Footer />
    </div>
  );
};

export default Index;
