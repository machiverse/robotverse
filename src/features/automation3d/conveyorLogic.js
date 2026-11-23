/**
 * Conveyor-to-robot control: what the line PLC and the robot controller do between them, on a fixed clock.
 *
 * A feeder releases parts onto the belt at a set rate, keeping a minimum gap. A photo-eye (PE1) sees each part.
 * Two ways for the robot to pick (see docs/automation-studio-conveyor.md for the sources):
 *   - "index", stop and pick: when PE1 sees a part the PLC brakes the belt so the part comes to rest at the pick
 *     position, then sets PART_READY. The robot goes down (ROBOT_IN_ZONE), grips, waits for its grip sensor (GRIP_OK),
 *     lifts and leaves the zone (PICK_DONE). Only then does the PLC restart the belt: it never moves under the gripper.
 *   - "track", conveyor tracking: the belt never stops. PE1 acts as the sync switch: each part is queued with the
 *     encoder count at detection, so its position is known all the way down the belt. The robot follows a part inside
 *     its tracking window and grips it on the move. A part that passes the window unpicked runs off the end of the
 *     belt into the reject bin.
 *   - "flow": an outfeed that carries parts off the end of the line.
 * Inspection (rejectRate > 0): a vision camera upstream of the robot checks every part. The PLC keeps each verdict
 * with the part (a shift register): a failed part (VISION_NG) is never indexed or tracked, it runs past the robot
 * off the end of the belt into the reject bin; good parts are picked as usual.
 * Positions are distances along the belt in metres: s = 0 is where the feeder (or the robot upstream) puts a part,
 * s = length is the pick end, the end roller is `overrun` further on. Part positions are their centres. No 3D here,
 * so the logic is tested on its own (tests/conveyor-logic.test.ts) and robotSim.js draws what it says.
 */

/**
 * A part's inspection result, the same on every run: a number in [0, 1) from its id (golden-ratio sequence), so the
 * failed parts are spread evenly and come at the set rate.
 */
const verdict = (id) => {
  const x = id * 0.6180339887 + 0.1;
  return x - Math.floor(x);
};

/** Fixed clock step (s): the same parts, edges and stops whatever the frame rate. */
export const TICK = 1 / 240;
const MIN_GAP = 0.004;
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const BELT_MODES = ["index", "track", "flow"];

/** Distance a belt running at `speed` (m/s) needs to stop at `decel` (m/s²). */
export const stopDistance = (speed, decel) => (speed * speed) / (2 * decel);

/** The signals between the feeder, the conveyor, the PLC and the robot, as an integrator lists them. */
export const SIGNALS = [
  { tag: "FEED", from: "PLC", to: "Feeder", device: "Escapement or upstream conveyor release", text: "Release the next part" },
  { tag: "CONV_RUN", from: "PLC", to: "Conveyor", device: "Motor starter / VFD run command", text: "Run the conveyor" },
  { tag: "CONV_RUNNING", from: "Conveyor", to: "PLC", device: "VFD running feedback", text: "Belt is moving" },
  { tag: "PE1", from: "Sensor", to: "PLC", device: "Photo-eye across the belt", text: "Part at the sensor" },
  { tag: "PART_READY", from: "PLC", to: "Robot", device: "PLC output → robot input", text: "Part at rest at the pick position" },
  { tag: "ROBOT_IN_ZONE", from: "Robot", to: "PLC", device: "Robot output → PLC input", text: "Robot inside the conveyor zone: belt must not move" },
  { tag: "PICK_DONE", from: "Robot", to: "PLC", device: "Robot output → PLC input", text: "Part picked and robot clear" },
  { tag: "GRIP_CMD", from: "Robot", to: "Gripper", device: "Gripper valve / vacuum generator", text: "Close the gripper / vacuum on" },
  { tag: "GRIP_OK", from: "Gripper", to: "Robot", device: "Vacuum switch / finger position sensor", text: "Part held" },
  { tag: "ENC", from: "Conveyor", to: "Robot", device: "Encoder on the belt drive", text: "Belt travel for conveyor tracking" },
  { tag: "VISION_OK", from: "Camera", to: "PLC", device: "Vision camera over the belt", text: "Part passed inspection" },
  { tag: "VISION_NG", from: "Camera", to: "PLC", device: "Vision camera over the belt", text: "Part failed inspection: it runs on into the reject bin" },
];
/** The signals each pick mode uses. */
export const MODE_SIGNALS = {
  index: ["FEED", "CONV_RUN", "CONV_RUNNING", "PE1", "PART_READY", "ROBOT_IN_ZONE", "PICK_DONE", "GRIP_CMD", "GRIP_OK"],
  track: ["FEED", "CONV_RUN", "CONV_RUNNING", "PE1", "ENC", "GRIP_CMD", "GRIP_OK"],
  flow: ["CONV_RUN", "CONV_RUNNING"],
};
/** The signals of a pick mode, with the camera's verdicts when parts are inspected. */
export function signalsFor(mode, inspect) {
  const list = MODE_SIGNALS[mode] || MODE_SIGNALS.index;
  if (!inspect) return list;
  const k = list.indexOf("PE1");
  return [...list.slice(0, k + 1), "VISION_OK", "VISION_NG", ...list.slice(k + 1)];
}

