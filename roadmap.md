# Phone and tablet fit

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
