import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Coins, Plus, Info } from "lucide-react";

interface CreditsDisplayProps {
  balance: number;
}

const CreditsDisplay = ({ balance }: CreditsDisplayProps) => {
  const isLow = balance < 20;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 border-muted-foreground/30 bg-background/60 backdrop-blur ${
            isLow ? "border-orange-300 text-orange-600" : ""
          }`}
        >
          <Coins className={`h-4 w-4 ${isLow ? "text-orange-500" : "text-amber-500"}`} />
          <span className="text-sm font-semibold">{balance}</span>
          <span className="text-xs text-muted-foreground">credits</span>
          {isLow && (
            <Badge variant="destructive" className="px-1.5 py-0 text-[10px] uppercase tracking-wide">
              Low
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">Credit balance</h4>
              <p className="text-xs text-muted-foreground">
                Credits are required to unlock full buyer details on leads.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase text-muted-foreground">Available</p>
              <p className="text-2xl font-semibold leading-tight">{balance}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Usage per lead unlock</span>
            </div>

            <div className="rounded-lg bg-muted p-3 text-xs">
              <div className="flex items-center justify-between">
                <span>Robot leads</span>
                <span className="font-medium">10 credits</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Spare parts leads</span>
                <span className="font-medium">5 credits</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Service leads</span>
                <span className="font-medium">5 credits</span>
              </div>
            </div>
          </div>

          <Button className="w-full" size="sm" variant="default">
            <Plus className="mr-2 h-4 w-4" />
            Buy more credits
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Need a higher volume plan? Contact admin for custom credit packages.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CreditsDisplay;
