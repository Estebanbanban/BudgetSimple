/**
 * Local-first subscriptions persistence + summary.
 *
 * MVP goal:
 * - When NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS=false (default), subscriptions should still support:
 *   - review (pending/confirmed/rejected)
 *   - confirm/reject
 *   - manual add + edit
 *   - summary + local drilldown (transactions)
 *
 * Storage:
 * - Uses IndexedDB "meta" store via window.budgetsimpleRuntime.getStore()
 * - Falls back to no-op if runtime/store not available.
 */
export type SubscriptionFrequency = "monthly" | "bi-weekly" | "quarterly" | "annual";
export type SubscriptionStatus = "pending" | "confirmed" | "rejected";
export type SubscriptionSource = "detected" | "manual";

export interface LocalSubscriptionRecord {
  /** Stable ID: `sub-${merchantKey}` */
  id: string;
  merchant: string;
  merchantKey: string;
  estimatedMonthlyAmount: number;
  frequency: SubscriptionFrequency;
  status: Exclude<SubscriptionStatus, "pending">;
  source: SubscriptionSource;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSubscriptionCandidate {
  id: string;
  merchant: string;
  merchantKey: string;
  estimatedMonthlyAmount: number;
  frequency: SubscriptionFrequency;
  firstDetectedDate: string;
  confidenceScore: number;
  status: SubscriptionStatus;
  occurrenceCount: number;
  averageAmount: number;
  variancePercentage: number;
}

export interface LocalSubscriptionSummary {
  totalMonthly: number;
  byMerchant: Array<{
    merchant: string;
    amount: number;
    frequency: SubscriptionFrequency;
    subscriptionId: string;
  }>;
  byCategory: Array<{
    categoryId?: string;
    categoryName?: string;
    amount: number;
    count: number;
  }>;
  subscriptions: Array<{
    id: string;
    merchant: string;
    categoryId?: string;
    estimatedMonthlyAmount: number;
    frequency: SubscriptionFrequency;
    lastTransactionDate?: string;
  }>;
}

type MetaEnvelope = {
  key: string;
  value: unknown;
};

type SubscriptionsMetaV1 = {
  version: 1;
  recordsByKey: Record<string, LocalSubscriptionRecord>;
};

const META_KEY = "subscriptions:v1";

function nowIso() {
  return new Date().toISOString();
}

function getRuntime(): {
  analyzeMerchants?: () => { merchants: unknown[]; subscriptions: Array<{ merchant: string; monthly: number; count: number }> };
  transactions?: () => Array<{ id: string; dateISO: string; amount: number; type: string; description: string }>;
  getStore?: () => { getAll: (store: "meta") => Promise<MetaEnvelope[]>; put: (store: "meta", value: MetaEnvelope) => Promise<void> };
} | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { budgetsimpleRuntime?: any }).budgetsimpleRuntime || null;
}

