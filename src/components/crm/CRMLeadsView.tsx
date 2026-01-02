import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Search,
  Filter,
  List,
  LayoutGrid,
  Users,
  Eye,
  Plus,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { useCRM } from "@/hooks/useCRM";
import type { useSellerCRM } from "@/hooks/useSellerCRM";
import LeadsManager from "./LeadsManager";
import LeadsPipeline from "./LeadsPipeline";

interface CRMLeadsViewProps {
  sellerCRM: ReturnType<typeof useSellerCRM>;
  crmData: ReturnType<typeof useCRM>;
}

const CRMLeadsView = ({ sellerCRM, crmData }: CRMLeadsViewProps) => {
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewTab, setViewTab] = useState("leads");

  const { leads, productViews, aggregatedViews, creditsBalance, updateLeadStatus } = sellerCRM;

  const viewsCount = aggregatedViews?.length || 0;
  const leadsCount = leads?.length || 0;

  const handleStatusChange = async (leadId: string, status: any) => {
    await updateLeadStatus(leadId, status);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Product Views</p>
                <p className="text-2xl font-semibold">{viewsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-semibold">{leadsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Unlocked</p>
                <p className="text-2xl font-semibold">{leads?.filter(l => l.is_unlocked).length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Credits</p>
                <p className="text-2xl font-semibold">{creditsBalance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Tabs value={viewTab} onValueChange={setViewTab} className="w-auto">
              <TabsList>
                <TabsTrigger value="views" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Views ({viewsCount})
                </TabsTrigger>
                <TabsTrigger value="leads" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Leads ({leadsCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {viewTab === "leads" && (
                <>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="negotiating">Negotiating</SelectItem>
                      <SelectItem value="closed_won">Won</SelectItem>
                      <SelectItem value="closed_lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>

                  <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
                    <ToggleGroupItem value="list" aria-label="List view" className="h-9 px-3">
                      <List className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pipeline" aria-label="Pipeline view" className="h-9 px-3">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewTab === "leads" && viewMode === "pipeline" ? (
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsPipeline 
              leads={leads || []} 
              onStatusChange={handleStatusChange}
              onLeadClick={() => {}}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <LeadsManager 
            sellerId={sellerCRM.leads?.[0]?.seller_id || ''} 
          />
        </Card>
      )}
    </div>
  );
};

export default CRMLeadsView;
