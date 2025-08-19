import {
  Tabs, TabsContent, TabsList, TabsTrigger,
  Card, CardContent, CardHeader, CardTitle,
  Badge, Button
} from '@/components/ui';
import RobotSellerDashboard from '@/components/RobotSellerDashboard';
import ServiceProviderDashboard from '@/components/ServiceProviderDashboard';
import SparePartsDashboard from '@/components/SparePartsDashboard';

const MultiRoleSellerDashboard = ({ userProfile }) => {
  // Role detection logic
  const userRoles = userProfile?.user_roles || [];
  const hasRobotSeller = userRoles.includes('robot_seller') || userProfile?.user_type === 'robot_seller';
  const hasPartsSeller = userRoles.includes('spare_parts_seller');
  const hasServiceProvider = userRoles.includes('service_provider') || userProfile?.user_type === 'service_provider';

  // Available role tabs
  const roles = [
    hasRobotSeller && { key: 'robots', label: 'Robot Seller', Component: RobotSellerDashboard },
    hasServiceProvider && { key: 'services', label: 'Service Provider', Component: ServiceProviderDashboard },
    hasPartsSeller && { key: 'parts', label: 'Parts Seller', Component: SparePartsDashboard }
  ].filter(Boolean);

  const [activeTab, setActiveTab] = useState(roles.length ? roles[0].key : '');

  return (
    <div className="space-y-6">
      {/* Company/Seller Info Card -- SHOW ONLY ONCE */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userProfile.company_name || 'Seller'}
            <span className="ml-2 text-sm text-muted-foreground">{userProfile.location}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {userRoles.map(role => (
              <Badge key={role} variant="secondary">{role.replace('_', ' ')}</Badge>
            ))}
          </div>
          {/* Optional: Company/Seller actions here */}
        </CardContent>
      </Card>

      {/* Tabs & Content: Only business dashboards */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex gap-2">
          {roles.map(role =>
            <TabsTrigger key={role.key} value={role.key}>
              {role.label}
            </TabsTrigger>
          )}
        </TabsList>

        {roles.map(role =>
          <TabsContent key={role.key} value={role.key}>
            <role.Component userProfile={userProfile} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default MultiRoleSellerDashboard;
