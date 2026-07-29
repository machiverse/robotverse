import { Coins, History, Crown, Sparkles, Shield, Zap, LayoutDashboard } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { CreditBalanceWidget } from '@/components/credits/CreditBalanceWidget';
import { SubscriptionPlans } from '@/components/credits/SubscriptionPlans';
import { CreditPacksStore } from '@/components/credits/CreditPacksStore';
import { CreditTransactionHistory } from '@/components/credits/CreditTransactionHistory';
import { SellerDashboardOverview } from '@/components/credits/SellerDashboardOverview';
import { DashboardSettingsLayout } from '@/components/dashboard/DashboardSettingsLayout';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useSearchParams } from '@/lib/router-compat';

const Credits = () => {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (value: string) => {
    if (value === 'overview') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground animate-pulse">Loading your credits...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardSettingsLayout
      title="Credits & Subscription"
      description="Manage your credits and subscription to unlock buyer leads"
    >
      {/* Hero Stats Section */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quick Unlock</p>
                <p className="text-lg font-semibold">1 Credit = 1 Lead</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verified Leads</p>
                <p className="text-lg font-semibold">100% Genuine</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bonus Credits</p>
                <p className="text-lg font-semibold">Up to 20% Extra</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Balance & Recent Transactions */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <CreditBalanceWidget showBuyButton={false} />
        </div>
        <div className="lg:col-span-2">
          <CreditTransactionHistory limit={5} showHeader={true} />
        </div>
      </div>

      {/* Tabs Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-b from-card to-card/50">
        <CardContent className="p-6">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 h-12 p-1 bg-muted/50">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="plans" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all"
              >
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Plans</span>
              </TabsTrigger>
              <TabsTrigger 
                value="packs" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all"
              >
                <Coins className="h-4 w-4" />
                <span className="hidden sm:inline">Buy Credits</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <SellerDashboardOverview />
            </TabsContent>

            <TabsContent value="plans" className="mt-6">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                    <Crown className="h-4 w-4" />
                    Subscription Plans
                  </div>
                  <h2 className="text-3xl font-bold mb-3">Choose Your Plan</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Get monthly credits and unlock premium features to grow your business
                  </p>
                </div>
                <SubscriptionPlans />
              </div>
            </TabsContent>

            <TabsContent value="packs" className="mt-6">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 text-sm font-medium mb-4">
                    <Coins className="h-4 w-4" />
                    Credit Packs
                  </div>
                  <h2 className="text-3xl font-bold mb-3">Buy Credit Packs</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Pay as you go - no subscription required. Perfect for occasional needs
                  </p>
                </div>
                <CreditPacksStore />
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-4">
                    <History className="h-4 w-4" />
                    Transaction History
                  </div>
                  <h2 className="text-3xl font-bold mb-3">Your Transactions</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Complete history of all your credit transactions
                  </p>
                </div>
                <CreditTransactionHistory />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardSettingsLayout>
  );
};

export default Credits;