function normalizeMerchantLikeRuntime(name: string) {
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

function merchantKeyFromDisplayName(displayName: string) {
  return displayName.toLowerCase().replace(/\s+/g, "");
}

async function getMeta(): Promise<SubscriptionsMetaV1> {
  const rt = getRuntime();
  const store = rt?.getStore?.();
  if (!store) return { version: 1, recordsByKey: {} };

  const meta = await store.getAll("meta");
  const entry = meta.find((m) => m.key === META_KEY);
  if (!entry) return { version: 1, recordsByKey: {} };

  const value = entry.value as Partial<SubscriptionsMetaV1> | undefined;
  if (!value || value.version !== 1 || !value.recordsByKey) return { version: 1, recordsByKey: {} };
  return value as SubscriptionsMetaV1;
}

async function setMeta(next: SubscriptionsMetaV1): Promise<void> {
  const rt = getRuntime();
  const store = rt?.getStore?.();
  if (!store) return;
  await store.put("meta", { key: META_KEY, value: next });
}

export async function listLocalSubscriptionRecords(): Promise<LocalSubscriptionRecord[]> {
  const meta = await getMeta();
  return Object.values(meta.recordsByKey).sort((a, b) => a.merchant.localeCompare(b.merchant));
}

export async function upsertLocalSubscriptionRecord(input: {
  merchant: string;
  estimatedMonthlyAmount: number;
  frequency: SubscriptionFrequency;
  status: Exclude<SubscriptionStatus, "pending">;
  source: SubscriptionSource;
}): Promise<LocalSubscriptionRecord> {
  const display = normalizeMerchantLikeRuntime(input.merchant);
  const merchantKey = merchantKeyFromDisplayName(display);
  const id = `sub-${merchantKey}`;
  const meta = await getMeta();
  const existing = meta.recordsByKey[merchantKey];
  const createdAt = existing?.createdAt || nowIso();
  const record: LocalSubscriptionRecord = {
    id,
    merchant: display,
    merchantKey,
    estimatedMonthlyAmount: input.estimatedMonthlyAmount,
    frequency: input.frequency,
    status: input.status,
    source: input.source,
    createdAt,
    updatedAt: nowIso(),
  };
  meta.recordsByKey[merchantKey] = record;
  await setMeta(meta);
  return record;
}

export async function setLocalSubscriptionStatus(
  merchantOrId: string,
  status: Exclude<SubscriptionStatus, "pending">
): Promise<void> {
  const meta = await getMeta();
  const merchantKey = merchantOrId.startsWith("sub-")
    ? merchantOrId.slice("sub-".length)
    : merchantOrId.startsWith("local-")
    ? merchantOrId.slice("local-".length)
    : merchantOrId;

  const existing = meta.recordsByKey[merchantKey];
  if (!existing) {
    // If we don't have an existing record, create a minimal one (detected).
    meta.recordsByKey[merchantKey] = {
      id: `sub-${merchantKey}`,
      merchant: merchantKey,
      merchantKey,
      estimatedMonthlyAmount: 0,
      frequency: "monthly",
      status,
      source: "detected",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  } else {
    meta.recordsByKey[merchantKey] = { ...existing, status, updatedAt: nowIso() };
  }
  await setMeta(meta);
}

export async function getLocalCandidates(): Promise<LocalSubscriptionCandidate[]> {
  const rt = getRuntime();
  const analysis = rt?.analyzeMerchants?.();
  if (!analysis) return [];

  const meta = await getMeta();

  return analysis.subscriptions.map((sub) => {
    const display = normalizeMerchantLikeRuntime(sub.merchant);
    const merchantKey = merchantKeyFromDisplayName(display);
    const record = meta.recordsByKey[merchantKey];
    const status: SubscriptionStatus = record?.status || "pending";

    const monthly =
      record && record.estimatedMonthlyAmount > 0
        ? record.estimatedMonthlyAmount
        : sub.monthly;
    const frequency: SubscriptionFrequency = record?.frequency || "monthly";

    return {
      id: `local-${merchantKey}`,
      merchant: display,
      merchantKey,
      estimatedMonthlyAmount: monthly,
      frequency,
      firstDetectedDate: nowIso(),
      confidenceScore: 0.8,
      status,
      occurrenceCount: sub.count || 0,
      averageAmount: monthly,
      variancePercentage: 0,
    };
  });
}

export async function getLocalConfirmedSubscriptions(): Promise<LocalSubscriptionRecord[]> {
  const meta = await getMeta();
  const records = Object.values(meta.recordsByKey).filter((r) => r.status === "confirmed");

  // Include manual subscriptions even if not in detection; they are stored as confirmed records.
  return records.sort((a, b) => b.estimatedMonthlyAmount - a.estimatedMonthlyAmount);
}

export async function getLocalSubscriptionSummary(): Promise<LocalSubscriptionSummary> {
  const rt = getRuntime();
  const txs = rt?.transactions?.() || [];

  const confirmed = await getLocalConfirmedSubscriptions();
  const byMerchant = confirmed.map((s) => ({
    merchant: s.merchant,
    amount: s.estimatedMonthlyAmount,
    frequency: s.frequency,
    subscriptionId: s.id,
  }));

  const totalMonthly = byMerchant.reduce((sum, s) => sum + (s.amount || 0), 0);

  // Minimal category breakdown for MVP (local-only): "Subscriptions"
  const byCategory =
    totalMonthly > 0
      ? [
          {
            categoryId: "subscriptions",
            categoryName: "Subscriptions",
            amount: totalMonthly,
            count: confirmed.length,
          },
        ]
      : [];

  const subscriptions = confirmed.map((s) => {
    const last = findLastTransactionDateForMerchant(txs, s.merchant);
    return {
      id: s.id,
      merchant: s.merchant,
      estimatedMonthlyAmount: s.estimatedMonthlyAmount,
      frequency: s.frequency,
      lastTransactionDate: last || undefined,
    };
  });

  return { totalMonthly, byMerchant, byCategory, subscriptions };
}

function findLastTransactionDateForMerchant(
  txs: Array<{ dateISO: string; description: string; amount: number; type: string }>,
  merchantDisplay: string
) {
  const target = normalizeMerchantLikeRuntime(merchantDisplay);
  const matches = txs
    .filter((t) => t.type === "expense" && t.amount < 0)
    .filter((t) => normalizeMerchantLikeRuntime(t.description || "") === target)
    .map((t) => t.dateISO)
    .sort()
    .reverse();
  return matches[0] || null;
}

export async function getLocalSubscriptionTransactions(subscriptionId: string): Promise<{
  subscriptionId: string;
  merchant: string;
  transactions: Array<{ id: string; date: string; description: string; merchant: string; amount: number }>;
  totalAmount: number;
}> {
  const rt = getRuntime();
  const txs = rt?.transactions?.() || [];
  const meta = await getMeta();

  const merchantKey = subscriptionId.startsWith("sub-") ? subscriptionId.slice("sub-".length) : subscriptionId;
  const record = meta.recordsByKey[merchantKey];
  const merchantDisplay = record?.merchant || merchantKey;
  const target = normalizeMerchantLikeRuntime(merchantDisplay);

  const matches = txs
    .filter((t) => t.type === "expense" && t.amount < 0)
    .filter((t) => normalizeMerchantLikeRuntime(t.description || "") === target)
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
    .slice(0, 200)
    .map((t) => ({
      id: t.id,
      date: t.dateISO,
      description: t.description,
      merchant: merchantDisplay,
      amount: t.amount,
    }));

  const totalAmount = matches.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return { subscriptionId, merchant: merchantDisplay, transactions: matches, totalAmount };
}

