import { Coins, TrendingUp, TrendingDown, Crown, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSellerCredits } from '@/hooks/useSellerCredits';
import { formatAmount } from '@/utils/currency';
import { Link } from 'react-router-dom';

interface CreditBalanceWidgetProps {
  compact?: boolean;
  showBuyButton?: boolean;
}

export const CreditBalanceWidget = ({ compact = false, showBuyButton = true }: CreditBalanceWidgetProps) => {
  const { credits, currentPlan, loading } = useSellerCredits();

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const balance = credits?.current_balance || 0;
  const isLowBalance = balance <= 3;
  const monthlyCredits = currentPlan?.monthly_credits || 0;
  const usagePercent = monthlyCredits > 0 ? ((monthlyCredits - balance) / monthlyCredits) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
        <Coins className="h-4 w-4 text-primary" />
        <span className="font-semibold text-primary">{balance}</span>
        <span className="text-xs text-muted-foreground">credits</span>
        {isLowBalance && (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Available Credits</p>
            <div className="flex items-center gap-2">
              <Coins className="h-8 w-8 text-primary" />
              <span className="text-4xl font-bold text-primary tabular">{balance}</span>
            </div>
          </div>
          {currentPlan && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Crown className="h-3 w-3" />
              {currentPlan.plan_name}
            </Badge>
          )}
        </div>

        {currentPlan && monthlyCredits > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Monthly Usage</span>
              <span>{monthlyCredits - balance} / {monthlyCredits} used</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-2 bg-success/10 rounded-lg">
            <TrendingUp className="h-4 w-4 text-success mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total Earned</p>
            <p className="font-semibold text-success">{credits?.total_earned || 0}</p>
          </div>
          <div className="text-center p-2 bg-red-500/10 rounded-lg">
            <TrendingDown className="h-4 w-4 text-red-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="font-semibold text-red-600">{credits?.total_spent || 0}</p>
          </div>
        </div>

        {isLowBalance && (
          <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-xs text-amber-700">Low credit balance! Buy more to continue unlocking leads.</p>
          </div>
        )}

        {showBuyButton && (
          <Link to="/dashboard/credits">
            <Button className="w-full" variant={isLowBalance ? "default" : "outline"}>
              <Coins className="h-4 w-4 mr-2" />
              {isLowBalance ? 'Buy Credits Now' : 'Buy More Credits'}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};
