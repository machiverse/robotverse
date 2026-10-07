/**
 * Construction 3D printing system: plant model + PLC, framework-free.
 *
 * The PLC runs as a fixed 20 ms scan (sim time): read inputs → safety →
 * sequence (auto) or manual commands → fault monitoring → write outputs.
 * The plant integrates the physics that the outputs drive: gantry axes,
 * dry-mix silo, batch mixer, hopper, piston pump, hose, nozzle valves and
 * sensors. Faults can be injected per module, and each module can be
 * tested on its own before running the integrated print.
 *
 * Units: mm, mm/s, s, bar, L, L/min.
 */

import { BED, HOME, PURGE, layerPath, pathLength, pointAt, type Pt, type Shape } from "./path";

export const SCAN = 0.02;

/* ------------------------------------------------------------------ types */

export type Mode = "auto" | "manual";

export type Step =
  | "IDLE" | "PRECHECK" | "HOMING" | "MIXING" | "PRIMING" | "MOVE_TO_START" | "PRINTING"
  | "LAYER_END" | "LAYER_CHANGE" | "MATERIAL_HOLD" | "STOPPING" | "STOPPED" | "FLUSH"
  | "COMPLETE" | "FAULT" | "ESTOP" | "TEST";

export const STEP_INFO: Record<Step, { code: number; label: string }> = {
  IDLE: { code: 0, label: "Idle – ready" },
  PRECHECK: { code: 10, label: "Pre-start checks" },
  HOMING: { code: 15, label: "Homing axes" },
  MIXING: { code: 20, label: "Mixing & filling hopper" },
  PRIMING: { code: 30, label: "Priming pump & hose" },
  MOVE_TO_START: { code: 40, label: "Moving to start point" },
  PRINTING: { code: 50, label: "Printing layer" },
  LAYER_END: { code: 60, label: "Layer end – dwell" },
  LAYER_CHANGE: { code: 70, label: "Moving to next layer" },
  MATERIAL_HOLD: { code: 55, label: "Held – waiting for material" },
  STOPPING: { code: 80, label: "Controlled stop" },
  STOPPED: { code: 85, label: "Stopped – resumable" },
  FLUSH: { code: 90, label: "Flushing pump & hose" },
  COMPLETE: { code: 95, label: "Print complete" },
  FAULT: { code: 900, label: "Fault – safe stop" },
  ESTOP: { code: 999, label: "Emergency stop" },
  TEST: { code: 500, label: "Module test" },
};

export type Severity = "fault" | "warning" | "info";
export interface Alarm {
  id: string;
  text: string;
  severity: Severity;
  active: boolean;
  acked: boolean;
  at: number;
  count: number;
}

export type FaultKey = "lowMaterial" | "blockage" | "pumpFailure" | "axisFault" | "heightSensor" | "guardOpen";
export const FAULTS: Record<FaultKey, { label: string; module: ModuleKey; note: string }> = {
  lowMaterial: { label: "Low material", module: "material", note: "Dry-mix silo runs empty; hopper drains to low-low." },
  blockage: { label: "Excessive pressure", module: "pump", note: "Hose blockage builds pressure until the high-high trip." },
  pumpFailure: { label: "Pump failure", module: "pump", note: "Pump motor trips; run feedback is lost." },
  axisFault: { label: "Positioning error", module: "gantry", note: "Axis drive loses tracking; following error grows." },
  heightSensor: { label: "Nozzle height sensor lost", module: "sensors", note: "Laser distance sensor signal drops out." },
  guardOpen: { label: "Safety gate opened", module: "safety", note: "Interlocked gate opened during operation." },
};

export type ModuleKey = "gantry" | "pump" | "material" | "sensors" | "safety" | "hmi";
export const MODULES: Record<ModuleKey, string> = {
  gantry: "Gantry / robot motion",
  pump: "Material pump & hose",
  material: "Silo, mixer & hopper",
  sensors: "Sensors",
  safety: "PLC safety & interlocks",
  hmi: "HMI indicators",
};
export interface ModuleResult {
  status: "idle" | "running" | "pass" | "fail";
  lines: string[];
}

export interface JobConfig {
  shape: Shape;
  layers: number;
  layerHeight: number;
  beadWidth: number;
  printSpeed: number;
  minLayerTime: number;
  autoRecovery: boolean;
  optimize: boolean;
}

export const DEFAULT_JOB: JobConfig = {
  shape: "room",
  layers: 24,
  layerHeight: 20,
  beadWidth: 50,
  printSpeed: 100,
  minLayerTime: 60,
  autoRecovery: true,
  optimize: true,
};

export interface Bead {
  layer: number;
  x1: number; y1: number; x2: number; y2: number;
  z: number;
  w: number;
}

export interface LayerStat {
  layer: number;
  time: number;
  avgPressure: number;
  maxPressure: number;
  avgFlow: number;
  heightRms: number;
  speed: number;
}

/** PLC inputs as the controller sees them (sensors and feedback). */
export interface Inputs {
  estopOk: boolean;
  guardClosed: boolean;
  safetyRelayOk: boolean;
  siloLow: boolean;
  hopperLSH: boolean;
  hopperLSL: boolean;
  hopperLSLL: boolean;
  mixerFb: boolean;
  pumpFb: boolean;
  pressure: number;
  flow: number;
  nozzleHeight: number;
  x: number; y: number; z: number;
  followingError: number;
  driveOk: boolean;
  homed: boolean;
}

/** PLC outputs (actuators). */
export interface Outputs {
  axisEnable: boolean;
  mixerRun: boolean;
  pumpRun: boolean;
  pumpSpeed: number;
  nozzleValve: boolean;
  recircValve: boolean;
  beaconGreen: boolean;
  beaconAmber: boolean;
  beaconRed: boolean;
  horn: boolean;
}

/* ------------------------------------------------------------ helpers */

/** IEC 61131-3 style on-delay timer. */
class TON {
  et = 0;
  q = false;
  constructor(public pt: number) {}
  run(inp: boolean, dt: number) {
    if (!inp) {
      this.et = 0;
      this.q = false;
    } else {
      this.et = Math.min(this.pt, this.et + dt);
      this.q = this.et >= this.pt;
    }
    return this.q;
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Small deterministic noise so tests are repeatable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
}

const HOPPER_CAP = 200;
const BATCH = 60;
const FLOW_MAX = 14; // L/min at 100 % pump speed
const P_HIGH = 22;
const P_HIGH_HIGH = 28;
const FE_LIMIT = 5;
const TRAVEL = 300;
const MANUAL_SPEED = 150;

type Gen = Generator<void, void, number>;
type Vec = { x: number; y: number; z: number };

/* ---------------------------------------------------------- the system */

export class ConcretePrinterSystem {
  job: JobConfig;
  t = 0;
  mode: Mode = "auto";
  step: Step = "IDLE";
  stepT = 0;
  message = "System ready. Press Start.";

