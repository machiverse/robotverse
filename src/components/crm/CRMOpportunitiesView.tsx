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

      <div className="overflow-x-auto rounded-lg border border-foreground/10 bg-card">
        <table className="w-full min-w-[820px] border-collapse text-[13px] leading-[1.4]">
          <thead className="sticky top-0 z-10 bg-card text-left text-[11px] font-normal uppercase tracking-[0.06em] text-foreground/45">
            <tr className="h-10 border-b border-foreground/10"><th className="px-4 font-normal">Opportunity</th><th className="px-4 font-normal">Stage</th><th className="px-4 text-right font-normal">Value</th><th className="px-4 text-right font-normal">Probability</th><th className="px-4 text-right font-normal">Close date</th><th className="w-12 px-2"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {filteredOpportunities.map((opp) => {
              const config = STAGE_CONFIG[opp.stage as keyof typeof STAGE_CONFIG];
              return <tr key={opp.id} tabIndex={0} className="h-11 border-b border-foreground/[0.06] text-foreground/65 transition-[background-color,color] duration-150 ease-out last:border-b-0 hover:bg-foreground/[0.03] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <td className="px-4"><p className="font-semibold text-foreground">{opp.opportunity_name}</p><p className="text-[11px] text-foreground/45">{opp.opportunity_number}</p></td>
                <td className="px-4 capitalize"><span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${config?.color.split(' ')[0] || 'bg-muted'}`} />{config?.label || opp.stage.replace('_', ' ')}</td>
                <td className="px-4 text-right font-semibold tabular-nums">₹{((opp.expected_value || 0) / 100000).toFixed(1)}L</td>
                <td className="px-4 text-right tabular-nums">{opp.probability}%</td>
                <td className="px-4 text-right tabular-nums">{opp.expected_close_date ? format(new Date(opp.expected_close_date), 'dd MMM yyyy') : '—'}</td>
                <td className="px-2"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" strokeWidth={1.5} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{stages.filter((stage) => stage !== opp.stage).map((stage) => <DropdownMenuItem key={stage} onClick={() => handleStageChange(opp.id, stage)}>Move to {STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG].label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></td>
              </tr>;
            })}
          </tbody>
        </table>
        {filteredOpportunities.length === 0 && <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-[13px] text-foreground/65"><Target className="h-4 w-4" strokeWidth={1.5} /><p>Qualified deals and their expected value will appear here.</p><Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />New Opportunity</Button></div>}
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
