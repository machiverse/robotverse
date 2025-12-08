import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Bell, 
  Clock,
  Target,
  FileText,
  Coins
} from 'lucide-react';
import { useSellerCRM, type CRMStats } from '@/hooks/useSellerCRM';
import LeadsManager from './LeadsManager';
import InvoicesManager from './InvoicesManager';
import FollowUpReminders from './FollowUpReminders';
import CreditsDisplay from './CreditsDisplay';

interface CRMDashboardProps {
  sellerId: string;
  itemType?: string;
}

const CRMDashboard = ({ sellerId, itemType }: CRMDashboardProps) => {
  const { stats, loading, creditsBalance } = useSellerCRM(itemType);
  const [activeTab, setActiveTab] = useState('leads');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Total Leads', 
      value: stats.totalLeads, 
      icon: Users, 
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30'
    },
    { 
      title: 'New Leads', 
      value: stats.newLeads, 
      icon: Target, 
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30'
    },
    { 
      title: 'Won Deals', 
      value: stats.closedWon, 
      icon: TrendingUp, 
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30'
    },
    { 
      title: 'Revenue', 
      value: `₹${stats.totalRevenue.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30'
    },
    { 
      title: 'Pending Follow-ups', 
      value: stats.pendingFollowUps, 
      icon: Bell, 
      color: stats.pendingFollowUps > 0 ? 'text-orange-600' : 'text-muted-foreground',
      bg: stats.pendingFollowUps > 0 ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-muted/30'
    },
    { 
      title: 'Credits', 
      value: creditsBalance, 
      icon: Coins, 
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main CRM Tabs */}
      <Card className="border-0 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b bg-muted/30 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">CRM Dashboard</CardTitle>
                <CardDescription>Manage leads, follow-ups, and invoices</CardDescription>
              </div>
              <CreditsDisplay balance={creditsBalance} />
            </div>
            <TabsList className="mt-4 bg-transparent border-b-0 p-0 h-auto">
              <TabsTrigger 
                value="leads" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                <Users className="w-4 h-4 mr-2" />
                Leads
                {stats.newLeads > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{stats.newLeads}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="follow-ups" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                <Clock className="w-4 h-4 mr-2" />
                Follow-ups
                {stats.pendingFollowUps > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">{stats.pendingFollowUps}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="invoices" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                <FileText className="w-4 h-4 mr-2" />
                Invoices
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-0">
            <TabsContent value="leads" className="m-0">
              <LeadsManager sellerId={sellerId} itemType={itemType} />
            </TabsContent>

            <TabsContent value="follow-ups" className="m-0">
              <FollowUpReminders sellerId={sellerId} />
            </TabsContent>

            <TabsContent value="invoices" className="m-0">
              <InvoicesManager sellerId={sellerId} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default CRMDashboard;