/** A complete, safe configuration from the user's (or the planner's) settings. */
export function beltConfig(o = {}) {
  const length = clamp(num(o.length, 1.55), 0.3, 20);
  const partLength = clamp(num(o.partLength, 0.1), 0.005, 2);
  const speed = clamp(num(o.speed, 0.3), 0.02, 2);
  const accel = clamp(num(o.accel, 1.2), 0.1, 10);
  const decel = clamp(num(o.decel, 1.5), 0.1, 10);
  const overrun = clamp(num(o.overrun, 0.13), 0, 1);
  const mode = BELT_MODES.includes(o.mode) ? o.mode : "index";
  const source = ["feeder", "upstream", "none"].includes(o.source) ? o.source : "feeder";
  const endStop = length + overrun - partLength / 2;
  const pickAt = clamp(num(o.pickAt, length), Math.min(partLength / 2 + 0.02, endStop), endStop);
  // Stop and pick: the beam sits upstream of the pick by the braking distance and a little more, so the PLC sees
  // the part in time to bring it to rest at the pick position.
  const peAt = clamp(pickAt + partLength / 2 - stopDistance(speed, decel) - 0.03, partLength + 0.01, pickAt + partLength / 2);
  const w = Array.isArray(o.window) ? o.window : [];
  const w0 = clamp(num(w[0], Math.max(partLength / 2 + 0.1, length * 0.45)), 0, length + overrun);
  const w1 = clamp(num(w[1], length - 0.02), w0, length + overrun);
  const detectAt = clamp(num(o.detectAt, Math.min(w0 - 0.05, partLength + 0.2)), partLength + 0.01, Math.max(partLength + 0.01, w0));
  // Inspection: the camera looks at each part (its centre) upstream of the pick sensor or of the tracking window.
  const rejectRate = mode === "flow" ? 0 : clamp(num(o.rejectRate, 0), 0, 0.9);
  const before = mode === "track" ? Math.min(w0, detectAt - partLength / 2) : peAt - partLength / 2;
  const inspectAt = clamp(num(o.inspectAt, before - 0.3), Math.min(partLength / 2 + 0.05, before), Math.max(partLength / 2 + 0.05, before - 0.02));
  return {
    length, partLength, speed, accel, decel, overrun, mode, source, pickAt, peAt,
    window: [w0, w1], detectAt, rejectRate, inspect: rejectRate > 0, inspectAt,
    gap: clamp(num(o.gap, 0.12), 0.01, 5),
    feedRate: clamp(num(o.feedRate, 0), 0, 600),
    restartDelay: clamp(num(o.restartDelay, 0.25), 0, 5),
    pulsesPerMetre: Math.round(clamp(num(o.pulsesPerMetre, 20000), 100, 1e6)),
  };
}

/**
 * The belt, its feeder, its photo-eye and the PLC that runs them.
 *   step(dt)                 advance the clock (fixed ticks inside)
 *   partReady()              index: the part at rest at the pick position, once PART_READY is on
 *   inWindow()               track: the oldest part inside the tracking window not yet claimed
 *   claim(id) / abandon(id)  track: the robot starts / gives up following a part
 *   take(id)                 the robot's grip is confirmed: the part leaves the belt
 *   robotInZone(on)          the robot enters / leaves the conveyor zone (leaving after a take = PICK_DONE)
 *   setGrip(cmd, ok)         gripper command and grip sensor, for the I/O view
 *   waiting(on)              the robot is waiting for a part (for the bottleneck)
 *   canAccept() / push()     a robot upstream puts a part on the belt
 *   drain()                  parts that left the belt at its end since the last call: [{ id, how: "bin" | "exit" }]
 *   snapshot()               state, I/O, parts, counters and timers for the dashboard
 */
