import assert from "node:assert/strict";
import { beltConfig, bottleneck, createBeltLogic, stopDistance, type BeltLogic } from "../src/features/automation3d/conveyorLogic.js";

const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

/**
 * A robot as its controller runs a conveyor pick: wait above the pick position for PART_READY, go down into the
 * conveyor zone, close the gripper, wait for the grip sensor, lift clear (PICK_DONE), carry the part away and come back.
 */
function indexRobot(belt: BeltLogic, times = { down: 0.4, close: 0.3, confirm: 0.1, up: 0.4, away: 3 }) {
  let phase = "wait", until = 0, id = -1, taken: number[] = [], takenAt: number[] = [];
  return {
    taken,
    takenAt,
    update(t: number, dt: number) {
      if (phase === "wait") {
        const p = belt.partReady();
        if (!p) return belt.waiting(true, dt);
        id = p.id;
        belt.robotInZone(true);
        phase = "down";
        until = t + times.down;
      } else if (t >= until) {
        if (phase === "down") (phase = "close"), (until = t + times.close), belt.setGrip(true, false);
        else if (phase === "close") (phase = "confirm"), (until = t + times.confirm);
        else if (phase === "confirm") {
          takenAt.push(belt.partAt(id)!);
          assert.ok(belt.take(id), "the PLC lets the robot take the indexed part");
          belt.setGrip(true, true);
          taken.push(id);
          phase = "up";
          until = t + times.up;
        } else if (phase === "up") (belt.robotInZone(false), (phase = "away"), (until = t + times.away));
        else if (phase === "away") (belt.setGrip(false, false), (phase = "wait"));
      }
    },
  };
}

/** Run the belt and a robot frame by frame, checking that no part ever jumps, overlaps or vanishes. */
function run(belt: BeltLogic, seconds: number, dt: number, robot?: { update(t: number, dt: number): void }) {
  const L = belt.config.partLength;
  let last = new Map<number, number>();
  let maxStep = 0;
  for (let t = 0; t < seconds; t += dt) {
    belt.step(dt);
    robot?.update(belt.time, dt);
    const now = new Map(belt.parts.map((p) => [p.id, p.s]));
    for (const [id, s] of now) {
      const before = last.get(id);
      if (before !== undefined) {
        assert.ok(s >= before - 1e-9, `part ${id} never moves backwards`);
        maxStep = Math.max(maxStep, s - before);
      }
    }
    for (let i = 1; i < belt.parts.length; i++) assert.ok(belt.parts[i - 1].s - belt.parts[i].s >= L - 1e-9, "parts never overlap on the belt");
    if (belt.io.ROBOT_IN_ZONE) assert.equal(belt.velocity, 0, "the belt never moves while the robot is in the conveyor zone");
    const c = belt.counters;
    assert.equal(c.fed, belt.parts.length + c.picked + c.binned + c.exited, "every part is on the belt, picked or off the end: none vanish");
    last = now;
  }
  return { maxStep };
}

// Stop and pick: the photo-eye brakes the belt, the part comes to rest at the pick position, the robot gets
// PART_READY only then, and the belt restarts only after PICK_DONE.
{
  const belt = createBeltLogic({ length: 1.55, partLength: 0.1, speed: 0.3, gap: 0.12, mode: "index" });
  const robot = indexRobot(belt);
  const { maxStep } = run(belt, 120, 1 / 60, robot);
  assert.ok(maxStep <= 0.3 / 60 + 1e-6, `parts move with the belt, never faster: ${maxStep}`);
  assert.ok(robot.taken.length >= 25, `about one part every 4.3 s: ${robot.taken.length}`);
  for (const s of robot.takenAt) near(s, belt.config.pickAt, 0.002, "the part rests at the pick position when the robot grips it");
  const snap = belt.snapshot();
  assert.ok(snap.events.some((e) => /PE1 sees part/.test(e.msg)));
  assert.ok(snap.events.some((e) => /PICK_DONE/.test(e.msg)));
  // The robot is the slower one: parts wait for it, it hardly waits for parts.
  assert.equal(bottleneck(snap)!.by, "robot");
}

