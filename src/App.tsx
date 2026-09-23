import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RobotComparisonProvider } from "@/contexts/RobotComparisonContext";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { usePageTracking } from "@/hooks/usePageTracking";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AccountStatus from "./pages/AccountStatus";
import ModerationGate from "./components/moderation/ModerationGate";
import RobotComparison from "./pages/RobotComparison";
import Robots from "./pages/Robots";
import RobotDetails from "./pages/RobotDetails";
import Parts from "./pages/Parts";
import SparePartDetails from "./pages/SparePartDetails";
import Services from "./pages/Services";
import ServiceDetails from "./pages/ServiceDetails";
import Logistics from "./pages/Logistics";
import LogisticsDetails from "./pages/LogisticsDetails";
import Financing from "./pages/Financing";
import FinancingDetails from "./pages/FinancingDetails";
import Blogs from "./pages/Blogs";
import BlogDetails from "./pages/BlogDetails";
import BlogEditor from "./pages/BlogEditor";
import CommunityPostDetails from "./pages/CommunityPostDetails";
import PostPreview from "./pages/PostPreview";
import DashboardPage from "./pages/DashboardPage";
import SparePartsSellerDashboard from "./pages/SparePartsSellerDashboard";
import SellerRobots from "./pages/SellerRobots";
import ProfileSettings from "./pages/ProfileSettings";
import TestImageMigration from "./pages/TestImageMigration";
import WatchlistDashboard from "./pages/WatchlistDashboard";
import NotFound from "./pages/NotFound";

// Programmatic SEO landing pages
import CityRobots from "./pages/landing/CityRobots";
import BrandRobots from "./pages/landing/BrandRobots";
import UsedBrandRobots from "./pages/landing/UsedBrandRobots";
import ApplicationRobots from "./pages/landing/ApplicationRobots";
import BrandParts from "./pages/landing/BrandParts";
import CategoryParts from "./pages/landing/CategoryParts";
import CityServices from "./pages/landing/CityServices";
import CompareRobots from "./pages/landing/CompareRobots";
import SEODashboard from "./pages/dashboard/admin/SEODashboard";

// Dashboard Pages
import Analytics from "./pages/dashboard/Analytics";
import Reports from "./pages/dashboard/Reports";
import MyRobots from "./pages/dashboard/MyRobots";
import PartsManagement from "./pages/dashboard/PartsManagement";
import ServicesManagement from "./pages/dashboard/ServicesManagement";
import Finance from "./pages/dashboard/Finance";
import LogisticsDashboard from "./pages/dashboard/Logistics";
import Settings from "./pages/dashboard/Settings";
import Help from "./pages/dashboard/Help";
import Privacy from "./pages/dashboard/Privacy";
import Messages from "./pages/dashboard/Messages";
import Credits from "./pages/dashboard/Credits";
import Quotations from "./pages/dashboard/Quotations";
import MyRequests from "./pages/dashboard/MyRequests";
import ApiKeys from "./pages/dashboard/ApiKeys";
import ApiDocs from "./pages/ApiDocs";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import SellerGuide from "./pages/SellerGuide";
import BuyerGuide from "./pages/BuyerGuide";
import Cookies from "./pages/Cookies";
import Sitemap from "./pages/Sitemap";
import Accessibility from "./pages/Accessibility";
import Chat from "./pages/Chat";
import CRM from "./pages/CRM";
import Pricing from "./pages/Pricing";
import { AutoSignInPopup } from "./components/AutoSignInPopup";
import { GlobalEmailVerificationHandler } from "./components/GlobalEmailVerificationHandler";
import AIAssistant from "./pages/AIAssistant";
import WhatsAppChatButton from "./components/whatsapp/WhatsAppChatButton";
import { AIAssistantProvider } from "./contexts/AIAssistantContext";
import RobotTalent from "./pages/RobotTalent";
import TalentJobDetail from "./pages/TalentJobDetail";
import TalentPostJob from "./pages/TalentPostJob";
import TalentSeekerProfile from "./pages/TalentSeekerProfile";
import TalentPostTraining from "./pages/TalentPostTraining";
import TalentEmployerDashboard from "./pages/TalentEmployerDashboard";
import AutomationStudio from "./pages/AutomationStudio";
import Auctions from "./pages/Auctions";
import AuctionDetail from "./pages/AuctionDetail";
import CreateAuction from "./pages/CreateAuction";
import EditAuction from "./pages/EditAuction";
import WhatsAppBotLayout from "./pages/whatsapp/WhatsAppBotLayout";
import WhatsAppDashboard from "./pages/whatsapp/WhatsAppDashboard";
import WhatsAppConversations from "./pages/whatsapp/WhatsAppConversations";
import WhatsAppKnowledgeBase from "./pages/whatsapp/WhatsAppKnowledgeBase";
import WhatsAppBroadcast from "./pages/whatsapp/WhatsAppBroadcast";
import WhatsAppSettings from "./pages/whatsapp/WhatsAppSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Global notification listener component
const GlobalChatNotifications = () => {
  useChatNotifications();
  return null;
};

// SPA route-change page view tracker for GA4
const PageTracker = () => {
  usePageTracking();
  return null;
};

const AppLoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: 'system-ui, sans-serif',
    color: '#64748b',
  }}>
    Loading...
  </div>
);

