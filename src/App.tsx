import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RobotComparisonProvider } from "@/contexts/RobotComparisonContext";
import CompareTray from "@/components/CompareTray";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useCanonicalHead } from "@/hooks/useCanonicalHead";
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
import ServiceRoute from "./pages/ServiceRoute";
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
// Loaded on demand so the Directory adds nothing to the main bundle
import WithBack from "./components/navigation/WithBack";
const AutomationStudioBuildPage = lazy(() => import("./pages/AutomationStudioBuildPage"));
const AutomationPlaybookPage = lazy(() => import("./pages/AutomationPlaybookPage"));
const AboutPage = lazy(() => import("./pages/About"));
const DirectoryModelPage = lazy(() => import("./pages/DirectoryModelPage"));
const Directory = lazy(() => import("./pages/Directory"));
const TrainingPosterPage = lazy(() => import("./pages/TrainingPosterPage"));
const DirectoryPhotosAdmin = lazy(() => import("./pages/DirectoryPhotosAdmin"));
const RobotNews = lazy(() => import("./pages/RobotNews"));
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
import AutomationStudio3DPage from "./pages/AutomationStudio3DPage";
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

// Keeps title/description/canonical/robots identical to the seo-render snapshot
const HeadSync = () => {
  useCanonicalHead();
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
            <CompareTray />
            <HeadSync />
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
              <Route path="/dashboard/admin/seo" element={<WithBack fallback="/dashboard" label="SEO"><SEODashboard /></WithBack>} />
              <Route path="/seller/:sellerId/robots" element={<SellerRobots />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/parts/:id" element={<SparePartDetails />} />
            <Route path="/spares/:category" element={<Parts />} />
            <Route path="/spares/:category/:subcategory" element={<Parts />} />
            <Route path="/spares/:category/:subcategory/:componentType" element={<Parts />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceRoute />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/logistics/:id" element={<LogisticsDetails />} />
            <Route path="/test-image-migration" element={<TestImageMigration />} />
            <Route path="/financing" element={<Financing />} />
            <Route path="/financing/:id" element={<FinancingDetails />} />
            <Route path="/robobook" element={<Blogs />} />
            <Route path="/robobook/news" element={<Suspense fallback={null}><RobotNews /></Suspense>} />
            <Route path="/community" element={<Navigate to="/robobook" replace />} />
            <Route path="/blogs" element={<Navigate to="/robobook" replace />} />
            <Route path="/robobook/:id" element={<CommunityPostDetails />} />
            <Route path="/community/:id" element={<RedirectWithId base="/robobook" />} />
            <Route path="/robobook/create" element={<BlogEditor />} />
            <Route path="/robobook/:id/edit" element={<BlogEditor />} />
            <Route path="/preview/:token" element={<PostPreview />} />
            <Route path="/blogs/:id" element={<RedirectWithId base="/blog" />} />
            <Route path="/blog/:id" element={<BlogDetails />} />

            <Route path="/marketplace/robots" element={<Navigate to="/robots" replace />} />
            <Route path="/marketplace/parts" element={<Navigate to="/parts" replace />} />
            <Route path="/marketplace/services" element={<Navigate to="/services" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/analytics" element={<WithBack fallback="/dashboard" label="Analytics"><Analytics /></WithBack>} />
            <Route path="/dashboard/reports" element={<WithBack fallback="/dashboard" label="Reports"><Reports /></WithBack>} />
            <Route path="/dashboard/messages" element={<WithBack fallback="/dashboard" label="Messages"><Messages /></WithBack>} />
            <Route path="/dashboard/robots" element={<WithBack fallback="/dashboard" label="My robots"><MyRobots /></WithBack>} />
            <Route path="/dashboard/parts" element={<WithBack fallback="/dashboard" label="Spare parts"><PartsManagement /></WithBack>} />
            <Route path="/dashboard/services" element={<WithBack fallback="/dashboard" label="Services"><ServicesManagement /></WithBack>} />
            <Route path="/dashboard/finance" element={<WithBack fallback="/dashboard" label="Finance"><Finance /></WithBack>} />
            <Route path="/dashboard/logistics" element={<WithBack fallback="/dashboard" label="Logistics"><LogisticsDashboard /></WithBack>} />
            <Route path="/dashboard/settings" element={<WithBack fallback="/dashboard" label="Settings"><Settings /></WithBack>} />
            <Route path="/dashboard/help" element={<WithBack fallback="/dashboard" label="Help"><Help /></WithBack>} />
            <Route path="/dashboard/privacy" element={<WithBack fallback="/dashboard" label="Privacy"><Privacy /></WithBack>} />
            <Route path="/dashboard/credits" element={<WithBack fallback="/dashboard" label="Credits"><Credits /></WithBack>} />
            <Route path="/dashboard/quotations" element={<WithBack fallback="/dashboard" label="Quotations"><Quotations /></WithBack>} />
            <Route path="/dashboard/my-requests" element={<WithBack fallback="/dashboard" label="My requests"><MyRequests /></WithBack>} />
            <Route path="/dashboard/api-keys" element={<WithBack fallback="/dashboard" label="API keys"><ApiKeys /></WithBack>} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/spare-parts-dashboard" element={<WithBack fallback="/dashboard" label="Spare parts dashboard"><SparePartsSellerDashboard /></WithBack>} />
            <Route path="/watchlist" element={<WatchlistDashboard />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/settings" element={<ProfileSettings />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<Suspense fallback={null}><AboutPage /></Suspense>} />
            <Route path="/directory" element={<Suspense fallback={null}><Directory /></Suspense>} />
            <Route path="/directory/:type/:slug" element={<Suspense fallback={null}><DirectoryModelPage /></Suspense>} />
            <Route path="/directory/training/poster/:id" element={<Suspense fallback={null}><TrainingPosterPage /></Suspense>} />
            <Route path="/admin/directory-photos" element={<WithBack fallback="/directory" label="Directory photos"><Suspense fallback={null}><DirectoryPhotosAdmin /></Suspense></WithBack>} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/seller-guide" element={<SellerGuide />} />
            <Route path="/buyer-guide" element={<BuyerGuide />} />
            <Route path="/cookies" element={<Cookies />} />
            {/* Public, crawlable privacy path (/dashboard/* is disallowed in robots.txt) */}
            <Route path="/privacy" element={<WithBack fallback="/" label="Privacy"><Privacy /></WithBack>} />

            <Route path="/sitemap" element={<Sitemap />} />
            <Route path="/accessibility" element={<Accessibility />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/robot-talent" element={<RobotTalent />} />
              <Route path="/robot-talent/talent" element={<RobotTalent />} />
              <Route path="/robot-talent/training" element={<RobotTalent />} />
              <Route path="/robot-talent/jobs/:id" element={<TalentJobDetail />} />
              <Route path="/robot-talent/post-job" element={<TalentPostJob />} />
              <Route path="/robot-talent/seeker-profile" element={<TalentSeekerProfile />} />
              <Route path="/robot-talent/post-training" element={<TalentPostTraining />} />
              <Route path="/robot-talent/employer-dashboard" element={<TalentEmployerDashboard />} />
              <Route path="/automation-studio" element={<AutomationStudio />} />
              <Route path="/automation-studio/3d" element={<AutomationStudio3DPage />} />
              <Route path="/automation-studio/build" element={<Suspense fallback={null}><AutomationStudioBuildPage /></Suspense>} />
              <Route path="/automation-studio/playbook" element={<Suspense fallback={null}><AutomationPlaybookPage /></Suspense>} />
              <Route path="/auctions" element={<Auctions />} />
              <Route path="/auctions/:id" element={<AuctionDetail />} />
              <Route path="/auctions/create" element={<CreateAuction />} />
              <Route path="/auctions/:id/edit" element={<EditAuction />} />
              <Route path="/whatsapp-bot" element={<WithBack fallback="/dashboard" label="WhatsApp bot"><WhatsAppBotLayout /></WithBack>}>
                <Route index element={<WhatsAppDashboard />} />
                <Route path="conversations" element={<WhatsAppConversations />} />
                <Route path="knowledge-base" element={<WhatsAppKnowledgeBase />} />
                <Route path="broadcast" element={<WhatsAppBroadcast />} />
                <Route path="settings" element={<WhatsAppSettings />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<WithBack fallback="/" label="Page not found"><NotFound /></WithBack>} />
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
