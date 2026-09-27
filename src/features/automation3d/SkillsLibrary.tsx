import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Search, Wrench } from "lucide-react";
import { SKILL_LIBRARY } from "@/utils/processAnalyzer";
import { PROCESS_PROFILES, processKind, type ProcessKind } from "./processProfiles";
import { SKILLS } from "./robotKnowledge";
import { EQUIPMENT, inrRange, robotPrice } from "./solutionCost";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Simulate one skill, e.g. with the sentence "We need robots for spot welding." */
  onTry: (text: string) => void;
}

// Every industrial robot skill the studio is trained on: what triggers it,
// what the robot does, typical robot, tooling and equipment price ranges.
export default function SkillsLibrary({ open, onOpenChange, onTry }: Props) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const m = new Map<ProcessKind, typeof SKILL_LIBRARY>();
    for (const s of SKILL_LIBRARY) {
      const hay = [s.template.name, ...s.keywords, ...s.template.eoat, s.template.robot.model].join(" ").toLowerCase();
      if (needle && !hay.includes(needle)) continue;
      const k = processKind(s.template);
      m.set(k, [...(m.get(k) || []), s]);
    }
    return [...m.entries()];
  }, [q]);
  const count = groups.reduce((n, [, l]) => n + l.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Industrial robot skills library</DialogTitle>
          <DialogDescription>
            The Automation Studio knows {SKILL_LIBRARY.length} robot automation skills across {Object.keys(SKILLS).length} process
            families. Write any of these tasks in your description and the studio plans the robots, tooling, 3D simulation
            and budget.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a task, tool or robot…" className="pl-8" />
        </div>
        <p className="text-xs text-muted-foreground">{count} skills</p>
        <div className="space-y-5">
          {groups.map(([kind, skills]) => {
            const eq = EQUIPMENT[kind];
            return (
              <section key={kind}>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PROCESS_PROFILES[kind].color }} />
                  {PROCESS_PROFILES[kind].label}
                </h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  {SKILLS[kind].does} Tool: {SKILLS[kind].toolName}
                  {SKILLS[kind].dedicated ? " (dedicated robot)" : ""}. Equipment:{" "}
                  {[...eq.eoat, ...eq.peripherals].map(([n]) => n).join(", ") || "gripper only"}.
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {skills.map(({ id, template, keywords }) => (
                    <div key={id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <b>{template.name}</b>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 px-2 text-xs"
                          onClick={() => {
                            onTry(`We need robots for ${template.name.toLowerCase()}.`);
                            onOpenChange(false);
                          }}
                        >
                          <Play className="mr-1 h-3 w-3" /> Simulate
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{template.automated.join(". ")}.</p>
                      <p className="mt-1.5 text-xs">
                        <span className="font-semibold">Typical robot:</span> {template.robot.model} ({template.robot.payload},{" "}
                        {template.robot.reach}) · approx. {inrRange(robotPrice(parseFloat(template.robot.payload) || 10))}
                      </p>
                      <p className="mt-1 flex gap-1 text-xs">
                        <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                        {template.eoat.join(", ")}
                      </p>
                      <p className="mt-1.5 flex flex-wrap gap-1">
                        {keywords.slice(0, 8).map((k) => (
                          <span key={k} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {k}
                          </span>
                        ))}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
