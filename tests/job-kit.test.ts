import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suggest } from "../src/features/automation3d/builderExtras";
import { toolFamily, type DirTool, type Match } from "../src/features/automation3d/equipmentScore";
import { isComponent } from "../src/features/automation3d/jobGear";
import { jobKit, kitGuide } from "../src/features/automation3d/jobKit";
import { BLOCKS } from "../src/features/automation3d/ProcessBuilder";
import { thinkCell } from "../src/features/automation3d/engineerPlaybook";
import { attachmentIssues } from "../src/features/automation3d/attachmentFit";

const dr = JSON.parse(readFileSync("public/directory/robots.json", "utf8"));
const dt: DirTool[] = JSON.parse(readFileSync("public/directory/tools.json", "utf8"));
const raw = { dr, dt, mr: [], mt: [] };
const catalog: Match[] = dt.map((t) => ({ source: "oem", kind: "tool", id: t.id, name: t.n, brand: t.b, model: t.m, type: t.c, href: "", score: 0, reasons: [] }));
const item = (re: RegExp) => catalog.find((m) => re.test(m.name))!;
const robot = (re: RegExp): Match => {
  const r = dr.find((x: { n: string }) => re.test(x.n));
  return { source: "oem", kind: "robot", id: r.id, name: r.n, brand: r.b, payload: r.p, reach: r.r, type: r.t, href: "", score: 0, reasons: r.ap?.includes("Collaborative") ? ["Collaborative"] : [] };
};
const names = (xs: { match: Match }[]) => xs.map((x) => x.match.name).join(" | ");

// The Directory keeps every earlier entry and adds the tools jobs were missing, numbered on.
assert.equal(new Set(dt.map((t) => t.id)).size, dt.length, "unique ids");
dt.forEach((t, i) => assert.equal(t.id, `RVTool${String(i + 1).padStart(4, "0")}`));
for (const re of [/laser welding head/i, /tig welding torch/i, /ultrasonic welding horn/i, /riveting tool/i, /laser cleaning head/i, /sack gripper/i, /dual gripper/i, /label applicator/i, /capping head/i, /filling nozzle/i, /seam tracking/i, /collision sensor/i, /tip dresser/i, /screw feeder/i])
  assert.ok(dt.some((t) => re.test(t.n)), `Directory lists ${re}`);
// Components are never offered as the working tool.
for (const t of dt) if (isComponent(t.n, t.c)) assert.equal(toolFamily(t.n, t.c), null, `${t.n} is a component`);

// Every builder job: a kit made of real catalogue items, and software to program and run it.
for (const b of BLOCKS) {
  const s = suggest(b.name, 10, raw);
  const kit = jobKit({ job: b.name, robot: s.robot, tool: s.tool, fenced: true }, catalog);
  kit.components.forEach((x) => assert.ok(isComponent(x.match.name, x.match.type), `${b.name}: ${x.match.name} is a component`));
  kit.accessories.forEach((a) => assert.ok(["changer", "sensor", "camera"].includes(a.slot)));
  assert.ok(kit.software.length >= 3, `${b.name}: software`);
  assert.ok(kit.software.some((x) => /TIA Portal/.test(x.name)) && kit.software.some((x) => /Safety Designer/.test(x.name)), `${b.name}: line and safety software`);
  // What the kit suggests never trips the attachment checks.
  const choice = { ...s, ...Object.fromEntries(kit.accessories.map((a) => [a.slot, a.match])) };
  const slots = kit.accessories.map((a) => a.slot as string);
  const fit = attachmentIssues(b.name, choice).filter((f) => slots.includes(f.slot));
  assert.deepEqual(fit.map((f) => f.title), [], `${b.name}: ${names(kit.accessories)}`);
  const g = kitGuide(b.name);
  assert.ok(g.tool && g.software.length, `${b.name}: guide`);
}

