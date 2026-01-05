export function formatMoney(amount: number, currency: string): string {
  const safeCurrency = currency || "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

