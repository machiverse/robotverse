/** Concept machine families. Dimensions are illustrative, never OEM/CAD measurements.
 * All meshes belong to the cell group and reuse the simulator's material pool.
 */
export function createSceneMachine({ THREE, box, cyl, materials: M, makeLabel, binding, x, z, partHeight }) {
  const group = new THREE.Group();
  const put = (m, dx, y, dz) => { m.position.set(x + dx, y, z + dz); group.add(m); return m; };
  const family = binding.family;
  const wide = family === "injection" || family === "reflow";
  const w = wide ? 1.65 : 1.0, d = 0.85;
  put(box(w, 0.16, d, M.dark), 0, 0.08, 0);
  for (const dx of [-w * 0.4, w * 0.4]) for (const dz of [-0.32, 0.32]) put(cyl(0.035, 0.06, M.steel, 12), dx, 0.03, dz);
  const point = new THREE.Vector3(x + 0.38, 0.82 + partHeight / 2, z);
  let moving;
  if (family === "press" || family === "thermoform") {
    for (const dz of [-0.34, 0.34]) put(box(0.22, 1.55, 0.14, M.machine), -0.2, 0.93, dz);
    put(box(0.7, 0.22, 0.86, M.machine), -0.04, 1.64, 0);
    put(box(0.74, 0.16, 0.7, M.steel), 0.08, 0.74, 0);
    moving = put(box(0.54, 0.16, 0.6, M.steel), 0.1, 1.24, 0);
  } else if (family === "injection") {
    put(box(1.62, 0.45, 0.8, M.machine), 0, 0.38, 0);
    for (const dz of [-0.26, 0.26]) put(box(1.15, 0.025, 0.025, M.steel), 0, 0.88, dz);
    put(box(0.16, 0.56, 0.62, M.dark), -0.08, 0.88, 0);
    moving = put(box(0.12, 0.56, 0.62, M.steel), 0.45, 0.88, 0);
    const barrel = put(cyl(0.09, 0.56, M.steel, 16), -0.58, 0.83, 0); barrel.rotation.z = Math.PI / 2;
    put(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 16), M.machine), -0.66, 1.12, 0);
    put(box(0.03, 0.76, 0.82, M.smoked), -0.4, 1.05, -0.38).castShadow = false;
  } else if (family === "reflow") {
    for (const dz of [-0.35, 0.35]) put(box(1.62, 0.64, 0.1, M.machine), 0, 0.99, dz);
    put(box(1.68, 0.12, 0.82, M.machine), 0, 1.35, 0);
    put(box(1.85, 0.06, 0.52, M.dark), 0.12, 0.77, 0);
    for (let i = 0; i < 8; i++) { const r = put(cyl(0.025, 0.5, M.steel, 12), -0.72 + i * 0.21, 0.8, 0); r.rotation.x = Math.PI / 2; }
    for (const dx of [-0.55, 0, 0.55]) put(box(0.32, 0.07, 0.55, M.frame), dx, 1.44, 0);
    moving = put(box(0.1, 0.04, 0.46, M.accent), 0.38, 0.84, 0);
  } else {
    // Guarded work zone with an open robot-facing access aperture.
    put(box(0.7, 1.12, 0.1, M.machine), -0.15, 0.77, -0.39);
    put(box(0.7, 1.12, 0.1, M.machine), -0.15, 0.77, 0.39);
    put(box(0.16, 1.12, 0.85, M.machine), -0.45, 0.77, 0);
    put(box(1.0, 0.1, 0.88, M.machine), 0, 1.38, 0);
    put(box(0.7, 0.12, 0.67, M.steel), 0.15, 0.74, 0);
    if (family === "lathe") {
      moving = put(cyl(0.13, 0.16, M.steel, 24), 0.03, 0.95, 0); moving.rotation.z = Math.PI / 2;
      put(box(0.2, 0.26, 0.28, M.dark), -0.14, 0.97, 0);
      for (const dz of [-0.2, 0.2]) put(box(0.65, 0.025, 0.025, M.steel), 0.12, 0.81, dz);
    } else if (family === "mill" || family === "laser") {
      put(box(0.18, 0.44, 0.18, M.frame), -0.02, 1.16, 0);
      moving = put(cyl(family === "laser" ? 0.025 : 0.065, 0.18, M.steel, 16), 0.23, 1.13, 0);
    } else if (family === "foaming") {
      for (const dz of [-0.23, 0.23]) put(cyl(0.07, 0.65, M.steel, 16), -0.15, 0.92, dz);
      moving = put(cyl(0.025, 0.22, M.dark, 12), 0.32, 1.1, 0);
    }
  }
  put(box(0.08, 0.3, 0.24, M.dark), 0.5, 1.14, 0.38);
  put(box(0.01, 0.15, 0.18, M.glass), 0.546, 1.18, 0.38).castShadow = false;
  const label = makeLabel(binding.label); label.position.set(x, 1.85, z); label.userData.priority = 3; group.add(label);
  if (moving) moving.userData.dynamic = true;
  const initial = moving?.position.clone();
  return { group, point, animate(k) {
    if (!moving || !initial) return;
    if (family === "lathe") moving.rotation.x = k * Math.PI * 12;
    else if (family === "injection") moving.position.x = initial.x - Math.sin(k * Math.PI) * 0.25;
    else if (family === "reflow") moving.position.x = initial.x + Math.sin(k * Math.PI * 2) * 0.45;
    else moving.position.y = initial.y - Math.sin(k * Math.PI) * 0.22;
  }, reset() { if (moving && initial) { moving.position.copy(initial); if (family === "lathe") moving.rotation.x = 0; } } };
}