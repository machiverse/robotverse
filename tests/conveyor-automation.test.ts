import assert from "node:assert/strict";
import { AUTOMATION_SKILLS, briefQuestion, CONVEYOR_PRODUCTS, defaultSetup, describedIn, describeLink, planConveyorAutomation, proposeAutomation, STATION_WORDS } from "../src/features/automation3d/conveyorAutomation";
import { SKILL_LIBRARY } from "../src/utils/processAnalyzer";
import { PRODUCT_KEYS, productInfo } from "../src/features/automation3d/workpieces.js";

// Every product offered for the belt is a real product of the 3D studio.
for (const k of CONVEYOR_PRODUCTS) assert.ok(PRODUCT_KEYS.includes(k), `${k} is a studio product`);

// A carton on a belt it fits on.
const carton = defaultSetup("carton");
const [, , depth] = productInfo({ key: "carton" }).size;
assert.ok(carton.conveyor.width >= depth + 0.08, "the default belt fits the carton with room for guide rails");
assert.equal(carton.mode, "index");

const robot = { name: "FANUC M-20iD/25", brand: "FANUC", payloadKg: 25, reachMm: 1831 };
const vacuum = { name: "Schmalz FXCB vacuum gripper", type: "Vacuum Gripper" };

// Stop and pick, end to end: no blocking issue, the seven stages in order, the handshake signals.
{
  const plan = planConveyorAutomation({ setup: carton, robot, tool: vacuum, destination: "pallet" });
  assert.ok(plan.ok, JSON.stringify(plan.issues));
  assert.deepEqual(plan.sequence.map((s) => s.stage), ["Feed", "Convey", "Sense", "Pick", "Transfer", "Place", "Repeat"]);
  assert.deepEqual(plan.io.map((s) => s.tag), ["FEED", "CONV_RUN", "CONV_RUNNING", "PE1", "PART_READY", "ROBOT_IN_ZONE", "PICK_DONE", "GRIP_CMD", "GRIP_OK"]);
  assert.match(plan.io.find((s) => s.tag === "GRIP_OK")!.device, /vacuum switch/i, "a vacuum gripper confirms with its vacuum switch");
  assert.match(plan.sequence[3].detail, /PART_READY/);
  assert.ok(plan.estimate.indexSeconds! > 0.25 && plan.estimate.indexSeconds! < 3, `index time ${plan.estimate.indexSeconds}`);
  assert.equal(plan.estimate.brakingMm, 30, "0.3 m/s braking at 1.5 m/s² takes 30 mm");
  assert.equal(plan.sim.belt.mode, "index");
  assert.equal(plan.sim.product.key, "carton");
  assert.ok(plan.sim.infeed.width >= depth);
}

// What cannot work is a stop, with the reason.
{
  const heavy = planConveyorAutomation({ setup: carton, robot: { ...robot, payloadKg: 7 }, tool: vacuum, destination: "pallet" });
  assert.ok(!heavy.ok);
  assert.ok(heavy.issues.some((i) => i.level === "stop" && /Too heavy/.test(i.text)));
  const torch = planConveyorAutomation({ setup: carton, robot, tool: { name: "Binzel ABIROB MIG torch" }, destination: "pallet" });
  assert.ok(torch.issues.some((i) => i.level === "stop" && /not a gripper/.test(i.text)));
  const none = planConveyorAutomation({ setup: carton, robot: null, tool: null, destination: null });
  assert.equal(none.issues.filter((i) => i.level === "stop").length, 3, "robot, gripper and destination are all missing");
  const narrow = planConveyorAutomation({ setup: { ...carton, conveyor: { ...carton.conveyor, width: 0.2 } }, robot, tool: vacuum, destination: "pallet" });
  assert.ok(narrow.issues.some((i) => i.level === "stop" && /too narrow/.test(i.text)));
  const fast = planConveyorAutomation({ setup: { ...carton, conveyor: { ...carton.conveyor, speed: 0.7 } }, robot, tool: vacuum, destination: "pallet" });
  assert.ok(fast.issues.some((i) => i.level === "warn" && /soft stops or conveyor tracking/.test(i.text)));
}

