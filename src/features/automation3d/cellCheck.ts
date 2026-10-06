// Checks for one robot cell in the builder: is the chosen robot, tool and safety type right for the job?
import { processKind, type ProcessKind } from "./processProfiles";
import { eoatKind } from "./robotSim.js";
import type { Choice } from "./EquipmentPicker";
import { attachmentIssues } from "./attachmentFit";

export type CheckState = "ok" | "warn" | "missing";
export interface CheckItem {
  state: CheckState;
  label: string;
  detail: string;
}

const GRIP = ["parallel", "dual", "vacuum", "magnet", "fork"];
/** End-of-arm tool families that do each kind of job. */
const TOOL_FOR: Record<ProcessKind, string[]> = {
  handling: GRIP, transport: GRIP, machining: GRIP, palletizing: ["vacuum", "fork", "parallel", "magnet"], packing: GRIP,
  welding: ["torch"], coating: ["nozzle"], finishing: ["spindle"], assembly: ["parallel", "dual", "driver", "vacuum"],
  inspection: [], filling: ["nozzle", "parallel", "vacuum"], sealing: ["nozzle", "parallel", "driver"], labeling: ["vacuum", "parallel", "nozzle"],
};
const TOOL_NAME: Record<string, string> = {
  parallel: "gripper", dual: "dual gripper", vacuum: "vacuum gripper", magnet: "magnetic gripper", fork: "fork / sack gripper",
  torch: "welding torch", spindle: "spindle / sander", driver: "screwdriver", nozzle: "dispensing / spray nozzle",
};
/** Robot types that suit only some jobs. */
const TYPE_FOR: [RegExp, ProcessKind[]][] = [
  [/scara/i, ["handling", "transport", "assembly", "packing", "inspection", "filling", "labeling", "sealing"]],
  [/delta/i, ["handling", "transport", "packing", "inspection", "labeling"]],
  [/palletiz/i, ["palletizing", "handling", "transport", "packing"]],
];

export const jobKind = (job: string) => processKind({ name: job });

export function checkCell(job: string, c: Choice, needKg: number | undefined, fenced: boolean | undefined, cobot: boolean): CheckItem[] {
  const kind = jobKind(job || "Loading & Unloading");
  const out: CheckItem[] = [];
  const r = c.robot;
  const t = c.tool;
  if (!job) out.push({ state: "missing", label: "Job", detail: "Drag a job onto this robot" });

  out.push(r ? { state: "ok", label: "Robot", detail: r.name } : { state: "missing", label: "Robot", detail: "Drag a robot onto this cell" });

  if (r) {
    const rule = TYPE_FOR.find(([re]) => re.test(`${r.type} ${r.name}`));
    out.push(
      rule && !rule[1].includes(kind)
        ? { state: "warn", label: "Robot type", detail: `A ${r.type} robot is not usual for ${job.toLowerCase()} — a 6-axis arm fits better` }
        : { state: "ok", label: "Robot type", detail: `${r.type || "Robot"} suits ${job.toLowerCase()}` },
    );
    if (r.payload != null && needKg != null)
      out.push(
        r.payload >= needKg
          ? { state: "ok", label: "Payload", detail: `${r.payload} kg ≥ ${needKg} kg needed` }
          : { state: "warn", label: "Payload", detail: `${r.payload} kg is below the ${needKg} kg this job needs (part + tool)` },
      );
  }

  const want = job ? TOOL_FOR[kind] : [];
  if (!t) out.push({ state: "missing", label: "Tool", detail: want.length ? `Add a ${TOOL_NAME[want[0]]}` : "Add a gripper or camera" });
  else {
    const k = eoatKind(`${t.name} ${t.type ?? ""}`);
    out.push(
      !want.length || want.includes(k)
        ? { state: "ok", label: "Tool", detail: `${t.name} fits the job` }
        : { state: "warn", label: "Tool", detail: `This looks like a ${TOOL_NAME[k] ?? "tool"}; ${job.toLowerCase()} needs a ${TOOL_NAME[want[0]]}` },
    );
  }

  if (r && fenced === undefined) out.push({ state: "missing", label: "Safety", detail: "Choose a safety fence or an open cobot cell" });
  else if (r)
    out.push(
      cobot
        ? { state: "ok", label: "Safety", detail: fenced ? "Fenced (a cobot may also run open after a risk assessment)" : "Open collaborative cell, speed and force limited" }
        : fenced
          ? { state: "ok", label: "Safety", detail: "Safety fence with interlocked door" }
          : { state: "warn", label: "Safety", detail: "An industrial robot needs a fence or light curtain (ISO 10218-2)" },
    );
  // Robot-attachment fit (weight, wrist, flange, brand, accessories); the tool-vs-job case is covered above.
  for (const f of attachmentIssues(job, c)) if (f.title !== "Tool does not do this job") out.push({ state: "warn", label: f.title, detail: f.detail });
  return out;
}

export const cellState = (items: CheckItem[]): CheckState =>
  items.some((i) => i.state === "missing") ? "missing" : items.some((i) => i.state === "warn") ? "warn" : "ok";
