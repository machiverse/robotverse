import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, DollarSign } from "lucide-react";
import { format } from "date-fns";
import type { useCRM } from "@/hooks/useCRM";

interface CRMQuotationsViewProps {
  crmData: ReturnType<typeof useCRM>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

const CRMQuotationsView = ({ crmData }: CRMQuotationsViewProps) => {
  const { quotations } = crmData;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredQuotations = quotations.filter((q) =>
    q.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Quotations ({quotations.length})</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search quotations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>
          <Button><Plus className="mr-2 h-4 w-4" />New Quotation</Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredQuotations.map((quotation) => (
          <Card key={quotation.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-indigo-100 p-2"><FileText className="h-5 w-5 text-indigo-600" /></div>
                <div>
                  <p className="font-medium">{quotation.quotation_number}</p>
                  <p className="text-sm text-muted-foreground">{quotation.buyer_name} • {quotation.buyer_company}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-green-600 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />₹{quotation.total_amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(new Date(quotation.created_at), 'dd MMM yyyy')}</p>
                </div>
                <Badge className={STATUS_COLORS[quotation.status] || STATUS_COLORS.draft}>{quotation.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredQuotations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-2 opacity-50" />
            <p>No quotations found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMQuotationsView;
