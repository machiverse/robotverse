import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/DashboardHeader";
import BuyerDashboard from "@/components/dashboards/BuyerDashboard";
import MultiRoleSellerDashboard from "@/components/MultiRoleSellerDashboard";
import LogisticsProviderDashboard from "@/components/dashboards/LogisticsProviderDashboard";
import FinanceProviderDashboard from "@/components/dashboards/FinanceProviderDashboard";
import { ShoppingCart, Store, Truck, CreditCard } from "lucide-react";

interface MultiRoleDashboardProps {
  userProfile: any;
}
const MultiRoleDashboard = ({ userProfile }: MultiRoleDashboardProps) => {
  const userRoles = userProfile?.user_roles || [];
  const sellerRoles = userRoles.filter((role: string) => 
    ['robot_seller', 'spare_parts_seller', 'service_provider'].includes(role)
  );
  const otherRoles = userRoles.filter((role: string) => 
    !['robot_seller', 'spare_parts_seller', 'service_provider'].includes(role)
  );
  
  // Single role case
  if (userRoles.length === 1) {
    const role = userRoles;
    if (sellerRoles.includes(role)) {
      return (
        <div className="container mx-auto px-4 py-8 space-y-6">
          <DashboardHeader userProfile={userProfile} onProfileUpdate={() => {}} />
          <MultiRoleSellerDashboard userProfile={userProfile} />
        </div>
      );
    }
    const roleConfigs = {
      buyer: BuyerDashboard,
      logistics_provider: LogisticsProviderDashboard,
      finance_provider: FinanceProviderDashboard,
    };
    const DashboardComponent = roleConfigs[role as keyof typeof roleConfigs];
    if (DashboardComponent) {
      return (
        <div className="container mx-auto px-4 py-8 space-y-6">
          <DashboardHeader userProfile={userProfile} onProfileUpdate={() => {}} />
          <DashboardComponent userProfile={userProfile} />
        </div>
      );
    }
  }

  // Multiple roles => Tabs
  const [activeTab, setActiveTab] = useState(sellerRoles.length > 0 ? 'seller' : otherRoles || 'buyer');
  const tabConfigs = {
    seller: {
      label: 'Seller Dashboard',
      icon: Store,
      component: MultiRoleSellerDashboard,
      description: 'Manage robots, parts & services',
    },
    buyer: {
      label: 'Buyer',
      icon: ShoppingCart,
      component: BuyerDashboard,
      description: 'Browse and purchase robots',
    },
    logistics_provider: {
      label: 'Logistics',
      icon: Truck,
      component: LogisticsProviderDashboard,
      description: 'Manage shipments',
    },
    finance_provider: {
      label: 'Finance',
      icon: CreditCard,
      component: FinanceProviderDashboard,
      description: 'Manage loan programs',
    }
  };
  const availableTabs = [];
  if (sellerRoles.length > 0) availableTabs.push('seller');
  otherRoles.forEach(role => {
    if (tabConfigs[role as keyof typeof tabConfigs]) availableTabs.push(role);
  });
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <DashboardHeader userProfile={userProfile} onProfileUpdate={() => {}} />
      {availableTabs.length > 1 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` }}>
            {availableTabs.map(tabKey => {
              const config = tabConfigs[tabKey as keyof typeof tabConfigs];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <TabsTrigger key={tabKey} value={tabKey} className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {availableTabs.map(tabKey => {
            const config = tabConfigs[tabKey as keyof typeof tabConfigs];
            if (!config) return null;
            const DashboardComponent = config.component;
            return (
              <TabsContent key={tabKey} value={tabKey} className="space-y-6">
                <DashboardComponent userProfile={userProfile} />
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <MultiRoleSellerDashboard userProfile={userProfile} />
      )}
    </div>
  );
};
export default MultiRoleDashboard;
