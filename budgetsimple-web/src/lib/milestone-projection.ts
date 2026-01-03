/**
 * Milestone Projection Engine
 * Calculates net worth trajectory with compounding
 */

export interface ProjectionPoint {
  month: number; // Months from now
  date: string; // ISO date
  netWorth: number;
  contributions: number; // Cumulative contributions
  growth: number; // Cumulative growth from compounding
}

export interface ProjectionCurve {
  label: string;
  points: ProjectionPoint[];
  color: string;
}

export interface ProjectionInputs {
  currentNetWorth: number;
  monthlyContribution: number;
  annualReturn: number; // As decimal (e.g., 0.07 for 7%)
  monthsToProject: number;
}

export interface MilestoneMarker {
  id: string;
  label: string;
  targetValue: number;
  targetDate?: string;
  x: number; // Month index
  y: number; // Net worth value
}

/**
 * Calculate monthly return rate from annual return
 */
export function monthlyReturnRate(annualReturn: number): number {
  return Math.pow(1 + annualReturn, 1 / 12) - 1;
}

/**
 * Project net worth forward with compounding
 * Formula: NW(t+1) = NW(t) * (1+r) + C
 */
export function projectNetWorth(inputs: ProjectionInputs): ProjectionPoint[] {
  const {
    currentNetWorth,
    monthlyContribution,
    annualReturn,
    monthsToProject,
  } = inputs;
  const monthlyRate = monthlyReturnRate(annualReturn);

  const points: ProjectionPoint[] = [];
  let netWorth = currentNetWorth;
  let totalContributions = 0;
  let totalGrowth = 0;

  const startDate = new Date();

  for (let month = 0; month <= monthsToProject; month++) {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + month,
      1
    );

    if (month > 0) {
      // Apply compounding: growth from previous month
      const growth = netWorth * monthlyRate;
      totalGrowth += growth;
      netWorth += growth;

      // Add contribution
      totalContributions += monthlyContribution;
      netWorth += monthlyContribution;
    }

    points.push({
      month,
      date: date.toISOString().split("T")[0],
      netWorth: Math.max(0, netWorth),
      contributions: totalContributions,
      growth: totalGrowth,
    });
  }

  return points;
}

/**
 * Calculate ETA for a milestone target
 */
export function calculateETA(
  inputs: ProjectionInputs,
  targetValue: number
): { month: number; date: string; netWorth: number } | null {
  const points = projectNetWorth(inputs);

  for (const point of points) {
    if (point.netWorth >= targetValue) {
      return {
        month: point.month,
        date: point.date,
        netWorth: point.netWorth,
      };
    }
  }

  return null; // Target not reached in projection period
}

/**
 * Calculate required monthly contribution to hit target by date
 */
export function calculateRequiredContribution(
  currentNetWorth: number,
  targetValue: number,
  targetDate: string,
  annualReturn: number
): number {
  const startDate = new Date();
  const endDate = new Date(targetDate);
  const months = Math.max(
    1,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth())
  );

  if (months <= 0 || targetValue <= currentNetWorth) {
    return 0;
  }

  const monthlyRate = monthlyReturnRate(annualReturn);

  // Binary search for required contribution
  let low = 0;
  let high = targetValue * 2; // Upper bound
  let best = 0;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (low + high) / 2;
    let nw = currentNetWorth;

    for (let m = 0; m < months; m++) {
      nw = nw * (1 + monthlyRate) + mid;
    }

    if (nw >= targetValue) {
      best = mid;
      high = mid;
    } else {
      low = mid;
    }

    if (high - low < 0.01) break;
  }

  return Math.ceil(best);
}

/**
 * Calculate sensitivity: how ETA changes with contribution change
 */
export function calculateSensitivity(
  inputs: ProjectionInputs,
  targetValue: number,
  contributionDelta: number
): { monthsEarlier: number; newETA: string | null } {
  const baseETA = calculateETA(inputs, targetValue);
  if (!baseETA) {
    return { monthsEarlier: 0, newETA: null };
  }

  const modifiedInputs = {
    ...inputs,
    monthlyContribution: inputs.monthlyContribution + contributionDelta,
  };

  const newETA = calculateETA(modifiedInputs, targetValue);
  if (!newETA) {
    return { monthsEarlier: 0, newETA: null };
  }

  return {
    monthsEarlier: baseETA.month - newETA.month,
    newETA: newETA.date,
  };
}

/**
 * Generate multiple projection curves (base, conservative, aggressive)
 */
export function generateProjectionCurves(
  inputs: ProjectionInputs
): ProjectionCurve[] {
  const base = projectNetWorth(inputs);

  const conservative = projectNetWorth({
    ...inputs,
    annualReturn: Math.max(0.02, inputs.annualReturn - 0.02), // 2% lower
  });

  const aggressive = projectNetWorth({
    ...inputs,
    annualReturn: inputs.annualReturn + 0.02, // 2% higher
  });

  return [
    {
      label: "Base",
      points: base,
      color: "#3b82f6",
    },
    {
      label: "Conservative",
      points: conservative,
      color: "#94a3b8",
    },
    {
      label: "Aggressive",
      points: aggressive,
      color: "#10b981",
    },
  ];
}

/**
 * Calculate current monthly contribution from cashflow
 */
export function calculateMonthlyContributionFromCashflow(
  transactions: any[],
  income: any[],
  days: number = 30
): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentIncome = income
    .filter((i) => {
      const date = new Date(i.dateISO || i.date);
      return date >= cutoffDate;
    })
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const recentExpenses = transactions
    .filter((t) => {
      const date = new Date(t.dateISO || t.date);
      return (
        date >= cutoffDate &&
        (t.type === "expense" || (t.amount && t.amount < 0))
      );
    })
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const cashflow = recentIncome - recentExpenses;
  const daysInPeriod = days;
  const monthlyContribution = (cashflow / daysInPeriod) * 30;

  return Math.max(0, monthlyContribution);
}
