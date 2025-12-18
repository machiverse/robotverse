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

const PIPELINE_STAGES: { status: Lead["status"]; label: string; color: string }[] = [
  { status: "new", label: "New", color: "bg-blue-500" },
  { status: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { status: "quoted", label: "Quoted", color: "bg-purple-500" },
  { status: "negotiating", label: "Negotiation", color: "bg-orange-500" },
  { status: "closed_won", label: "Converted", color: "bg-green-500" },
  { status: "closed_lost", label: "Closed", color: "bg-red-500" },
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
      className="p-3 cursor-pointer hover:shadow-md transition-shadow border-muted/60"
      onClick={() => onLeadClick(lead)}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
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
          
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate">
                {lead.is_unlocked ? lead.buyer_company || "No company" : "XXXXX"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span className="truncate">{lead.item_name || "Unknown"}</span>
            </div>
          </div>

          {lead.product_price && (
            <Badge variant="secondary" className="mt-2 text-[10px]">
              ₹{lead.product_price.toLocaleString()}
            </Badge>
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
      className={`flex-1 min-w-[200px] max-w-[280px] flex flex-col rounded-lg border transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-muted/60 bg-muted/20"
      }`}
    >
      <div className="p-3 border-b border-muted/60">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${stage.color}`} />
          <span className="text-sm font-medium">{stage.label}</span>
          <Badge variant="secondary" className="ml-auto text-[10px]">
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
            <div className="py-8 text-center text-xs text-muted-foreground">
              No leads
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
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "400px" }}>
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
