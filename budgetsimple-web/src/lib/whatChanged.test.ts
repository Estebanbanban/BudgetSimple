import { describe, expect, it } from "vitest";
import { calculateWhatChanged, type CategoryLike, type TransactionLike } from "./whatChanged";

const categories: CategoryLike[] = [
  { id: "groceries", name: "Groceries", type: "expense" },
  { id: "rent", name: "Rent", type: "expense" },
  { id: "paycheck", name: "Paycheck", type: "income" },
];

const baseTransactions: TransactionLike[] = [
  {
    id: "t-g-1",
    dateISO: "2024-05-12",
    amount: -240,
    type: "expense",
    categoryId: "groceries",
    description: "Costco 1234",
  },
  {
    id: "t-g-2",
    dateISO: "2024-05-20",
    amount: -90,
    type: "expense",
    categoryId: "groceries",
    description: "Trader Joes #88",
  },
  {
    id: "t-g-3",
    dateISO: "2024-04-11",
    amount: -70,
    type: "expense",
    categoryId: "groceries",
    description: "Trader Joes #22",
  },
  {
    id: "t-i-1",
    dateISO: "2024-05-03",
    amount: 3100,
    type: "income",
    categoryId: "paycheck",
    description: "ACME Payroll",
  },
  {
    id: "t-i-2",
    dateISO: "2024-04-03",
    amount: 2900,
    type: "income",
    categoryId: "paycheck",
    description: "ACME Payroll",
  },
];

describe("calculateWhatChanged", () => {
  it("returns driver explanations aligned with month-over-month deltas", () => {
    const currentSpend = { Groceries: 330 };
    const previousSpend = { Groceries: 70 };

    const results = calculateWhatChanged({
      month: "2024-05",
      previousMonth: "2024-04",
      currentSpend,
      previousSpend,
      currentIncome: 3100,
      previousIncome: 2900,
      transactions: baseTransactions,
      categories,
    });

    const groceries = results.find((r) => r.category === "Groceries");
    expect(groceries).toBeDefined();
    expect(groceries?.change).toBe(260);
    expect(groceries?.drivers.merchantSpike?.merchant).toBe("Costco");
    expect(groceries?.drivers.merchantSpike?.delta).toBeCloseTo(240);
    expect(groceries?.drivers.largestTransaction?.id).toBe("t-g-1");
    expect(groceries?.drivers.anomaly).toBe(true);

    const income = results.find((r) => r.category === "Income");
    expect(income?.change).toBe(200);
    expect(income?.drivers.merchantSpike?.merchant).toBe("Acme Payroll");
  });

  it("limits results and keeps explanations in sync", () => {
    const currentSpend = { Groceries: 330, Rent: 1200 };
    const previousSpend = { Groceries: 70, Rent: 1200 };

    const results = calculateWhatChanged({
      month: "2024-05",
      previousMonth: "2024-04",
      currentSpend,
      previousSpend,
      currentIncome: 0,
      previousIncome: 0,
      transactions: baseTransactions,
      categories,
      limit: 1,
    });

    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("Groceries");
    expect(results[0].drivers.merchantSpike?.delta).toBeCloseTo(240);
    expect(Math.abs(results[0].drivers.merchantSpike?.delta || 0)).toBeGreaterThan(
      Math.abs(results[0].change) * 0.8
    );
  });
});

