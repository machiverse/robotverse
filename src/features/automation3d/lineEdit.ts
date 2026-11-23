import { processesFromSkills } from "@/utils/processAnalyzer";
import type { planLine } from "./robotKnowledge";

/** The tasks a line is planned from. */
export type LineTasks = Parameters<typeof planLine>[0];

const SHARE = /\s*\((\d+)(?:st|nd|rd|th) robot\)$/i;
const ordinal = (n: number) => `${n}${n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

/** The job a task stands for: "MIG/MAG Welding (2nd robot)" is MIG/MAG Welding done by a second robot. */
export const baseJob = (name: string) => String(name).replace(SHARE, "");
/** A task another robot shares with the first one on the same job. */
export const isShare = (name: string) => SHARE.test(String(name));

/** Jobs at the end of a line: the part leaves on a pallet or in a carton. */
const OUTPUT = /palleti|stacking|packing|box form|carton|wrapping|shipping/i;

/**
 * One more robot on the same job: a copy of the task, named for its robot, right after the last robot on that
 * job. The robots split the work (each welds half the seams, tends half the machines), so the line makes
 * about one more share of parts per hour.
 */
export function shareJob(input: LineTasks, name: string): { input: LineTasks; added: string } {
  const base = baseJob(name);
  const at = input.reduce((k, t, i) => (baseJob(t.name) === base ? i : k), -1);
  const copies = input.filter((t) => baseJob(t.name) === base).length;
  const added = `${base} (${ordinal(copies + 1)} robot)`;
  const src = input.find((t) => t.name === base) ?? input[at] ?? { name: base };
  const task = { ...src, name: added };
  const next = at < 0 ? [...input, task] : [...input.slice(0, at + 1), task, ...input.slice(at + 1)];
  return { input: next, added };
}

/**
 * A robot for another job: after the robot it follows (`after`, a task name), or at the end of the line for
 * palletizing and packing. A job already on the line is shared instead.
 */
export function addJob(input: LineTasks, job: string, after?: string): { input: LineTasks; added: string } {
  const name = String(job).trim();
  if (input.some((t) => baseJob(t.name).toLowerCase() === name.toLowerCase())) return shareJob(input, input.find((t) => baseJob(t.name).toLowerCase() === name.toLowerCase())!.name);
  const card = processesFromSkills([name])[0];
  const task = card && card.name.toLowerCase() === name.toLowerCase() ? card : { name };
  const last = after ? input.findIndex((t) => t.name === after) : -1;
  const at = OUTPUT.test(task.name) || last < 0 ? input.length : last + 1;
  return { input: [...input.slice(0, at), task, ...input.slice(at)], added: task.name };
}

/** The line without the tasks the user added. */
export const removeTasks = (input: LineTasks, names: string[]) => input.filter((t) => !names.includes(t.name));

/** Jobs a line often gets a robot for next: inspection, palletizing or packing, a loader, finishing after welding. */
export function suggestJobs(input: LineTasks): string[] {
  const jobs = input.map((t) => baseJob(t.name).toLowerCase());
  const has = (re: RegExp) => jobs.some((j) => re.test(j));
  const out = ["Vision Inspection", "Palletizing", "Packing & Box Forming", "Loading & Unloading"];
  if (has(/weld/)) out.unshift("Grinding & Surface Prep");
  if (has(/cnc|machin|mill|turn/)) out.unshift("Deflashing & Surface Finishing");
  return out.filter((j) => !jobs.includes(j.toLowerCase()) && !(OUTPUT.test(j) && input.some((t) => OUTPUT.test(t.name)))).slice(0, 5);
}
