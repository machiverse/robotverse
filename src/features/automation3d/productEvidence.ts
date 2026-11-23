/** What goes in and what comes out of the job, as the analysis or the user gave it. */
export interface ProductEvidence {
  name?: string;
  material?: string;
  size?: string;
  weight_kg?: number | null;
  /** The finished output leaving the process (e.g. "deburred aluminium housing"). */
  output?: string;
  /** The finish of the output (painted, polished, welded, packed…). */
  finish?: string;
}

const real = (v?: string | null) => {
  const t = (v ?? "").trim();
  return t && !/^(unknown|n\/a|none|unconfirmed|-)$/i.test(t) ? t : "";
};

/** Plain sentence the 3D scene reads to build the real raw part and finished product. */
export function productSentence(w?: ProductEvidence | null): string {
  if (!w) return "";
  const name = real(w.name), material = real(w.material), output = real(w.output), finish = real(w.finish);
  const parts: string[] = [];
  if (name || material) parts.push(`Workpiece: ${[material, name].filter(Boolean).join(" ")}`);
  if (real(w.size)) parts.push(`size ${real(w.size)}`);
  if (output || finish) parts.push(`Finished output: ${[finish, output].filter(Boolean).join(" ")}`);
  return parts.join(". ");
}

/** The brief the 3D scene uses: the user's words first, then the extracted product knowledge. */
export function sceneBrief(brief: string | undefined, w?: ProductEvidence | null): string | undefined {
  const extra = productSentence(w);
  if (!extra) return brief;
  if (brief && brief.toLowerCase().includes(extra.toLowerCase())) return brief;
  return [brief, extra].filter(Boolean).join(". ");
}
