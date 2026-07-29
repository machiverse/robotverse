import { Bot, Package, Wrench, Crown, Calendar, CreditCard, TrendingUp, Shield, AlertTriangle, Infinity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useSellerCredits } from '@/hooks/useSellerCredits';
import { formatAmount } from '@/utils/currency';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const planBadgeVariants: Record<string, string> = {
  free: 'bg-muted text-muted-foreground border-border',
  basic: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  standard: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  premium: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
};

const planIcons: Record<string, React.ReactNode> = {
  free: <CreditCard className="h-4 w-4" />,
  basic: <TrendingUp className="h-4 w-4" />,
  standard: <Crown className="h-4 w-4" />,
  premium: <Shield className="h-4 w-4" />
};

export const SellerDashboardOverview = () => {
  const navigate = useNavigate();
  const { 
    isGrandfathered, 
    registrationDate, 
    currentPlan, 
    limits, 
    usage, 
    remaining,
    hasLeadManagerAccess,
    loading: limitsLoading 
  } = useSubscriptionLimits();
  
  const { credits, loading: creditsLoading } = useSellerCredits();

  const loading = limitsLoading || creditsLoading;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const planType = currentPlan?.plan_type || 'free';
  const creditBalance = credits?.current_balance || 0;

  const renderLimit = (limit: number, used: number, remaining: number) => {
    if (limit === -1) {
      return (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <Infinity className="h-4 w-4" />
          <span>Unlimited</span>
        </div>
      );
    }
    
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    const isLow = remaining <= 1 && limit > 0;
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className={isLow ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {used} / {limit} used
          </span>
          <span className={isLow ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {remaining} left
          </span>
        </div>
        <Progress value={percentage} className={isLow ? '[&>div]:bg-destructive' : ''} />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Account Status Banner */}
      <Card className={isGrandfathered ? 'border-green-500/30 bg-green-500/5' : 'border-primary/20'}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isGrandfathered ? 'bg-green-500/10' : planBadgeVariants[planType]}`}>
                {isGrandfathered ? <Shield className="h-5 w-5 text-green-600" /> : planIcons[planType]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    {isGrandfathered ? 'Legacy Account' : currentPlan?.plan_name || 'Free Plan'}
                  </h3>
                  <Badge variant="outline" className={planBadgeVariants[planType]}>
                    {planType.toUpperCase()}
                  </Badge>
                  {isGrandfathered && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      GRANDFATHERED
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Member since {registrationDate ? format(registrationDate, 'MMM d, yyyy') : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isGrandfathered && planType !== 'premium' && (
                <Button onClick={() => navigate('/pricing')} size="sm">
                  Upgrade Plan
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/credits')}>
                Buy Credits
              </Button>
            </div>
          </div>
          
          {isGrandfathered && (
            <p className="text-sm text-green-700 mt-3 bg-green-500/10 p-2 rounded">
              ✨ As a legacy member (registered before Feb 1, 2026), you enjoy unlimited listings and full platform access.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Credit Balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{creditBalance}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentPlan?.monthly_credits || 0} credits/month with plan
            </p>
            {creditBalance < 20 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Low credits - Buy more
              </div>
            )}
          </CardContent>
        </Card>

        {/* Robot Listings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Robot Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isGrandfathered ? (
              <div className="text-3xl font-bold text-green-600 flex items-center gap-2">
                <Infinity className="h-6 w-6" />
                <span className="text-lg">Unlimited</span>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">{usage.robots}</div>
                {renderLimit(limits.robots, usage.robots, remaining.robots)}
              </>
            )}
          </CardContent>
        </Card>

        {/* Spare Parts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Spare Parts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isGrandfathered ? (
              <div className="text-3xl font-bold text-green-600 flex items-center gap-2">
                <Infinity className="h-6 w-6" />
                <span className="text-lg">Unlimited</span>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">{usage.spareParts}</div>
                {renderLimit(limits.spareParts, usage.spareParts, remaining.spareParts)}
              </>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isGrandfathered ? (
              <div className="text-3xl font-bold text-green-600 flex items-center gap-2">
                <Infinity className="h-6 w-6" />
                <span className="text-lg">Unlimited</span>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">{usage.services}</div>
                {renderLimit(limits.services, usage.services, remaining.services)}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Access</CardTitle>
          <CardDescription>
            Your current plan features and access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className={`p-3 rounded-lg border ${hasLeadManagerAccess ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted/50'}`}>
              <div className="flex items-center gap-2">
                <Crown className={`h-4 w-4 ${hasLeadManagerAccess ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="font-medium text-sm">Lead Manager (CRM)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hasLeadManagerAccess ? '✅ Access enabled' : '🔒 Upgrade to unlock'}
              </p>
            </div>
            
            <div className={`p-3 rounded-lg border ${currentPlan?.has_advanced_analytics ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted/50'}`}>
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${currentPlan?.has_advanced_analytics ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="font-medium text-sm">Advanced Analytics</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentPlan?.has_advanced_analytics ? '✅ Full analytics' : '🔒 Basic only'}
              </p>
            </div>
            
            <div className="p-3 rounded-lg border border-border bg-muted/50">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Support Level</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentPlan?.support_level === 'priority_whatsapp' && '📞 Priority WhatsApp & Call'}
                {currentPlan?.support_level === 'priority_email' && '📧 Priority Email'}
                {currentPlan?.support_level === 'email' && '📧 Email Support'}
                {(!currentPlan?.support_level || currentPlan?.support_level === 'none') && '📄 Self-service'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
