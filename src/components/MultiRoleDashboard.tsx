import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Star, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Define icons and components for allowed roles (example placeholders)
const roleConfigs: Record<string, { label: string; icon: React.ElementType; component: React.FC<any> }> = {
  // Define allowed non-seller roles here. Example:
  buyer: { label: "Buyer", icon: Star, component: () => <div>Buyer Dashboard Content</div> },
  logistics: { label: "Logistics", icon: BarChart3, component: () => <div>Logistics Dashboard Content</div> },
  finance: { label: "Finance", icon: CheckCircle, component: () => <div>Finance Dashboard Content</div> }
};

// Roles to exclude (seller roles)
const excludedSellerRoles = ['robot_seller', 'spare_parts_seller', 'parts_seller', 'service_provider'];

interface MultiRoleDashboardProps {
  userProfile: any;
}

const MultiRoleDashboard = ({ userProfile }: MultiRoleDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Filter roles excluding seller roles
  const allRoles: string[] = userProfile?.user_roles || userProfile?.seller_roles || [];
  const filteredRoles = allRoles.filter(role => !excludedSellerRoles.includes(role) && roleConfigs[role]);
  const [activeTab, setActiveTab] = useState(filteredRoles[0] || '');

  useEffect(() => {
    if (filteredRoles.length > 0) {
      setActiveTab(filteredRoles);
    }
  }, [filteredRoles]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg">Please log in to access your dashboard.</p>
      </div>
    );
  }

  if (filteredRoles.length === 0) {
    return (
      <div className="space-y-6 p-6 max-w-md mx-auto">
        <Alert className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <AlertDescription className="text-yellow-700 flex flex-col items-center gap-2">
            <AlertCircle className="w-10 h-10" />
            <strong>No non-seller roles configured</strong>
            <p className="text-sm text-yellow-600 text-center">
              Your account does not have roles available for this dashboard. Please contact support or update your profile.
            </p>
          </AlertDescription>
        </Alert>
        <Button className="w-full" onClick={() => window.location.href = '/profile'}>
          Update Your Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Multi-Role Dashboard</h1>
        <Button variant="outline" size="sm" onClick={() => toast({ title: "Refresh triggered" })}>
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full h-12" style={{ gridTemplateColumns: `repeat(${filteredRoles.length}, 1fr)` }}>
          {filteredRoles.map(role => {
            const config = roleConfigs[role];
            const Icon = config.icon;
            return (
              <TabsTrigger key={role} value={role} className="flex items-center gap-2 justify-center">
                <Icon className="w-5 h-5" />
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {filteredRoles.map(role => {
          const config = roleConfigs[role];
          const DashboardComponent = config.component;
          return (
            <TabsContent key={role} value={role} className="mt-6">
              <DashboardComponent userProfile={userProfile} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default MultiRoleDashboard;
