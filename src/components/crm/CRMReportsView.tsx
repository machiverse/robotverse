import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Target, DollarSign } from "lucide-react";
import type { useCRM } from "@/hooks/useCRM";
import type { useSellerCRM } from "@/hooks/useSellerCRM";

interface CRMReportsViewProps {
  crmData: ReturnType<typeof useCRM>;
  sellerCRM: ReturnType<typeof useSellerCRM>;
}

const CRMReportsView = ({ crmData, sellerCRM }: CRMReportsViewProps) => {
  const { stats, opportunities } = crmData;

  const wonOpps = opportunities.filter(o => o.stage === 'closed_won');
  const lostOpps = opportunities.filter(o => o.stage === 'closed_lost');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Reports & Analytics</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.wonDeals} won / {stats.totalLeads} leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">₹{(stats.pipelineValue / 100000).toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground mt-1">Weighted: ₹{(stats.weightedPipeline / 100000).toFixed(1)}L</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Won Revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">₹{(stats.wonRevenue / 100000).toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground mt-1">{wonOpps.length} deals closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Win/Loss Ratio</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lostOpps.length > 0 ? (wonOpps.length / lostOpps.length).toFixed(1) : wonOpps.length}:1</p>
            <p className="text-xs text-muted-foreground mt-1">{wonOpps.length} won, {lostOpps.length} lost</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Lead Sources</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Website', 'Inquiry', 'Referral', 'Exhibition', 'Direct'].map((source, i) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm">{source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.random() * 80 + 20}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{Math.floor(Math.random() * 30 + 5)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Product Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Industrial Robots', 'Spare Parts', 'Services', 'Software', 'Tools'].map((cat) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm">{cat}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${Math.random() * 80 + 20}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-16">₹{(Math.random() * 50).toFixed(1)}L</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CRMReportsView;