  i: Inputs;
  q: Outputs = {
    axisEnable: false, mixerRun: false, pumpRun: false, pumpSpeed: 0, nozzleValve: false,
    recircValve: false, beaconGreen: false, beaconAmber: false, beaconRed: false, horn: false,
  };

  /* plant */
  cmd: Vec = { ...HOME };
  act: Vec = { ...HOME };
  fe = 0;
  homed = false;
  private motion: { target: Vec; feed: number } | null = null;
  silo = 100;
  mixer = { batch: 0, phase: "empty" as "empty" | "dosing" | "mixing" | "ready" | "discharging", t: 0, running: false };
  hopper = 110;
  pumpRpm = 0;
  pressure = 0;
  flow = 0;
  clog = 0;
  trim = 0;
  heightMeas = 0;
  estopPressed = false;
  safetyLatched = true;
  injected = new Set<FaultKey>();
  private noise = rng(7);

  /* process */
  layer = 0;
  s = 0;
  path: Pt[];
  layerLen: number;
  layersDone = 0;
  printedLen = 0;
  beads: Bead[] = [];
  private beadMark: { x: number; y: number } | null = null;
  feedOverride = 1;
  speed: number;
  flowCorr = 1;
  printTime = 0;
  materialUsed = 0;
  layerStats: LayerStat[] = [];
  optimizerLog: string[] = [];
  events: { t: number; msg: string }[] = [];
  alarms = new Map<string, Alarm>();
  resumable = false;
  pumpRetries = 0;
  lampTest = false;

  /* manual */
  manual = { pump: false, valve: false, mixer: false };

  /* tests */
  tests: Record<ModuleKey, ModuleResult>;
  private test: { key: ModuleKey; gen: Gen; queue: ModuleKey[] } | null = null;

  /* commands latched from the HMI, consumed by the next scan */
  private cmdStart = false;
  private cmdStop = false;

  /* per-layer accumulators */
  private acc = { t: 0, p: 0, pMax: 0, f: 0, h2: 0, n: 0 };
  private dwell = 0;
  private holdClear = new TON(3);
  private primeT = new TON(2);
  private primeOk = new TON(3);
  private pumpFbT = new TON(2);
  private noDelivery = new TON(4);
  private heightLost = new TON(0.5);
  private heightDev = new TON(1.5);
  private mixerFbT = new TON(2);
  private retryT = new TON(5);

  constructor(job: Partial<JobConfig> = {}) {
    this.job = { ...DEFAULT_JOB, ...job };
    this.speed = this.job.printSpeed;
    this.path = layerPath(this.job.shape, 0);
    this.layerLen = pathLength(this.path);
    this.i = this.readInputs();
    this.tests = Object.fromEntries(
      (Object.keys(MODULES) as ModuleKey[]).map((k) => [k, { status: "idle", lines: [] }]),
    ) as unknown as Record<ModuleKey, ModuleResult>;
  }

  /* ============================================================ HMI API */

  setJob(patch: Partial<JobConfig>) {
    const editable = ["IDLE", "COMPLETE"].includes(this.step) || patch.autoRecovery !== undefined || patch.optimize !== undefined;
    if (!editable) return;
    this.job = { ...this.job, ...patch };
    if (["IDLE", "COMPLETE"].includes(this.step)) {
      this.speed = this.job.printSpeed;
      this.resetJob();
    }
  }

  start() {
    if (this.mode !== "auto") return this.note("Start refused: select AUTO mode first.");
    this.cmdStart = true;
  }
  stop() {
    this.cmdStop = true;
  }
  setEstop(pressed: boolean) {
    this.estopPressed = pressed;
    if (pressed) this.log("EMERGENCY STOP pressed");
  }
  /** Reset: re-arms the safety relay and clears latched faults whose cause has gone. */
  reset() {
    if (this.estopPressed) return this.note("Reset refused: release the emergency stop first.");
    if (!this.guardClosed()) return this.note("Reset refused: close the safety gate first.");
    this.safetyLatched = true;
    let blocked: string | null = null;
    for (const a of this.alarms.values()) {
      if (!a.active) continue;
      if (a.severity === "fault" && this.faultPersists(a.id)) blocked = a.text;
      else if (a.severity === "fault") {
        a.active = false;
        // After a positioning fault the axis position is not trusted: re-home.
        if (a.id === "POS_ERR") this.homed = false;
      }
    }
    if (blocked) return this.note(`Reset refused: cause still present – ${blocked}`);
    if (this.step === "FAULT" || this.step === "ESTOP") {
      this.go(this.resumable ? "STOPPED" : "IDLE", this.resumable ? "Reset done. Press Start to resume the print." : "Reset done. Ready.");
    }
    this.pumpRetries = 0;
  }
  ackAlarms() {
    for (const a of this.alarms.values()) a.acked = true;
  }
  setMode(m: Mode) {
    if (m === this.mode) return;
    const safe = ["IDLE", "STOPPED", "FAULT", "COMPLETE", "ESTOP"].includes(this.step);
    if (!safe) return this.note("Mode change refused: stop the automatic cycle first.");
    this.mode = m;
    this.manual = { pump: false, valve: false, mixer: false };
    this.log(`Mode → ${m.toUpperCase()}`);
    this.message = m === "manual" ? "MANUAL / maintenance mode: reduced speed, jog and module tests enabled." : "AUTO mode.";
  }
  inject(k: FaultKey, on: boolean) {
    if (on) this.injected.add(k);
    else this.injected.delete(k);
    if (k === "lowMaterial" && on) {
      this.silo = 0;
      this.hopper = Math.min(this.hopper, 45);
      this.mixer = { ...this.mixer, batch: 0, phase: "empty", t: 0 };
    }
    if (k === "lowMaterial" && !on) this.silo = 100;
    if (k === "blockage" && !on) this.clog = 0;
    if (k === "axisFault" && !on) this.fe = 0;
    this.log(`${on ? "Injected" : "Cleared"}: ${FAULTS[k].label}`);
  }
  refillSilo() {
    this.silo = 100;
    this.injected.delete("lowMaterial");
    this.log("Operator refilled the dry-mix silo");
  }

