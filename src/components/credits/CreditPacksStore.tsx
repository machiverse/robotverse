import { Coins, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSellerCredits } from '@/hooks/useSellerCredits';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/hooks/useAuth';
import { formatAmount } from '@/utils/currency';

interface CreditPacksStoreProps {
  onPurchaseComplete?: () => void;
}

export const CreditPacksStore = ({ onPurchaseComplete }: CreditPacksStoreProps) => {
  const { creditPacks, loading, refreshCredits } = useSellerCredits();
  const { purchaseCredits, processingPayment, loading: paymentLoading } = useRazorpay();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const handlePurchase = async (pack: typeof creditPacks[0]) => {
    const result = await purchaseCredits(
      pack.id,
      pack.credits_amount + (pack.bonus_credits || 0),
      Number(pack.price),
      user?.email
    );

    if (result.success) {
      await refreshCredits();
      onPurchaseComplete?.();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Buy Credits</h2>
        <p className="text-muted-foreground">Purchase credits to unlock leads and grow your business</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {creditPacks.map((pack) => {
          const totalCredits = pack.credits_amount + (pack.bonus_credits || 0);
          const perCreditCost = Number(pack.price) / totalCredits;

          return (
            <Card
              key={pack.id}
              className={`relative transition-all hover:shadow-lg hover:-translate-y-1 ${
                pack.is_popular ? 'ring-2 ring-primary border-primary/30' : ''
              }`}
            >
              {pack.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Best Value
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{pack.pack_name}</CardTitle>
                <CardDescription>One-time purchase</CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-3">
                  <span className="text-3xl font-bold text-primary">{pack.credits_amount}</span>
                  {pack.bonus_credits > 0 && (
                    <span className="text-lg text-success font-semibold ml-1">+{pack.bonus_credits}</span>
                  )}
                  <p className="text-sm text-muted-foreground">credits</p>
                </div>

                <div className="text-2xl font-bold mb-2">
                  {formatAmount(Number(pack.price))}
                </div>

                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {formatAmount(perCreditCost)} per credit
                </div>

                {pack.bonus_credits > 0 && (
                  <Badge variant="secondary" className="mt-2 bg-success/10 text-success border-success/30/20">
                    +{pack.bonus_credits} Bonus Credits
                  </Badge>
                )}
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={pack.is_popular ? 'default' : 'outline'}
                  onClick={() => handlePurchase(pack)}
                  disabled={processingPayment || paymentLoading}
                >
                  {processingPayment || paymentLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Buy Now'
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground mt-6">
        <p>🔒 Secure payment powered by Razorpay</p>
        <p className="mt-1">Credits never expire • Instant activation</p>
      </div>
    </div>
  );
};
