import { useState } from "react";
import { format } from "date-fns";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  User,
  Phone,
  Mail,
  Building2,
  Package,
  Lock,
  Unlock,
  GripVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Lead } from "@/hooks/useSellerCRM";

interface LeadsPipelineProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: Lead["status"]) => Promise<boolean | void>;
  onLeadClick: (lead: Lead) => void;
}

const PIPELINE_STAGES: { status: Lead["status"]; label: string; color: string; bgLight: string }[] = [
  { status: "new", label: "New", color: "bg-blue-500", bgLight: "bg-blue-50 dark:bg-blue-950/30" },
  { status: "contacted", label: "Contacted", color: "bg-amber-500", bgLight: "bg-amber-50 dark:bg-amber-950/30" },
  { status: "quoted", label: "Quoted", color: "bg-violet-500", bgLight: "bg-violet-50 dark:bg-violet-950/30" },
  { status: "negotiating", label: "Negotiation", color: "bg-orange-500", bgLight: "bg-orange-50 dark:bg-orange-950/30" },
  { status: "closed_won", label: "Won", color: "bg-emerald-500", bgLight: "bg-emerald-50 dark:bg-emerald-950/30" },
  { status: "closed_lost", label: "Lost", color: "bg-red-500", bgLight: "bg-red-50 dark:bg-red-950/30" },
];

interface DraggableLeadCardProps {
  lead: Lead;
  onLeadClick: (lead: Lead) => void;
}

const DraggableLeadCard = ({ lead, onLeadClick }: DraggableLeadCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: lead,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3 cursor-pointer hover:shadow-md transition-all duration-200 border-border/60 hover:border-primary/30 bg-card group"
      onClick={() => onLeadClick(lead)}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {lead.is_unlocked ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <Unlock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                <Lock className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <p className="text-sm font-semibold truncate">
              {lead.is_unlocked ? lead.buyer_name : "XXXXX"}
            </p>
          </div>
          
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {lead.is_unlocked ? lead.buyer_company || "No company" : "XXXXX"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium text-foreground/80">{lead.item_name || "Unknown"}</span>
            </div>
          </div>

          {lead.product_price && (
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary">
                ₹{lead.product_price.toLocaleString()}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const LeadCardOverlay = ({ lead }: { lead: Lead }) => (
  <Card className="p-3 shadow-lg border-primary/50 bg-card w-64">
    <div className="flex items-start gap-2">
      <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {lead.is_unlocked ? (
            <Unlock className="h-3 w-3 text-green-600" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
          <p className="text-sm font-medium truncate">
            {lead.is_unlocked ? lead.buyer_name : "XXXXX"}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Package className="h-3 w-3" />
          <span className="truncate">{lead.item_name || "Unknown"}</span>
        </div>
      </div>
    </div>
  </Card>
);

interface DroppableColumnProps {
  stage: typeof PIPELINE_STAGES[0];
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

const DroppableColumn = ({ stage, leads, onLeadClick }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] max-w-[300px] flex flex-col rounded-xl border-2 transition-all duration-200 ${
        isOver 
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
          : `border-transparent ${stage.bgLight}`
      }`}
    >
      <div className="p-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${stage.color} ring-2 ring-offset-2 ring-offset-background ring-${stage.color}/30`} />
          <span className="text-sm font-semibold tracking-tight">{stage.label}</span>
          <Badge variant="secondary" className="ml-auto text-[10px] font-bold px-2">
            {leads.length}
          </Badge>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {leads.map((lead) => (
            <DraggableLeadCard key={lead.id} lead={lead} onLeadClick={onLeadClick} />
          ))}
          {leads.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                <Package className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground">No leads</p>
              <p className="text-[10px] text-muted-foreground/60">Drag leads here</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const LeadsPipeline = ({ leads, onStatusChange, onLeadClick }: LeadsPipelineProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) {
      setActiveId(lead.id);
      setActiveLead(lead);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as Lead["status"];

    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.status !== newStatus) {
      await onStatusChange(leadId, newStatus);
    }
  };

  const getLeadsByStatus = (status: Lead["status"]) =>
    leads.filter((lead) => lead.status === status);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-1" style={{ minHeight: "450px" }}>
        {PIPELINE_STAGES.map((stage) => (
          <DroppableColumn
            key={stage.status}
            stage={stage}
            leads={getLeadsByStatus(stage.status)}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead && <LeadCardOverlay lead={activeLead} />}
      </DragOverlay>
    </DndContext>
  );
};

export default LeadsPipeline;