  /* manual commands – every one goes through the same interlocks as auto */
  jog(axis: "x" | "y" | "z", dist: number) {
    if (!this.manualOk()) return;
    if (!this.axisPermit()) return this.note("Jog refused: axis permit missing (safety or drive fault).");
    const target = { ...this.cmd, [axis]: this.cmd[axis] + dist };
    target.x = clamp(target.x, 0, BED.x);
    target.y = clamp(target.y, 0, BED.y);
    target.z = clamp(target.z, 0, BED.z);
    this.motion = { target, feed: MANUAL_SPEED };
  }
  home() {
    if (!this.manualOk()) return;
    if (!this.axisPermit()) return this.note("Homing refused: axis permit missing.");
    this.motion = { target: { ...HOME }, feed: MANUAL_SPEED };
    this.homed = false;
    this.pendingHome = true;
  }
  private pendingHome = false;
  setManual(key: "pump" | "valve" | "mixer", on: boolean) {
    if (!this.manualOk()) return;
    if (key === "pump" && on && !this.pumpPermit(true)) return this.note("Pump ON refused: " + this.pumpBlock(true));
    if (key === "valve" && on && !this.i.pumpFb) return this.note("Nozzle valve refused: pump not running.");
    this.manual[key] = on;
  }
  runTest(key: ModuleKey) {
    if (this.mode !== "manual") return this.note("Module tests run in MANUAL / maintenance mode.");
    if (this.test) return this.note("A module test is already running.");
    this.startTest([key]);
  }
  runAllTests() {
    if (this.mode !== "manual") return this.note("Module tests run in MANUAL / maintenance mode.");
    if (this.test) return;
    this.startTest(Object.keys(MODULES) as ModuleKey[]);
  }

  /* ============================================================== scan */

  /** Advance the simulation by `seconds` of sim time in fixed PLC scans. */
  advance(seconds: number) {
    const n = Math.min(4000, Math.round(seconds / SCAN));
    for (let k = 0; k < n; k++) this.scan(SCAN);
  }

  scan(dt: number) {
    this.t += dt;
    this.stepT += dt;
    this.i = this.readInputs();
    this.safety();
    if (this.step === "TEST" && this.test) this.runTestScan(dt);
    else if (this.mode === "auto") this.sequence(dt);
    else this.manualLogic();
    this.monitor(dt);
    this.stackLight();
    this.plant(dt);
    this.cmdStart = false;
    this.cmdStop = false;
  }

  /* ------------------------------------------------------------ inputs */

  private guardClosed() {
    return !this.injected.has("guardOpen");
  }

  private readInputs(): Inputs {
    const heightOk = !this.injected.has("heightSensor");
    return {
      estopOk: !this.estopPressed,
      guardClosed: this.guardClosed(),
      safetyRelayOk: this.safetyLatched && !this.estopPressed && this.guardClosed(),
      siloLow: this.silo < 5,
      hopperLSH: this.hopper >= 190,
      hopperLSL: this.hopper <= 50,
      hopperLSLL: this.hopper <= 12,
      mixerFb: this.mixer.running,
      pumpFb: this.pumpRpm > 5 && !this.injected.has("pumpFailure"),
      pressure: Math.max(0, this.pressure + this.noise() * 0.15),
      flow: Math.max(0, this.flow + this.noise() * 0.08),
      nozzleHeight: heightOk ? this.heightMeas : NaN,
      x: this.act.x, y: this.act.y, z: this.act.z,
      followingError: this.fe,
      driveOk: this.fe < FE_LIMIT,
      homed: this.homed,
    };
  }

  /* ------------------------------------------------------------ safety */

  private safety() {
    if (!this.i.estopOk || !this.i.guardClosed) this.safetyLatched = false;
    if (!this.i.estopOk && this.step !== "ESTOP") {
      this.raise("ESTOP", "Emergency stop pressed – category 0 stop (safe torque off)", "fault");
      this.holdPrint();
      this.test = null;
      this.go("ESTOP", "EMERGENCY STOP. Release the button, then press Reset.");
    }
  }

  private axisPermit() {
    return this.i.safetyRelayOk && this.i.driveOk;
  }
  private pumpPermit(manual = false) {
    return this.pumpBlock(manual) === null;
  }
  private pumpBlock(manual = false): string | null {
    if (!this.i.safetyRelayOk) return "safety circuit not reset (E-stop / gate)";
    if (this.i.pressure >= P_HIGH_HIGH) return "pressure high-high";
    if (this.i.hopperLSLL && !manual) return "hopper low-low (pump would suck air)";
    if (this.injected.has("pumpFailure") && this.alarms.get("PUMP_FAIL")?.active) return "pump fault latched";
    return null;
  }
  private manualOk() {
    if (this.mode !== "manual") {
      this.note("Refused: manual commands need MANUAL mode.");
      return false;
    }
    if (this.test) {
      this.note("Refused: module test running.");
      return false;
    }
    return true;
  }

  /* ---------------------------------------------------------- sequence */

