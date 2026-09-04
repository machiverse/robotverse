// ============================================================================
// Procurement Intelligence — deterministic requirement extraction + matching.
// No LLM involvement: pure regex + SQL. The LLM only explains what this returns.
// ============================================================================
import { landedCost, type LandedCostBreakdown } from './landedCost.ts';

export type Application =
  | 'spot_weld'
  | 'arc_weld'
  | 'palletizing'
  | 'material_handling'
  | 'machine_tending'
  | 'painting'
  | 'dispensing';

export interface Requirement {
  application?: Application;
  partWeightKg?: number;
  gripperWeightKg?: number;
  payloadKg?: number;
  requiredReachMm?: number;
  budgetMax?: number;
  condition?: 'new' | 'used' | 'refurbished';
  oem?: string;
  model?: string;
  location?: string;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

const APPLICATION_PATTERNS: [RegExp, Application][] = [
  [/\bspot[\s-]?weld/i, 'spot_weld'],
  [/\b(arc[\s-]?weld|mig|tig|gmaw|gtaw)\b/i, 'arc_weld'],
  [/\bpalleti[sz]/i, 'palletizing'],
  [/\b(material[\s-]?handling|handling|pick[\s-]*(and|&|n)[\s-]*place|pick[\s-]?and[\s-]?place)\b/i, 'material_handling'],
  [/\b(machine[\s-]?tending|cnc|tending)\b/i, 'machine_tending'],
  [/\bpaint/i, 'painting'],
  [/\b(dispens|glue|gluing|sealant|sealing|adhesive)/i, 'dispensing'],
  // generic "welding" last — defaults to spot_weld only if nothing more specific matched
  [/\bweld/i, 'spot_weld'],
];

const KNOWN_OEMS: [RegExp, string][] = [
  [/\bfanuc\b/i, 'FANUC'],
  [/\babb\b/i, 'ABB'],
  [/\bkuka\b/i, 'KUKA'],
  [/\b(yaskawa|motoman)\b/i, 'Yaskawa'],
  [/\bkawasaki\b/i, 'Kawasaki'],
  [/\bnachi\b/i, 'Nachi'],
  [/\bcomau\b/i, 'Comau'],
  [/\bst[aä]ubli\b/i, 'Staubli'],
  [/\bdenso\b/i, 'Denso'],
  [/\bepson\b/i, 'Epson'],
  [/\bmitsubishi\b/i, 'Mitsubishi'],
  [/\b(universal robots|\bur\d{1,2}e?\b)/i, 'Universal Robots'],
  [/\bdoosan\b/i, 'Doosan'],
  [/\bhyundai\b/i, 'Hyundai'],
];

// Model patterns per OEM family. Order matters: most specific first.
const MODEL_PATTERNS: RegExp[] = [
  /\b(R-?2000i[A-C]\/\d{2,3}[A-Z]{0,2})\b/i,          // R-2000iC/165F
  /\b(M-?\d{1,4}i[A-Z]\/\d{1,3}[A-Z]{0,2})\b/i,        // M-710iC/50, M-900iB/360
  /\b(M-?\d{1,4}i[A-Z])\b/i,                           // M-20iA
  /\b(LR\s?Mate\s?\d{3}i[A-Z]\/?\d{0,2}[A-Z]{0,2})\b/i,
  /\b(ARC\s?Mate\s?\d{3}i[A-Z]\/?\d{0,3}[A-Z]{0,2})\b/i,
  /\b(IRB\s?\d{3,4}(?:-\d{2,3}\/\d\.\d{2})?)\b/i,      // IRB 6640-235/2.55, IRB 6640
  /\b(KR\s?\d{1,4}\s?R\d{3,4}(?:\s?(?:extra|ultra|F|K|C|nano|arc\s?HW))?)\b/i, // KR 210 R2700
  /\b(KR\s?\d{1,4}(?:\s?(?:L\d{2,3}|-\d))?)\b/i,      // KR 210, KR 16
  /\b(GP\s?\d{1,3}[A-Z]?)\b/i,                         // GP180
  /\b(MH\s?\d{1,3}(?:\s?II)?)\b/i,                     // MH50 II
  /\b(HP\s?\d{1,3}D?)\b/i,
  /\b(UR\s?\d{1,2}e?)\b/i,                             // UR10e
  /\b(RS\d{3}[NL]?)\b/i,                               // Kawasaki RS
];

const NUM = '(\\d+(?:\\.\\d+)?)';

function num(m: RegExpMatchArray | null, i = 1): number | undefined {
  if (!m) return undefined;
  const v = parseFloat(m[i]);
  return Number.isFinite(v) ? v : undefined;
}

function parseBudget(text: string): number | undefined {
  const t = text.toLowerCase();
  const crore = t.match(new RegExp(`${NUM}\\s*(crore|cr)\\b`));
  if (crore) return Math.round(parseFloat(crore[1]) * 10000000);
  const lakh = t.match(new RegExp(`${NUM}\\s*(lakhs?|lacs?|lakh|lac|l)\\b`));
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100000);
  // Plain digits with budget/₹/rs/inr context, e.g. "budget 2500000", "₹25,00,000", "rs 25,00,000"
  const plain = t.match(/(?:budget|₹|rs\.?|inr)\s*(?:is|of|:|under|below|upto|up to|max(?:imum)?)?\s*₹?\s*([\d,]{5,})/);
  if (plain) {
    const v = parseInt(plain[1].replace(/,/g, ''), 10);
    if (Number.isFinite(v) && v >= 10000) return v;
  }
  const under = t.match(/(?:under|below|upto|up to|within|max(?:imum)?)\s*₹?\s*([\d,]{5,})/);
  if (under) {
    const v = parseInt(under[1].replace(/,/g, ''), 10);
    if (Number.isFinite(v) && v >= 10000) return v;
  }
  return undefined;
}

