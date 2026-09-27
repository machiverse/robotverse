# Automation Studio process coverage

The analysis preview now renders every returned ProcessCard in a single interactive 3D production line. It uses the existing Three.js, React Three Fiber and Drei dependencies; no plugin, external asset or new package is required.

## Findings

- Eight industry blueprints contain 43 example process entries.
- The description analyzer has 36 templates and returns at most eight unique matches in description order. Unrecognized/empty descriptions use an industry blueprint.
- Previously, the SVG previews truncated results to six stations; the cell preview used only stations[0]. The separate free-text simulator provides four presets.
- The new preview consumes the returned process array directly. The existing analyzer's eight-result limit and the standalone simulator are unchanged.

## Visual capabilities

13 conceptual motion families: handling, welding/soldering, machining/forming, surface finishing, coating/dispensing, inspection/testing, packing, palletizing, transport, assembly, filling, sealing/capping and labeling.

Each station includes a selectable process, tool representation, motion sequence labels, analysis robot metadata, required EOAT and preceding/following process. Material markers follow a continuous serpentine line. Overview, top and front cameras support orbit/zoom. Playback and speed reuse the existing controls. Reduced-motion preferences stop animation. WebGL failure preserves the accessible process list and directs users to the 2D views.

Both SVG previews now grow to fit every returned process. Demo material-flow counters are explicitly illustrative; the previous arbitrary parts/hour counter has been removed.

## Limits

This is a conceptual visual preview, not a validated engineering simulator or digital twin. Models are schematic, not manufacturer CAD. It does not solve calibrated robot kinematics, validate payload, simulate collision avoidance, determine safety envelopes or calculate production throughput. The analyzer's existing cycle estimates remain labeled as analysis estimates. Multiple operations within one ProcessCard share one representative station family. Station quantity does not multiply the number of displayed process stations.

## Validation

Run the focused coverage test:

```sh
./node_modules/.bin/esbuild tests/automation-process-coverage.test.ts --bundle --platform=node --format=esm --outfile=/tmp/robotverse-process-test.mjs
node /tmp/robotverse-process-test.mjs
npm run build
```

The coverage test verifies all 43 blueprint entries, each motion family, and eight-station material-route continuity. The production build passes. The repository-wide TypeScript check reports errors outside the changed Automation Studio files. Visual browser verification requires a Chromium/WebGL environment.
