/**
 * Print paths for the construction printer. Units are millimetres on the
 * build platform (X 0..BED.x, Y 0..BED.y). Each layer is one continuous
 * polyline, reversed on odd layers so the nozzle never travels empty between
 * layers.
 */

export const BED = { x: 3200, y: 2600, z: 1200 } as const;
export const HOME = { x: 150, y: 150, z: 1100 } as const;
/** Purge bin used while priming, at the front-left corner of the platform. */
export const PURGE = { x: 150, y: 150, z: 400 } as const;

export type Shape = "room" | "wall" | "curved";
export type Pt = { x: number; y: number };

export const SHAPES: Record<Shape, { label: string; note: string }> = {
  room: { label: "Small room with door opening", note: "2.4 × 1.8 m footprint, 0.8 m door" },
  wall: { label: "Straight wall", note: "2.8 m long" },
  curved: { label: "Curved wall", note: "Half-round, 1.1 m radius" },
};

export function layerPath(shape: Shape, layer: number): Pt[] {
  const cx = BED.x / 2;
  const cy = BED.y / 2;
  let pts: Pt[];
  if (shape === "wall") {
    pts = [
      { x: cx - 1400, y: cy },
      { x: cx + 1400, y: cy },
    ];
  } else if (shape === "curved") {
    pts = [];
    const r = 1100;
    for (let i = 0; i <= 48; i++) {
      const a = Math.PI - (Math.PI * i) / 48;
      pts.push({ x: cx + r * Math.cos(a), y: cy - 300 + r * Math.sin(a) });
    }
  } else {
    // Room: start at the left side of the door, run round the walls, finish at the right side.
    const w = 2400, h = 1800, door = 800;
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    pts = [
      { x: cx - door / 2, y: y0 },
      { x: x0, y: y0 },
      { x: x0, y: y1 },
      { x: x1, y: y1 },
      { x: x1, y: y0 },
      { x: cx + door / 2, y: y0 },
    ];
  }
  return layer % 2 === 1 ? pts.slice().reverse() : pts;
}

export function pathLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return l;
}

/** Point at distance `s` along the polyline, plus the segment heading. */
export function pointAt(pts: Pt[], s: number): Pt & { heading: number } {
  let left = Math.max(0, s);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg || i === pts.length - 1) {
      const f = seg > 0 ? Math.min(1, left / seg) : 0;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, heading: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    left -= seg;
  }
  return { ...pts[pts.length - 1], heading: 0 };
}
