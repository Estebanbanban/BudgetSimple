export type TxType = "expense" | "income" | "investment" | "transfer";

export type CategoryLike = {
  id: string;
  name: string;
  type: TxType;
};

export type TransactionLike = {
  id: string;
  dateISO: string;
  amount: number;
  type: TxType;
  categoryId: string;
  description: string;
};

export type ChangeDriver = {
  largestTransaction?: TransactionDriver;
  merchantSpike?: MerchantDriver;
  anomaly: boolean;
};

export type TransactionDriver = {
  id: string;
  description: string;
  amount: number;
  dateISO: string;
  merchant: string;
};

export type MerchantDriver = {
  merchant: string;
  current: number;
  previous: number;
  delta: number;
};

export type WhatChangedItem = {
  category: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  type: "expense" | "income";
  drivers: ChangeDriver;
};

export type WhatChangedInput = {
  month: string;
  previousMonth: string;
  currentSpend: Record<string, number>;
  previousSpend: Record<string, number>;
  currentIncome: number;
  previousIncome: number;
  transactions: TransactionLike[];
  categories: CategoryLike[];
  limit?: number;
  normalizeMerchant?: (name: string) => string;
};

const DEFAULT_LIMIT = 5;

export function calculateWhatChanged(input: WhatChangedInput): WhatChangedItem[] {
  const {
    month,
    previousMonth,
    currentSpend,
    previousSpend,
    currentIncome,
    previousIncome,
    transactions,
    categories,
    normalizeMerchant = defaultNormalizeMerchant,
  } = input;

  const changes: WhatChangedItem[] = [];
  const allCategories = new Set([
    ...Object.keys(currentSpend),
    ...Object.keys(previousSpend),
  ]);

  for (const category of allCategories) {
    const current = currentSpend[category] || 0;
    const previous = previousSpend[category] || 0;
    if (current === 0 && previous === 0) continue;

    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : current > 0 ? 100 : 0;

    if (Math.abs(change) > 50 || Math.abs(changePercent) > 10) {
      const drivers = buildDrivers({
        changeCategory: category,
        month,
        previousMonth,
        change,
        transactions,
        categories,
        normalizeMerchant,
      });

      changes.push({
        category,
        current,
        previous,
        change,
        changePercent,
        type: "expense",
        drivers,
      });
    }
  }

  if (currentIncome > 0 || previousIncome > 0) {
    const incomeChange = currentIncome - previousIncome;
    const incomeChangePercent =
      previousIncome > 0 ? (incomeChange / previousIncome) * 100 : currentIncome > 0 ? 100 : 0;

    changes.push({
      category: "Income",
      current: currentIncome,
      previous: previousIncome,
      change: incomeChange,
      changePercent: incomeChangePercent,
      type: "income",
      drivers: buildDrivers({
        changeCategory: "Income",
        month,
        previousMonth,
        change: incomeChange,
        transactions,
        categories,
        normalizeMerchant,
      }),
    });
  }

  const totalCurrent = sumValues(currentSpend);
  const totalPrevious = sumValues(previousSpend);
  const totalChange = totalCurrent - totalPrevious;
  const totalChangePercent =
    totalPrevious > 0 ? (totalChange / totalPrevious) * 100 : totalCurrent > 0 ? 100 : 0;

  changes.push({
    category: "Total Expenses",
    current: totalCurrent,
    previous: totalPrevious,
    change: totalChange,
    changePercent: totalChangePercent,
    type: "expense",
    drivers: buildDrivers({
      changeCategory: "Total Expenses",
      month,
      previousMonth,
      change: totalChange,
      transactions,
      categories,
      normalizeMerchant,
    }),
  });

  return changes
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, input.limit ?? DEFAULT_LIMIT);
}

function buildDrivers(options: {
  changeCategory: string;
  month: string;
  previousMonth: string;
  change: number;
  transactions: TransactionLike[];
  categories: CategoryLike[];
  normalizeMerchant: (name: string) => string;
}): ChangeDriver {
  const {
    changeCategory,
    month,
    previousMonth,
    change,
    transactions,
    categories,
    normalizeMerchant,
  } = options;

  const categoryIds = categoryIdsForName(changeCategory, categories);
  const typeFilter = changeCategory === "Income" ? "income" : "expense";
  const currentRange = monthRange(month);
  const previousRange = monthRange(previousMonth);

  const currentTx = transactions
    .filter((t) => t.type === typeFilter)
    .filter((t) => inRange(t.dateISO, currentRange) && matchesCategory(t, categoryIds));
  const previousTx = transactions
    .filter((t) => t.type === typeFilter)
    .filter((t) => inRange(t.dateISO, previousRange) && matchesCategory(t, categoryIds));

  const largestTransaction = currentTx
    .slice()
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

  const merchantSpike = findMerchantSpike(currentTx, previousTx, normalizeMerchant);

  const anomaly = Boolean(
    (largestTransaction && Math.abs(largestTransaction.amount) >= Math.abs(change) * 0.5) ||
      (merchantSpike && Math.abs(merchantSpike.delta) >= Math.abs(change) * 0.5)
  );

  return {
    largestTransaction: largestTransaction
      ? {
          id: largestTransaction.id,
          description: largestTransaction.description,
          amount: Math.abs(largestTransaction.amount),
          dateISO: largestTransaction.dateISO,
          merchant: normalizeMerchant(largestTransaction.description || ""),
        }
      : undefined,
    merchantSpike,
    anomaly,
  };
}

function findMerchantSpike(
  currentTx: TransactionLike[],
  previousTx: TransactionLike[],
  normalizeMerchant: (name: string) => string
): MerchantDriver | undefined {
  const currentTotals = totalByMerchant(currentTx, normalizeMerchant);
  const previousTotals = totalByMerchant(previousTx, normalizeMerchant);

  let best: MerchantDriver | undefined;
  for (const [merchant, current] of currentTotals.entries()) {
    const previous = previousTotals.get(merchant) || 0;
    const delta = current - previous;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { merchant, current, previous, delta };
    }
  }
  return best && Math.abs(best.delta) > 0 ? best : undefined;
}

function totalByMerchant(
  transactions: TransactionLike[],
  normalizeMerchant: (name: string) => string
) {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    const merchant = normalizeMerchant(tx.description || "");
    const current = totals.get(merchant) || 0;
    totals.set(merchant, current + Math.abs(tx.amount));
  }
  return totals;
}

function categoryIdsForName(category: string, categories: CategoryLike[]) {
  if (category === "Total Expenses" || category === "Income") return new Set<string>();
  const ids = categories
    .filter((c) => c.name.toLowerCase() === category.toLowerCase())
    .map((c) => c.id);
  return new Set(ids);
}

function matchesCategory(tx: TransactionLike, allowed: Set<string>) {
  if (allowed.size === 0) return true;
  return allowed.has(tx.categoryId);
}

function sumValues(values: Record<string, number>) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function monthRange(month: string) {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return { from: null, to: null };
  const start = `${month}-01`;
  const endDate = new Date(year, mon, 0);
  const end = endDate.toISOString().slice(0, 10);
  return { from: start, to: end };
}

function inRange(dateISO: string, range: { from: string | null; to: string | null }) {
  if (!range.from || !range.to) return false;
  return dateISO >= range.from && dateISO <= range.to;
}

function defaultNormalizeMerchant(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Unknown";
  const words = cleaned.split(" ").slice(0, 3).join(" ");
  return words.replace(/\b\w/g, (c) => c.toUpperCase());
}