// Conveyor tracking: the maker's option and an encoder; the belt never stops, so no PART_READY handshake.
{
  const plan = planConveyorAutomation({ setup: { ...carton, mode: "track" }, robot, tool: vacuum, destination: "pallet" });
  assert.ok(plan.ok);
  assert.ok(plan.issues.some((i) => /FANUC Line Tracking/.test(i.text)));
  assert.ok(plan.io.some((s) => s.tag === "ENC") && !plan.io.some((s) => s.tag === "PART_READY"));
  assert.equal(plan.estimate.indexSeconds, null);
  const other = planConveyorAutomation({ setup: { ...carton, mode: "track" }, robot: { name: "Acme Arm 10", payloadKg: 20 }, tool: vacuum, destination: "pallet" });
  assert.ok(other.issues.some((i) => i.level === "warn" && /offers conveyor tracking/.test(i.text)));
}

// A feeder faster than the belt can carry is flagged.
{
  const plan = planConveyorAutomation({ setup: { ...carton, feed: { rate: 200, gap: 0.2 } }, robot, tool: vacuum, destination: "pallet" });
  assert.ok(plan.issues.some((i) => /carries at most/.test(i.text)));
}

// Vision inspection: an Inspect stage before the pick sensor, the camera's two signals, the simulated reject share.
{
  const plan = planConveyorAutomation({ setup: { ...carton, rejectRate: 0.15 }, robot, tool: vacuum, destination: "pallet" });
  assert.ok(plan.ok);
  assert.deepEqual(plan.sequence.map((s) => s.stage), ["Feed", "Convey", "Inspect", "Sense", "Pick", "Transfer", "Place", "Repeat"]);
  assert.deepEqual(plan.sequence.map((s) => s.n), [1, 2, 3, 4, 5, 6, 7, 8]);
  const tags = plan.io.map((s) => s.tag);
  assert.ok(tags.indexOf("VISION_OK") > tags.indexOf("PE1") && tags.includes("VISION_NG"));
  assert.ok(plan.issues.some((i) => i.level === "info" && /15%/.test(i.text) && /assumption/.test(i.text)));
  assert.equal(plan.sim.belt.rejectRate, 0.15);
  const none = planConveyorAutomation({ setup: carton, robot, tool: vacuum, destination: "pallet" });
  assert.ok(!none.io.some((s) => s.tag.startsWith("VISION")) && none.sim.belt.rejectRate === 0);
}

// The automation skills: every robot job they plan is a real job of the studio.
const jobs = new Set(SKILL_LIBRARY.map((x) => x.template.name));
for (const sk of AUTOMATION_SKILLS) assert.ok(jobs.has(sk.job), `${sk.id}: ${sk.job} is a studio job`);

