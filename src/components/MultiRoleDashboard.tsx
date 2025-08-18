/**import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  
  // If user only has one role, default to that role's dashboard
  const [activeTab, setActiveTab] = useState(userRoles[0] || 'buyer');

  const roleConfigs = {
    buyer: {
      label: 'Buyer',
      icon: ShoppingCart,
      component: BuyerDashboard,
      description: 'Browse and purchase robots'
    },
    robot_seller: {
      label: 'Robot Seller',
      icon: Store,
      component: RobotSellerDashboard,
      description: 'Manage robot listings'
    },
    spare_parts_seller: {
      label: 'Parts Seller',
      icon: Settings,
      component: SparePartsDashboard, // Reuse for now, can be specialized later
      description: 'Manage spare parts'
    },
    service_provider: {
      label: 'Service Provider',
      icon: Wrench,
      component: ServiceProviderDashboard,
      description: 'Manage service offerings'
    },
    logistics_provider: {
      label: 'Logistics',
      icon: Truck,
      component: LogisticsProviderDashboard,
      description: 'Manage shipments'
    },
    finance_provider: {
      label: 'Finance',
      icon: CreditCard,
      component: FinanceProviderDashboard,
      description: 'Manage loan programs'
    }
  };

  // If user has only one role, render that dashboard directly
  if (userRoles.length === 1) {
    const role = userRoles[0];
    const config = roleConfigs[role];
    if (config) {
      const DashboardComponent = config.component;
      return <DashboardComponent userProfile={userProfile} />;
    }
  }

  // If user has multiple roles, show tabbed interface
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Dashboard Header with Company Logo */}
     /** <DashboardHeader userProfile={userProfile} onProfileUpdate={() => {}} />
      
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
              <TabsTrigger 
                key={role} 
                value={role}
                className="flex items-center space-x-2"
              >
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <config.icon className="w-5 h-5" />
                    <span>{config.label} Dashboard</span>
                  </CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
              </Card>
              <DashboardComponent userProfile={userProfile} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default MultiRoleDashboard;