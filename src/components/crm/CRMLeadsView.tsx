import type { useCRM } from "@/hooks/useCRM";
import type { useSellerCRM } from "@/hooks/useSellerCRM";
import LeadsManager from "./LeadsManager";
import { useAuth } from "@/hooks/useAuth";

interface CRMLeadsViewProps {
  sellerCRM: ReturnType<typeof useSellerCRM>;
  crmData: ReturnType<typeof useCRM>;
}

/**
 * CRMLeadsView - Consolidated Lead Manager
 * 
 * This component provides a unified view for all lead-related data:
 * - Product Views: Shows user engagement with products
 * - Leads: General inquiries and converted views
 * - Quote Requests: Buyer quote submissions
 * 
 * All sub-navigation is handled within LeadsManager component.
 */
const CRMLeadsView = ({ sellerCRM, crmData }: CRMLeadsViewProps) => {
  const { user } = useAuth();
  
  return (
    <LeadsManager 
      sellerId={user?.id || ''} 
    />
  );
};

export default CRMLeadsView;