// From the user's words to the automation: what was said, what a rule chose, what is assumed and must be confirmed.
const how = (p: ReturnType<typeof proposeAutomation>, label: string) => p.facts.find((f) => f.label === label);
{
  // The master brief's own example.
  const p = proposeAutomation("I have a conveyor carrying 5 kg metal parts. I want a FANUC robot to pick each part and place it inside a CNC machine.");
  assert.equal(p.skill.id, "cnc");
  assert.deepEqual(p.cells, [{ job: "CNC Machining", stations: ["conveyor", "cnc", "pallet"], brand: "Fanuc", cobot: false }]);
  assert.equal(p.setup!.product.kg, 5);
  assert.equal(how(p, "Weight")!.how, "said");
  assert.equal(how(p, "Robot maker")!.value, "FANUC");
  assert.equal(how(p, "Parts go to")!.how, "assumed", "the brief does not say where finished parts go");
  assert.ok(p.missing.some((m) => /finished parts go/.test(m.question)));
  assert.ok(p.confirm.some((c) => /pallet/.test(c)), "the assumed destination must be confirmed");
  assert.equal(p.gripper.family, "dual", "machine tending swaps parts with a dual gripper");
  assert.ok(p.needKg >= 8, "part and gripper");
  assert.ok(p.signals.some((x) => x.tag === "MACHINE_READY") && p.signals.some((x) => x.tag === "CYCLE_START"), "the CNC handshake");
  assert.ok(p.rules.some((r) => /automatic door/.test(r.rule)));
  assert.equal(p.setup!.mode, "index");
  const plan = planConveyorAutomation({ setup: p.setup!, robot: { name: "FANUC M-20iD/25", brand: "FANUC", payloadKg: 25 }, tool: { name: "SCHUNK dual gripper" }, destination: p.destination });
  assert.ok(plan.ok, JSON.stringify(plan.issues));
}
{
  const p = proposeAutomation("Cartons of 12 kg come on a conveyor at 10 cases per minute; an ABB robot should stack them on pallets.");
  assert.equal(p.skill.id, "palletizing");
  assert.equal(p.cells[0].brand, "ABB");
  assert.equal(p.setup!.feed.rate, 10);
  assert.equal(p.setup!.product.key, "carton");
  assert.equal(p.gripper.family, "vacuum");
  assert.equal(p.confirm.length, 0, "everything that matters was said");
}
{
  const p = proposeAutomation("Pick 120 chocolate pralines per minute from a moving belt and pack them into trays.");
  assert.equal(p.setup!.mode, "track", "a moving belt is conveyor tracking");
  assert.ok(p.confirm.some((c) => /tracking option/.test(c)));
  assert.ok(p.rules.some((r) => /several robots|delta/.test(r.rule)), "120 a minute is more than one arm picks");
}
{
  const p = proposeAutomation("A camera should inspect aluminium castings on the conveyor and reject the bad ones, about 3% defects; good ones go on a pallet.");
  assert.equal(p.skill.id, "sorting");
  assert.equal(p.setup!.rejectRate, 0.03);
  assert.equal(p.destination, "pallet");
  assert.equal(how(p, "Inspection")!.how, "said");
  for (const [words, rate] of [["rejects the bad ones, about 5%", 0.05], ["8% are rejected by the camera", 0.08], ["a reject rate of 2%", 0.02]] as const) {
    const q = proposeAutomation(`A camera checks castings on the conveyor and ${words}; good ones go on a pallet.`);
    assert.equal(q.setup!.rejectRate, rate, words);
    assert.ok(!q.confirm.some((c) => /fail inspection/.test(c)), "a rate the user gave is not an assumption");
  }
}
{
  // Putting parts on a conveyor is where they go, not where they come from.
  const p = proposeAutomation("The robot unloads an injection moulding machine and puts the parts on a conveyor.");
  assert.equal(p.skill.id, "moulding");
  assert.deepEqual(p.cells[0].stations, ["mould", "out"]);
  assert.equal(p.setup, null, "the robot does not pick from a conveyor");
  assert.ok(p.signals.some((x) => x.tag === "MOULD_OPEN"));
}
{
  const p = proposeAutomation("Two robots: the first picks boxes from the conveyor and passes them to the second, which palletizes them.");
  assert.deepEqual(p.cells.map((c) => [c.job, c.stations]), [["Loading & Unloading", ["conveyor", "out"]], ["Palletizing", ["pallet"]]]);
}
{
  const p = proposeAutomation("Load steel blanks 500 x 350 x 3 mm from a conveyor into a stamping press, 6 per minute");
  assert.equal(p.skill.id, "press");
  assert.deepEqual(p.setup!.product.size.map((v) => Math.round(v * 1000)), [500, 3, 350], "length × width × height read as written");
  assert.equal(p.setup!.feed.rate, 6);
}
{
  // Nothing is invented: a vague brief gets defaults, each marked assumed, and questions.
  const p = proposeAutomation("move parts");
  assert.equal(p.skill.id, "pick-place");
  assert.ok(p.facts.filter((f) => f.how === "assumed").length >= 4);
  assert.ok(p.missing.length >= 4 && p.confirm.length >= 2);
}

