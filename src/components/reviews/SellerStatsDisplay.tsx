import { Star, ShoppingBag } from 'lucide-react';

interface SellerStatsDisplayProps {
  completedSales?: number;
  averageRating?: number;
  totalReviews?: number;
  compact?: boolean;
}

export function SellerStatsDisplay({ completedSales = 0, averageRating = 0, totalReviews = 0, compact = false }: SellerStatsDisplayProps) {
  if (completedSales === 0 && totalReviews === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        {averageRating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({totalReviews})</span>
          </div>
        )}
        {completedSales > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{completedSales} sales</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-2">
      {averageRating > 0 && (
        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-full">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-sm">{averageRating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({totalReviews} reviews)</span>
        </div>
      )}
      {completedSales > 0 && (
        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full">
          <ShoppingBag className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold text-sm">{completedSales}</span>
          <span className="text-xs text-muted-foreground">completed sales</span>
        </div>
      )}
    </div>
  );
}