export function createBeltLogic(options = {}) {
  // The settings as given; positions that follow from them (beam, window, detect) are worked out again on each change.
  let given = { ...options };
  let cfg = beltConfig(given);
  let t, acc, v, enc, nextId, nextFeed, plc, indexed, taken, restartAt, parts, outbox, events, io, since, counters, timers, feederOn, pulses, firstPick;

  function reset() {
    t = 0;
    acc = 0;
    v = 0;
    enc = 0;
    nextId = 1;
    nextFeed = 0;
    plc = "RUN";
    indexed = null;
    taken = false;
    restartAt = 0;
    parts = [];
    outbox = [];
    events = [];
    feederOn = true;
    pulses = {};
    firstPick = null;
    io = { FEED: false, CONV_RUN: false, CONV_RUNNING: false, PE1: false, VISION_OK: false, VISION_NG: false, PART_READY: false, ROBOT_IN_ZONE: false, PICK_DONE: false, GRIP_CMD: false, GRIP_OK: false };
    since = Object.fromEntries(Object.keys(io).map((k) => [k, 0]));
    counters = { fed: 0, picked: 0, missed: 0, binned: 0, exited: 0, gripFaults: 0, inspected: 0, rejected: 0 };
    timers = { running: 0, stopped: 0, partWaiting: 0, robotWaiting: 0, feederBlocked: 0 };
  }
  reset();

  const event = (msg) => {
    events.unshift({ t, msg });
    if (events.length > 40) events.length = 40;
  };
  const setIO = (tag, on) => {
    if (io[tag] === !!on) return;
    io[tag] = !!on;
    since[tag] = t;
  };
  /** A pulse lasts one tenth of a second, long enough for the I/O view to show it. */
  const pulse = (tag) => {
    setIO(tag, true);
    pulses[tag] = t + 0.1;
  };
  const byId = (id) => parts.find((p) => p.id === id) || null;
  const setPlc = (s) => (plc = s);

  /** The entry of the belt is clear for a new part with `gap` in front of it. */
  const entryClear = (gap) => parts.every((p) => p.s >= cfg.partLength + gap);

  function addPart() {
    const p = { id: nextId++, s: 0, prev: 0, at: t, claimed: false, missed: false, queuedAt: null, inspected: false, reject: false };
    parts.push(p);
    return p;
  }

  function tick(h) {
    t += h;
    const L = cfg.partLength;
    for (const [tag, until] of Object.entries(pulses))
      if (t >= until) {
        setIO(tag, false);
        delete pulses[tag];
      }

    // Feeder: the next part when it is due and the entry is clear.
    if (cfg.source === "feeder" && feederOn) {
      if (t >= nextFeed - 1e-9) {
        if (entryClear(cfg.gap)) {
          const p = addPart();
          counters.fed++;
          pulse("FEED");
          if (cfg.feedRate > 0) nextFeed = (t - nextFeed > h * 1.5 ? t : nextFeed) + 60 / cfg.feedRate;
          if (counters.fed === 1) event(`Feeder released part ${p.id} onto the belt`);
        } else if (cfg.feedRate > 0 && firstPick !== null) timers.feederBlocked += h;
      }
    }

    // PLC: the run command.
    let run = true;
    if (cfg.mode === "index") {
      if (plc === "RESTART" && t >= restartAt) setPlc("RUN");
      run = plc === "RUN";
      // Interlock: never move the belt while the robot is in the conveyor zone.
      if (io.ROBOT_IN_ZONE) run = false;
    }
    setIO("CONV_RUN", run);

    // The belt: accelerate and brake within the drive's limits.
    if (cfg.mode === "index" && plc === "BRAKE") {
      const p = byId(indexed);
      const d = p ? cfg.pickAt - p.s : 0;
      if (!p || d <= 5e-4) v = 0;
      else {
        const need = (v * v) / (2 * d);
        v = need >= cfg.decel * 0.98 ? Math.max(0, v - need * h) : Math.min(cfg.speed, v + cfg.accel * h);
        if (v * h > d) v = d / h;
      }
    } else {
      const target = run ? cfg.speed : 0;
      v = target > v ? Math.min(target, v + cfg.accel * h) : Math.max(target, v - cfg.decel * h);
    }
    const ds = v * h;
    enc += ds;
    setIO("CONV_RUNNING", v > 1e-4);
    if (v > 1e-4) timers.running += h;
    else timers.stopped += h;

    // Parts ride the belt; a part held by the one in front of it (or the end stop) slides on the belt.
    const endStop = cfg.length + cfg.overrun - L / 2;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.prev = p.s;
      let s = p.s + ds;
      if (cfg.mode === "index" && !p.reject) s = Math.min(s, endStop);
      if (i > 0) s = Math.min(s, parts[i - 1].s - L - MIN_GAP);
      p.s = Math.max(p.prev, s);
    }

    // The camera: each part is checked once as it passes, and the PLC keeps the verdict with the part.
    if (cfg.inspect)
      for (const p of parts)
        if (!p.inspected && p.prev < cfg.inspectAt && p.s >= cfg.inspectAt) {
          p.inspected = true;
          p.reject = verdict(p.id) < cfg.rejectRate;
          counters.inspected++;
          if (p.reject) {
            counters.rejected++;
            pulse("VISION_NG");
            event(`Camera: part ${p.id} NG — the PLC lets it run past the robot into the reject bin`);
          } else pulse("VISION_OK");
        }

    // The discharge end: a part runs off the end roller into the reject bin (tracking, rejects) or out of the line.
    if (cfg.mode !== "index" || cfg.inspect) {
      while (parts.length && parts[0].s >= cfg.length + cfg.overrun) {
        const p = parts.shift();
        if (cfg.mode !== "flow") {
          counters.binned++;
          outbox.push({ id: p.id, how: "bin" });
        } else {
          counters.exited++;
          outbox.push({ id: p.id, how: "exit" });
        }
      }
    }

    // PE1: the beam is blocked while a part covers it.
    const beam = cfg.mode === "track" ? cfg.detectAt : cfg.peAt;
    const covering = parts.filter((p) => p.s - L / 2 <= beam && p.s + L / 2 >= beam);
    setIO("PE1", cfg.mode !== "flow" && covering.length > 0);
    if (cfg.mode === "track") {
      // Sync switch: each part is queued once, with the encoder count when its front broke the beam.
      for (const p of parts)
        if (p.queuedAt === null && p.prev + L / 2 < beam && p.s + L / 2 >= beam) {
          p.queuedAt = enc;
          event(`PE1 synced part ${p.id} at encoder ${Math.round(enc * cfg.pulsesPerMetre)} — queued for the robot`);
        }
      // A part past the window's downstream boundary can no longer be picked.
      for (const p of parts)
        if (!p.missed && !p.reject && p.s > cfg.window[1]) {
          p.missed = true;
          counters.missed++;
          event(`Part ${p.id} passed the tracking window — missed, it runs into the reject bin`);
        }
    } else if (cfg.mode === "index") {
      // Stop and pick: a part at the beam while the belt runs is the next one to index.
      const next = covering.find((x) => !x.reject);
      if (plc === "RUN" && indexed === null && next) {
        const p = next;
        indexed = p.id;
        taken = false;
        setPlc("BRAKE");
        event(`PE1 sees part ${p.id} — PLC brakes the conveyor`);
      }
      if (plc === "BRAKE" && v === 0) {
        setPlc("READY");
        setIO("PART_READY", true);
        event(`Part ${indexed} at rest at the pick position — PART_READY to the robot`);
      }
    }

    if (io.PART_READY && !io.ROBOT_IN_ZONE && !taken && firstPick !== null) timers.partWaiting += h;
  }

  const api = {
    get config() {
      return cfg;
    },
    get time() {
      return t;
    },
    get velocity() {
      return v;
    },
    get state() {
      return plc;
    },
    get parts() {
      return parts;
    },
    get io() {
      return io;
    },
    get counters() {
      return counters;
    },
    get events() {
      return events;
    },
    /** New settings: the belt starts again empty. */
    configure(o) {
      given = { ...given, ...o };
      cfg = beltConfig(given);
      reset();
    },
    reset,
    /** The feeder can be held (a cell without a robot yet does not flood its belt). */
    setFeeder(on) {
      feederOn = !!on;
    },
    step(dt) {
      acc += clamp(num(dt, 0), 0, 2);
      while (acc >= TICK - 1e-12) {
        tick(TICK);
        acc -= TICK;
      }
    },
    partAt(id) {
      const p = byId(id);
      return p ? p.s : null;
    },
    partReady() {
      if (cfg.mode !== "index" || !io.PART_READY || taken) return null;
      return byId(indexed);
    },
    inWindow() {
      if (cfg.mode !== "track") return null;
      return parts.find((p) => !p.claimed && !p.missed && !p.reject && p.queuedAt !== null && p.s >= cfg.window[0] && p.s <= cfg.window[1]) || null;
    },
    /** Track: is the part still on the belt and inside the window? */
    trackable(id) {
      const p = byId(id);
      return !!p && !p.missed && p.s <= cfg.window[1];
    },
    claim(id) {
      const p = byId(id);
      if (!p || p.claimed || p.missed || p.reject) return false;
      p.claimed = true;
      event(`Robot tracks part ${id}`);
      return true;
    },
    abandon(id) {
      const p = byId(id);
      if (p) p.claimed = false;
    },
    /** The robot's grip is confirmed: the part comes off the belt. False when it may not take it. */
    take(id) {
      const i = parts.findIndex((p) => p.id === id);
      if (i < 0) return false;
      if (cfg.mode === "index" && !(io.PART_READY && id === indexed)) return false;
      parts.splice(i, 1);
      counters.picked++;
      if (firstPick === null) firstPick = t;
      if (cfg.mode === "index") taken = true;
      event(`Grip confirmed (GRIP_OK) — part ${id} lifted off the belt`);
      return true;
    },
    robotInZone(on) {
      const was = io.ROBOT_IN_ZONE;
      setIO("ROBOT_IN_ZONE", on);
      if (was && !on && cfg.mode === "index" && taken) {
        // Handshake: the robot reports the pick done and clear, the PLC drops PART_READY and restarts the belt.
        pulse("PICK_DONE");
        setIO("PART_READY", false);
        indexed = null;
        taken = false;
        setPlc("RESTART");
        restartAt = t + cfg.restartDelay;
        event("Robot clear (PICK_DONE) — PLC restarts the conveyor");
      }
    },
    setGrip(cmd, ok) {
      setIO("GRIP_CMD", cmd);
      setIO("GRIP_OK", ok);
    },
    gripFault(msg) {
      counters.gripFaults++;
      event(msg || "No grip confirmation — retrying");
    },
    waiting(on, h) {
      if (on && firstPick !== null) timers.robotWaiting += num(h, 0);
    },
    canAccept() {
      return entryClear(0.03);
    },
    push() {
      const p = addPart();
      counters.fed++;
      return p.id;
    },
    drain() {
      const out = outbox;
      outbox = [];
      return out;
    },
    snapshot() {
      return {
        t,
        mode: cfg.mode,
        state: cfg.mode === "index" ? plc : "RUN",
        speed: cfg.speed,
        velocity: v,
        encoder: Math.round(enc * cfg.pulsesPerMetre),
        pickAt: cfg.pickAt,
        beam: cfg.mode === "track" ? cfg.detectAt : cfg.peAt,
        inspect: cfg.inspect,
        inspectAt: cfg.inspectAt,
        window: cfg.window,
        length: cfg.length,
        io: { ...io },
        since: { ...since },
        parts: parts.map((p) => ({ id: p.id, s: p.s, claimed: p.claimed, missed: p.missed, reject: p.reject })),
        counters: { ...counters, onBelt: parts.length },
        timers: { ...timers, measured: firstPick === null ? 0 : t - firstPick },
        events: events.slice(0, 12),
      };
    },
  };
  return api;
}

/**
 * Where the time goes, from a belt snapshot: the robot waiting for parts means the feed or the conveyor sets the
 * pace; parts waiting for the robot (or running past it unpicked) mean the robot does.
 */
export function bottleneck(snap) {
  // Measured from the first pick: before it the first part is only travelling down an empty belt.
  const span = snap && snap.timers.measured;
  if (!span || span < 8) return null;
  const { partWaiting, robotWaiting, feederBlocked } = snap.timers;
  const share = (x) => Math.round((100 * x) / span);
  if (snap.counters.missed > 0) return { by: "robot", text: `The robot cannot keep up: ${snap.counters.missed} part${snap.counters.missed === 1 ? "" : "s"} passed it unpicked` };
  if (share(robotWaiting) >= 10 && robotWaiting > partWaiting) return { by: "feed", text: `The robot waits for parts ${share(robotWaiting)}% of the time — the feed rate or the conveyor sets the pace` };
  if (share(partWaiting) >= 10 || share(feederBlocked) >= 10) return { by: "robot", text: `Parts wait for the robot ${share(Math.max(partWaiting, feederBlocked))}% of the time — the robot sets the pace` };
  return { by: "balanced", text: "Feed and robot are balanced" };
}