// The AI planner hands the user's words to the Builder in a link; they come back the same, and nothing else opens.
{
  const words = "Cartons of 12 kg come on a conveyor at 10 cases per minute; an ABB robot should stack them on pallets & wrap them = done?";
  const link = describeLink(words);
  assert.ok(link.startsWith("/automation-studio/build#describe="));
  assert.ok(!/[ &=?]/.test(link.slice(link.indexOf("=") + 1)), "the words are encoded");
  assert.equal(describedIn(link.slice(link.indexOf("#"))), words);
  assert.equal(describedIn(`#describe=${encodeURIComponent("  pick  \n parts  ")}`), "pick parts", "spaces tidied");
  assert.equal(describedIn(`#describe=${encodeURIComponent("move")}`), null, "too short to design from");
  assert.equal(describedIn("#job=Palletizing"), null);
  assert.equal(describedIn("#starter=conveyor"), null);
  assert.equal(describedIn("#describe=%E0%A4%A"), null, "a broken link opens nothing");
  assert.equal(describedIn(describeLink("x".repeat(5000)).replace(/^[^#]*/, ""))!.length, 1200, "long descriptions are cut to a link's size");
}

// The AI planner's own examples: understood as the right application, every station named, and the conveyor
// automation the 3D line's infeed runs is a real studio product on a belt that fits it.
for (const [brief, id, kg] of [
  ["Weld 12 kg steel brackets with MIG, 2 shifts, 400 parts a day", "weld", 12],
  ["Load and unload a CNC lathe with 5 kg shafts", "cnc", 5],
  ["Palletize 25 kg cartons coming on a conveyor", "palletizing", 25],
] as const) {
  const p = proposeAutomation(brief);
  assert.equal(p.skill.id, id, brief);
  assert.equal(p.facts.find((f) => f.label === "Weight")!.how, "said", brief);
  for (const c of p.cells) for (const k of c.stations) assert.ok(STATION_WORDS[k], `${k} has words`);
  assert.ok(p.setup, `${brief}: parts come on the infeed conveyor`);
  assert.equal(p.setup!.product.kg, kg);
  const sim = planConveyorAutomation({ setup: p.setup!, destination: p.destination, robots: p.cells.length }).sim;
  assert.ok(PRODUCT_KEYS.includes(sim.product.key), `${sim.product.key} is a studio product`);
  assert.ok(sim.infeed.length >= 1 && sim.infeed.width >= sim.product.size[2], "the belt fits the product");
  assert.ok(sim.belt.mode === "index" || sim.belt.mode === "track");
}
// A question added to the brief and answered is read as the answer, never as the examples it offers.
{
  const brief = "Cartons of 12 kg come on a conveyor; a robot should stack them on pallets.";
  const p = proposeAutomation(brief);
  const maker = p.missing.find((m) => /maker/.test(m.question))!.question;
  assert.match(maker, /FANUC/, "the question offers makers as examples");
  assert.equal(proposeAutomation(`${brief} ${briefQuestion(maker)} Answer: ABB`).cells[0].brand, "ABB");
  for (const m of p.missing) {
    const q = proposeAutomation(`${brief} ${briefQuestion(m.question)} Answer: `);
    assert.equal(q.skill.id, p.skill.id, `${m.question} does not change the application`);
    assert.equal(q.cells[0].brand, undefined, `${m.question} names no maker`);
    assert.equal(q.setup!.product.kg, 12);
  }
}
// Every application the skills know names its stations in words.
for (const sk of AUTOMATION_SKILLS) {
  for (const k of [sk.machine, sk.destination, sk.source === "machine" ? undefined : sk.source === "conveyor" ? "conveyor" : sk.source]) if (k) assert.ok(STATION_WORDS[k as keyof typeof STATION_WORDS], `${sk.id}: ${k}`);
}

console.log("conveyor automation ok");
