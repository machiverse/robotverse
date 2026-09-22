# Automation Studio header and analysis upgrade

## Build
- Remove the dismissible Automation Studio banner component and every page mount.
- Add Automation Studio beside Submit Request in the main header, plus the mobile Quick Actions grid.
- Extend every industry process result with cycle-time, safety-risk, and integration details, then render them below the before/after comparison.
- Add the six-metric Deep Analysis Summary after the process results.
- Replace the Material Flow and 3D Cell View placeholders with industry-driven visuals, and enhance Factory Layout with robot-arm symbols, EOAT labels, a stronger grid, and animated flow.

## Technical details
- Keep all analysis content driven by the selected industry blueprint.
- Use semantic design tokens and existing card/button components.
- Use SVG animation for material movement and CSS transforms for the isometric cell view, with reduced-motion fallbacks.
- Preserve the existing simulated analysis, authentication, routes, inventory, ROI, and CTA behavior.

## Verification
- Run the project type check and focused source checks.
- Verify the public Automation Studio teaser and header on desktop/mobile; authenticated result views remain code-verified because preview authentication is externally managed.