// SEO: canonicalise duplicate article/community paths, preserving the :id param
const RedirectWithId = ({ base }: { base: string }) => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`${base}/${id ?? ""}`} replace />;
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RobotComparisonProvider>
        <TooltipProvider>
          <GlobalChatNotifications />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PageTracker />
            <AIAssistantProvider>
              <GlobalEmailVerificationHandler />
              <AutoSignInPopup />
              <ModerationGate />
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/account-status" element={<AccountStatus />} />
              <Route path="/robots" element={<Robots />} />
              <Route path="/robots/compare" element={<RobotComparison />} />
              {/* Programmatic SEO landing pages (must precede dynamic /robots/:id) */}
              <Route path="/robots/city/:city" element={<CityRobots />} />
              <Route path="/robots/brand/:brand" element={<BrandRobots />} />
              <Route path="/robots/:brand/used" element={<UsedBrandRobots />} />
              <Route path="/robots/application/:application" element={<ApplicationRobots />} />
              <Route path="/robots/:id" element={<RobotDetails />} />
              <Route path="/parts/brand/:brand" element={<BrandParts />} />
              <Route path="/parts/category/:cat" element={<CategoryParts />} />
              {/* Removed: /services/:city/:serviceCombo doorway pages (now 404 + noindex) */}
              <Route path="/compare/:slug" element={<CompareRobots />} />
              <Route path="/dashboard/admin/seo" element={<SEODashboard />} />
              <Route path="/seller/:sellerId/robots" element={<SellerRobots />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/parts/:id" element={<SparePartDetails />} />
            <Route path="/spares/:category" element={<Parts />} />
            <Route path="/spares/:category/:subcategory" element={<Parts />} />
            <Route path="/spares/:category/:subcategory/:componentType" element={<Parts />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetails />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/logistics/:id" element={<LogisticsDetails />} />
            <Route path="/test-image-migration" element={<TestImageMigration />} />
            <Route path="/financing" element={<Financing />} />
            <Route path="/financing/:id" element={<FinancingDetails />} />
            <Route path="/robobook" element={<Blogs />} />
            <Route path="/community" element={<Navigate to="/robobook" replace />} />
            <Route path="/blogs" element={<Navigate to="/robobook" replace />} />
            <Route path="/robobook/:id" element={<CommunityPostDetails />} />
            <Route path="/community/:id" element={<RedirectWithId base="/robobook" />} />
            <Route path="/robobook/create" element={<BlogEditor />} />
            <Route path="/robobook/:id/edit" element={<BlogEditor />} />
            <Route path="/preview/:token" element={<PostPreview />} />
            <Route path="/blogs/:id" element={<RedirectWithId base="/blog" />} />
            <Route path="/blog/:id" element={<BlogDetails />} />

            <Route path="/marketplace/robots" element={<Robots />} />
            <Route path="/marketplace/parts" element={<Parts />} />
            <Route path="/marketplace/services" element={<Services />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
            <Route path="/dashboard/reports" element={<Reports />} />
            <Route path="/dashboard/messages" element={<Messages />} />
            <Route path="/dashboard/robots" element={<MyRobots />} />
            <Route path="/dashboard/parts" element={<PartsManagement />} />
            <Route path="/dashboard/services" element={<ServicesManagement />} />
            <Route path="/dashboard/finance" element={<Finance />} />
            <Route path="/dashboard/logistics" element={<LogisticsDashboard />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/help" element={<Help />} />
            <Route path="/dashboard/privacy" element={<Privacy />} />
            <Route path="/dashboard/credits" element={<Credits />} />
            <Route path="/dashboard/quotations" element={<Quotations />} />
            <Route path="/dashboard/my-requests" element={<MyRequests />} />
            <Route path="/dashboard/api-keys" element={<ApiKeys />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/spare-parts-dashboard" element={<SparePartsSellerDashboard />} />
            <Route path="/watchlist" element={<WatchlistDashboard />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/settings" element={<ProfileSettings />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/seller-guide" element={<SellerGuide />} />
            <Route path="/buyer-guide" element={<BuyerGuide />} />
            <Route path="/cookies" element={<Cookies />} />
            {/* Public, crawlable privacy path (/dashboard/* is disallowed in robots.txt) */}
            <Route path="/privacy" element={<Privacy />} />

            <Route path="/sitemap" element={<Sitemap />} />
            <Route path="/accessibility" element={<Accessibility />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/robot-talent" element={<RobotTalent />} />
              <Route path="/robot-talent/jobs/:id" element={<TalentJobDetail />} />
              <Route path="/robot-talent/post-job" element={<TalentPostJob />} />
              <Route path="/robot-talent/seeker-profile" element={<TalentSeekerProfile />} />
              <Route path="/robot-talent/post-training" element={<TalentPostTraining />} />
              <Route path="/robot-talent/employer-dashboard" element={<TalentEmployerDashboard />} />
              <Route path="/automation-studio" element={<AutomationStudio />} />
              <Route path="/auctions" element={<Auctions />} />
              <Route path="/auctions/:id" element={<AuctionDetail />} />
              <Route path="/auctions/create" element={<CreateAuction />} />
              <Route path="/auctions/:id/edit" element={<EditAuction />} />
              <Route path="/whatsapp-bot" element={<WhatsAppBotLayout />}>
                <Route index element={<WhatsAppDashboard />} />
                <Route path="conversations" element={<WhatsAppConversations />} />
                <Route path="knowledge-base" element={<WhatsAppKnowledgeBase />} />
                <Route path="broadcast" element={<WhatsAppBroadcast />} />
                <Route path="settings" element={<WhatsAppSettings />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <WhatsAppChatButton />

            </AIAssistantProvider>
          </BrowserRouter>
        </TooltipProvider>
      </RobotComparisonProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