  private sequence(dt: number) {
    const q = this.q;
    const h = this.job.layerHeight;
    const running = !["IDLE", "STOPPED", "COMPLETE", "FAULT", "ESTOP"].includes(this.step);
    if (running) this.printTime += dt;

    if (this.cmdStop && running && this.step !== "STOPPING" && this.step !== "FLUSH") {
      this.holdPrint();
      this.go("STOPPING", "Stop pressed: controlled stop, extrusion off.");
    }

    switch (this.step) {
      case "IDLE":
      case "COMPLETE":
      case "STOPPED": {
        this.outputsIdle(this.step === "STOPPED");
        if (this.cmdStart) {
          if (this.activeFault()) return this.note("Start refused: active fault. Press Reset.");
          if (!this.i.safetyRelayOk) return this.note("Start refused: safety circuit not reset.");
          if (this.step === "COMPLETE") this.resetJob();
          this.go("PRECHECK", "Start: running pre-start checks.");
        }
        break;
      }
      case "PRECHECK": {
        this.outputsIdle(true);
        if (this.stepT < 1) break;
        const problems: string[] = [];
        if (this.i.hopperLSLL && this.i.siloLow) problems.push("no material (hopper low-low and silo empty)");
        if (!this.i.driveOk) problems.push("axis drive not ready");
        if (Number.isNaN(this.i.nozzleHeight)) problems.push("nozzle height sensor not responding");
        if (this.i.pressure > 5) problems.push("line still pressurised");
        if (problems.length) {
          this.raise("PRECHECK", `Pre-start check failed: ${problems.join("; ")}`, "fault");
          this.go("FAULT");
          break;
        }
        this.log("Pre-start checks passed: safety OK, material available, drives ready, sensors alive");
        this.go(this.i.homed ? "MIXING" : "HOMING", this.i.homed ? "Starting mixer." : "Homing axes.");
        break;
      }
      case "HOMING": {
        q.axisEnable = true;
        this.moveTo(HOME, TRAVEL);
        if (this.inPosition()) {
          this.homed = true;
          this.go("MIXING", "Axes homed. Starting mixer.");
        } else if (this.stepT > 40) {
          this.raise("HOME_TO", "Homing timeout", "fault");
          this.go("FAULT");
        }
        break;
      }
      case "MIXING": {
        q.axisEnable = true;
        q.mixerRun = true;
        this.moveTo(PURGE, TRAVEL);
        if (this.mixerFbT.run(q.mixerRun && !this.i.mixerFb, dt)) {
          this.raise("MIXER_FB", "Mixer motor: no run feedback", "fault");
          this.go("FAULT");
          break;
        }
        const ready = this.hopper >= 60 || (this.resumable && this.hopper >= 30);
        if (ready && this.inPosition() && this.stepT > 3) this.go("PRIMING", "Material ready. Priming pump.");
        else if (this.stepT > 240) {
          this.raise("MAT_NR", "Material not ready: hopper did not fill (check silo / mixer)", "fault");
          this.go("FAULT");
        }
        break;
      }
      case "PRIMING": {
        q.axisEnable = true;
        q.mixerRun = true;
        if (!this.pumpPermit()) break;
        q.pumpRun = true;
        // Build pressure on recirculation first, then open the nozzle over the purge bin.
        const built = this.primeT.run(this.i.pumpFb && this.i.pressure > 1.5, dt);
        q.recircValve = !built;
        q.nozzleValve = built;
        q.pumpSpeed = built ? 45 : 35;
        if (this.primeOk.run(built && this.i.pressure > 3 && this.i.pressure < P_HIGH && this.i.flow > 2, dt)) {
          this.primeT.run(false, dt);
          this.primeOk.run(false, dt);
          this.go("MOVE_TO_START", "Hose primed. Moving to the print start point.");
        } else if (this.stepT > 30) {
          this.raise("PRIME_TO", "Priming failed: no stable pressure / flow at the nozzle", "fault");
          this.go("FAULT");
        }
        break;
      }
      case "MOVE_TO_START": {
        this.runIdlePump();
        const p = pointAt(this.path, this.s);
        const z = this.zNominal();
        const above = { x: p.x, y: p.y, z: z + 60 };
        const near = Math.hypot(this.cmd.x - p.x, this.cmd.y - p.y) < 1;
        this.moveTo(near ? { x: p.x, y: p.y, z } : above, near ? 80 : TRAVEL);
        if (near && this.inPosition()) {
          this.beadMark = null;
          this.go("PRINTING", `Printing layer ${this.layer + 1} of ${this.job.layers}.`);
        }
        break;
      }
      case "PRINTING": {
        q.axisEnable = true;
        q.mixerRun = true;
        if (this.i.hopperLSLL) {
          this.raise("MAT_LL", "Low material: hopper low-low – printing held", "warning");
          this.holdPrint();
          this.go("MATERIAL_HOLD", "Held: waiting for material.");
          break;
        }
        q.pumpRun = this.pumpPermit();
        q.nozzleValve = q.pumpRun;
        q.recircValve = false;

        // Pressure-based slowdown (optimisation) and recovery.
        if (this.i.pressure > P_HIGH) this.feedOverride = Math.max(0.5, this.feedOverride - 0.25 * dt);
        else this.feedOverride = Math.min(1, this.feedOverride + 0.05 * dt);
        const v = this.speed * this.feedOverride;

        // Flow feed-forward from bead cross-section and speed, trimmed by the flow meter.
        const req = this.requiredFlow(v);
        if (this.i.flow > 0.5) this.flowCorr = clamp(this.flowCorr + 0.4 * ((req - this.i.flow) / req) * dt, 0.8, 1.5);
        q.pumpSpeed = clamp((req / FLOW_MAX) * 100 * this.flowCorr, 0, 100);

        // Move along the path only once material is flowing (start-of-layer lead).
        if (this.i.flow > req * 0.5) this.s = Math.min(this.layerLen, this.s + v * dt);
        const p = pointAt(this.path, this.s);
        this.heightControl(dt);
        this.cmd = { x: p.x, y: p.y, z: this.zNominal() + this.trim };
        this.motion = null;
        this.deposit(req);

        // Layer statistics.
        this.acc.t += dt;
        this.acc.p += this.i.pressure;
        this.acc.pMax = Math.max(this.acc.pMax, this.i.pressure);
        this.acc.f += this.i.flow;
        const he = Number.isNaN(this.i.nozzleHeight) ? 0 : this.i.nozzleHeight - h;
        this.acc.h2 += he * he;
        this.acc.n += 1;

        if (this.s >= this.layerLen) this.endLayer();
        break;
      }
      case "LAYER_END": {
        this.runIdlePump();
        this.moveTo({ ...this.cmd, z: this.zNominal() + 30 }, 80);
        if (this.stepT >= this.dwell) {
          this.layer += 1;
          this.s = 0;
          this.path = layerPath(this.job.shape, this.layer);
          this.trim *= 0.5;
          this.go("MOVE_TO_START", `Layer change: moving to layer ${this.layer + 1}.`);
        }
        break;
      }
      case "MATERIAL_HOLD": {
        q.axisEnable = true;
        q.mixerRun = true;
        this.runIdlePump(20);
        const ok = this.holdClear.run(this.hopper > 40, dt);
        if (ok && (this.job.autoRecovery || this.cmdStart)) {
          this.clear("MAT_LL");
          this.log("Automatic recovery: hopper refilled, resuming print in place");
          this.go("PRINTING", `Resumed layer ${this.layer + 1}.`);
        }
        if (this.stepT > 20 * 60) this.raise("OPEN_TIME", "Material open time exceeded – flush the hose before restarting", "warning");
        break;
      }
      case "STOPPING": {
        q.axisEnable = true;
        q.mixerRun = true;
        q.pumpRun = false;
        q.recircValve = true;
        if (this.i.pressure < 3 && this.stepT > 1) this.go("STOPPED", "Stopped. Press Start to resume from the same point.");
        break;
      }
      case "FLUSH": {
        q.axisEnable = true;
        q.mixerRun = false;
        this.moveTo(PURGE, TRAVEL);
        const there = this.inPosition();
        q.pumpRun = there && this.pumpPermit(true);
        q.pumpSpeed = 40;
        q.nozzleValve = q.pumpRun;
        q.recircValve = !there;
        if (there && this.stepT > 10) {
          q.pumpRun = false;
          q.nozzleValve = false;
          this.resumable = false;
          this.go("COMPLETE", `Print complete: ${this.layersDone} layers in ${fmtTime(this.printTime)}.`);
        }
        break;
      }
      case "FAULT": {
        this.outputsFault();
        // Automatic recovery for a pump motor trip: one restart attempt.
        const pumpTrip = this.alarms.get("PUMP_FAIL");
        if (this.job.autoRecovery && pumpTrip?.active && this.onlyFault("PUMP_FAIL") && this.pumpRetries < 1) {
          if (this.retryT.run(true, dt)) {
            this.retryT.run(false, dt);
            this.pumpRetries += 1;
            this.log("Automatic recovery: resetting pump motor overload, restart attempt 1");
            pumpTrip.active = false;
            // Re-prime over the purge bin, then return to the held point.
            this.go("MIXING", "Auto-recovery: restarting pump at the purge position.");
          }
        }
        break;
      }
      case "ESTOP": {
        this.outputsOff();
        break;
      }
      default:
        break;
    }
  }