// A slow feeder sets the pace: the robot waits for parts.
{
  const belt = createBeltLogic({ length: 1.55, partLength: 0.1, speed: 0.3, feedRate: 6, mode: "index" });
  const robot = indexRobot(belt);
  run(belt, 120, 1 / 50, robot);
  assert.ok(robot.taken.length >= 10 && robot.taken.length <= 12, `six parts a minute: ${robot.taken.length}`);
  assert.equal(bottleneck(belt.snapshot())!.by, "feed");
}

// With no robot, the lead part waits at the pick position, the belt stays stopped and the feeder stops once the
// entry is full: the parts behind keep their gap instead of piling up.
{
  const belt = createBeltLogic({ length: 1.55, partLength: 0.1, speed: 0.3, gap: 0.12, mode: "index" });
  run(belt, 60, 1 / 60);
  assert.equal(belt.state, "READY");
  assert.equal(belt.velocity, 0);
  near(belt.parts[0].s, belt.config.pickAt, 0.002, "the lead part waits at the pick position");
  for (let i = 1; i < belt.parts.length; i++) assert.ok(belt.parts[i - 1].s - belt.parts[i].s >= 0.1 + 0.12 - 1e-6, "the feeder's gap is kept");
  assert.ok(belt.parts.length <= 8, `the belt holds what fits at that pitch: ${belt.parts.length}`);
  const fed = belt.counters.fed;
  run(belt, 30, 1 / 60);
  assert.equal(belt.counters.fed, fed, "no more parts once the belt is full and stopped");
}

// Braking distance is physics, not animation: 0.3 m/s at 1.5 m/s² takes 3 cm.
near(stopDistance(0.3, 1.5), 0.03, 1e-9, "stop distance");
assert.ok(beltConfig({ speed: 0.3 }).peAt < beltConfig({ speed: 0.3 }).pickAt, "the beam is upstream of the pick position");

// Conveyor tracking: the belt never stops; parts the robot cannot reach in time are missed and run into the bin.
{
  const belt = createBeltLogic({ length: 1.55, partLength: 0.1, speed: 0.25, mode: "track", window: [0.9, 1.45], feedRate: 30 });
  let busyUntil = 0;
  let picked = 0;
  let stopped = 0;
  const robot = {
    update(t: number, dt: number) {
      if (belt.velocity < 1e-4 && t > 1) stopped++;
      if (t < busyUntil) return;
      const p = belt.inWindow();
      if (!p) return belt.waiting(true, dt);
      assert.ok(belt.claim(p.id));
      assert.ok(belt.trackable(p.id));
      assert.ok(belt.take(p.id));
      picked++;
      busyUntil = t + 3.5; // a slower robot than the feed: 30 parts a minute is one every 2 s
    },
  };
  run(belt, 120, 1 / 60, robot);
  assert.equal(stopped, 0, "a tracking belt never stops");
  const c = belt.counters;
  assert.ok(picked >= 30 && picked <= 36, `the robot picks about one part every 3.5 s: ${picked}`);
  assert.ok(c.missed > 20, `the rest are missed: ${c.missed}`);
  assert.ok(c.binned >= c.missed - 3, "missed parts end up in the reject bin");
  assert.equal(bottleneck(belt.snapshot())!.by, "robot");
  const out = belt.drain();
  assert.ok(out.length === c.binned && out.every((o) => o.how === "bin"));
}

// Deterministic clock: the same belt, stepped in different frame sizes, ends in the same state.
{
  const a = createBeltLogic({ length: 2, partLength: 0.2, speed: 0.4, mode: "track", feedRate: 40 });
  const b = createBeltLogic({ length: 2, partLength: 0.2, speed: 0.4, mode: "track", feedRate: 40 });
  for (let i = 0; i < 1800; i++) a.step(1 / 60);
  for (let i = 0; i < 300; i++) b.step(0.1);
  assert.deepEqual(a.counters, b.counters);
  assert.deepEqual(a.parts.map((p) => +p.s.toFixed(6)), b.parts.map((p) => +p.s.toFixed(6)));
}

