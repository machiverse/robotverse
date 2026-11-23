# Phone and tablet fit

# Yeemak project page
- [x] Add the supplied standalone welding document at /projects/yeemak without modifying the Studio or backend.
- [x] Verify live animation, pause/resume, restart, cameras and component/sequence panels at desktop and phone widths without page errors or horizontal page overflow.

# RoboBook post management
- [x] Restore owner edit/delete controls in grid and feed, including drafts and scheduled posts in both post stores; prevent dialog clicks navigating away.
- [x] Verify status preservation and ownership rules with tests; all existing tests pass and public RoboBook renders without errors.
- [ ] Verify signed-in edit/save/delete end to end — blocked by externally managed authentication without a preview session.

- [x] Audit 35 public page-family URLs at phone and tablet widths; open real robot and service details.
- [x] Fix directory/talent tabs, cell-builder steps, service titles, header sizing, CRM controls, and dialog/drawer bounds without changing functionality.
- [x] Verify corrected views and mobile navigation visually at 375, 768, 932, and 1024 pixels; preview build passes.
- [ ] Verify signed-in dashboard layouts — blocked by externally managed authentication without a preview session.
- [ ] Exhaustive checks of every individual listing, post, and private page — blocked by unavailable signed-in access; representative public details checked.

# Dashboard layout refactor

- [x] Replace horizontal role tabs with responsive left navigation.
- [x] Render all configured roles and preserve the existing dashboard prop contract.
- [x] Promote seller/admin CRM views into the Pipeline navigation group.
- [x] Convert touched CRM list presentations to dense tables and skeleton loading states.
- [x] Add the 52px header, breadcrumb, mobile drawer, and persistent desktop collapse state.
- [x] Verify TypeScript, diff integrity, forbidden transition/tab patterns, and role mount signature.
- [ ] Run authenticated browser interaction checks — blocked because this project uses externally managed authentication and no preview session is available.

# Automation Studio analysis upgrade

## Uploaded process to 3D
- [x] Include the user's job description in media analysis, open the signed-in 3D results after upload analysis, and rename visible provider labels to AI analysis.
- [x] Initialize and refresh raw/finished item evidence with scene inputs, keep uploaded evidence from being replaced by text-only refinements, and test machine/item mapping.
- [x] Verify photo and four-frame video UI handoffs with controlled analysis responses on desktop and phone: CNC evidence, steel shaft item, finished-output text and no horizontal overflow; planner regressions pass.
- [ ] Verify the owner's real video through signed-in analysis and exact output appearance — blocked by unavailable external authentication and representative media; current 3D geometry remains an approximation, not image/video reconstruction or model training.

## Claude process analysis
- [x] Diagnose media 400 with a minimal provider request: organization-scoped key requires the anthropic-workspace-id header; add shared workspace support and safe configuration errors with regression tests.
- [x] Configure the supplied Anthropic workspace and redeploy both analysis services; live shared-adapter text and photo requests succeed, with photo analysis retaining stated steel, CNC lathe, finished shafts and ordered steps; five adapter tests and station-preservation checks pass.
- [x] Connect the saved Anthropic key to authenticated description and media analysis without table, storage, Directory or simulator changes; both services deployed.
- [x] Preserve media machine evidence and ordered stations in the report-to-scene handoff; all existing tests and three Claude adapter tests pass.
- [ ] Verify a real signed-in uploaded-media Studio flow — blocked by external authentication without a preview session; live Claude text and photo responses now succeed with the configured workspace, but authenticated UI-to-service-to-scene verification remains unavailable.

## Machinery-grounded workflow request
- [x] Audit the supplied portal: three plants, 265 model records; procedural reference geometry, not photo reconstruction. Identify the lost station data in the studio.
- [x] Add front-end station/evidence preservation, repeated operations, machine-family geometry and matching load/process/unload actions; leave all Supabase resources unchanged.
- [x] Verify written lathe and injection workflows, complete injection cycle, phone fit, empty reach/layout warnings and stable memory after eight rebuilds; all existing tests pass.
- [ ] Verify real uploaded photo/video findings against the owner's known process — needs representative user media; existing analysis remains unchanged, so exact machine recognition/reconstruction is not supplied.

- [x] Remove the top Automation Studio banner and its page mounts.
- [x] Add Automation Studio to desktop header actions and mobile Quick Actions.
- [x] Add cycle, safety, and integration detail to every industry process.
- [x] Add the Deep Analysis Summary.
- [x] Build Factory Layout, Material Flow, and 3D Cell visualizations.
- [x] Verify type safety and public desktop/mobile presentation.

# Automation Studio animated visual upgrade

- [x] Replace the isometric cell with an animated SVG robot work cell.
- [x] Add richer live material-flow and factory-layout movement.
- [x] Add shared play/pause and speed controls.
- [x] Add robot and station detail tooltips with connected-path highlighting.
- [x] Verify type safety, source integrity, and the public preview.

# Profile identity: name only

- [x] Add one shared name/initials helper that never returns an email.
- [x] Show the Name only in header, mobile menu, dashboard sidebars, dashboard header, profile header, and admin sidebar.
- [x] Add and run a test that the display name never comes from an email.
- [ ] Check the signed-in profile menu in the browser — blocked because this project uses externally managed authentication and no preview session is available.

# Automation Studio 3D performance and natural presentation
- [x] Bake rigid geometry, retain animated subtrees, and repair transient resource cleanup.
- [x] Coalesce rebuilding and batch equipment in both screens; yield construction and warm shaders.
- [x] Add stats, adaptive resolution, offscreen/paused rendering, recovery states, and label controls.
- [x] Add contact decals, restrained materials and gliding camera views.
- [x] Run memory/draw-call/lifecycle regressions and final phone/tablet checks: standard one/four benchmarks are 217/591 draw calls with stable geometry/texture counts after 15 rebuilds; size change rebuilds once, context recovery works, and a populated Builder renders.