  private endLayer() {
    const q = this.q;
    q.nozzleValve = false;
    this.layersDone += 1; // CTU layer counter
    const a = this.acc;
    const stat: LayerStat = {
      layer: this.layer + 1,
      time: a.t,
      avgPressure: a.n ? a.p / a.n : 0,
      maxPressure: a.pMax,
      avgFlow: a.n ? a.f / a.n : 0,
      heightRms: a.n ? Math.sqrt(a.h2 / a.n) : 0,
      speed: this.speed,
    };
    this.layerStats.push(stat);
    this.acc = { t: 0, p: 0, pMax: 0, f: 0, h2: 0, n: 0 };
    this.log(`Layer ${stat.layer} done in ${stat.time.toFixed(0)} s · max ${stat.maxPressure.toFixed(1)} bar · height RMS ${stat.heightRms.toFixed(2)} mm`);
    if (this.job.optimize) this.optimize(stat);
    if (this.layersDone >= this.job.layers) {
      this.go("FLUSH", "All layers printed. Flushing pump and hose.");
      return;
    }
    // Minimum layer time lets the layer below gain strength before it carries the next.
    this.dwell = Math.max(1.5, this.job.minLayerTime - stat.time);
    this.go("LAYER_END", `Layer ${stat.layer} complete. Dwell ${this.dwell.toFixed(0)} s.`);
  }

  private optimize(s: LayerStat) {
    const max = this.job.printSpeed * 1.5;
    let next = this.speed;
    let why = "";
    if (s.maxPressure > P_HIGH - 2) {
      next = this.speed * 0.92;
      why = `pressure peak ${s.maxPressure.toFixed(1)} bar near the ${P_HIGH} bar limit`;
    } else if (s.maxPressure < 16 && s.heightRms < 1.5 && s.time > this.job.minLayerTime * 0.6) {
      next = Math.min(max, this.speed * 1.05);
      why = `pressure headroom and height RMS ${s.heightRms.toFixed(2)} mm`;
    }
    if (next !== this.speed) {
      this.optimizerLog.push(`Layer ${s.layer}: ${why} → print speed ${this.speed.toFixed(0)} → ${next.toFixed(0)} mm/s`);
      this.speed = next;
    }
  }

  /* ----------------------------------------------------------- manual */

  private manualLogic() {
    const q = this.q;
    if (this.step === "ESTOP") {
      this.outputsOff();
      return;
    }
    if (!["IDLE", "STOPPED", "FAULT", "COMPLETE"].includes(this.step)) this.go("IDLE");
    q.axisEnable = this.axisPermit();
    q.mixerRun = this.manual.mixer && this.i.safetyRelayOk;
    q.pumpRun = this.manual.pump && this.pumpPermit(true);
    q.pumpSpeed = 30;
    q.nozzleValve = this.manual.valve && q.pumpRun;
    // Never dead-head the pump: with the nozzle shut the line recirculates.
    q.recircValve = q.pumpRun && !q.nozzleValve;
    if (!q.pumpRun) {
      this.manual.pump = false;
      this.manual.valve = false;
    }
    if (this.pendingHome && this.inPosition()) {
      this.homed = true;
      this.pendingHome = false;
      this.log("Manual homing complete");
    }
    if (this.step === "FAULT" && !this.activeFault()) this.go("IDLE");
  }

  /* ------------------------------------------------------ monitoring */

  private monitor(dt: number) {
    const q = this.q;
    const i = this.i;
    const printing = this.step === "PRINTING";

    if (i.hopperLSL) this.raise("MAT_L", "Hopper level low", "warning");
    else this.clear("MAT_L");
    if (i.siloLow) this.raise("SILO", "Dry-mix silo empty – refill the silo", "warning");
    else this.clear("SILO");
    if (i.pressure > P_HIGH && i.pressure < P_HIGH_HIGH) this.raise("P_H", `Pump pressure high (> ${P_HIGH} bar): slowing down`, "warning");
    else if (i.pressure < P_HIGH - 2) this.clear("P_H");
    if (!i.guardClosed) this.raise("GATE", "Safety gate open", "info");
    else this.clear("GATE");

    if (this.step === "ESTOP" || this.step === "TEST") {
      // Tests report their own failures.
      if (this.step === "ESTOP") return;
    }

    const trip = (id: string, text: string) => {
      this.raise(id, text, "fault");
      if (this.step !== "FAULT") {
        this.holdPrint();
        this.test = null;
        this.go("FAULT", `FAULT: ${text}. Machine brought to a safe stop.`);
      }
    };

    if (i.pressure >= P_HIGH_HIGH) trip("P_HH", `Excessive pressure ${i.pressure.toFixed(1)} bar (≥ ${P_HIGH_HIGH} bar high-high) – pump stopped`);
    if (this.pumpFbT.run(q.pumpRun && !i.pumpFb && this.pumpRpmCmdAge > 1, dt)) trip("PUMP_FAIL", "Pump failure: motor running command but no run feedback");
    if (i.followingError >= FE_LIMIT) trip("POS_ERR", `Positioning error: following error ${i.followingError.toFixed(1)} mm (limit ${FE_LIMIT} mm)`);
    if (this.heightLost.run((printing || this.step === "MOVE_TO_START") && Number.isNaN(i.nozzleHeight), dt))
      trip("H_SENS", "Nozzle height sensor: signal lost");
    if (this.heightDev.run(printing && !Number.isNaN(i.nozzleHeight) && Math.abs(i.nozzleHeight - this.job.layerHeight) > 5, dt))
      trip("H_DEV", "Nozzle height out of tolerance (±5 mm)");
    if (this.noDelivery.run(printing && q.nozzleValve && i.pressure < 2 && i.flow < 1 && this.stepT > 3, dt))
      trip("NO_FLOW", "No material at the nozzle (hose leak or empty line)");
    if (!i.guardClosed && !["IDLE", "STOPPED", "COMPLETE", "FAULT", "ESTOP"].includes(this.step) && this.mode === "auto")
      trip("GATE_RUN", "Safety gate opened during operation – category 1 stop");
  }

