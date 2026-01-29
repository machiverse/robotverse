import EnhancedHeader from "@/components/EnhancedHeader";
import EnhancedHero from "@/components/EnhancedHero";
import LiveStats from "@/components/LiveStats";
import MarketplaceCategories from "@/components/MarketplaceCategories";
import HomeRobotListings from "@/components/HomeRobotListings";
import WhyChooseRobotVerse from "@/components/WhyChooseRobotVerse";
import ProfessionalCategories from "@/components/ProfessionalCategories";
import Footer from "@/components/Footer";
import { AutoSEOHead } from "@/components/SEO/AutoSEOHead";
import { useAutoSEO } from "@/hooks/useAutoSEO";
import { generateOrganizationSchema } from "@/utils/seoSchemas";

const Index = () => {
  const { seoData } = useAutoSEO({ type: 'home' });

  return (
    <div className="min-h-screen bg-background">
      {seoData && (
        <AutoSEOHead
          title={seoData.title}
          description={seoData.description}
          keywords={seoData.keywords}
          ogTitle={seoData.ogTitle}
          ogDescription={seoData.ogDescription}
          ogImage={seoData.ogImage}
          twitterCard={seoData.twitterCard}
          canonicalUrl={seoData.canonicalUrl}
          schemaMarkup={[seoData.schemaMarkup, generateOrganizationSchema()]}
        />
      )}
      <EnhancedHeader />
      <EnhancedHero />
      <HomeRobotListings />
      <MarketplaceCategories />
      <ProfessionalCategories />
      <WhyChooseRobotVerse />
      <Footer />
    </div>
  );
};

export default Index;
