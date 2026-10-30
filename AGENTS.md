# Project rules
- RoboBook grid cards mount owner actions outside their navigation link and target the post's original store; community publication changes use the shared helper and blog autosave preserves publication state.
- Robot simulator rigid meshes are baked by material/shadow flags; mark mutable subtrees dynamic and preserve asset-factory pools during transient cleanup to prevent animation regressions and leaks.
- Simulator mutations are coalesced by the frame stepper; screens use setEquipmentAll and wait for readiness before queries so user actions do not trigger synchronous rebuild cascades.
- In development, each simulator canvas exposes __robotSimulation for browser performance checks; stats() flushes pending work and reports complete frame counters and rebuild count.