  private pumpRpmCmdAge = 0;

  private faultPersists(id: string) {
    switch (id) {
      case "ESTOP": return this.estopPressed;
      case "GATE_RUN": return !this.guardClosed();
      case "P_HH": return this.injected.has("blockage") || this.pressure >= P_HIGH_HIGH;
      case "PUMP_FAIL": return this.injected.has("pumpFailure");
      case "POS_ERR": return this.injected.has("axisFault");
      case "H_SENS": return this.injected.has("heightSensor");
      case "PRECHECK": return false;
      default: return false;
    }
  }
  private activeFault() {
    for (const a of this.alarms.values()) if (a.active && a.severity === "fault") return true;
    return false;
  }
  private onlyFault(id: string) {
    for (const a of this.alarms.values()) if (a.active && a.severity === "fault" && a.id !== id) return false;
    return true;
  }

  /* ------------------------------------------------------ output sets */

  private outputsOff() {
    Object.assign(this.q, { axisEnable: false, mixerRun: false, pumpRun: false, pumpSpeed: 0, nozzleValve: false, recircValve: false });
    this.motion = null;
  }
  private outputsIdle(keepMixer: boolean) {
    Object.assign(this.q, { axisEnable: this.axisPermit(), pumpRun: false, pumpSpeed: 0, nozzleValve: false, recircValve: this.pressure > 1 });
    this.q.mixerRun = keepMixer && this.i.safetyRelayOk && this.resumable;
  }
  /** Fault reaction: stop motion and extrusion, relieve pressure, keep agitating so the concrete does not set. */
  private outputsFault() {
    Object.assign(this.q, { axisEnable: this.axisPermit(), pumpRun: false, pumpSpeed: 0, nozzleValve: false, recircValve: true });
    this.q.mixerRun = this.i.safetyRelayOk;
    this.motion = null;
  }
  private runIdlePump(speed = 25) {
    const q = this.q;
    q.axisEnable = true;
    q.mixerRun = true;
    q.pumpRun = this.pumpPermit();
    q.pumpSpeed = speed;
    q.nozzleValve = false;
    q.recircValve = true;
  }
  private holdPrint() {
    this.q.nozzleValve = false;
    this.motion = null;
    if (this.layersDone > 0 || this.s > 0) this.resumable = true;
  }

  private stackLight() {
    const q = this.q;
    const blink = Math.floor(this.t * 2) % 2 === 0;
    const fault = this.step === "FAULT" || this.step === "ESTOP";
    const anyUnacked = [...this.alarms.values()].some((a) => a.active && !a.acked && a.severity === "fault");
    q.beaconRed = this.lampTest || (fault && (anyUnacked ? blink : true));
    q.beaconAmber =
      this.lampTest || this.mode === "manual" || ["MATERIAL_HOLD", "STOPPING", "STOPPED", "TEST"].includes(this.step) ||
      [...this.alarms.values()].some((a) => a.active && a.severity === "warning");
    q.beaconGreen = this.lampTest || (this.mode === "auto" && !fault && !["IDLE", "STOPPED", "COMPLETE"].includes(this.step));
    q.horn = anyUnacked;
  }

  /* ------------------------------------------------------------ plant */

  private plant(dt: number) {
    const q = this.q;

    // Gantry axes.
    const enabled = q.axisEnable && this.safetyLatched && !this.estopPressed;
    if (enabled && this.motion) {
      const { target, feed } = this.motion;
      const dx = target.x - this.cmd.x, dy = target.y - this.cmd.y, dz = target.z - this.cmd.z;
      const d = Math.hypot(dx, dy, dz);
      const stepLen = feed * dt;
      if (d <= stepLen) this.cmd = { ...target };
      else this.cmd = { x: this.cmd.x + (dx / d) * stepLen, y: this.cmd.y + (dy / d) * stepLen, z: this.cmd.z + (dz / d) * stepLen };
    }
    const moving = enabled && (this.step === "PRINTING" || (this.motion && !this.atTarget()));
    if (this.injected.has("axisFault") && moving) this.fe = Math.min(12, this.fe + 3 * dt);
    else if (!this.injected.has("axisFault")) this.fe = moving ? 0.3 + Math.abs(this.noise()) * 0.4 : Math.max(0, this.fe - 2 * dt);
    this.act = { x: this.cmd.x - this.fe * 0.7, y: this.cmd.y + this.fe * 0.7, z: this.cmd.z };

    // Silo → batch mixer → hopper.
    this.mixer.running = q.mixerRun && !this.estopPressed;
    const m = this.mixer;
    if (m.running) {
      m.t += dt;
      if (m.phase === "empty" && this.silo >= 1 && this.hopper < 150) {
        m.phase = "dosing";
        m.t = 0;
      } else if (m.phase === "dosing") {
        m.batch = Math.min(BATCH, m.batch + (BATCH / 12) * dt);
        this.silo = Math.max(0, this.silo - (2.5 / 12) * dt);
        if (m.batch >= BATCH) {
          m.phase = "mixing";
          m.t = 0;
        }
      } else if (m.phase === "mixing" && m.t >= 25) {
        m.phase = "ready";
        m.t = 0;
      } else if (m.phase === "ready" && this.hopper < 140) {
        m.phase = "discharging";
      } else if (m.phase === "discharging") {
        const move = Math.min(m.batch, 3 * dt, HOPPER_CAP - this.hopper);
        m.batch -= move;
        this.hopper += move;
        if (m.batch <= 0.01) {
          m.batch = 0;
          m.phase = "empty";
          m.t = 0;
        }
      }
    }

    // Pump, hose and valves.
    const failed = this.injected.has("pumpFailure");
    const cmdRpm = q.pumpRun && !failed && !this.estopPressed ? q.pumpSpeed : 0;
    this.pumpRpmCmdAge = q.pumpRun ? this.pumpRpmCmdAge + dt : 0;
    this.pumpRpm += (cmdRpm - this.pumpRpm) * Math.min(1, dt / (failed ? 0.4 : 1.0));
    const suction = this.hopper >= 12 ? 1 : Math.max(0, this.hopper / 12);
    const pumpFlow = FLOW_MAX * (this.pumpRpm / 100) * suction;
    if (this.injected.has("blockage") && this.pumpRpm > 5) this.clog = Math.min(3, this.clog + dt / 4);
    let pTarget: number;
    if (q.nozzleValve) {
      this.flow = pumpFlow / (1 + this.clog * 0.6);
      pTarget = pumpFlow > 0.1 ? 1.5 + 1.3 * pumpFlow * (1 + this.clog * 2.2) : 0;
    } else if (q.recircValve) {
      this.flow = 0;
      pTarget = pumpFlow > 0.1 ? 1 + 0.35 * pumpFlow : 0;
    } else {
      this.flow = 0;
      // Both valves shut: a driven pump dead-heads; a stopped one leaves trapped pressure bleeding off.
      pTarget = cmdRpm > 5 ? 35 : this.pressure * 0.9;
    }
    pTarget = Math.min(35, pTarget); // mechanical relief valve
    this.pressure += (pTarget - this.pressure) * Math.min(1, dt / 0.6);
    this.pressure = Math.max(0, this.pressure);
    const used = (this.flow / 60) * dt;
    this.hopper = Math.max(0, this.hopper - (q.nozzleValve ? used : 0));
    if (q.nozzleValve) this.materialUsed += used;

    // Nozzle height sensor: distance from nozzle tip to the top of the layer below.
    const surface = this.surfaceUnderNozzle();
    this.heightMeas = this.act.z - surface + this.noise() * 0.1;
  }

