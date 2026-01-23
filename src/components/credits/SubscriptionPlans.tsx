import { Check, Crown, Zap, Rocket, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSellerCredits } from '@/hooks/useSellerCredits';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/hooks/useAuth';
import { formatAmount } from '@/utils/currency';
import { useState } from 'react';

interface SubscriptionPlansProps {
  onSubscribeComplete?: () => void;
}

const planIcons: Record<string, React.ReactNode> = {
  basic: <Zap className="h-6 w-6" />,
  standard: <Crown className="h-6 w-6" />,
  premium: <Rocket className="h-6 w-6" />
};

const planColors: Record<string, string> = {
  basic: 'border-blue-500/30 bg-blue-500/5',
  standard: 'border-amber-500/30 bg-amber-500/5',
  premium: 'border-purple-500/30 bg-purple-500/5'
};

const planBadgeColors: Record<string, string> = {
  basic: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  standard: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  premium: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
};

export const SubscriptionPlans = ({ onSubscribeComplete }: SubscriptionPlansProps) => {
  const { plans, currentPlan, loading, refreshCredits } = useSellerCredits();
  const { subscribeToPlan, processingPayment, loading: paymentLoading } = useRazorpay();
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
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

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Subscription Plans</h2>
        <p className="text-muted-foreground">Choose a plan that fits your business needs</p>
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
          <Badge variant="secondary" className="ml-2 text-xs bg-green-500/10 text-green-600 border-green-500/20">Save 17%</Badge>
        </Label>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan?.id === plan.id;
          const price = isAnnual ? (plan.annual_price || plan.monthly_price * 12) : plan.monthly_price;
          const monthlyEquivalent = isAnnual ? price / 12 : price;
          const features = Array.isArray(plan.features) ? plan.features : [];
          const isSubscribing = subscribingPlanId === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative transition-all hover:shadow-lg ${planColors[plan.plan_type]} ${
                plan.plan_type === 'standard' ? 'md:-translate-y-2 ring-2 ring-amber-500/50' : ''
              }`}
            >
              {plan.plan_type === 'standard' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-amber-500 text-white">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className={`mx-auto p-3 rounded-full w-fit mb-2 ${planBadgeColors[plan.plan_type]}`}>
                  {planIcons[plan.plan_type]}
                </div>
                <CardTitle className="text-xl">{plan.plan_name}</CardTitle>
                <CardDescription>{plan.monthly_credits} credits/month</CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-4">
                  <span className="text-4xl font-bold">{formatAmount(monthlyEquivalent)}</span>
                  <span className="text-muted-foreground">/month</span>
                  {isAnnual && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Billed {formatAmount(price)} annually
                    </p>
                  )}
                </div>

                <ul className="space-y-2 text-sm text-left">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.plan_type === 'standard' ? 'default' : 'outline'}
                  disabled={isCurrentPlan || processingPayment || paymentLoading}
                  onClick={() => handleSubscribe(plan)}
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
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

      <div className="text-center text-sm text-muted-foreground mt-6">
        <p>🔒 Secure payment powered by Razorpay</p>
        <p className="mt-1">Cancel anytime • Credits added monthly</p>
      </div>
    </div>
  );
};
