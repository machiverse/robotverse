import assert from "node:assert/strict";
import { ConcretePrinterSystem, type Step } from "../src/features/automation3d/concrete/engine";
import { matchTemplateIds } from "../src/utils/processAnalyzer";

/** Runs sim time in chunks until `cond` holds or `limit` seconds pass. */
function runUntil(sys: ConcretePrinterSystem, cond: () => boolean, limit: number) {
  const end = sys.t + limit;
  while (sys.t < end) {
    if (cond()) return true;
    sys.advance(0.5);
  }
  return cond();
}
const at = (sys: ConcretePrinterSystem, step: Step) => () => sys.step === step;

// 1. Full automatic print: start → checks → home → mix → prime → print N layers → flush → complete.
{
  const sys = new ConcretePrinterSystem({ layers: 3, shape: "wall" });
  sys.start();
  assert.ok(runUntil(sys, at(sys, "PRINTING"), 120), `reached PRINTING (at ${sys.step}: ${sys.message})`);
  sys.advance(5);
  assert.equal(sys.q.nozzleValve, true, "nozzle open while printing");
  assert.equal(sys.q.recircValve, false, "recirculation shut while printing");
  assert.ok(sys.i.pressure > 3 && sys.i.pressure < 22, `print pressure in band (${sys.i.pressure.toFixed(1)})`);
  assert.ok(runUntil(sys, at(sys, "COMPLETE"), 900), `completed (at ${sys.step}: ${sys.message})`);
  assert.equal(sys.layersDone, 3, "layer counter");
  assert.equal(Math.round(sys.progress), 100);
  assert.ok(sys.beads.length > 100, "beads deposited");
  assert.equal(new Set(sys.beads.map((b) => b.layer)).size, 3, "three layers of beads");
  for (const st of sys.layerStats) assert.ok(st.heightRms < 2, `layer ${st.layer} height RMS ${st.heightRms.toFixed(2)} mm`);
  assert.equal(sys.q.pumpRun, false, "pump off at the end");
  assert.ok(sys.printTime > 0);
}

// 2. Excessive pressure (hose blockage): trips high-high, pump stops, reset refused until cleared, then resumes.
{
  const sys = new ConcretePrinterSystem({ layers: 4, shape: "wall" });
  sys.start();
  runUntil(sys, at(sys, "PRINTING"), 120);
  sys.inject("blockage", true);
  assert.ok(runUntil(sys, at(sys, "FAULT"), 60), "blockage → FAULT");
  assert.ok(sys.alarms.get("P_HH")?.active, "P_HH alarm");
  sys.advance(0.2);
  assert.equal(sys.q.pumpRun, false, "pump stopped on fault");
  assert.equal(sys.q.nozzleValve, false, "nozzle shut on fault");
  assert.equal(sys.q.recircValve, true, "pressure relieved via recirculation");
  sys.reset();
  assert.equal(sys.step, "FAULT", "reset refused while blocked");
  sys.inject("blockage", false);
  sys.advance(3);
  sys.reset();
  assert.equal(sys.step, "STOPPED", "resumable after reset");
  const s = sys.s;
  sys.start();
  assert.ok(runUntil(sys, at(sys, "PRINTING"), 120), "resumed printing");
  assert.ok(Math.abs(sys.s - s) < 50, "resumed from the held point");
}

// 3. Pump failure: detected by missing feedback; one automatic restart; latched if it fails again.
{
  const sys = new ConcretePrinterSystem({ layers: 4, shape: "wall" });
  sys.start();
  runUntil(sys, at(sys, "PRINTING"), 120);
  sys.inject("pumpFailure", true);
  assert.ok(runUntil(sys, at(sys, "FAULT"), 10), "pump failure → FAULT");
  assert.ok(sys.alarms.get("PUMP_FAIL")?.active);
  assert.ok(runUntil(sys, () => sys.pumpRetries === 1, 20), "one automatic restart attempt");
  assert.ok(runUntil(sys, () => sys.step === "FAULT" && sys.alarms.get("PUMP_FAIL")!.active, 60), "latched after failed retry");
  sys.advance(10);
  assert.equal(sys.step, "FAULT", "no second automatic retry");
}

// 4. Low material: print holds at hopper low-low, then resumes automatically once the silo is refilled.
{
  const sys = new ConcretePrinterSystem({ layers: 8, shape: "room" });
  sys.start();
  runUntil(sys, at(sys, "PRINTING"), 120);
  sys.inject("lowMaterial", true);
  assert.ok(runUntil(sys, at(sys, "MATERIAL_HOLD"), 900), `low material → hold (at ${sys.step})`);
  assert.equal(sys.q.nozzleValve, false, "extrusion stopped on hold");
  assert.equal(sys.q.pumpRun, false, "pump interlocked off at low-low");
  sys.refillSilo();
  assert.ok(runUntil(sys, at(sys, "PRINTING"), 200), "auto-resumed after refill");
}

// 5. Positioning error and E-stop.
{
  const sys = new ConcretePrinterSystem({ layers: 4, shape: "wall" });
  sys.start();
  runUntil(sys, at(sys, "PRINTING"), 120);
  sys.inject("axisFault", true);
  assert.ok(runUntil(sys, at(sys, "FAULT"), 10), "axis fault → FAULT");
  assert.ok(sys.alarms.get("POS_ERR")?.active);
  sys.inject("axisFault", false);
  sys.reset();
  assert.equal(sys.homed, false, "re-home required after a positioning fault");

  sys.setEstop(true);
  sys.advance(0.1);
  assert.equal(sys.step, "ESTOP");
  assert.equal(sys.q.axisEnable || sys.q.pumpRun || sys.q.mixerRun, false, "all outputs off on E-stop");
  sys.reset();
  assert.equal(sys.step, "ESTOP", "reset refused while E-stop pressed");
  sys.setEstop(false);
  sys.reset();
  assert.notEqual(sys.step, "ESTOP", "reset after release");
}

// 6. Manual mode interlocks and module tests.
{
  const sys = new ConcretePrinterSystem();
  sys.setMode("manual");
  sys.inject("guardOpen", true);
  sys.advance(0.1);
  sys.setManual("pump", true);
  sys.advance(1);
  assert.equal(sys.q.pumpRun, false, "pump refused with the gate open");
  sys.inject("guardOpen", false);
  sys.reset();
  sys.advance(0.1);
  sys.setManual("pump", true);
  sys.advance(2);
  assert.equal(sys.q.pumpRun, true, "pump runs in manual when permitted");
  assert.equal(sys.q.recircValve, true, "recirculation forced with nozzle shut (no dead-heading)");
  sys.setManual("pump", false);
  sys.advance(1);

  sys.runAllTests();
  assert.ok(runUntil(sys, () => sys.step !== "TEST", 300), "tests finish");
  for (const [k, r] of Object.entries(sys.tests)) assert.equal(r.status, "pass", `${k}: ${r.lines.join(" | ")}`);

  sys.inject("heightSensor", true);
  sys.runTest("sensors");
  runUntil(sys, () => sys.step !== "TEST", 30);
  assert.equal(sys.tests.sensors.status, "fail", "sensor test catches the lost height signal");
}

// 7. Analyzer recognises construction printing instead of metal WAAM.
{
  const ids = matchTemplateIds("Design an automated 3D printing system for construction: a robotic construction 3D printer depositing concrete layer by layer to build a wall, with sensors and a PLC.");
  assert.deepEqual(ids, ["concrete3dp"]);
  assert.deepEqual(matchTemplateIds("wire arc additive 3d printing of a steel part"), ["waam"]);
}

console.log("concrete printer PLC tests passed");
