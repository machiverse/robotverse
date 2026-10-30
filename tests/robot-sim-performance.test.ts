import { strict as assert } from "node:assert";

// Integration regression: real WebGL allocation counters, not scene/markup snapshots.
// Requires the existing local preview and the sandbox's bundled Python Playwright.
const script = String.raw`
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width":1280,"height":1800})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("http://localhost:8080/automation-studio/3d?process=Pick%20from%20conveyor%0AWeld%20at%20weld%0APlace%20on%20pallet")
        await page.wait_for_selector('[data-scene-ready="1"]', timeout=120000)
        result = await page.evaluate("""async () => {
            const s = document.querySelector('canvas').__robotSimulation;
            s.pause(); s.setQuality('standard');
            const steps = [{action:'pick',station:'conveyor',label:'Pick'}, {action:'weld',station:'weld',label:'Weld'}, {action:'place',station:'pallet',label:'Place'}];
            const configure = (n) => {
                s.setPlan({cells:Array.from({length:n},(_,i)=>({title:'MIG/MAG Welding '+(i+1), steps}))});
                s.setEquipmentAll(Array(n).fill(null)); s.setCobots(Array(n).fill(false));
                s.setFencing(Array(n).fill(true)); s.setSpacing('clear');
            };
            const previous = s.stats();
            configure(1); const one = s.stats();
            for (let i=0;i<15;i++) { configure(1); s.stats(); }
            const afterOne = s.stats();
            configure(4); const four = s.stats();
            for (let i=0;i<15;i++) { configure(4); s.stats(); }
            const afterFour = s.stats();
            return {previous,one,afterOne,four,afterFour};
        }""")
        result['errors'] = errors
        print(json.dumps(result))
        await browser.close()
asyncio.run(main())
`;
const result = Bun.spawnSync(["python3", "-c", script], { stdout: "pipe", stderr: "pipe" });
assert.equal(result.exitCode, 0, result.stderr.toString());
const data = JSON.parse(result.stdout.toString().trim());
assert.deepEqual(data.errors, [], "The simulation must not throw browser errors");
assert.ok(data.one.drawCalls <= 300, `One welding cell: ${data.one.drawCalls} calls`);
assert.ok(data.four.drawCalls <= 650, `Four welding robots: ${data.four.drawCalls} calls`);
assert.equal(data.one.rebuilds - data.previous.rebuilds, 1, "Plan/equipment/fence/spacing must coalesce into one rebuild");
for (const [before, after] of [[data.one, data.afterOne], [data.four, data.afterFour]]) {
  assert.equal(after.geometries, before.geometries, "No geometry growth after 15 rebuilds");
  assert.equal(after.textures, before.textures, "No texture growth after 15 rebuilds");
  assert.equal(after.rebuilds - before.rebuilds, 15, "Each configuration must rebuild exactly once");
}
console.log(`robot-sim-performance: one ${data.one.drawCalls}; four ${data.four.drawCalls}; stable memory after 15 rebuilds each`);