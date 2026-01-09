import { Coins, CreditCard, History, Crown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditBalanceWidget } from '@/components/credits/CreditBalanceWidget';
import { SubscriptionPlans } from '@/components/credits/SubscriptionPlans';
import { CreditPacksStore } from '@/components/credits/CreditPacksStore';
import { CreditTransactionHistory } from '@/components/credits/CreditTransactionHistory';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

const Credits = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Credits & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your credits and subscription to unlock buyer leads
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <CreditBalanceWidget showBuyButton={false} />
        </div>
        <div className="lg:col-span-2">
          <CreditTransactionHistory limit={5} showHeader={true} />
        </div>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="packs" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Buy Credits
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-muted-foreground">
                Get monthly credits and unlock premium features
              </p>
            </div>
            <SubscriptionPlans />
          </div>
        </TabsContent>

        <TabsContent value="packs">
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Buy Credit Packs</h2>
              <p className="text-muted-foreground">
                Pay as you go - no subscription required
              </p>
            </div>
            <CreditPacksStore />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <CreditTransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Credits;
