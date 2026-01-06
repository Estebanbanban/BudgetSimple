/**
 * Currency conversion utilities
 * Handles multi-currency support with conversion to display currency
 */

// Exchange rates (simplified - in production, fetch from API)
// Base: USD
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  CAD: 1.35, // Approximate
  EUR: 0.92, // Approximate
  GBP: 0.79, // Approximate
  AUD: 1.52, // Approximate
};

/**
 * Convert amount from source currency to target currency
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  if (!EXCHANGE_RATES[fromCurrency] || !EXCHANGE_RATES[toCurrency]) {
    console.warn(`Missing exchange rate for ${fromCurrency} or ${toCurrency}`);
    return amount; // Fallback: return as-is
  }
  // Convert to USD first, then to target
  const usdAmount = amount / EXCHANGE_RATES[fromCurrency];
  return usdAmount * EXCHANGE_RATES[toCurrency];
}

/**
 * Get currency from transaction or income, defaulting to display currency
 */
export function getTransactionCurrency(
  tx: { currency?: string },
  displayCurrency: string
): string {
  return tx.currency || displayCurrency;
}

/**
 * Format currency with symbol
 */
export function formatCurrencyWithSymbol(
  amount: number,
  currency: string
): string {
  const symbols: Record<string, string> = {
    USD: '$',
    CAD: 'CA$',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

