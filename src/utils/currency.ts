// Currency conversion utilities
export interface CurrencyRates {
  INR: number;
  USD: number;
  EUR: number;
}

// Static exchange rates - in production, you'd fetch these from an API
// These rates are approximate and should be updated regularly
const EXCHANGE_RATES: CurrencyRates = {
  INR: 1,     // Base currency
  USD: 0.012, // 1 INR = 0.012 USD
  EUR: 0.011, // 1 INR = 0.011 EUR
};

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€'
} as const;

export type Currency = keyof typeof CURRENCY_SYMBOLS;

/**
 * Convert any currency amount to INR
 */
export function convertToINR(amount: number, fromCurrency: Currency): number {
  if (fromCurrency === 'INR') {
    return amount;
  }
  
  // Convert to INR: amount * (1 / rate_to_inr)
  const rateToINR = 1 / EXCHANGE_RATES[fromCurrency];
  return amount * rateToINR;
}

/**
 * Convert INR amount to any currency
 */
export function convertFromINR(inrAmount: number, toCurrency: Currency): number {
  if (toCurrency === 'INR') {
    return inrAmount;
  }
  
  return inrAmount * EXCHANGE_RATES[toCurrency];
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return `${symbol}${formattedAmount}`;
}

/**
 * Format currency with better handling for any currency string
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (amount === null || amount === undefined) {
    return 'Price on Request';
  }
  
  // Handle legacy currency codes
  const normalizedCurrency = currency.toUpperCase() as Currency;
  
  if (CURRENCY_SYMBOLS[normalizedCurrency]) {
    return formatPrice(amount, normalizedCurrency);
  }
  
  // Fallback for unknown currencies
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Compare two prices by converting both to INR
 */
export function comparePrices(
  price1: number,
  currency1: Currency,
  price2: number,
  currency2: Currency
): number {
  const inrPrice1 = convertToINR(price1, currency1);
  const inrPrice2 = convertToINR(price2, currency2);
  
  return inrPrice1 - inrPrice2;
}

/**
 * Get the equivalent price in all currencies
 */
export function getPriceInAllCurrencies(amount: number, fromCurrency: Currency) {
  const inrAmount = convertToINR(amount, fromCurrency);
  
  return {
    INR: inrAmount,
    USD: convertFromINR(inrAmount, 'USD'),
    EUR: convertFromINR(inrAmount, 'EUR')
  };
}

/**
 * Fetch live exchange rates (placeholder for future implementation)
 * In production, you might use an API like exchangerate-api.com or fixer.io
 */
export async function fetchLiveRates(): Promise<CurrencyRates> {
  // For now, return static rates
  // In production, implement API call here
  return EXCHANGE_RATES;
}

/**
 * Calculate total value in INR for an array of items with different currencies
 */
export function calculateTotalInINR(items: Array<{ price: number; currency: Currency }>): number {
  return items.reduce((total, item) => {
    return total + convertToINR(item.price, item.currency);
  }, 0);
}