import type { ProcessCard } from "@/data/automationStudioIndustries";

export type ProcessKind = "handling" | "welding" | "machining" | "finishing" | "coating" | "inspection" | "packing" | "palletizing" | "transport" | "assembly" | "filling" | "sealing" | "labeling";
export const PROCESS_PROFILES: Record<ProcessKind, { label: string; color: string; skills: string[] }> = {
  handling: { label: "Handling", color: "#60a5fa", skills: ["Pick", "Transfer", "Place"] },
  welding: { label: "Welding / soldering", color: "#fb923c", skills: ["Fixture positioning", "Seam / joint path", "Tool retract"] },
  machining: { label: "Machining / forming", color: "#94a3b8", skills: ["Load fixture", "Machine cycle", "Unload"] },
  finishing: { label: "Surface finishing", color: "#c084fc", skills: ["Approach surface", "Sweep passes", "Tool retract"] },
  coating: { label: "Coating / dispensing", color: "#22d3ee", skills: ["Approach", "Application path", "Tool retract"] },
  inspection: { label: "Inspection / test", color: "#34d399", skills: ["Present part", "Scan / test", "Release"] },
  packing: { label: "Packing", color: "#fbbf24", skills: ["Form carton", "Load product", "Close carton"] },
  palletizing: { label: "Palletizing", color: "#f59e0b", skills: ["Pick case", "Layer positioning", "Stack"] },
  transport: { label: "Material transport", color: "#2dd4bf", skills: ["Collect load", "Travel", "Deliver"] },
  assembly: { label: "Assembly", color: "#818cf8", skills: ["Locate component", "Insert / fasten", "Release"] },
  filling: { label: "Filling / dosing", color: "#38bdf8", skills: ["Position container", "Dose", "Release"] },
  sealing: { label: "Capping / sealing", color: "#e879f9", skills: ["Position", "Cap / seal", "Release"] },
  labeling: { label: "Labeling", color: "#a3e635", skills: ["Locate pack", "Apply label", "Release"] },
};

// Classify the process itself, not incidental mentions in tooling or robot names.
export function processKind(process: Pick<ProcessCard, "name">): ProcessKind {
  const name = process.name.toLowerCase();
  if (/depallet/.test(name)) return "handling";
  if (/transport|material supply/.test(name)) return "transport";
  if (/weld|solder/.test(name)) return "welding";
  if (/polish|grind|finish|surface prep/.test(name)) return "finishing";
  if (/sealant|adhesive|paint|coat|spray|dispens/.test(name)) return "coating";
  if (/inspect|test|scan|verification|measur|gaug/.test(name)) return "inspection";
  if (/pallet|stack/.test(name)) return "palletizing";
  if (/label|coding|serialisation/.test(name)) return "labeling";
  if (/fill|dos/.test(name)) return "filling";
  if (/cap|seal|stopper/.test(name)) return "sealing";
  if (/cnc|mill|turning|drill|cut|bend|profil|chamfer|press|stamp|mould|mold|cast|forg/.test(name)) return "machining";
  if (/assembly|screw/.test(name)) return "assembly";
  if (/pack|box|carton/.test(name)) return "packing";
  return "handling";
}

export function stationPosition(index: number): [number, number, number] {
  const row = Math.floor(index / 4);
  return [(row % 2 ? 3 - index % 4 : index % 4) * 4.5, 0, row * 4.5];
}
