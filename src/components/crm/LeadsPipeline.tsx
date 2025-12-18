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
  Clock,
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

const PIPELINE_STAGES: { status: Lead["status"]; label: string; color: string; bgLight: string; dot: string }[] = [
  { status: "new",          label: "New",         color: "bg-blue-500",    bgLight: "bg-blue-50 dark:bg-blue-950/30",    dot: "bg-blue-500" },
  { status: "contacted",    label: "Contacted",   color: "bg-amber-500",   bgLight: "bg-amber-50 dark:bg-amber-950/30",  dot: "bg-amber-500" },
  { status: "quoted",       label: "Quoted",      color: "bg-violet-500",  bgLight: "bg-violet-50 dark:bg-violet-950/30", dot: "bg-violet-500" },
  { status: "negotiating",  label: "Negotiation", color: "bg-orange-500",  bgLight: "bg-orange-50 dark:bg-orange-950/30", dot: "bg-orange-500" },
  { status: "closed_won",   label: "Won",         color: "bg-emerald-500", bgLight: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500" },
  { status: "closed_lost",  label: "Lost",        color: "bg-red-500",     bgLight: "bg-red-50 dark:bg-red-950/30",      dot: "bg-red-500" },
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
      className="group cursor-pointer border border-border/60 bg-card p-3 text-xs shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
      onClick={() => onLeadClick(lead)}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 cursor-grab text-muted-foreground opacity-40 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            {lead.is_unlocked ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <Unlock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                <Lock className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <p className="truncate text-sm font-semibold">
              {lead.is_unlocked ? lead.buyer_name || "Unknown" : "XXXXX"}
            </p>
          </div>

          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {lead.is_unlocked ? lead.buyer_company || "No company" : "XXXXX"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium text-foreground">
                {lead.item_name || "Unknown product"}
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            {lead.product_price && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-[10px] font-semibold text-primary"
              >
                ₹{lead.product_price.toLocaleString()}
              </Badge>
            )}
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(lead.created_at), "dd MMM")}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const LeadCardOverlay = ({ lead }: { lead: Lead }) => (
  <Card className="w-64 border-primary/50 bg-card p-3 shadow-lg">
    <div className="flex items-start gap-2">
      <GripVertical className="mt-1 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {lead.is_unlocked ? (
            <Unlock className="h-3 w-3 text-emerald-600" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
          <p className="truncate text-sm font-medium">
            {lead.is_unlocked ? lead.buyer_name || "Unknown" : "XXXXX"}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Package className="h-3 w-3" />
          <span className="truncate">{lead.item_name || "Unknown product"}</span>
        </div>
      </div>
    </div>
  </Card>
);

interface DroppableColumnProps {
  stage: (typeof PIPELINE_STAGES)[number];
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
      className={`flex min-w-[230px] max-w-[320px] flex-1 flex-col rounded-xl border-2 transition-all duration-200 ${
        isOver
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : `border-transparent ${stage.bgLight}`
      }`}
    >
      <div className="border-b border-border/40 p-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
          <span className="text-sm font-semibold tracking-tight">{stage.label}</span>
          <Badge
            variant="secondary"
            className="ml-auto px-2 text-[10px] font-bold"
          >
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
            <div className="py-10 text-center text-[11px] text-muted-foreground">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-muted/50">
                <Package className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <p>No leads</p>
              <p className="text-[10px] text-muted-foreground/60">Drag leads here</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const LeadsPipeline = ({ leads, onStatusChange, onLeadClick }: LeadsPipelineProps) => {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
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
      <div
        className="flex gap-4 overflow-x-auto px-1 pb-4"
        style={{ minHeight: "460px" }}
      >
        {PIPELINE_STAGES.map((stage) => (
          <DroppableColumn
            key={stage.status}
            stage={stage}
            leads={getLeadsByStatus(stage.status)}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay>{activeLead && <LeadCardOverlay lead={activeLead} />}</DragOverlay>
    </DndContext>
  );
};

export default LeadsPipeline;
