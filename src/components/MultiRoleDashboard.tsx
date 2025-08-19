import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Store, Wrench, Settings, Truck, CreditCard } from "lucide-react";
import BuyerDashboard from "@/components/dashboards/BuyerDashboard";
import RobotSellerDashboard from "@/components/dashboards/RobotSellerDashboard";
import SparePartsDashboard from "@/pages/SparePartsSellerDashboard";
import ServiceProviderDashboard from "@/components/dashboards/ServiceProviderDashboard";
import LogisticsProviderDashboard from "@/components/dashboards/LogisticsProviderDashboard";
import FinanceProviderDashboard from "@/components/dashboards/FinanceProviderDashboard";
import { DashboardHeader } from "@/components/DashboardHeader";

interface MultiRoleDashboardProps {
  userProfile: any;
}

const MultiRoleDashboard = ({ userProfile }: MultiRoleDashboardProps) => {
  const userRoles = userProfile?.user_roles || [];
  const [activeTab, setActiveTab] = useState(userRoles[0] || 'buyer');

  const roleConfigs = {
    buyer: {
      label: 'Buyer',
      icon: ShoppingCart,
      component: BuyerDashboard
    },
    robot_seller: {
      label: 'Robot Seller',
      icon: Store,
      component: RobotSellerDashboard
    },
    spare_parts_seller: {
      label: 'Parts Seller',
      icon: Settings,
      component: SparePartsDashboard
    },
    service_provider: {
      label: 'Service Provider',
      icon: Wrench,
      component: ServiceProviderDashboard
    },
    logistics_provider: {
      label: 'Logistics',
      icon: Truck,
      component: LogisticsProviderDashboard
    },
    finance_provider: {
      label: 'Finance',
      icon: CreditCard,
      component: FinanceProviderDashboard
    }
  };

  // Single role: render business dashboard directly, NO company card inside the dashboard
  if (userRoles.length === 1) {
    const role = userRoles[0];
    const config = roleConfigs[role];
    if (config) {
      const DashboardComponent = config.component;
      return (
        <div className="container mx-auto px-4 py-8 space-y-6">
          <DashboardHeader userProfile={userProfile} />
          <DashboardComponent userProfile={userProfile} />
        </div>
      );
    }
  }

  // Multi-role: show tab navigation, only show business dashboards in tab content, NOT company info
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <DashboardHeader userProfile={userProfile} />
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <h1 className="text-3xl font-bold">Multi-Role Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((role: string) => (
              <Badge key={role} variant="secondary" className="capitalize">
                {roleConfigs[role]?.label || role.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
        <p className="text-muted-foreground">
          Manage your different roles and access specialized features for each.
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${userRoles.length}, 1fr)` }}>
          {userRoles.map((role: string) => {
            const config = roleConfigs[role];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <TabsTrigger key={role} value={role} className="flex items-center space-x-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {userRoles.map((role: string) => {
          const config = roleConfigs[role];
          if (!config) return null;
          const DashboardComponent = config.component;
          return (
            <TabsContent key={role} value={role} className="space-y-6">
              {/* Business dashboard ONLY; do NOT repeat company info or cards here */}
              <DashboardComponent userProfile={userProfile} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default MultiRoleDashboard;
