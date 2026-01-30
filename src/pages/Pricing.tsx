import { Check, Crown, Zap, Rocket, Coins, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatAmount } from '@/utils/currency';
import { SEOHead } from '@/components/SEOHead';

const planIcons: Record<string, React.ReactNode> = {
  free: <Zap className="h-6 w-6" />,
  basic: <Zap className="h-6 w-6" />,
  standard: <Crown className="h-6 w-6" />,
  premium: <Rocket className="h-6 w-6" />
};

const planColors: Record<string, string> = {
  free: 'border-muted bg-muted/20',
  basic: 'border-blue-500/30 bg-blue-500/5',
  standard: 'border-amber-500/30 bg-amber-500/5',
  premium: 'border-purple-500/30 bg-purple-500/5'
};

const planBadgeColors: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  basic: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  standard: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  premium: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
};

const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    type: 'free',
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 100,
    features: ['100 free credits (one-time)', 'Basic lead access', 'Email support'],
  },
  {
    id: 'basic',
    name: 'Basic',
    type: 'basic',
    monthlyPrice: 999,
    annualPrice: 9990,
    credits: 500,
    features: ['500 credits/month', 'Priority lead access', 'Email & chat support', 'Basic analytics'],
  },
  {
    id: 'standard',
    name: 'Standard',
    type: 'standard',
    monthlyPrice: 2999,
    annualPrice: 29990,
    credits: 1500,
    features: ['1500 credits/month', 'Premium lead access', 'Priority support', 'Advanced analytics', 'CRM integration'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    type: 'premium',
    monthlyPrice: 4999,
    annualPrice: 49990,
    credits: 3000,
    features: ['3000 credits/month', 'Unlimited lead access', 'Dedicated support', 'Full analytics suite', 'API access', 'Custom integrations'],
  },
];

const creditPacks = [
  { id: '1', name: '₹500 Credits', credits: 500, price: 500 },
  { id: '2', name: '₹1,000 Credits', credits: 1000, price: 1000 },
  { id: '3', name: '₹2,000 Credits', credits: 2000, price: 2000 },
  { id: '4', name: '₹5,000 Credits', credits: 5000, price: 5000 },
];

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/dashboard/credits');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing & Credit Plans | RobotVerse - Industrial Robot Marketplace"
        description="Affordable pricing plans and credit packs for accessing verified industrial robot leads. Subscribe monthly or buy credits as needed. Start free with 100 credits."
        keywords="robotverse pricing, robot marketplace pricing, industrial robot leads cost, subscription plans, buy credits, robot marketplace fees, seller pricing india"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "RobotVerse Subscription Plans",
          "description": "Credit-based access to verified industrial robot buyer leads",
          "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "INR",
            "lowPrice": 0,
            "highPrice": 4999,
            "offerCount": 4
          }
        }}
      />
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/robotverse-logo.png" alt="RobotVerse" className="h-8" />
            <span className="font-bold text-xl">RobotVerse</span>
          </div>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Choose a subscription plan for monthly credits or buy credit packs as needed. 
            Unlock verified buyer leads and grow your business.
          </p>
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Subscription Plans</h2>
            <p className="text-muted-foreground mb-6">Get monthly credits with automatic renewal</p>
            
            <div className="flex items-center justify-center gap-4 mb-8">
              <Label htmlFor="pricing-toggle" className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
                Monthly
              </Label>
              <Switch
                id="pricing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <Label htmlFor="pricing-toggle" className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
                Annual
                <Badge variant="secondary" className="ml-2 text-xs bg-green-500/10 text-green-600 border-green-500/20">Save 17%</Badge>
              </Label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {subscriptionPlans.map((plan) => {
              const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
              const monthlyEquivalent = isAnnual && plan.annualPrice > 0 ? plan.annualPrice / 12 : plan.monthlyPrice;

              return (
                <Card
                  key={plan.id}
                  className={`relative transition-all hover:shadow-lg ${planColors[plan.type]} ${
                    plan.popular ? 'lg:-translate-y-2 ring-2 ring-amber-500/50' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-amber-500 text-white">Most Popular</Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2">
                    <div className={`mx-auto p-3 rounded-full w-fit mb-2 ${planBadgeColors[plan.type]}`}>
                      {planIcons[plan.type]}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.credits} credits/month</CardDescription>
                  </CardHeader>

                  <CardContent className="text-center">
                    <div className="mb-4">
                      {price === 0 ? (
                        <span className="text-4xl font-bold">Free</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold">{formatAmount(monthlyEquivalent)}</span>
                          <span className="text-muted-foreground">/month</span>
                        </>
                      )}
                      {isAnnual && price > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Billed {formatAmount(price)} annually
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 text-sm text-left">
                      {plan.features.map((feature, index) => (
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
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={handleGetStarted}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Credit Packs */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Credit Packs</h2>
            <p className="text-muted-foreground">One-time purchase • No subscription required • Never expires</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {creditPacks.map((pack) => (
              <Card key={pack.id} className="transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <Coins className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{pack.name}</CardTitle>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-3">
                    <span className="text-3xl font-bold text-primary">{pack.credits}</span>
                    <p className="text-sm text-muted-foreground">credits</p>
                  </div>

                  <div className="text-2xl font-bold">
                    {formatAmount(pack.price)}
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {formatAmount(pack.price / pack.credits)} per credit
                  </p>
                </CardContent>

                <CardFooter>
                  <Button className="w-full" variant="outline" onClick={handleGetStarted}>
                    Buy Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Grow Your Business?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Start with 100 free credits and unlock verified buyer leads today.
          </p>
          <Button size="lg" onClick={handleGetStarted}>
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>🔒 Secure payments powered by Razorpay</p>
          <p className="mt-2">© 2026 RobotVerse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
