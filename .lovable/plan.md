# Automation Studio animated robot simulation upgrade

## Build
- Create `RobotCellSimulation` as a responsive SVG work-cell scene for the selected primary station, including an articulated pick-and-place robot, moving conveyor and parts, pick/place zones, fencing, light curtains, floor shadow, joint highlights, and a live status panel.
- Replace the existing CSS isometric cell tab with the new simulation while keeping all results driven by the selected industry blueprint.
- Upgrade Material Flow with dimensional station blocks, animated striped conveyors, larger glowing parts, per-station live processed counts, and a throughput counter that rises to 47 while the view is active.
- Upgrade Factory Layout with gently moving robot wrists, pulsing activity indicators, safety-envelope overlays, and small parts moving along connected flow paths.
- Add shared Play/Pause and speed controls above the tabs. The controls will affect the active visualization through scoped CSS custom properties and pause state, with `prefers-reduced-motion` respected.
- Add consistent station and robot hover/focus tooltips in all three visualizations showing model, payload, reach, EOAT, and cycle time; highlight the connected paths for the active station.

## Technical details
- Extend the local visual-station adapter with the robot metadata already present in each process result; do not change blueprint business data, analysis behavior, routes, or backend logic.
- Move the large visualization implementations out of `AutomationStudio.tsx` into focused components under `src/components/automation-studio/`, sharing a typed station model and animation-state props.
- Use semantic design tokens for SVG fills, strokes, shadows, status colors, and controls. Use CSS/SVG animation only—no new 3D or animation dependency.
- Use unique SVG definition IDs per view so patterns, filters, paths, and markers cannot collide when tabs remain mounted.
- Pause React timers when animation is paused or a flow view is inactive, and clean up every interval on unmount.
- Keep tooltips keyboard-accessible where SVG elements can receive focus, and provide static, legible visuals when reduced motion is enabled.

## Verification
- Run focused lint/type checks and inspect the final source for timer cleanup, unique SVG IDs, semantic color usage, and animation-duration variables.
- Verify the public Automation Studio preview still renders normally.
- Because authenticated preview access is externally managed, verify Step 4 through source/type checks and, if an authenticated session is unavailable, clearly report that limitation.
