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

const PIPELINE_STAGES: { status: Lead["status"]; label: string; color: string; bgLight: string; dot: string; textColor: string }[] = [
  { status: "new",          label: "New",         color: "bg-blue-500",    bgLight: "bg-blue-50 dark:bg-blue-950/30",    dot: "bg-blue-500", textColor: "text-blue-700 dark:text-blue-300" },
  { status: "contacted",    label: "Contacted",   color: "bg-amber-500",   bgLight: "bg-amber-50 dark:bg-amber-950/30",  dot: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-300" },
  { status: "quoted",       label: "Quoted",      color: "bg-violet-500",  bgLight: "bg-violet-50 dark:bg-violet-950/30", dot: "bg-violet-500", textColor: "text-violet-700 dark:text-violet-300" },
  { status: "negotiating",  label: "Negotiation", color: "bg-orange-500",  bgLight: "bg-orange-50 dark:bg-orange-950/30", dot: "bg-orange-500", textColor: "text-orange-700 dark:text-orange-300" },
  { status: "closed_won",   label: "Won",         color: "bg-emerald-500", bgLight: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500", textColor: "text-emerald-700 dark:text-emerald-300" },
  { status: "closed_lost",  label: "Lost",        color: "bg-red-500",     bgLight: "bg-red-50 dark:bg-red-950/30",      dot: "bg-red-500", textColor: "text-red-700 dark:text-red-300" },
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
      className="group cursor-pointer border border-border/40 bg-card p-3.5 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
      onClick={() => onLeadClick(lead)}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 cursor-grab text-muted-foreground/40 transition-colors group-hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          {/* Header with avatar and name */}
          <div className="mb-2 flex items-center gap-2.5">
            {lead.is_unlocked ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {(lead.buyer_name || "U").charAt(0).toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Lock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              </div>
            )}
            <p className="truncate text-sm font-semibold text-foreground">
              {lead.is_unlocked ? lead.buyer_name || "Unknown" : "XXXXX"}
            </p>
          </div>

          {/* Company and Product info */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">
                {lead.is_unlocked ? lead.buyer_company || "No company" : "XXXXX"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <span className="truncate font-medium text-foreground/90">
                {lead.item_name || "Unknown product"}
              </span>
            </div>
          </div>

          {/* Footer with price and date */}
          <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2">
            {lead.product_price ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ₹{lead.product_price.toLocaleString()}
              </span>
            ) : (
              <span />
            )}
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
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
      className={`flex min-w-[240px] max-w-[320px] flex-1 flex-col rounded-xl border transition-all duration-200 ${
        isOver
          ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border/30 bg-card/50"
      }`}
    >
      {/* Column Header */}
      <div className={`rounded-t-xl border-b border-border/20 px-4 py-3 ${stage.bgLight}`}>
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${stage.dot} ring-2 ring-white dark:ring-slate-900`} />
          <span className={`text-sm font-semibold tracking-tight ${stage.textColor}`}>{stage.label}</span>
          <Badge
            variant="secondary"
            className="ml-auto h-5 min-w-[20px] justify-center rounded-full px-2 text-[10px] font-bold bg-background/80 text-foreground"
          >
            {leads.length}
          </Badge>
        </div>
      </div>

      {/* Cards Area */}
      <ScrollArea className="flex-1 p-2.5">
        <div className="space-y-2.5">
          {leads.map((lead) => (
            <DraggableLeadCard key={lead.id} lead={lead} onLeadClick={onLeadClick} />
          ))}
          {leads.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/30">
                <Package className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-xs font-medium text-muted-foreground/60">No leads</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/40">Drag leads here</p>
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
