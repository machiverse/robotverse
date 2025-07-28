import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Add this import to your Dashboard.tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { 
  Bot, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Users, 
  Star,
  Plus,
  Activity,
  DollarSign,
  Settings,
  BarChart
} from "lucide-react";

interface DashboardProps {
  userType: 'buyer' | 'seller' | 'service' | 'parts';
}

const Dashboard = ({ userType }: DashboardProps) => {
  const getDashboardData = () => {
    switch (userType) {
      case 'buyer':
        return {
          title: 'Buyer Dashboard',
          subtitle: 'Manage your robot purchases and wishlist',
          stats: [
            { label: 'Total Orders', value: '12', icon: ShoppingCart, trend: '+15%' },
            { label: 'Saved Robots', value: '28', icon: Bot, trend: '+8%' },
            { label: 'Active Bids', value: '5', icon: TrendingUp, trend: '+25%' },
            { label: 'Reviews Given', value: '9', icon: Star, trend: '+12%' }
          ],
          quickActions: [
            { label: 'Browse Marketplace', icon: Bot },
            { label: 'My Orders', icon: Package },
            { label: 'Wishlist', icon: Star },
            { label: 'Messages', icon: Users }
          ]
        };
      case 'seller':
        return {
          title: 'Seller Dashboard',
          subtitle: 'Manage your robot listings and sales',
          stats: [
            { label: 'Total Sales', value: '$45,230', icon: DollarSign, trend: '+22%' },
            { label: 'Active Listings', value: '18', icon: Bot, trend: '+5%' },
            { label: 'Orders Today', value: '7', icon: ShoppingCart, trend: '+35%' },
            { label: 'Rating', value: '4.8', icon: Star, trend: '+0.1' }
          ],
          quickActions: [
            { label: 'Add New Robot', icon: Plus },
            { label: 'Manage Listings', icon: Package },
            { label: 'Sales Analytics', icon: BarChart },
            { label: 'Customer Messages', icon: Users }
          ]
        };
      case 'service':
        return {
          title: 'Service Provider Dashboard',
          subtitle: 'Manage your robotics services and clients',
          stats: [
            { label: 'Active Services', value: '15', icon: Settings, trend: '+18%' },
            { label: 'This Month Revenue', value: '$12,850', icon: DollarSign, trend: '+28%' },
            { label: 'Pending Requests', value: '8', icon: Activity, trend: '+12%' },
            { label: 'Client Rating', value: '4.9', icon: Star, trend: '+0.2' }
          ],
          quickActions: [
            { label: 'Add Service', icon: Plus },
            { label: 'Schedule Calendar', icon: Activity },
            { label: 'Client Management', icon: Users },
            { label: 'Service Reports', icon: BarChart }
          ]
        };
      case 'parts':
        return {
          title: 'Parts Provider Dashboard',
          subtitle: 'Manage your spare parts inventory and orders',
          stats: [
            { label: 'Parts in Stock', value: '1,247', icon: Package, trend: '+8%' },
            { label: 'Orders Today', value: '23', icon: ShoppingCart, trend: '+15%' },
            { label: 'Revenue', value: '$8,950', icon: DollarSign, trend: '+20%' },
            { label: 'Supplier Rating', value: '4.7', icon: Star, trend: '+0.3' }
          ],
          quickActions: [
            { label: 'Add Parts', icon: Plus },
            { label: 'Inventory Management', icon: Package },
            { label: 'Bulk Orders', icon: Activity },
            { label: 'Parts Analytics', icon: BarChart }
          ]
        };
    }
  };

  const data = getDashboardData();

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{data.title}</h1>
          <p className="text-muted-foreground">{data.subtitle}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {data.stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-gradient-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {stat.trend}
                      </Badge>
                    </div>
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-card border-border mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button 
                    key={index} 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-start space-x-3 p-3 rounded-lg bg-background/50">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Sample activity item</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;