// A robot upstream puts parts on a transfer belt; the next robot picks them at its end.
{
  const belt = createBeltLogic({ length: 1.6, partLength: 0.14, mode: "index", source: "upstream" });
  assert.ok(belt.canAccept());
  belt.push();
  assert.ok(!belt.canAccept(), "the entry is taken until the part moves on");
  const robot = indexRobot(belt);
  run(belt, 20, 1 / 60, robot);
  assert.deepEqual(robot.taken, [1]);
  assert.ok(belt.canAccept());
}

// An outfeed carries parts off the end of the line.
{
  const belt = createBeltLogic({ length: 1.5, partLength: 0.1, mode: "flow", source: "upstream" });
  belt.push();
  run(belt, 10, 1 / 60);
  assert.equal(belt.counters.exited, 1);
  assert.deepEqual(belt.drain(), [{ id: 1, how: "exit" }]);
}

// Inspection: the camera fails some parts; the PLC never indexes them, the robot never gets them, and they run off
// the end into the reject bin. The verdicts are the same on every run.
{
  const make = () => createBeltLogic({ length: 1.8, partLength: 0.12, speed: 0.3, gap: 0.1, mode: "index", rejectRate: 0.25 });
  const belt = make();
  assert.ok(belt.config.inspect && belt.config.inspectAt < belt.config.peAt, "the camera looks before the pick sensor");
  const robot = indexRobot(belt);
  const rejects = new Set<number>();
  const L = belt.config.partLength;
  for (let t = 0; t < 180; t += 1 / 60) {
    belt.step(1 / 60);
    robot.update(belt.time, 1 / 60);
    belt.parts.filter((p) => p.reject).forEach((p) => rejects.add(p.id));
    const ready = belt.partReady();
    assert.ok(!ready || !ready.reject, "PART_READY is never given for a rejected part");
    const c = belt.counters;
    assert.equal(c.fed, belt.parts.length + c.picked + c.binned + c.exited, "every part accounted for");
    for (let i = 1; i < belt.parts.length; i++) assert.ok(belt.parts[i - 1].s - belt.parts[i].s >= L - 1e-9);
  }
  const c = belt.counters;
  assert.ok(c.rejected >= 5 && c.rejected === rejects.size, `the camera failed some parts: ${c.rejected}`);
  assert.ok(robot.taken.every((id) => !rejects.has(id)), "the robot never picks a rejected part");
  const onBelt = belt.parts.filter((p) => p.reject).length;
  assert.equal(c.binned, c.rejected - onBelt, "every rejected part ends in the reject bin");
  assert.ok(robot.taken.length >= 25, `good parts keep coming: ${robot.taken.length}`);
  assert.ok(belt.events.some((e) => /NG/.test(e.msg)));
  // The same parts fail on every run.
  const again = make();
  const seen = new Set<number>();
  for (let t = 0; t < 60; t += 0.1) {
    again.step(0.1);
    again.parts.filter((p) => p.reject).forEach((p) => seen.add(p.id));
  }
  for (const id of seen) assert.ok(rejects.has(id), `part ${id} fails both times`);
}

// Tracking with inspection: rejected parts are not claimed and not counted as missed.
{
  const belt = createBeltLogic({ length: 2.6, partLength: 0.12, speed: 0.25, mode: "track", window: [1.3, 2.4], feedRate: 12, rejectRate: 0.3 });
  for (let t = 0; t < 120; t += 1 / 60) {
    belt.step(1 / 60);
    const p = belt.inWindow();
    if (p) {
      assert.ok(!p.reject);
      assert.ok(belt.take(p.id));
    }
    for (const x of belt.parts) if (x.reject) assert.equal(belt.claim(x.id), false, "a rejected part cannot be claimed");
  }
  const c = belt.counters;
  assert.ok(c.rejected > 0 && c.missed === 0, `rejects are not misses: ${JSON.stringify(c)}`);
  assert.ok(c.binned >= c.rejected - 3);
}

console.log("conveyor logic ok");
