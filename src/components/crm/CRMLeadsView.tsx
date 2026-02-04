import { useState } from "react";
import type { useCRM } from "@/hooks/useCRM";
import type { useSellerCRM } from "@/hooks/useSellerCRM";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import FullScreenLeadManager from "./FullScreenLeadManager";

interface CRMLeadsViewProps {
  sellerCRM: ReturnType<typeof useSellerCRM>;
  crmData: ReturnType<typeof useCRM>;
}

/**
 * CRMLeadsView - Entry point for Lead Manager
 * 
 * When the user clicks "Open Lead Manager", the full-screen CRM interface opens.
 */
const CRMLeadsView = ({ sellerCRM, crmData }: CRMLeadsViewProps) => {
  const { user } = useAuth();
  const [showFullScreen, setShowFullScreen] = useState(false);
  
  if (showFullScreen) {
    return <FullScreenLeadManager onClose={() => setShowFullScreen(false)} />;
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <LayoutDashboard className="mb-4 h-12 w-12 text-primary" />
      <h2 className="text-xl font-semibold mb-2">Lead Manager</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Access your full CRM workspace to manage product views, quote requests, 
        purchase new leads, and track your sales pipeline.
      </p>
      <Button size="lg" onClick={() => setShowFullScreen(true)}>
        <LayoutDashboard className="mr-2 h-5 w-5" />
        Open Lead Manager
      </Button>
    </div>
  );
};

export default CRMLeadsView;
