import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Coins, Plus, Info } from 'lucide-react';

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
          className={`gap-2 ${isLow ? 'border-orange-300 text-orange-600' : ''}`}
        >
          <Coins className={`w-4 h-4 ${isLow ? 'text-orange-500' : 'text-amber-500'}`} />
          <span className="font-semibold">{balance}</span>
          <span className="text-muted-foreground">credits</span>
          {isLow && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Low</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Credit Balance</h4>
            <span className="text-2xl font-bold">{balance}</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Credits are used to unlock buyer details</span>
            </div>
            
            <div className="bg-muted rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between">
                <span>Robot leads</span>
                <span className="font-medium">10 credits</span>
              </div>
              <div className="flex justify-between">
                <span>Spare Parts leads</span>
                <span className="font-medium">5 credits</span>
              </div>
              <div className="flex justify-between">
                <span>Service leads</span>
                <span className="font-medium">5 credits</span>
              </div>
            </div>
          </div>

          <Button className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Buy More Credits
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Contact admin for credit packages
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CreditsDisplay;