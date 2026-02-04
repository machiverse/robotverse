import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import FullScreenLeadManager from "./FullScreenLeadManager";

/**
 * CRMLeadsView - Entry point for Lead Manager
 * 
 * When the user clicks "Open Lead Manager", the full-screen CRM interface opens.
 * This component is self-contained and doesn't require external props.
 */
const CRMLeadsView = () => {
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