// MIG welding on an ABB arc robot: the welding package and the parts around the torch.
{
  const kit = jobKit({ job: "MIG/MAG Welding", robot: robot(/ABB IRB 2600ID-8/), tool: item(/ABIROB A360/), fenced: true }, catalog);
  const sw = kit.software.map((x) => x.name);
  assert.deepEqual(sw.slice(0, 3), ["RobotStudio", "RobotWare Arc", "OCTOPUZ"]);
  assert.match(names(kit.components), /Power Source/);
  assert.match(names(kit.components), /Wire Feeder/);
  assert.match(names(kit.components), /BRS-CC Torch Cleaning/);
  assert.match(names(kit.components), /Collision Sensor/);
  assert.match(names(kit.accessories), /Seam Tracking/);
  assert.ok(kit.also.some((x) => /fume/i.test(x)));
}
// Force control: a sensor for assembly (cobot or industrial), none when the grinding tool is compliant.
assert.match(names(jobKit({ job: "Assembly", robot: robot(/^UR10e/), tool: item(/OnRobot 2FG7/) }, catalog).accessories), /FT 300|HEX/);
assert.match(names(jobKit({ job: "Assembly", robot: robot(/KUKA KR 10 R1420/), tool: item(/EGU 50/) }, catalog).accessories), /Axia80/);
assert.ok(!jobKit({ job: "Polishing", robot: robot(/KUKA KR 30 R2100/), tool: item(/FerRobotics ACF K-5227600/) }, catalog).accessories.some((a) => a.slot === "sensor"));
assert.ok(jobKit({ job: "Grinding & Surface Prep", robot: robot(/KUKA KR 30 R2100/), tool: item(/Teknomotor ATC71/) }, catalog).accessories.some((a) => a.slot === "sensor"));
// Vacuum: a generator only where the gripper has none built in; spare cups for all.
assert.ok(!/Vacuum Generator/.test(names(jobKit({ job: "Cartoning (Product into Cartons)", robot: robot(/^UR10e/), tool: item(/OnRobot VG10/) }, catalog).components)));
assert.match(names(jobKit({ job: "Cartoning (Product into Cartons)", robot: robot(/KUKA KR 10 R1420/), tool: item(/SMC ZXP7A01-ZP20U/) }, catalog).components), /Vacuum Generator/);
// Palletizing software by maker and robot class; bin picking vision; two tools ask for a changer.
assert.ok(jobKit({ job: "Palletizing", robot: robot(/Fanuc M-410iC\/110/), tool: item(/FMP/) }, catalog).software.some((x) => /PalletTool/.test(x.name)));
assert.ok(jobKit({ job: "Palletizing", robot: robot(/^UR20/), tool: item(/2FGP20 Palletizer/) }, catalog).software.some((x) => x.name === "Pally"));
assert.ok(jobKit({ job: "Bin Picking", robot: robot(/KUKA KR 10 R1420/), tool: item(/EGU 50/) }, catalog).software.some((x) => /Bin Picking Studio/.test(x.name)));
assert.match(names(jobKit({ job: "MIG/MAG Welding", robot: robot(/ABB IRB 2600ID-8/), tool: item(/ABIROB A360/), tool2: item(/EGU 50/) }, catalog).accessories), /ATI QC-11 Tool Changer \(Master/);
assert.match(names(jobKit({ job: "Loading & Unloading", robot: robot(/^UR10e/), tool: item(/OnRobot 2FG7/), tool2: item(/OnRobot RG6/) }, catalog).accessories), /OnRobot Quick/);

// The engineer's reasoning lists what is still missing, then what is in the cell, and the software.
{
  const r = robot(/ABB IRB 2600ID-8/);
  const tool = item(/ABIROB A360/);
  const kit = jobKit({ job: "MIG/MAG Welding", robot: r, tool, fenced: true }, catalog);
  const base = { job: "MIG/MAG Welding", choice: { robot: r, tool }, fenced: true, cobot: false, cycle: null, checks: [], kit };
  const before = thinkCell(base);
  assert.equal(before.find((t) => t.step === "Accessories & components")?.state, "todo");
  assert.match(before.find((t) => t.step === "Software")!.thought, /RobotStudio/);
  const after = thinkCell({ ...base, choice: { ...base.choice, camera: kit.accessories[0].match }, parts: kit.components.map((x) => x.match) });
  assert.equal(after.find((t) => t.step === "Accessories & components")?.state, "ok");
}
console.log(`job kits: ${BLOCKS.length} jobs with accessories, components and software`);
