import EnhancedHeader from '@/components/EnhancedHeader';
import Footer from '@/components/Footer';
import AIAssistantChat from '@/components/ai-assistant/AIAssistantChat';
import { UniversalSEOHead } from '@/components/SEO/UniversalSEOHead';

const AIAssistant = () => {
  return (
    <div className="min-h-screen bg-background">
      <UniversalSEOHead
        pageType="other"
        title="AI Robot Assistant | RobotVerse - Find Industrial Robots"
        description="Use RobotVerse AI to find the perfect industrial robot, spare parts, and system integrators for your needs. Powered by intelligent search across our marketplace."
        keywords={['robot assistant', 'find industrial robots', 'robot recommendation', 'AI robot search']}
      />
      <EnhancedHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            RobotVerse AI Assistant
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Describe your requirements — application, payload, budget — and get instant robot recommendations
          </p>
        </div>
        <AIAssistantChat fullPage />
      </main>
      <Footer />
    </div>
  );
};

export default AIAssistant;