export function extractRequirement(text: string): Requirement {
  const req: Requirement = {};
  const t = text || '';
  const lower = t.toLowerCase();

  // Application
  for (const [re, app] of APPLICATION_PATTERNS) {
    if (re.test(t)) { req.application = app; break; }
  }

  // Part weight: "95 kg part", "part weight 95kg", "part weighs 95 kg", "workpiece 95kg"
  const part =
    lower.match(new RegExp(`${NUM}\\s*kgs?\\s*(?:part|workpiece|component|job|load)\\b`)) ||
    lower.match(new RegExp(`(?:part|workpiece|component|job)\\s*(?:weight|weighs|weighing|is|of|:)?\\s*(?:about|around|approx\\.?|~)?\\s*${NUM}\\s*kgs?`));
  req.partWeightKg = num(part);

  // Gripper / EOAT / tool weight
  const gripper =
    lower.match(new RegExp(`(?:gripper|eoat|end[\\s-]?effector|tool(?:ing)?)\\s*(?:weight|weighs|is|of|:)?\\s*(?:about|around|approx\\.?|~)?\\s*${NUM}\\s*kgs?`)) ||
    lower.match(new RegExp(`${NUM}\\s*kgs?\\s*(?:gripper|eoat|end[\\s-]?effector|tool)\\b`));
  req.gripperWeightKg = num(gripper);

  // Direct payload: "165 kg robot", "payload 165kg", "165kg payload", "165 kg class"
  const payload =
    lower.match(new RegExp(`(?:payload|capacity)\\s*(?:of|is|:|around|about|min(?:imum)?|at least)?\\s*${NUM}\\s*kgs?`)) ||
    lower.match(new RegExp(`${NUM}\\s*kgs?\\s*(?:payload|capacity|robot|class|arm)\\b`));
  req.payloadKg = num(payload);

  // Reach: "2400mm reach", "reach 2.4 m", "reach of 2655 mm"
  const reachMm =
    lower.match(new RegExp(`${NUM}\\s*mm\\s*reach`)) ||
    lower.match(new RegExp(`reach\\s*(?:of|is|:|at least|min(?:imum)?)?\\s*${NUM}\\s*mm`));
  const reachM =
    lower.match(new RegExp(`${NUM}\\s*m(?:etres?|eters?)?\\s*reach`)) ||
    lower.match(new RegExp(`reach\\s*(?:of|is|:|at least|min(?:imum)?)?\\s*${NUM}\\s*m(?:etres?|eters?)?\\b`));
  if (reachMm) req.requiredReachMm = Math.round(num(reachMm)!);
  else if (reachM) {
    const v = num(reachM)!;
    req.requiredReachMm = v < 20 ? Math.round(v * 1000) : Math.round(v); // "reach 2.4 m" vs "reach 2400 m"(typo)
  }

  // Budget
  req.budgetMax = parseBudget(t);

  // Condition
  if (/\brefurb/i.test(t)) req.condition = 'refurbished';
  else if (/\b(used|second[\s-]?hand|pre[\s-]?owned)\b/i.test(t)) req.condition = 'used';
  else if (/\b(brand\s+new|new)\b/i.test(t)) req.condition = 'new';

  // OEM
  for (const [re, name] of KNOWN_OEMS) {
    if (re.test(t)) { req.oem = name; break; }
  }

  // Model
  for (const re of MODEL_PATTERNS) {
    const m = t.match(re);
    if (m) {
      req.model = m[1].replace(/\s+/g, ' ').trim();
      // infer OEM from model family when not stated
      if (!req.oem) {
        if (/^(R-?2000|M-?\d|LR|ARC)/i.test(req.model)) req.oem = 'FANUC';
        else if (/^IRB/i.test(req.model)) req.oem = 'ABB';
        else if (/^KR/i.test(req.model)) req.oem = 'KUKA';
        else if (/^(GP|MH|HP)/i.test(req.model)) req.oem = 'Yaskawa';
        else if (/^UR/i.test(req.model)) req.oem = 'Universal Robots';
        else if (/^RS/i.test(req.model)) req.oem = 'Kawasaki';
      }
      break;
    }
  }

  // Strip undefined keys for a clean partial object
  for (const k of Object.keys(req) as (keyof Requirement)[]) {
    if (req[k] === undefined) delete req[k];
  }
  return req;
}

