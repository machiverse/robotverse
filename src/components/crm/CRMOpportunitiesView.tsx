import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Plus,
  Target,
  DollarSign,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash,
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { useCRM, CRMOpportunity } from "@/hooks/useCRM";

interface CRMOpportunitiesViewProps {
  crmData: ReturnType<typeof useCRM>;
}

const STAGE_CONFIG = {
  qualification: { label: "Qualification", color: "bg-primary/10 text-primary", probability: 10 },
  needs_analysis: { label: "Needs Analysis", color: "bg-yellow-100 text-yellow-700", probability: 25 },
  proposal: { label: "Proposal", color: "bg-primary/10 text-primary", probability: 50 },
  negotiation: { label: "Negotiation", color: "bg-orange-100 text-orange-700", probability: 75 },
  closed_won: { label: "Closed Won", color: "bg-success/10 text-success", probability: 100 },
  closed_lost: { label: "Closed Lost", color: "bg-red-100 text-red-700", probability: 0 },
};

const CRMOpportunitiesView = ({ crmData }: CRMOpportunitiesViewProps) => {
  const { opportunities, createOpportunity, updateOpportunity } = crmData;
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    opportunity_name: "",
    description: "",
    stage: "qualification",
    expected_value: "",
    expected_close_date: "",
    probability: 10,
  });

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = opp.opportunity_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleCreate = async () => {
    if (!formData.opportunity_name) return;
    await createOpportunity({
      opportunity_name: formData.opportunity_name,
      description: formData.description,
      stage: formData.stage,
      expected_value: formData.expected_value ? parseFloat(formData.expected_value) : undefined,
      expected_close_date: formData.expected_close_date || undefined,
      probability: formData.probability,
    });
    setIsCreateOpen(false);
    setFormData({
      opportunity_name: "",
      description: "",
      stage: "qualification",
      expected_value: "",
      expected_close_date: "",
      probability: 10,
    });
  };

  const handleStageChange = async (oppId: string, newStage: string) => {
    const config = STAGE_CONFIG[newStage as keyof typeof STAGE_CONFIG];
    await updateOpportunity(oppId, { 
      stage: newStage,
      probability: config?.probability || 0,
      is_closed: ['closed_won', 'closed_lost'].includes(newStage),
    });
  };

  // Group by stage for Kanban view
  const stages = Object.keys(STAGE_CONFIG);
  const oppsByStage = stages.reduce((acc, stage) => {
    acc[stage] = filteredOpportunities.filter(o => o.stage === stage);
    return acc;
  }, {} as Record<string, CRMOpportunity[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Opportunities</h2>
          <p className="text-sm text-muted-foreground">
            {opportunities.length} opportunities • ₹{(crmData.stats.pipelineValue / 100000).toFixed(1)}L pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Opportunity
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-6 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const config = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG];
          const stageOpps = oppsByStage[stage] || [];
          const stageValue = stageOpps.reduce((sum, o) => sum + (o.expected_value || 0), 0);

          return (
            <div key={stage} className="min-w-[250px]">
              <div className={`rounded-t-lg p-3 ${config.color}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{config.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {stageOpps.length}
                  </Badge>
                </div>
                <p className="text-xs mt-1 opacity-80">
                  ₹{(stageValue / 100000).toFixed(1)}L
                </p>
              </div>
              <div className="bg-muted/50 rounded-b-lg p-2 min-h-[400px] space-y-2">
                {stageOpps.map((opp) => (
                  <Card key={opp.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{opp.opportunity_name}</p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {opp.opportunity_number}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {stages.filter(s => s !== stage).map((s) => (
                              <DropdownMenuItem 
                                key={s}
                                onClick={() => handleStageChange(opp.id, s)}
                              >
                                Move to {STAGE_CONFIG[s as keyof typeof STAGE_CONFIG].label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <DollarSign className="h-3 w-3 text-success" />
                          <span className="font-medium text-success">
                            ₹{((opp.expected_value || 0) / 100000).toFixed(1)}L
                          </span>
                          <span className="text-muted-foreground">({opp.probability}%)</span>
                        </div>
                        {opp.expected_close_date && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(opp.expected_close_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {stageOpps.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                    No opportunities
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Opportunity Name *</Label>
              <Input
                value={formData.opportunity_name}
                onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })}
                placeholder="Enter opportunity name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stage</Label>
                <Select 
                  value={formData.stage} 
                  onValueChange={(v) => setFormData({ 
                    ...formData, 
                    stage: v,
                    probability: STAGE_CONFIG[v as keyof typeof STAGE_CONFIG]?.probability || 10
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.filter(s => !['closed_won', 'closed_lost'].includes(s)).map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected Value (₹)</Label>
                <Input
                  type="number"
                  value={formData.expected_value}
                  onChange={(e) => setFormData({ ...formData, expected_value: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expected Close Date</Label>
                <Input
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Probability (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Opportunity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMOpportunitiesView;
