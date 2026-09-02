import { Check, Crown, Zap, Rocket, Loader2, Bot, Package, Wrench, CreditCard, Infinity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSellerCredits } from '@/hooks/useSellerCredits';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/hooks/useAuth';
import { formatAmount } from '@/utils/currency';
import { useState } from 'react';

interface SubscriptionPlansProps {
  onSubscribeComplete?: () => void;
}

const planIcons: Record<string, React.ReactNode> = {
  free: <CreditCard className="h-6 w-6" />,
  basic: <Zap className="h-6 w-6" />,
  standard: <Crown className="h-6 w-6" />,
  premium: <Rocket className="h-6 w-6" />
};

const planColors: Record<string, string> = {
  free: 'border-border bg-muted/30',
  basic: 'border-primary/30 bg-primary/5',
  standard: 'border-amber-500/30 bg-amber-500/5',
  premium: 'border-primary/30 bg-primary/5'
};

const planBadgeColors: Record<string, string> = {
  free: 'bg-muted text-muted-foreground border-border',
  basic: 'bg-primary/10 text-primary border-primary/30',
  standard: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  premium: 'bg-primary/10 text-primary border-primary/30'
};

// Listing limits per plan
const planLimits: Record<string, { robots: number; spareParts: number; services: number }> = {
  free: { robots: 2, spareParts: 5, services: 1 },
  basic: { robots: 7, spareParts: 15, services: 2 },
  standard: { robots: 15, spareParts: 30, services: 5 },
  premium: { robots: -1, spareParts: -1, services: -1 } // -1 = unlimited
};

const renderLimit = (limit: number, label: string, icon: React.ReactNode) => (
  <div className="flex items-center gap-2 text-xs">
    {icon}
    <span className="text-muted-foreground">{label}:</span>
    {limit === -1 ? (
      <span className="font-medium flex items-center gap-1">
        <Infinity className="h-3 w-3" /> Unlimited
      </span>
    ) : (
      <span className="font-medium">{limit}</span>
    )}
  </div>
);

export const SubscriptionPlans = ({ onSubscribeComplete }: SubscriptionPlansProps) => {
  const { plans, currentPlan, loading, refreshCredits } = useSellerCredits();
  const { isGrandfathered } = useSubscriptionLimits();
  const { subscribeToPlan, processingPayment, loading: paymentLoading } = useRazorpay();
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-48 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (plan.plan_type === 'free') return; // Free plan doesn't need subscription
    
    setSubscribingPlanId(plan.id);
    
    const result = await subscribeToPlan(
      plan.id,
      plan.plan_type,
      isAnnual ? 'annual' : 'monthly',
      user?.email
    );

    if (result.success) {
      await refreshCredits();
      onSubscribeComplete?.();
    }
    
    setSubscribingPlanId(null);
  };

  // Include all plans including free
  const allPlans = plans.length > 0 ? plans : [];

  return (
    <div className="space-y-6">
      {/* Grandfathered User Notice */}
      {isGrandfathered && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/10">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-success">Legacy Account Benefits</h3>
                <p className="text-sm text-success">
                  As a member registered before Feb 1, 2026, you enjoy unlimited listings regardless of plan. 
                  Subscribe to get monthly credits for unlocking buyer details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Subscription Plans</h2>
        <p className="text-muted-foreground">Choose a plan that fits your business needs</p>
        {!isGrandfathered && (
          <p className="text-xs text-muted-foreground mt-2">
            Listing limits apply to accounts registered on or after Feb 1, 2026
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 mb-8">
        <Label htmlFor="billing-toggle" className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={isAnnual}
          onCheckedChange={setIsAnnual}
        />
        <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
          Annual
          <Badge variant="secondary" className="ml-2 text-xs bg-success/10 text-success border-success/30">Save 17%</Badge>
        </Label>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {allPlans.map((plan) => {
          const isCurrentPlan = currentPlan?.id === plan.id;
          const isFreePlan = plan.plan_type === 'free';
          const price = isAnnual ? (plan.annual_price || plan.monthly_price * 12) : plan.monthly_price;
          const monthlyEquivalent = isAnnual ? price / 12 : price;
          const features = Array.isArray(plan.features) ? plan.features : [];
          const isSubscribing = subscribingPlanId === plan.id;
          const limits = planLimits[plan.plan_type] || planLimits.free;

          return (
            <Card
              key={plan.id}
              className={`relative transition-all hover:shadow-lg ${planColors[plan.plan_type] || planColors.free} ${
                plan.plan_type === 'standard' ? 'md:-translate-y-2 ring-2 ring-amber-500/50' : ''
              }`}
            >
              {plan.plan_type === 'standard' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-amber-500 text-primary-foreground">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className={`mx-auto p-3 rounded-full w-fit mb-2 ${planBadgeColors[plan.plan_type] || planBadgeColors.free}`}>
                  {planIcons[plan.plan_type] || planIcons.free}
                </div>
                <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                <CardDescription>
                  {plan.monthly_credits > 0 ? `${plan.monthly_credits} credits/month` : 'No monthly credits'}
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center space-y-4">
                <div>
                  {isFreePlan ? (
                    <span className="text-3xl font-bold">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{formatAmount(monthlyEquivalent)}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </>
                  )}
                  {isAnnual && !isFreePlan && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed {formatAmount(price)} annually
                    </p>
                  )}
                </div>

                {/* Listing Limits Section */}
                {!isGrandfathered && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Listing Limits</p>
                    {renderLimit(limits.robots, 'Robots', <Bot className="h-3 w-3 text-muted-foreground" />)}
                    {renderLimit(limits.spareParts, 'Spare Parts', <Package className="h-3 w-3 text-muted-foreground" />)}
                    {renderLimit(limits.services, 'Services', <Wrench className="h-3 w-3 text-muted-foreground" />)}
                  </div>
                )}

                <ul className="space-y-1.5 text-xs text-left">
                  {features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-3 w-3 text-success mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.plan_type === 'standard' ? 'default' : 'outline'}
                  disabled={isCurrentPlan || isFreePlan || processingPayment || paymentLoading}
                  onClick={() => handleSubscribe(plan)}
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : isFreePlan ? (
                    'Current Plan'
                  ) : (
                    'Choose Plan'
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Credit Cost Reference */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-medium mb-3 text-sm">Credit Usage Guide</h4>
          <div className="grid md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span>Robot buyer unlock: <strong>10 credits</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span>Spare part buyer unlock: <strong>5 credits</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <span>Service buyer unlock: <strong>5 credits</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground mt-6">
        <p>🔒 Secure payment powered by Razorpay</p>
        <p className="mt-1">Cancel anytime • Credits added monthly • Credits never expire</p>
      </div>
    </div>
  );
};
