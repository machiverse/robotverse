import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Eye, BarChart3, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarketIntelligencePanelProps {
  robotId: string;
  onGenerateReport: (insights: any) => void;
}

interface MarketInsights {
  viewCount: number;
  similarRobotsCount: number;
  demandTrend: 'High' | 'Medium' | 'Low';
  pricePosition: string;
  marketCategory: string;
  recommendations: string[];
}

const MarketIntelligencePanel = ({ robotId, onGenerateReport }: MarketIntelligencePanelProps) => {
  const [insights, setInsights] = useState<MarketInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInsights();
  }, [robotId]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://cmahwgetrqczytnijbuk.supabase.co/functions/v1/robot-market-intelligence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getInsights',
          robotId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast({
        title: "Error",
        description: "Failed to load market insights.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'High': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            AI Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            AI Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load market insights.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          AI Market Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <Eye className="w-4 h-4" />
              Views
            </div>
            <div className="text-2xl font-bold text-foreground">{insights.viewCount}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Similar Products</div>
            <div className="text-2xl font-bold text-foreground">{insights.similarRobotsCount}</div>
          </div>
        </div>

        {/* Market Demand */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Market Demand</span>
            <Badge className={getTrendColor(insights.demandTrend)}>
              <TrendingUp className="w-3 h-3 mr-1" />
              {insights.demandTrend}
            </Badge>
          </div>
        </div>

        {/* Price Position */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Price Position</span>
            <Badge variant="outline">{insights.pricePosition}</Badge>
          </div>
        </div>

        {/* Market Category */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Category</span>
            <Badge variant="secondary">{insights.marketCategory}</Badge>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">AI Recommendations</h4>
          <div className="space-y-2">
            {insights.recommendations.map((rec, index) => (
              <div key={index} className="text-xs bg-muted p-2 rounded text-muted-foreground">
                • {rec}
              </div>
            ))}
          </div>
        </div>

        {/* Generate Report Button */}
        <Button 
          onClick={() => onGenerateReport(insights)} 
          className="w-full"
          variant="default"
        >
          <FileText className="w-4 h-4 mr-2" />
          Get Market Report
        </Button>
      </CardContent>
    </Card>
  );
};

export default MarketIntelligencePanel;