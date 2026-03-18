import EnhancedHeader from "@/components/EnhancedHeader";
import EnhancedHero from "@/components/EnhancedHero";
import HomeRobotListings from "@/components/HomeRobotListings";
import MarketplaceCategories from "@/components/MarketplaceCategories";
import WhyChooseRobotVerse from "@/components/WhyChooseRobotVerse";
import ProfessionalCategories from "@/components/ProfessionalCategories";
import CitiesCoveredMap from "@/components/CitiesCoveredMap";
import Footer from "@/components/Footer";
import { HomepageTestimonials } from "@/components/reviews/HomepageTestimonials";
import { UniversalSEOHead } from "@/components/SEO/UniversalSEOHead";
import { 
  generateOrganizationSchema, 
  generateWebSiteSchema, 
  generateLocalBusinessSchema 
} from "@/utils/seo/modernSchemas";

const Index = () => {
  // Homepage schemas
  const homeSchemas = [
    generateOrganizationSchema(),
    generateWebSiteSchema(),
    generateLocalBusinessSchema()
  ];

  return (
    <div className="min-h-screen bg-background">
      <UniversalSEOHead
        pageType="home"
        title="Buy & Sell Industrial Robots India | RobotVerse Marketplace"
        description="India's #1 marketplace for industrial robots. Buy verified FANUC, ABB, KUKA, Yaskawa robots with warranty. Spare parts, services, financing & logistics. 500+ robots available."
        keywords={[
          'industrial robots marketplace India',
          'buy industrial robots online',
          'sell industrial robots India',
          'used industrial robots for sale',
          'FANUC robots India',
          'ABB robots India',
          'KUKA robots India',
          'Yaskawa robots India',
          'robot spare parts India',
          'robot automation equipment',
          'industrial automation marketplace',
          'robot trading platform India',
          'refurbished industrial robots',
          'robot financing India',
          'robot logistics India'
        ]}
        ogTitle="RobotVerse - India's Largest Industrial Robot Marketplace"
        ogDescription="Buy & sell verified industrial robots, spare parts, and automation equipment. Connect with 500+ sellers across India. Get financing & logistics support."
        schemas={homeSchemas}
      />
      <EnhancedHeader />
      <EnhancedHero />
      <HomeRobotListings />
      <MarketplaceCategories />
      <ProfessionalCategories />
      <CitiesCoveredMap />
      <WhyChooseRobotVerse />
      <HomepageTestimonials />
      <Footer />
    </div>
  );
};

export default Index;
