import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCRM } from "@/hooks/useCRM";
import { useSellerCRM } from "@/hooks/useSellerCRM";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import CRMSidebar from "@/components/crm/CRMSidebar";
import CRMOverview from "@/components/crm/CRMOverview";
import CRMLeadsView from "@/components/crm/CRMLeadsView";
import CRMOpportunitiesView from "@/components/crm/CRMOpportunitiesView";
import CRMAccountsView from "@/components/crm/CRMAccountsView";
import CRMTasksView from "@/components/crm/CRMTasksView";
import CRMQuotationsView from "@/components/crm/CRMQuotationsView";
import CRMReportsView from "@/components/crm/CRMReportsView";
import CRMActivityView from "@/components/crm/CRMActivityView";
import { Loader2 } from "lucide-react";

type CRMView = "overview" | "leads" | "opportunities" | "accounts" | "tasks" | "quotations" | "reports" | "activity";

const CRM = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState<CRMView>("overview");
  const crmData = useCRM();
  const sellerCRM = useSellerCRM();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || crmData.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading CRM...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return <CRMOverview crmData={crmData} sellerCRM={sellerCRM} />;
      case "leads":
        return <CRMLeadsView sellerCRM={sellerCRM} crmData={crmData} />;
      case "opportunities":
        return <CRMOpportunitiesView crmData={crmData} />;
      case "accounts":
        return <CRMAccountsView crmData={crmData} />;
      case "tasks":
        return <CRMTasksView crmData={crmData} />;
      case "quotations":
        return <CRMQuotationsView crmData={crmData} />;
      case "reports":
        return <CRMReportsView crmData={crmData} sellerCRM={sellerCRM} />;
      case "activity":
        return <CRMActivityView crmData={crmData} />;
      default:
        return <CRMOverview crmData={crmData} sellerCRM={sellerCRM} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <CRMSidebar activeView={activeView} setActiveView={setActiveView} stats={crmData.stats} />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold capitalize">{activeView === "overview" ? "CRM Dashboard" : activeView}</h1>
            </div>
          </header>
          <div className="p-4 lg:p-6">
            {renderView()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default CRM;
