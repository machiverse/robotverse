import { Coins, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSellerCredits } from '@/hooks/useSellerCredits';
import { formatAmount } from '@/utils/currency';
import { toast } from 'sonner';

interface CreditPacksStoreProps {
  onSelectPack?: (packId: string) => void;
}

export const CreditPacksStore = ({ onSelectPack }: CreditPacksStoreProps) => {
  const { creditPacks, loading } = useSellerCredits();

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

  const handleSelectPack = (packId: string) => {
    if (onSelectPack) {
      onSelectPack(packId);
    } else {
      toast.info('Payment integration coming soon!');
    }
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {creditPacks.map((pack) => {
        const totalCredits = pack.credits_amount + pack.bonus_credits;
        const perCreditCost = pack.price / totalCredits;

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
              <CardDescription>Pay as you go</CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="mb-3">
                <span className="text-3xl font-bold text-primary">{pack.credits_amount}</span>
                {pack.bonus_credits > 0 && (
                  <span className="text-lg text-green-500 font-semibold ml-1">+{pack.bonus_credits}</span>
                )}
                <p className="text-sm text-muted-foreground">credits</p>
              </div>

              <div className="text-2xl font-bold mb-2">
                {formatAmount(pack.price)}
              </div>

              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {formatAmount(perCreditCost)} per credit
              </div>

              {pack.bonus_credits > 0 && (
                <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-600 border-green-500/20">
                  +{pack.bonus_credits} Bonus Credits
                </Badge>
              )}
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={pack.is_popular ? 'default' : 'outline'}
                onClick={() => handleSelectPack(pack.id)}
              >
                Buy Now
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
