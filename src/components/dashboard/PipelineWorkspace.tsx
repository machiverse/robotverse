import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCRM } from "@/hooks/useCRM";
import { useSellerCRM } from "@/hooks/useSellerCRM";
import CRMOverview from "@/components/crm/CRMOverview";
import CRMLeadsView from "@/components/crm/CRMLeadsView";
import CRMOpportunitiesView from "@/components/crm/CRMOpportunitiesView";
import CRMAccountsView from "@/components/crm/CRMAccountsView";
import CRMActivityView from "@/components/crm/CRMActivityView";
import BuyLeadsTab from "@/components/crm/BuyLeadsTab";
import { Skeleton } from "@/components/ui/skeleton";

interface PipelineWorkspaceProps {
  activeView: string;
  isCommissionSeller: boolean;
}

const PipelineSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-foreground/10 bg-card">
    <div className="grid h-10 grid-cols-5 items-center gap-4 border-b border-foreground/10 px-4">
      {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-3 w-full" />)}
    </div>
    {[0, 1, 2, 3, 4, 5].map((row) => (
      <div key={row} className="grid h-11 grid-cols-5 items-center gap-4 border-b border-foreground/[0.06] px-4 last:border-b-0">
        {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-3 w-full" />)}
      </div>
    ))}
  </div>
);

const PipelineWorkspace = ({ activeView, isCommissionSeller }: PipelineWorkspaceProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const crmData = useCRM();
  const sellerCRM = useSellerCRM();

  if (crmData.loading) return <PipelineSkeleton />;

  switch (activeView) {
    case "pipeline-overview":
      return <CRMOverview crmData={crmData} sellerCRM={sellerCRM} />;
    case "pipeline-leads":
      return <CRMLeadsView isCommissionSeller={isCommissionSeller} initialTab="leads" />;
    case "pipeline-opportunities":
      return <CRMOpportunitiesView crmData={crmData} />;
    case "pipeline-accounts":
      return <CRMAccountsView crmData={crmData} />;
    case "pipeline-activity":
      return <CRMActivityView crmData={crmData} />;
    case "pipeline-buy-leads":
      return (
        <BuyLeadsTab
          sellerId={user?.id || ""}
          creditsBalance={sellerCRM.creditsBalance}
          onLeadPurchased={sellerCRM.fetchLeads}
          onBuyCredits={() => navigate("/dashboard/credits")}
          isCommissionSeller={isCommissionSeller}
        />
      );
    default:
      return <CRMOverview crmData={crmData} sellerCRM={sellerCRM} />;
  }
};

export default PipelineWorkspace;