import assert from "node:assert/strict";
import { INDUSTRY_BLUEPRINTS } from "../src/data/automationStudioIndustries";
import { analyzeDescription } from "../src/utils/processAnalyzer";
import { processKind, PROCESS_PROFILES, stationPosition } from "../src/features/automation3d/processProfiles";

let count = 0;
for (const industry of INDUSTRY_BLUEPRINTS) {
  const processes = analyzeDescription("", industry.key);
  assert.equal(processes.length, industry.processes.length);
  for (const process of processes) {
    assert.ok(PROCESS_PROFILES[processKind(process)]);
    count++;
  }
}
const eight = analyzeDescription("pick scan pack label shipping palletize sort transport", null);
assert.equal(eight.length, 8);
assert.equal(new Set(eight.map((_, i) => stationPosition(i).join(","))).size, 8);
for (let i = 1; i < eight.length; i++) {
  const a = stationPosition(i - 1), b = stationPosition(i);
  assert.equal(Math.hypot(b[0] - a[0], b[2] - a[2]), 4.5, "Adjacent stations must have continuous flow");
}
for (const [name, kind] of Object.entries({
  "Surface Polishing": "finishing", "Sealant & Adhesive Application": "coating",
  "Quality Inspection": "inspection", "Selective Soldering": "welding",
  "Material Transport": "transport", "CNC Milling": "machining",
  "Case Packing & Palletizing": "palletizing", "Aseptic Vial Filling": "filling",
  "Stoppering & Capping": "sealing", "Labeling & Weighing": "labeling",
  "Final Assembly & Boxing": "assembly", "Box Forming & Sizing": "packing",
  "Loading & Unloading": "handling",
})) assert.equal(processKind({ name }), kind);
console.log(`${INDUSTRY_BLUEPRINTS.length} industries, ${count} blueprint processes, 13 motion families and 8-station flow verified.`);
