/**
 * OEM (manufacturer) colour layer.
 *
 * GOVERNING RULE: Manufacturer colour appears ONLY as a shape — a 3px rail or a
 * 7px dot. It is NEVER a background behind text, NEVER on a button or control,
 * NEVER on a status badge, NEVER a section background, NEVER a gradient, NEVER
 * used for text colour. This keeps FANUC yellow from reading as the warning
 * token and ABB red from reading as the destructive token.
 *
 * This file is the single source of truth for the brand -> colour mapping.
 */

export interface OemBrand {
  key: string;
  label: string;
  color: string;
}

export const OEM_BRANDS: OemBrand[] = [
  { key: "fanuc", label: "FANUC", color: "#E8B400" },
  { key: "abb", label: "ABB", color: "#C8321E" },
  { key: "kuka", label: "KUKA", color: "#E85D14" },
  { key: "yaskawa", label: "Yaskawa", color: "#0B4DA2" },
  { key: "cobot", label: "Collaborative", color: "#0E7C7B" },
  { key: "kawasaki", label: "Kawasaki", color: "#2E7D32" },
  { key: "nachi", label: "Nachi / Hyundai", color: "#5A6B7C" },
  { key: "white", label: "White body", color: "#9AA5B1" },
  { key: "other", label: "Other", color: "#C4CBD3" },
];

const BY_KEY: Record<string, OemBrand> = OEM_BRANDS.reduce((acc, b) => {
  acc[b.key] = b;
  return acc;
}, {} as Record<string, OemBrand>);

const OTHER = BY_KEY.other;

/** raw substring token -> brand key, evaluated in order (most specific first). */
const MATCHERS: Array<[string, string]> = [
  ["fanuc", "fanuc"],
  ["abb", "abb"],
  ["kuka", "kuka"],
  ["yaskawa", "yaskawa"],
  ["motoman", "yaskawa"],
  // Collaborative / cobot vendors
  ["universalrobots", "cobot"],
  ["doosan", "cobot"],
  ["techman", "cobot"],
  ["elite", "cobot"],
  ["aubo", "cobot"],
  ["dobot", "cobot"],
  ["fairino", "cobot"],
  ["kawasaki", "kawasaki"],
  ["nachi", "nachi"],
  ["hyundai", "nachi"],
  // "White body" SCARA / small-arm makers
  ["denso", "white"],
  ["staubli", "white"],
  ["epson", "white"],
  ["mitsubishi", "white"],
  ["omron", "white"],
];

const normalize = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/ä|â|à/g, "a")
    .replace(/ü|û/g, "u")
    .replace(/[^a-z0-9]/g, "");

/** Never throws — always returns a brand (falls back to "Other"). */
export function resolveOemBrand(raw: string | null | undefined): OemBrand {
  try {
    if (!raw || typeof raw !== "string") return OTHER;
    const n = normalize(raw);
    if (!n) return OTHER;

    for (const [token, key] of MATCHERS) {
      if (n.includes(token)) return BY_KEY[key] ?? OTHER;
    }

    // "UR" model prefixes (UR5, UR10e, ur-16) => collaborative
    if (/^ur\d/.test(n)) return BY_KEY.cobot;

    return OTHER;
  } catch {
    return OTHER;
  }
}

export function getOemColor(raw: string | null | undefined): string {
  return resolveOemBrand(raw).color;
}
