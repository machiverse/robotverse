import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Robots from "./pages/Robots";
import RobotDetails from "./pages/RobotDetails";
import Parts from "./pages/Parts";
import Services from "./pages/Services";
import Logistics from "./pages/Logistics";
import Financing from "./pages/Financing";
import Blogs from "./pages/Blogs";
import BlogDetails from "./pages/BlogDetails";
import BlogEditor from "./pages/BlogEditor";
import DashboardPage from "./pages/DashboardPage";
import SparePartsSellerDashboard from "./pages/SparePartsSellerDashboard";
import SellerRobots from "./pages/SellerRobots";
import ProfileSettings from "./pages/ProfileSettings";
import TestImageMigration from "./pages/TestImageMigration";
import NotFound from "./pages/NotFound";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/robots" element={<Robots />} />
            <Route path="/robots/:id" element={<RobotDetails />} />
            <Route path="/seller/:sellerId/robots" element={<SellerRobots />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/services" element={<Services />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/test-image-migration" element={<TestImageMigration />} />
            <Route path="/financing" element={<Financing />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blogs/create" element={<BlogEditor />} />
            <Route path="/blogs/:id" element={<BlogDetails />} />
            <Route path="/blogs/:id/edit" element={<BlogEditor />} />
            <Route path="/marketplace/robots" element={<Robots />} />
            <Route path="/marketplace/parts" element={<Parts />} />
            <Route path="/marketplace/services" element={<Services />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
            <Route path="/dashboard/reports" element={<Reports />} />
            <Route path="/dashboard/robots" element={<MyRobots />} />
            <Route path="/dashboard/parts" element={<PartsManagement />} />
            <Route path="/dashboard/services" element={<ServicesManagement />} />
            <Route path="/dashboard/finance" element={<Finance />} />
            <Route path="/dashboard/logistics" element={<LogisticsDashboard />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/help" element={<Help />} />
            <Route path="/dashboard/privacy" element={<Privacy />} />
            <Route path="/spare-parts-dashboard" element={<SparePartsSellerDashboard />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/settings" element={<ProfileSettings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
