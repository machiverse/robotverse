import assert from "node:assert/strict";
import { processesFromSkills } from "../src/utils/processAnalyzer";
import { planLine } from "../src/features/automation3d/robotKnowledge";
import { addJob, baseJob, isShare, removeTasks, shareJob, suggestJobs } from "../src/features/automation3d/lineEdit";
import { cellEquipment, jobsOfTitle } from "../src/features/automation3d/cellEquipment.js";

const names = (p: ReturnType<typeof planLine>) => p.robots.map((r) => r.tasks.map((t) => t.name).join(" + "));
const acts = (p: ReturnType<typeof planLine>, i: number) => p.robots[i].steps.map((s) => `${s.action}@${s.station}`);

// One welding job, and a second robot to share it: two welding cells, the part passed between them.
const weld = processesFromSkills(["MIG/MAG Welding"]);
assert.equal(planLine(weld).robots.length, 1);
const two = shareJob(weld, "MIG/MAG Welding");
assert.equal(two.added, "MIG/MAG Welding (2nd robot)");
assert.ok(isShare(two.added) && baseJob(two.added) === "MIG/MAG Welding");
assert.deepEqual(two.input[1].robot, weld[0].robot, "the second robot does the same job with the same robot class");
const p2 = planLine(two.input, "balanced", { splitBefore: [two.added] });
assert.deepEqual(names(p2), ["MIG/MAG Welding", "MIG/MAG Welding (2nd robot)"]);
assert.ok(acts(p2, 0).includes("weld@weld") && acts(p2, 1).includes("weld@weld"), "both robots weld");
assert.equal(acts(p2, 0).at(-1), "place@out", "robot 1 passes the part on");
assert.equal(acts(p2, 1)[0], "pick@in", "robot 2 takes it from the transfer belt");
// A third robot: named in order, after the second.
const three = shareJob(two.input, "MIG/MAG Welding");
assert.equal(three.added, "MIG/MAG Welding (3rd robot)");
assert.deepEqual(three.input.map((t) => t.name), ["MIG/MAG Welding", "MIG/MAG Welding (2nd robot)", "MIG/MAG Welding (3rd robot)"]);
assert.equal(planLine(three.input, "balanced", { splitBefore: [two.added, three.added] }).robots.length, 3);
// Sharing a shared job counts the copies of the base job.
assert.equal(shareJob(three.input, "MIG/MAG Welding (2nd robot)").added, "MIG/MAG Welding (4th robot)");

// A robot for another job: palletizing goes to the end, a process after the robot it follows.
const pal = addJob(weld, "Palletizing", "MIG/MAG Welding");
assert.equal(pal.added, "Palletizing");
const pp = planLine(pal.input, "balanced", { splitBefore: [pal.added] });
assert.deepEqual(names(pp), ["MIG/MAG Welding", "Palletizing"]);
assert.equal(acts(pp, 1).at(-1), "place@pallet");
const grind = addJob(pal.input, "Grinding & Surface Prep", "MIG/MAG Welding");
assert.deepEqual(grind.input.map((t) => t.name), ["MIG/MAG Welding", "Grinding & Surface Prep", "Palletizing"]);
assert.ok(grind.input[1].robot, "a library job brings its robot and tooling");
// A job already on the line is shared, not duplicated.
assert.equal(addJob(weld, "mig/mag welding").added, "MIG/MAG Welding (2nd robot)");
// Removing the added robot gives the line back.
assert.deepEqual(removeTasks(two.input, [two.added]).map((t) => t.name), ["MIG/MAG Welding"]);

// Suggestions fit the line and leave out what it has.
assert.equal(suggestJobs(weld)[0], "Grinding & Surface Prep");
assert.ok(!suggestJobs(pal.input).includes("Palletizing") && !suggestJobs(pal.input).includes("Packing & Box Forming"));
assert.equal(suggestJobs(processesFromSkills(["CNC Machining"]))[0], "Deflashing & Surface Finishing");
for (const j of [...suggestJobs(weld), ...suggestJobs(processesFromSkills(["CNC Machining"]))]) assert.equal(processesFromSkills([j])[0]?.name, j, `${j} is a library job`);

// The second robot's cell gets the welding set-up too.
assert.deepEqual(jobsOfTitle("Robot 2: MIG/MAG Welding (2nd robot)"), ["MIG/MAG Welding"]);
assert.ok(cellEquipment(jobsOfTitle("Robot 2: MIG/MAG Welding (2nd robot)")).some((x) => /power source/i.test(x.name)));

// Robot type and fence are separate: an industrial robot without a fence is guarded by scanners.
const open = cellEquipment(["MIG/MAG Welding"], { fenced: false, cobot: false });
assert.ok(open.some((x) => x.model === "controller") && !open.some((x) => x.model === "cobotBox"), "industrial controller");
assert.ok(open.some((x) => x.model === "scanner") && !open.some((x) => /safety fence/i.test(x.name)), "scanners, no fence");
assert.ok(open.some((x) => /10218-2/.test(x.name)), "risk assessment for an unfenced industrial robot");
const fencedCobot = cellEquipment(["Pick & Place Handling"], { fenced: true, cobot: true });
assert.ok(fencedCobot.some((x) => x.model === "cobotBox") && fencedCobot.some((x) => /safety fence/i.test(x.name)) && !fencedCobot.some((x) => x.model === "scanner"));

console.log("line edit: share, add, remove, suggestions and fence/robot type verified");
