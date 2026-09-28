import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchMarketRobots, matchMarketTools, matchOemRobots, matchOemTools, needOf } from "../src/features/automation3d/equipmentScore";
import { engineSolution } from "../src/features/automation3d/solutionEngine";

const robots = JSON.parse(readFileSync("public/directory/robots.json", "utf8"));
const tools = JSON.parse(readFileSync("public/directory/tools.json", "utf8"));

const cases = [
  "Weld 12 kg steel brackets with MIG, 2 shifts",
  "Palletize 50 kg cement bags coming on a conveyor",
  "Load and unload a CNC lathe with 5 kg shafts, cobot next to operator",
  "Screw small PCB assemblies with 4 screws each",
  "Deburr 4 kg aluminium castings",
];
for (const brief of cases) {
  const sol = engineSolution(brief);
  for (const st of sol.stations) {
    const need = needOf(st);
    const oem = matchOemRobots(need, robots);
    const eoat = matchOemTools(need, tools, `${st.name} ${st.tooling}`);
    assert.ok(!eoat.slice(0, 2).some((t) => /yumi|e\.do/i.test(t.name)), `no robot-specific mini gripper on top for ${st.name}`);
    if (/MIG|welding/i.test(st.name)) assert.ok(!/spot/i.test(eoat[0]?.name ?? ""), "MIG station gets an arc torch, not a spot gun");
    assert.ok(oem.length >= 2, `OEM robots for ${st.name}`);
    for (const r of oem) {
      assert.ok((r.payload ?? 0) >= need.payload, `${r.name} payload ${r.payload} >= ${need.payload}`);
      if (need.cobot) assert.match(r.reasons.join(" "), /Collaborative/);
      if (need.robotType) assert.equal(r.type, need.robotType);
    }
    assert.equal(new Set(oem.map((r) => r.brand)).size, oem.length, "one model per brand");
    console.log(`• ${st.name} (≥${need.payload} kg${need.cobot ? ", cobot" : ""}${need.robotType ? ", " + need.robotType : ""}): ${oem.slice(0, 3).map((r) => `${r.name} ${r.payload} kg`).join(" | ")}  EOAT: ${eoat.slice(0, 2).map((t) => t.name).join(" | ") || "—"}`);
  }
}

// Marketplace rows (as returned by Supabase) are sized the same way.
const need = needOf(engineSolution("Weld 12 kg steel brackets with MIG").stations.find((s) => /weld/i.test(s.name))!);
const listings = [
  { id: "a", name: "FANUC ArcMate 100iC welding robot", brand: "FANUC", robot_type: "welding", payload_capacity: 12, reach: 1420, price: 850000, condition: "Refurbished" },
  { id: "b", name: "KUKA KR 6 small robot", brand: "KUKA", robot_type: "industrial", payload_capacity: 6, reach: 900, price: 500000 },
  { id: "c", name: "ABB IRB 2600 arc welding", brand: "ABB", robot_type: "welding", payload_capacity: 20, reach: 1650, price: 1200000 },
  { id: "d", name: "KUKA KR 180 palletizing robot", brand: "KUKA", robot_type: "palletizing", payload_capacity: 180, reach: 3200, price: 1900000 },
];
const m = matchMarketRobots(need, listings);
assert.deepEqual(m.map((x) => x.id).sort(), ["a", "c"].filter((id) => (listings.find((l) => l.id === id)!.payload_capacity >= need.payload)).sort(), "undersized robot excluded");
assert.ok(m.every((x) => x.href.startsWith("/robots/")));
const parts = [
  { id: "p1", name: "Binzel robotic MIG torch", category: "Welding", price: 60000, quantity: 2 },
  { id: "p2", name: "Schmalz vacuum gripper", category: "Gripper", price: 40000, quantity: 1 },
];
assert.deepEqual(matchMarketTools(need, parts, "MIG welding torch").map((x) => x.id), ["p1"], "welding torch for a welding station");
console.log("equipment match: ok");