const BUY_INTENT = /\b(need|buy|purchase|procure|procurement|source|sourcing|looking for|want|require|requirement|quote|quotation|budget|price for|cost of)\b/i;

export function isProcurementQuery(requirement: Requirement, rawText: string): boolean {
  const hasFigure =
    requirement.payloadKg !== undefined ||
    requirement.partWeightKg !== undefined ||
    requirement.gripperWeightKg !== undefined;
  const hasModel = requirement.model !== undefined;
  if (!hasFigure && !hasModel) return false;

  const hasApplication = requirement.application !== undefined;
  const hasBuyIntent = BUY_INTENT.test(rawText || '');
  return hasApplication || hasBuyIntent;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export interface RobotModelRow {
  id: string;
  oem: string;
  model: string;
  series: string | null;
  payload_kg: number;
  reach_mm: number;
  axes: number | null;
  controller_gen: string[] | null;
  mounting: string[] | null;
  ip_rating: string | null;
  repeatability_mm: number | null;
  robot_weight_kg: number | null;
  power_kva: number | null;
  supply_voltage: string | null;
  applications: string[] | null;
  lifecycle_status: string | null;
  spares_risk: string | null;
  successor_model: string | null;
  datasheet_url: string | null;
  verified_on: string;
}

export interface OwnListing {
  id: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  price: number | null;
  currency: string | null;
  payload_capacity: number | null;
  reach: number | null;
  condition: string | null;
  year_manufactured: number | null;
  controller_type: string | null;
  location: string | null;
  state: string | null;
  lead_time: string | null;
  matched_model_id: string | null;
}

export interface DealerSummary {
  dealerCount: number;
  countries: string[];
  typicalLeadDaysMin: number | null;
  typicalLeadDaysMax: number | null;
  oemsCovered: string[];
}

export interface ExternalListingOut {
  id: string;
  model_id: string | null;
  model: string | null;
  oem: string | null;
  raw_model_text: string;
  year: number | null;
  condition_grade: string | null;
  asking_price: number | null;
  currency: string | null;
  location_country: string | null;
  source_platform: string;
  source_url: string;
  verified_on: string;
  is_stale: boolean;
  days_old: number;
  landedCost: LandedCostBreakdown | null;
}

export interface MatchResult {
  requiredPayload: number | null;
  assumedGripper: boolean;
  tier: 0 | 1 | 2 | 3;
  models: RobotModelRow[];
  own: OwnListing[];
  dealerSummary: DealerSummary | null;
  external: ExternalListingOut[];
  requirement: Requirement;
}

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

function normModel(s: string | null | undefined): string {
  return (s || '').toLowerCase().replace(/[\s\-_/]/g, '');
}

export function computeRequiredPayload(req: Requirement): { requiredPayload: number | null; assumedGripper: boolean } {
  if (req.partWeightKg !== undefined) {
    let gripper = req.gripperWeightKg;
    let assumed = false;
    if (gripper === undefined) {
      gripper = req.partWeightKg * 0.25;
      assumed = true;
    }
    return { requiredPayload: Math.round((req.partWeightKg + gripper) * 1.2 * 10) / 10, assumedGripper: assumed };
  }
  if (req.payloadKg !== undefined) return { requiredPayload: req.payloadKg, assumedGripper: false };
  return { requiredPayload: null, assumedGripper: false };
}

export async function matchRobots(supabase: SupabaseLike, req: Requirement): Promise<MatchResult> {
  const { requiredPayload, assumedGripper } = computeRequiredPayload(req);

  // --- Candidate models from the spec catalogue ---------------------------
  let q = supabase.from('robot_models').select('*').limit(40);
  if (requiredPayload !== null) {
    q = q.gte('payload_kg', requiredPayload).lte('payload_kg', requiredPayload * 2.5);
  }
  if (req.requiredReachMm !== undefined) q = q.gte('reach_mm', req.requiredReachMm);
  if (req.application) q = q.contains('applications', [req.application]);
  if (req.oem) q = q.ilike('oem', req.oem);
  if (req.model) {
    // exact-ish model match (case/space/dash-insensitive) via ilike on a loose pattern
    q = q.ilike('model', `%${req.model.replace(/\s+/g, '%')}%`);
  }
  q = q.order('payload_kg', { ascending: true });

  const { data: modelsData, error: modelsErr } = await q;
  if (modelsErr) console.error('robot_models query error:', modelsErr.message);
  const models: RobotModelRow[] = (modelsData || []) as RobotModelRow[];

  const modelIds = models.map((m) => m.id);
  const modelKeys = models.map((m) => normModel(m.model));
  const oems = Array.from(new Set(models.map((m) => m.oem)));

  // --- TIER 1: our own live listings (public.robots) ---------------------
  let own: OwnListing[] = [];
  if (models.length > 0) {
    // Broad pull by brand + payload window, then deterministic model filter in TS.
    let oq = supabase
      .from('robots')
      .select('id, name, brand, model, price, currency, payload_capacity, reach, condition, year_manufactured, controller_type, location, state, lead_time')
      .eq('availability', 'available')
      .limit(200);
    if (oems.length > 0) {
      oq = oq.or(oems.map((o) => `brand.ilike.%${o}%`).join(','));
    }
    const { data: ownData, error: ownErr } = await oq;
    if (ownErr) console.error('robots (tier 1) query error:', ownErr.message);
    own = ((ownData || []) as Omit<OwnListing, 'matched_model_id'>[])
      .map((r) => {
        const rk = normModel(r.model) || normModel(r.name);
        const idx = modelKeys.findIndex((mk) => mk && (rk.includes(mk) || mk.includes(rk) && rk.length >= 4));
        return { ...r, matched_model_id: idx >= 0 ? models[idx].id : null };
      })
      .filter((r) => r.matched_model_id !== null)
      .slice(0, 15);
  }

  // --- TIER 2: dealer network (AGGREGATE ONLY — never expose contacts) ----
  let dealerSummary: DealerSummary | null = null;
  if (oems.length > 0) {
    const { data: dealers, error: dErr } = await supabase
      .from('dealer_network')
      .select('country, oem_specialties, typical_lead_days')
      .overlaps('oem_specialties', oems)
      .limit(100);
    if (dErr) console.error('dealer_network query error:', dErr.message);
    if (dealers && dealers.length > 0) {
      const leads = dealers.map((d: any) => d.typical_lead_days).filter((n: any) => typeof n === 'number');
      dealerSummary = {
        dealerCount: dealers.length,
        countries: Array.from(new Set(dealers.map((d: any) => d.country).filter(Boolean))) as string[],
        typicalLeadDaysMin: leads.length ? Math.min(...leads) : null,
        typicalLeadDaysMax: leads.length ? Math.max(...leads) : null,
        oemsCovered: Array.from(new Set(dealers.flatMap((d: any) => d.oem_specialties || []).filter((o: string) => oems.includes(o)))) as string[],
      };
    }
  }

  // --- TIER 3: external listings ------------------------------------------
  let external: ExternalListingOut[] = [];
  if (modelIds.length > 0) {
    const { data: ext, error: eErr } = await supabase
      .from('external_listings_view')
      .select('*')
      .in('model_id', modelIds)
      .order('verified_on', { ascending: false })
      .limit(15);
    if (eErr) console.error('external_listings_view query error:', eErr.message);
    external = ((ext || []) as any[]).map((e) => {
      const m = models.find((mm) => mm.id === e.model_id);
      const lc = e.asking_price != null
        ? landedCost({ askingPrice: Number(e.asking_price), currency: e.currency || 'EUR', locationCountry: e.location_country, sparesRisk: m?.spares_risk })
        : null;
      return {
        id: e.id,
        model_id: e.model_id,
        model: m?.model ?? null,
        oem: m?.oem ?? null,
        raw_model_text: e.raw_model_text,
        year: e.year,
        condition_grade: e.condition_grade,
        asking_price: e.asking_price != null ? Number(e.asking_price) : null,
        currency: e.currency,
        location_country: e.location_country,
        source_platform: e.source_platform,
        source_url: e.source_url,
        verified_on: e.verified_on,
        is_stale: !!e.is_stale,
        days_old: Number(e.days_old ?? 0),
        landedCost: lc,
      };
    });
    // Rank by total landed cost ascending (unpriced last)
    external.sort((a, b) => (a.landedCost?.totalInr ?? Infinity) - (b.landedCost?.totalInr ?? Infinity));
  }

  const tier: 0 | 1 | 2 | 3 = own.length > 0 ? 1 : dealerSummary ? 2 : external.length > 0 ? 3 : 0;

  return { requiredPayload, assumedGripper, tier, models, own, dealerSummary, external, requirement: req };
}
