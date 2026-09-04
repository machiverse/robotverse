// ============================================================================
// Landed cost calculator — importing an industrial robot into India.
//
// PROVISIONAL — customs duty rates for HS 8479.50 change with each Union Budget
// and vary by classification and FTA origin. Confirm with a licensed customs
// broker before these figures are shown to a buyer.
// ============================================================================

/** Basic Customs Duty (BCD) on assessable value. PROVISIONAL. */
export const BCD_RATE = 0.075;
/** Social Welfare Surcharge, levied on BCD. PROVISIONAL. */
export const SWS_RATE = 0.10;
/** IGST on (assessable + BCD + SWS). PROVISIONAL. */
export const IGST_RATE = 0.18;

/** Indicative FX to INR. PROVISIONAL — refresh before quoting. */
export const FX_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 84,
  EUR: 91,
  GBP: 106,
  JPY: 0.56,
  CNY: 11.6,
  KRW: 0.061,
};
export const USD_TO_INR = FX_TO_INR.USD;

/** Indicative door-to-port freight for one crated six-axis robot, in USD. PROVISIONAL. */
export const FREIGHT_USD_BY_REGION: Record<string, number> = {
  EU: 3200,
  US: 4100,
  JP: 2800,
  CN: 1900,
  KR: 2400,
  IN: 0,
};

/** Spares reserve as a fraction of goods value, keyed by robot_models.spares_risk. */
export const SPARES_RESERVE_RATE: Record<string, number> = {
  high: 0.15,
  medium: 0.10,
  low: 0.05,
};

/** Default commissioning / installation allowance in INR. PROVISIONAL. */
export const DEFAULT_INSTALLATION_INR = 150000;

export type FreightRegion = keyof typeof FREIGHT_USD_BY_REGION;

export interface LandedCostInput {
  askingPrice: number;
  currency: string;
  /** ISO-ish country name/code from the listing; mapped to a freight region. */
  locationCountry?: string | null;
  sparesRisk?: string | null;
  installationInr?: number;
}

export interface LandedCostBreakdown {
  currency: string;
  fxToInr: number;
  region: FreightRegion;
  goodsInr: number;
  freightInr: number;
  assessableInr: number;
  bcdInr: number;
  socialWelfareSurchargeInr: number;
  igstInr: number;
  sparesReserveInr: number;
  installationInr: number;
  totalInr: number;
  provisional: true;
}

const EU_COUNTRIES = [
  'germany', 'de', 'netherlands', 'nl', 'italy', 'it', 'france', 'fr', 'spain', 'es', 'belgium', 'be',
  'austria', 'at', 'poland', 'pl', 'czech', 'cz', 'sweden', 'se', 'denmark', 'dk', 'portugal', 'pt',
  'hungary', 'hu', 'slovakia', 'sk', 'romania', 'ro', 'finland', 'fi', 'ireland', 'ie', 'uk', 'united kingdom', 'gb', 'switzerland', 'ch',
];

export function regionForCountry(country?: string | null): FreightRegion {
  const c = (country || '').trim().toLowerCase();
  if (!c) return 'EU';
  if (c === 'india' || c === 'in') return 'IN';
  if (c === 'usa' || c === 'us' || c === 'united states' || c === 'canada' || c === 'ca' || c === 'mexico' || c === 'mx') return 'US';
  if (c === 'japan' || c === 'jp') return 'JP';
  if (c === 'china' || c === 'cn' || c === 'taiwan' || c === 'tw' || c === 'hong kong' || c === 'hk') return 'CN';
  if (c === 'korea' || c === 'south korea' || c === 'kr') return 'KR';
  if (EU_COUNTRIES.includes(c)) return 'EU';
  return 'EU';
}

function round(n: number): number {
  return Math.round(n);
}

export function landedCost(input: LandedCostInput): LandedCostBreakdown {
  const currency = (input.currency || 'EUR').toUpperCase();
  const fxToInr = FX_TO_INR[currency] ?? FX_TO_INR.EUR;
  const region = regionForCountry(input.locationCountry);

  const goodsInr = (input.askingPrice || 0) * fxToInr;
  const freightInr = FREIGHT_USD_BY_REGION[region] * USD_TO_INR;
  const assessable = goodsInr + freightInr;
  const bcd = assessable * BCD_RATE;
  const sws = bcd * SWS_RATE;
  const igst = (assessable + bcd + sws) * IGST_RATE;
  const sparesRate = SPARES_RESERVE_RATE[(input.sparesRisk || '').toLowerCase()] ?? SPARES_RESERVE_RATE.medium;
  const sparesReserve = goodsInr * sparesRate;
  const installation = input.installationInr ?? DEFAULT_INSTALLATION_INR;

  const total = goodsInr + freightInr + bcd + sws + igst + sparesReserve + installation;

  return {
    currency,
    fxToInr,
    region,
    goodsInr: round(goodsInr),
    freightInr: round(freightInr),
    assessableInr: round(assessable),
    bcdInr: round(bcd),
    socialWelfareSurchargeInr: round(sws),
    igstInr: round(igst),
    sparesReserveInr: round(sparesReserve),
    installationInr: round(installation),
    totalInr: round(total),
    provisional: true,
  };
}