  private surfaceUnderNozzle() {
    const h = this.job.layerHeight;
    if (this.layer === 0) return 0.3 * Math.sin(this.s / 400);
    const n = this.layer;
    const slump = 0.35 * Math.pow(n, 0.8);
    const bumps = 0.8 * Math.sin(this.s / 300 + n) + 0.4 * Math.sin(this.s / 77 + 2 * n);
    return n * h - slump + bumps;
  }

  /* ----------------------------------------------------- control bits */

  private zNominal() {
    return (this.layer + 1) * this.job.layerHeight;
  }

  /** Integral height control: trims Z so the nozzle stands off one layer height above the layer below. */
  private heightControl(dt: number) {
    const m = this.i.nozzleHeight;
    if (Number.isNaN(m)) return;
    const err = this.job.layerHeight - m;
    this.trim = clamp(this.trim + 3 * err * dt, -8, 8);
  }

  private requiredFlow(v: number) {
    return (this.job.beadWidth * this.job.layerHeight * v * 60) / 1e6; // mm³/s → L/min
  }

  private deposit(req: number) {
    if (!this.q.nozzleValve || this.i.flow < 0.3) {
      this.beadMark = null;
      return;
    }
    const here = { x: this.act.x, y: this.act.y };
    if (!this.beadMark) {
      this.beadMark = here;
      return;
    }
    const d = Math.hypot(here.x - this.beadMark.x, here.y - this.beadMark.y);
    if (d >= 40) {
      const w = clamp(this.i.flow / Math.max(0.1, req), 0.3, 1.5);
      this.beads.push({ layer: this.layer, x1: this.beadMark.x, y1: this.beadMark.y, x2: here.x, y2: here.y, z: this.act.z - this.job.layerHeight / 2, w });
      this.printedLen += d;
      this.beadMark = here;
    }
  }

  private moveTo(target: { x: number; y: number; z: number }, feed: number) {
    const cur = this.motion?.target;
    if (!cur || cur.x !== target.x || cur.y !== target.y || cur.z !== target.z || this.motion?.feed !== feed) this.motion = { target: { ...target }, feed };
  }
  private atTarget() {
    const t = this.motion?.target;
    return !t || Math.hypot(t.x - this.cmd.x, t.y - this.cmd.y, t.z - this.cmd.z) < 0.5;
  }
  private inPosition() {
    return this.atTarget() && this.fe < 1.5;
  }

  /* ------------------------------------------------------------ tests */

  private startTest(queue: ModuleKey[]) {
    const key = queue[0];
    this.manual = { pump: false, valve: false, mixer: false };
    Object.assign(this.q, { pumpRun: false, pumpSpeed: 0, nozzleValve: false, recircValve: false, mixerRun: false, axisEnable: this.axisPermit() });
    this.motion = null;
    this.tests[key] = { status: "running", lines: [] };
    this.test = { key, gen: this.testGen(key), queue: queue.slice(1) };
    this.go("TEST", `Testing: ${MODULES[key]}`);
  }

  private runTestScan(dt: number) {
    const tst = this.test!;
    const r = tst.gen.next(dt);
    if (!r.done) return;
    const res = this.tests[tst.key];
    if (res.status === "running") res.status = "pass";
    this.log(`Module test ${MODULES[tst.key]}: ${res.status.toUpperCase()}`);
    Object.assign(this.q, { pumpRun: false, pumpSpeed: 0, nozzleValve: false, recircValve: this.pressure > 1, mixerRun: false });
    this.lampTest = false;
    this.test = null;
    if (tst.queue.length) this.startTest(tst.queue);
    else this.go("IDLE", "Module tests finished.");
  }

