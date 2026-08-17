import { ArrowUpRight, ArrowDownRight, Gift, RefreshCw, Unlock, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSellerCredits } from '@/hooks/useSellerCredits';
import { format } from 'date-fns';

const transactionIcons: Record<string, React.ReactNode> = {
  purchase: <CreditCard className="h-4 w-4" />,
  subscription_credit: <RefreshCw className="h-4 w-4" />,
  lead_unlock: <Unlock className="h-4 w-4" />,
  refund: <ArrowUpRight className="h-4 w-4" />,
  bonus: <Gift className="h-4 w-4" />,
  expired: <ArrowDownRight className="h-4 w-4" />
};

const transactionColors: Record<string, string> = {
  purchase: 'bg-success/10 text-success',
  subscription_credit: 'bg-primary/10 text-primary',
  lead_unlock: 'bg-amber-500/10 text-amber-600',
  refund: 'bg-primary/10 text-primary',
  bonus: 'bg-pink-500/10 text-pink-600',
  expired: 'bg-red-500/10 text-red-600'
};

const transactionLabels: Record<string, string> = {
  purchase: 'Purchase',
  subscription_credit: 'Subscription',
  lead_unlock: 'Lead Unlock',
  refund: 'Refund',
  bonus: 'Bonus',
  expired: 'Expired'
};

interface CreditTransactionHistoryProps {
  limit?: number;
  showHeader?: boolean;
}

export const CreditTransactionHistory = ({ limit, showHeader = true }: CreditTransactionHistoryProps) => {
  const { transactions, loading } = useSellerCredits();

  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
      )}
      <CardContent className={showHeader ? '' : 'pt-6'}>
        {displayTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Your credit transactions will appear here</p>
          </div>
        ) : (
          <ScrollArea className={limit ? '' : 'h-[400px]'}>
            <div className="space-y-3">
              {displayTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${transactionColors[tx.transaction_type]}`}>
                      {transactionIcons[tx.transaction_type]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {tx.description || transactionLabels[tx.transaction_type]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.credits_amount > 0 ? 'text-success' : 'text-red-600'}`}>
                      {tx.credits_amount > 0 ? '+' : ''}{tx.credits_amount}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Balance: {tx.balance_after}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
