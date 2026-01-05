export type ContributionMode = "auto" | "manual";

export type PlanSettings = {
  startingNetWorth: number;
  currency: string;
  annualReturn: number; // decimal, e.g. 0.07
  contributionMode: ContributionMode;
  manualMonthlyContribution: number;
};

const CONFIG_KEY = "budgetsimple:v1";

const DEFAULTS: PlanSettings = {
  startingNetWorth: 0,
  currency: "USD",
  annualReturn: 0.07,
  contributionMode: "auto",
  manualMonthlyContribution: 0,
};

type StoredConfig = { settings?: Record<string, unknown> } & Record<string, unknown>;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type RuntimeConfig = { settings?: Record<string, unknown> } & Record<string, unknown>;
type Runtime = {
  config?: () => unknown;
  getConfig?: () => unknown;
  saveConfig?: () => void;
};

function getRuntimeConfig(): RuntimeConfig | null {
  if (typeof window === "undefined") return null;
  const runtime = (window as unknown as { budgetsimpleRuntime?: Runtime }).budgetsimpleRuntime;
  if (!runtime) return null;
  const cfg = runtime.config?.() ?? runtime.getConfig?.() ?? null;
  return cfg as RuntimeConfig | null;
}

function saveRuntimeConfig(): void {
  if (typeof window === "undefined") return;
  const runtime = (window as unknown as { budgetsimpleRuntime?: Runtime }).budgetsimpleRuntime;
  runtime?.saveConfig?.();
}

export function readPlanSettings(): PlanSettings {
  // Prefer runtime config if available, fallback to localStorage.
  const runtimeConfig = getRuntimeConfig();
  const fromRuntime = runtimeConfig?.settings ?? null;

  const raw = typeof window !== "undefined" ? localStorage.getItem(CONFIG_KEY) : null;
  const parsed = safeParse<Record<string, unknown>>(raw);
  const fromStorage = (parsed?.settings as Record<string, unknown> | undefined) ?? null;

  const src = (fromRuntime ?? fromStorage ?? {}) as Record<string, unknown>;

  return {
    startingNetWorth: Number((src.netWorthManual as number | undefined) ?? DEFAULTS.startingNetWorth) || 0,
    currency: String((src.currency as string | undefined) ?? DEFAULTS.currency),
    annualReturn: Number((src.planAnnualReturn as number | undefined) ?? DEFAULTS.annualReturn) || DEFAULTS.annualReturn,
    contributionMode:
      ((src.planContributionMode as ContributionMode | undefined) ?? DEFAULTS.contributionMode),
    manualMonthlyContribution:
      Number((src.planManualContribution as number | undefined) ?? DEFAULTS.manualMonthlyContribution) || 0,
  };
}

export function writePlanSettings(next: Partial<PlanSettings>) {
  if (typeof window === "undefined") return;

  // Update runtime config if present.
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig) {
    runtimeConfig.settings = runtimeConfig.settings ?? {};
    if (next.startingNetWorth !== undefined) runtimeConfig.settings.netWorthManual = next.startingNetWorth;
    if (next.currency !== undefined) runtimeConfig.settings.currency = next.currency;
    if (next.annualReturn !== undefined) runtimeConfig.settings.planAnnualReturn = next.annualReturn;
    if (next.contributionMode !== undefined) runtimeConfig.settings.planContributionMode = next.contributionMode;
    if (next.manualMonthlyContribution !== undefined)
      runtimeConfig.settings.planManualContribution = next.manualMonthlyContribution;
    saveRuntimeConfig();
    return;
  }

  // Fallback: write to localStorage under the same config key.
  const existing: StoredConfig = safeParse<StoredConfig>(localStorage.getItem(CONFIG_KEY)) ?? {};
  const settings: Record<string, unknown> = existing.settings ?? {};
  existing.settings = settings;
  if (next.startingNetWorth !== undefined) settings.netWorthManual = next.startingNetWorth;
  if (next.currency !== undefined) settings.currency = next.currency;
  if (next.annualReturn !== undefined) settings.planAnnualReturn = next.annualReturn;
  if (next.contributionMode !== undefined) settings.planContributionMode = next.contributionMode;
  if (next.manualMonthlyContribution !== undefined) settings.planManualContribution = next.manualMonthlyContribution;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(existing));
}