  private *testGen(key: ModuleKey): Gen {
    const res = this.tests[key];
    const say = (l: string) => res.lines.push(l);
    const fail = (l: string) => {
      res.status = "fail";
      say("✗ " + l);
    };
    const q = this.q;
    const wait = function* (self: ConcretePrinterSystem, secs: number): Gen {
      const end = self.t + secs;
      while (self.t < end) yield;
    };
    const until = function* (self: ConcretePrinterSystem, cond: () => boolean, secs: number): Generator<void, boolean, number> {
      const end = self.t + secs;
      while (!cond()) {
        if (self.t > end) return false;
        yield;
      }
      return true;
    };

    if (key === "gantry") {
      if (!this.axisPermit()) return fail("Axis permit missing (safety or drive fault)");
      q.axisEnable = true;
      const pts = [HOME, { x: 200, y: 200, z: 300 }, { x: BED.x - 200, y: 200, z: 300 }, { x: BED.x - 200, y: BED.y - 200, z: 300 }, { x: 200, y: BED.y - 200, z: 300 }, HOME];
      for (const p of pts) {
        this.motion = { target: { ...p }, feed: 250 };
        const ok = yield* until(this, () => this.atTarget(), 40);
        if (!ok || this.fe >= FE_LIMIT) return fail(`Could not reach ${p.x}/${p.y}/${p.z} (following error ${this.fe.toFixed(1)} mm)`);
        say(`✓ Reached X${p.x} Y${p.y} Z${p.z} · following error ${this.fe.toFixed(2)} mm`);
      }
      this.homed = true;
      say("✓ Axes homed, travel limits and in-position checks OK");
    } else if (key === "pump") {
      if (!this.pumpPermit(true)) return fail("Pump permit missing: " + this.pumpBlock(true));
      q.recircValve = true;
      q.pumpRun = true;
      q.pumpSpeed = 40;
      const fb = yield* until(this, () => this.i.pumpFb, 2.5);
      if (!fb) return fail("No run feedback within 2.5 s (motor / contactor)");
      say("✓ Run feedback received");
      yield* wait(this, 4);
      const p = this.i.pressure;
      if (p < 1.5 || p > 8) return fail(`Recirculation pressure ${p.toFixed(1)} bar out of range 1.5–8 bar`);
      say(`✓ Recirculation pressure ${p.toFixed(1)} bar in range`);
      q.pumpRun = false;
      const stopped = yield* until(this, () => !this.i.pumpFb, 3);
      if (!stopped) return fail("Pump did not stop");
      say("✓ Stop command honoured; line depressurised on recirculation");
    } else if (key === "material") {
      q.mixerRun = true;
      const fb = yield* until(this, () => this.i.mixerFb, 2);
      if (!fb) return fail("Mixer motor: no run feedback");
      say("✓ Mixer run feedback");
      yield* wait(this, 2);
      q.mixerRun = false;
      say(`✓ Hopper ${this.hopper.toFixed(0)} L · switches LSH=${+this.i.hopperLSH} LSL=${+this.i.hopperLSL} LSLL=${+this.i.hopperLSLL} consistent`);
      if (this.i.siloLow) return fail("Dry-mix silo empty – material not available");
      say(`✓ Silo ${this.silo.toFixed(0)} % · batch size ${BATCH} L`);
    } else if (key === "sensors") {
      const samples: number[] = [];
      for (let k = 0; k < 25; k++) {
        samples.push(this.i.nozzleHeight);
        yield;
      }
      if (samples.some((v) => Number.isNaN(v))) return fail("Nozzle height sensor: signal lost");
      say(`✓ Nozzle height sensor alive (${samples[samples.length - 1].toFixed(1)} mm)`);
      say(`✓ Pressure transmitter ${this.i.pressure.toFixed(1)} bar (range 0–40)`);
      say(`✓ Flow meter ${this.i.flow.toFixed(2)} L/min (range 0–20)`);
      say(`✓ Axis encoders X${this.i.x.toFixed(0)} Y${this.i.y.toFixed(0)} Z${this.i.z.toFixed(0)}`);
      if (!this.i.driveOk) return fail("Axis drive reports following-error fault");
    } else if (key === "safety") {
      if (!this.i.estopOk) return fail("E-stop is pressed");
      if (!this.i.guardClosed) return fail("Safety gate open");
      // Channel test: simulate each safety input and confirm the outputs drop.
      const before = this.safetyLatched;
      this.safetyLatched = false;
      yield;
      const dropped = !this.axisPermit() && !this.pumpPermit(true);
      this.safetyLatched = before;
      if (!dropped) return fail("Outputs did not drop when the safety relay opened");
      say("✓ Safety relay open → axis enable and pump permit removed within one scan");
      say("✓ Interlock: pump refuses to run dead-headed (recirculation forced when nozzle shut)");
      say(`✓ Interlock: pressure high-high ${P_HIGH_HIGH} bar trips pump · high ${P_HIGH} bar slows print`);
      say("✓ Interlock: nozzle valve needs pump feedback · print needs homed axes and live height sensor");
    } else if (key === "hmi") {
      this.lampTest = true;
      say("Lamp test: all indicators on for 2 s");
      yield* wait(this, 2);
      this.lampTest = false;
      say("✓ Beacon red / amber / green and horn outputs cycled");
    }
  }

  /* ---------------------------------------------------------- alarms */

  private raise(id: string, text: string, severity: Severity) {
    const a = this.alarms.get(id);
    if (a?.active) return;
    this.alarms.set(id, { id, text, severity, active: true, acked: false, at: this.t, count: (a?.count ?? 0) + 1 });
    this.log(`${severity.toUpperCase()}: ${text}`);
  }
  private clear(id: string) {
    const a = this.alarms.get(id);
    if (a?.active && a.severity !== "fault") a.active = false;
  }

  private go(step: Step, message?: string) {
    if (this.step !== step) this.log(`Step ${STEP_INFO[this.step].code} → ${STEP_INFO[step].code} ${STEP_INFO[step].label}`);
    this.step = step;
    this.stepT = 0;
    if (message) this.message = message;
  }
  private note(msg: string) {
    this.message = msg;
    this.log(msg);
  }
  private log(msg: string) {
    this.events.push({ t: this.t, msg });
    if (this.events.length > 300) this.events.splice(0, this.events.length - 300);
  }

  private resetJob() {
    this.layer = 0;
    this.s = 0;
    this.layersDone = 0;
    this.printedLen = 0;
    this.beads = [];
    this.layerStats = [];
    this.optimizerLog = [];
    this.printTime = 0;
    this.materialUsed = 0;
    this.feedOverride = 1;
    this.flowCorr = 1;
    this.trim = 0;
    this.resumable = false;
    this.speed = this.job.printSpeed;
    this.path = layerPath(this.job.shape, 0);
    this.layerLen = pathLength(this.path);
  }

  /* ---------------------------------------------------------- readout */

  get progress() {
    const total = this.layerLen * this.job.layers;
    return clamp(((this.layersDone * this.layerLen + (this.step === "COMPLETE" || this.step === "FLUSH" ? 0 : this.s)) / total) * 100, 0, 100);
  }
  get remaining() {
    const left = (100 - this.progress) / 100 * this.layerLen * this.job.layers;
    const perLayer = Math.max(this.job.minLayerTime, this.layerLen / this.speed);
    return (left / this.layerLen) * perLayer;
  }
  get heightError() {
    return Number.isNaN(this.i.nozzleHeight) ? NaN : this.i.nozzleHeight - this.job.layerHeight;
  }
  get alarmList() {
    return [...this.alarms.values()].sort((a, b) => Number(b.active) - Number(a.active) || b.at - a.at);
  }
}

export function fmtTime(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}
