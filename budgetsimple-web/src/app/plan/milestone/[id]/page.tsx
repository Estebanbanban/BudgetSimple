"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getMilestone,
  getMilestoneProgress,
  updateMilestone,
  deleteMilestone,
  formatDate,
  type Milestone,
  type MilestoneProgress,
} from "@/lib/milestones-local";
import {
  calculateETA,
  calculateRequiredContribution,
} from "@/lib/milestone-projection";
import MilestoneGraph from "@/components/milestone-graph";
import MilestoneLevers from "@/components/milestone-levers";
import { readPlanSettings, writePlanSettings, type ContributionMode } from "@/lib/plan-settings";
import { formatMoney } from "@/lib/money";
import { showToast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { KebabMenu, MenuItem } from "@/components/ui/menu";

export default function MilestoneDrilldownPage() {
  const params = useParams();
  const router = useRouter();
  const milestoneId = params?.id as string;

  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [progress, setProgress] = useState<MilestoneProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingNetWorth, setStartingNetWorth] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("USD");
  const [annualReturn, setAnnualReturn] = useState<number>(0.07);
  const [contributionMode, setContributionMode] = useState<ContributionMode>("auto");
  const [manualMonthlyContribution, setManualMonthlyContribution] = useState<number>(0);
  const [autoMonthlyContribution, setAutoMonthlyContribution] = useState<number>(0);
  const [contributionHistory, setContributionHistory] = useState<
    Array<{ month: string; amount: number }>
  >([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (!milestoneId) {
        setLoading(false);
        return;
      }

      // Ensure we're on the client side
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      // Wait a bit to ensure runtime is initialized (but don't wait forever)
      let retries = 0;
      while (!(window as any).budgetsimpleRuntime && retries < 20) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }

      if (!(window as any).budgetsimpleRuntime) {
        console.warn("Runtime not available, milestone data may be limited");
      }

      const ms = await getMilestone(milestoneId);
      if (!ms) {
        router.push("/plan");
        setLoading(false);
        return;
      }

      setMilestone(ms);
      const prog = await getMilestoneProgress(ms);
      if (!prog) {
        console.error("Failed to calculate milestone progress");
        // Still set milestone even if progress fails
        setProgress({
          milestone: ms,
          currentValue: 0,
          targetValue: ms.target_value,
          progressPercent: 0,
          remaining: ms.target_value,
          status: "no_data",
        });
        setLoading(false);
        return;
      }
      setProgress(prog);

      // Load saved assumptions from localStorage first (like plan page does)
      const settings = readPlanSettings();
      setStartingNetWorth(settings.startingNetWorth);
      setCurrency(settings.currency);
      setAnnualReturn(settings.annualReturn);
      setContributionMode(settings.contributionMode);
      setManualMonthlyContribution(settings.manualMonthlyContribution);

      // Load financial data (only if runtime is available)
      const runtime = (window as any).budgetsimpleRuntime;
      if (runtime) {
        // Calculate monthly contribution
        let transactions: any[] = [];
        let income: any[] = [];
        try {
          transactions = runtime.transactions?.() || [];
          income = runtime.income?.() || [];
        } catch (dataError) {
          console.error("Error getting transactions/income:", dataError);
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const inMonth = (d: string) => {
          const date = new Date(d);
          return date >= monthStart && date <= monthEnd;
        };

        const lastMonthIncome = income
          .filter((i: any) => inMonth(i.dateISO || i.date))
          .reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

        const lastMonthExpenses = transactions
          .filter((t: any) => {
            const dateISO = t.dateISO || t.date;
            return (
              inMonth(dateISO) &&
              (t.type === "expense" || (t.amount && t.amount < 0))
            );
          })
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);

        const autoContrib = Math.max(0, lastMonthIncome - lastMonthExpenses);
        setAutoMonthlyContribution(autoContrib);

        // Calculate contribution history (last 12 months)
        const history: Array<{ month: string; amount: number }> = [];
        for (let i = 11; i >= 0; i--) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - i);
          const monthStart = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            1
          );
          const monthEnd = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth() + 1,
            0
          );

          const monthIncome = income
            .filter((inc: any) => {
              const date = new Date(inc.dateISO || inc.date);
              return date >= monthStart && date <= monthEnd;
            })
            .reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);

          const monthExpenses = transactions
            .filter((t: any) => {
              const date = new Date(t.dateISO || t.date);
              return (
                date >= monthStart &&
                date <= monthEnd &&
                (t.type === "expense" || (t.amount && t.amount < 0))
              );
            })
            .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);

          history.push({
            month: monthDate.toISOString().slice(0, 7),
            amount: Math.max(0, monthIncome - monthExpenses),
          });
        }
        setContributionHistory(history);

        // Seed starting net worth from a simple estimate if user hasn't set it yet.
        if (!settings.startingNetWorth || settings.startingNetWorth === 0) {
          const totalIncome = income.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
          const totalExpenses = transactions
            .filter((t: any) => t.type === "expense" || (t.amount && t.amount < 0))
            .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);
          const estimatedNW = Math.max(0, totalIncome - totalExpenses);
          if (estimatedNW > 0) setStartingNetWorth(estimatedNW);
        }
      }
    } catch (error) {
      console.error("Error loading milestone data:", error);
    } finally {
      setLoading(false);
    }
  }, [milestoneId, router]);

  useEffect(() => {
    if (milestoneId) {
      loadData();
    }
  }, [milestoneId, loadData]);

  const effectiveContribution = contributionMode === "auto" ? autoMonthlyContribution : manualMonthlyContribution;

  if (loading) {
    return (
      <section className="view" data-view="plan">
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "14px", color: "#64748b" }}>
            Loading milestone...
          </div>
        </div>
      </section>
    );
  }

  if (!milestone) {
    if (!loading) {
      return (
        <section className="view" data-view="plan">
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "16px",
              }}
            >
              Milestone not found
            </div>
            <ButtonLink href="/plan" variant="accent">
              Back to Plan
            </ButtonLink>
          </div>
        </section>
      );
    }
    return null;
  }

  // Create a default progress if it doesn't exist
  const safeProgress: MilestoneProgress = progress || {
    milestone,
    currentValue: 0,
    targetValue: milestone.target_value,
    progressPercent: 0,
    remaining: milestone.target_value,
    status: "no_data" as const,
  };

  const requiredContribution = milestone.target_date
    ? calculateRequiredContribution(
        startingNetWorth,
        milestone.target_value,
        milestone.target_date,
        annualReturn
      )
    : null;

  const gap =
    requiredContribution && effectiveContribution
      ? requiredContribution - effectiveContribution
      : null;

  const eta = calculateETA(
    {
      currentNetWorth: startingNetWorth,
      monthlyContribution: effectiveContribution,
      annualReturn,
      monthsToProject: 120,
    },
    milestone.target_value
  );

  const insight = useMemo(() => {
    const months = contributionHistory.filter((h) => Number.isFinite(h.amount));
    if (months.length < 3) return null;
    const avg = months.reduce((s, h) => s + h.amount, 0) / months.length;
    const positive = months.filter((h) => h.amount > 0).length;
    if (avg === 0) return "No consistent contributions detected yet.";
    const consistency = Math.round((positive / months.length) * 100);
    return `Average contribution ${formatMoney(avg, currency)}/mo • ${consistency}% of months positive.`;
  }, [contributionHistory, currency]);

  return (
    <section className="view" data-view="plan">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space)" }}>
        <div className="page-head">
          <div>
            <ButtonLink href="/plan" variant="quiet">
              ← Back to Plan
            </ButtonLink>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <h1 style={{ margin: 0 }}>{milestone.label}</h1>
              <Badge
                tone={
                  safeProgress.status === "ahead"
                    ? "success"
                    : safeProgress.status === "on_track"
                    ? "info"
                    : safeProgress.status === "behind"
                    ? "warning"
                    : "neutral"
                }
              >
                {safeProgress.status === "ahead"
                  ? "Ahead"
                  : safeProgress.status === "on_track"
                  ? "On track"
                  : safeProgress.status === "behind"
                  ? "Behind"
                  : "No data"}
              </Badge>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Target: <b>{formatMoney(milestone.target_value, currency)}</b>
              {milestone.target_date ? ` by ${formatDate(milestone.target_date)}` : ""}
              {eta?.date ? ` • ETA: ${formatDate(eta.date)}` : ""}
            </div>
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button
              variant="quiet"
              type="button"
              onClick={async () => {
                const label = prompt("Edit milestone name:", milestone.label);
                if (label && label !== milestone.label) {
                  await updateMilestone(milestone.id, { label });
                  await loadData();
                  showToast("Saved", "success");
                }
              }}
            >
              Edit
            </Button>
            <KebabMenu label="More actions">
              <MenuItem
                onClick={async () => {
                  const { createMilestone } = await import("@/lib/milestones-local");
                  await createMilestone({
                    label: `${milestone.label} (Copy)`,
                    targetValue: milestone.target_value,
                    targetDate: milestone.target_date,
                    type: milestone.type,
                    displayOrder: 999,
                  });
                  showToast("Milestone duplicated", "success");
                  router.push("/plan");
                }}
              >
                Duplicate
              </MenuItem>
              <MenuItem
                danger
                onClick={async () => {
                  if (!confirm("Delete this milestone?")) return;
                  await deleteMilestone(milestone.id);
                  showToast("Milestone deleted", "danger");
                  router.push("/plan");
                }}
              >
                Delete
              </MenuItem>
            </KebabMenu>
          </div>
        </div>

        <MilestoneGraph
          currentNetWorth={startingNetWorth}
          monthlyContribution={effectiveContribution}
          annualReturn={annualReturn}
          currency={currency}
          focusMilestone={{
            id: milestone.id,
            label: milestone.label,
            targetValue: milestone.target_value,
            targetDate: milestone.target_date,
          }}
        />

        <div className="plan-metrics">
          <div className="plan-metric">
            <div className="plan-metric-label">Current net worth</div>
            <div className="plan-metric-value">{formatMoney(startingNetWorth, currency)}</div>
          </div>
          <div className="plan-metric">
            <div className="plan-metric-label">Required / mo</div>
            <div className="plan-metric-value">
              {requiredContribution !== null ? `${formatMoney(requiredContribution, currency)}/mo` : "—"}
            </div>
          </div>
          <div className="plan-metric">
            <div className="plan-metric-label">Current / mo</div>
            <div className="plan-metric-value">{formatMoney(effectiveContribution, currency)}/mo</div>
          </div>
          <div className="plan-metric">
            <div className="plan-metric-label">Gap</div>
            <div className="plan-metric-value" style={{ color: gap && gap > 0 ? "var(--danger)" : undefined }}>
              {gap !== null ? (gap > 0 ? `+${formatMoney(gap, currency)}/mo` : "On pace") : "—"}
            </div>
          </div>
          <div className="plan-metric">
            <div className="plan-metric-label">ETA (current pace)</div>
            <div className="plan-metric-value">{eta?.date ? (formatDate(eta.date) ?? "—") : "—"}</div>
          </div>
        </div>

        <MilestoneLevers
          currentNetWorth={startingNetWorth}
          monthlyContribution={effectiveContribution}
          annualReturn={annualReturn}
          currency={currency}
          milestone={{
            id: milestone.id,
            label: milestone.label,
            targetValue: milestone.target_value,
            targetDate: milestone.target_date,
          }}
          onContributionChange={(amount) => {
            setContributionMode("manual");
            setManualMonthlyContribution(amount);
            writePlanSettings({ contributionMode: "manual", manualMonthlyContribution: amount });
            showToast("Saved", "success");
          }}
          onDateChange={async (date) => {
            await updateMilestone(milestone.id, { targetDate: date });
            await loadData();
            showToast("Saved", "success");
          }}
        />

        {contributionHistory.length > 0 ? (
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Contribution history</div>
                <div className="panel-sub">Last 12 months (net cashflow estimate).</div>
              </div>
            </div>
            <div className="panel-body">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110 }}>
                {contributionHistory.map((h, idx) => {
                  const max = Math.max(...contributionHistory.map((x) => x.amount), 1);
                  const height = max > 0 ? (h.amount / max) * 100 : 0;
                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(6, height)}%`,
                          borderRadius: "8px 8px 10px 10px",
                          background: h.amount > 0 ? "rgba(31,111,235,0.82)" : "rgba(229,72,77,0.72)",
                        }}
                        title={`${h.month}: ${formatMoney(h.amount, currency)}`}
                      />
                      <div className="small muted" style={{ marginTop: 6, fontSize: 10 }}>
                        {new Date(h.month + "-01").toLocaleDateString("en-US", { month: "short" })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {insight ? <div className="panel-note">{insight}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
