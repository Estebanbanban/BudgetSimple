"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getMilestone,
  getMilestoneProgress,
  updateMilestone,
  deleteMilestone,
  formatCurrency,
  formatDate,
  type Milestone,
  type MilestoneProgress,
} from "@/lib/milestones-local";
import {
  generateProjectionCurves,
  calculateETA,
  calculateRequiredContribution,
  calculateSensitivity,
  type ProjectionInputs,
  type ProjectionCurve,
} from "@/lib/milestone-projection";
import MilestoneGraph from "@/components/milestone-graph";
import MilestoneLevers from "@/components/milestone-levers";
import {
  showContributionModal,
  showDateModal,
} from "@/lib/plan-assumptions-modal";
import WhatChangedSection from "./what-changed-section";
import AdviceCardsSection from "./advice-cards-section";
import HistorySection from "./history-section";

export default function MilestoneDrilldownPage() {
  const params = useParams();
  const router = useRouter();
  const milestoneId = (params?.id as string) || null;

  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [progress, setProgress] = useState<MilestoneProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [netWorth, setNetWorth] = useState<number>(0);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);
  const [annualReturn, setAnnualReturn] = useState<number>(0.07);
  const [contributionMode, setContributionMode] = useState<"auto" | "manual">(
    "auto"
  );
  const [manualContribution, setManualContribution] = useState<number>(0);
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
      try {
        const CONFIG_KEY = "budgetsimple:v1";
        const raw = localStorage.getItem(CONFIG_KEY);
        if (raw) {
          const config = JSON.parse(raw);
          if (config?.settings) {
            setNetWorth(config.settings.netWorthManual || 0);
            setAnnualReturn(config.settings.planAnnualReturn || 0.07);
            setContributionMode(config.settings.planContributionMode || "auto");
            setManualContribution(config.settings.planManualContribution || 0);
          }
        }
      } catch (configError) {
        console.error("Error loading config from localStorage:", configError);
      }

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

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentIncome = income
          .filter((i: any) => {
            const date = new Date(i.dateISO || i.date);
            return date >= thirtyDaysAgo;
          })
          .reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

        const recentExpenses = transactions
          .filter((t: any) => {
            const date = new Date(t.dateISO || t.date);
            return (
              date >= thirtyDaysAgo &&
              (t.type === "expense" || (t.amount && t.amount < 0))
            );
          })
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);

        const cashflow = recentIncome - recentExpenses;
        const autoContrib = Math.max(0, (cashflow / 30) * 30);
        const effectiveContrib =
          contributionMode === "auto" ? autoContrib : manualContribution;
        setMonthlyContribution(effectiveContrib);

        // Calculate contribution history (last 6 months)
        const history: Array<{ month: string; amount: number }> = [];
        for (let i = 5; i >= 0; i--) {
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
      }
    } catch (error) {
      console.error("Error loading milestone data:", error);
    } finally {
      setLoading(false);
    }
  }, [milestoneId, router]);

  useEffect(() => {
    if (milestoneId && typeof window !== "undefined") {
      loadData();
    } else if (!milestoneId && typeof window !== "undefined") {
      // If no milestone ID, redirect to plan page
      router.push("/plan");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestoneId]);

  const effectiveContribution =
    contributionMode === "auto" ? monthlyContribution : manualContribution;

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
            <Link
              href="/plan"
              className="btn btn-accent"
              style={{ textDecoration: "none" }}
            >
              Back to Plan
            </Link>
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

  let requiredContribution: number | null = null;
  try {
    requiredContribution = milestone.target_date
      ? calculateRequiredContribution(
          netWorth,
          milestone.target_value,
          milestone.target_date,
          annualReturn
        )
      : null;
  } catch (error) {
    console.error("Error calculating required contribution:", error);
  }

  const gap =
    requiredContribution && effectiveContribution
      ? requiredContribution - effectiveContribution
      : null;

  let eta: { month: number; date: string } | null = null;
  try {
    eta = calculateETA(
      {
        currentNetWorth: netWorth,
        monthlyContribution: effectiveContribution,
        annualReturn,
        monthsToProject: 120,
      },
      milestone.target_value
    );
  } catch (error) {
    console.error("Error calculating ETA:", error);
  }

  const inputs: ProjectionInputs = {
    currentNetWorth: netWorth,
    monthlyContribution: effectiveContribution,
    annualReturn,
    monthsToProject: 120,
  };

  let sensitivityPlus100: { monthsEarlier: number } | null = null;
  let sensitivityMinus100: { monthsEarlier: number } | null = null;
  let sensitivityReturnPlus1: { monthsEarlier: number } | null = null;

  try {
    sensitivityPlus100 = calculateSensitivity(
      inputs,
      milestone.target_value,
      100
    );
    sensitivityMinus100 = calculateSensitivity(
      inputs,
      milestone.target_value,
      -100
    );
    sensitivityReturnPlus1 = calculateSensitivity(
      { ...inputs, annualReturn: annualReturn + 0.01 },
      milestone.target_value,
      0
    );
  } catch (error) {
    console.error("Error calculating sensitivity:", error);
  }

  // Calculate contribution consistency
  const positiveMonths = contributionHistory.filter((h) => h.amount > 0).length;
  const consistencyScore =
    contributionHistory.length > 0
      ? (positiveMonths / contributionHistory.length) * 100
      : 0;
  const bestMonth =
    contributionHistory.length > 0
      ? Math.max(...contributionHistory.map((h) => h.amount))
      : 0;
  const worstMonth =
    contributionHistory.length > 0
      ? Math.min(...contributionHistory.map((h) => h.amount))
      : 0;
  const avgContribution =
    contributionHistory.length > 0
      ? contributionHistory.reduce((sum, h) => sum + h.amount, 0) /
        contributionHistory.length
      : 0;
  const contributionStdDev =
    contributionHistory.length > 0
      ? Math.sqrt(
          contributionHistory.reduce(
            (sum, h) => sum + Math.pow(h.amount - avgContribution, 2),
            0
          ) / contributionHistory.length
        )
      : 0;
  const isVolatile = contributionStdDev > avgContribution * 0.3;

  return (
    <section className="view" data-view="plan">
      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 10,
            padding: "1.5rem 0",
            marginBottom: "1.5rem",
            borderBottom: "2px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <div style={{ flex: 1 }}>
              <Link
                href="/plan"
                className="btn btn-quiet btn-sm"
                style={{
                  textDecoration: "none",
                  marginBottom: "12px",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ← Back to Plan
              </Link>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                }}
              >
                <h1
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    margin: 0,
                    lineHeight: "1.2",
                  }}
                >
                  {milestone.label}
                </h1>
                <div
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    background:
                      safeProgress.status === "ahead" ||
                      safeProgress.status === "on_track"
                        ? "#ecfdf5"
                        : safeProgress.status === "behind"
                        ? "#fffbeb"
                        : "#f1f5f9",
                    color:
                      safeProgress.status === "ahead" ||
                      safeProgress.status === "on_track"
                        ? "#065f46"
                        : safeProgress.status === "behind"
                        ? "#92400e"
                        : "#475569",
                    border: `1px solid ${
                      safeProgress.status === "ahead" ||
                      safeProgress.status === "on_track"
                        ? "#a7f3d0"
                        : safeProgress.status === "behind"
                        ? "#fde68a"
                        : "#cbd5e1"
                    }`,
                  }}
                >
                  {safeProgress.status === "ahead"
                    ? "Ahead of schedule"
                    : safeProgress.status === "on_track"
                    ? "On track"
                    : safeProgress.status === "behind"
                    ? "Behind schedule"
                    : "No data"}
                </div>
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                Target:{" "}
                <strong style={{ color: "#1f2933" }}>
                  {formatCurrency(milestone.target_value)}
                </strong>
                {milestone.target_date &&
                  ` by ${formatDate(milestone.target_date)}`}
                {eta && (
                  <>
                    {" • "}
                    <span style={{ color: "#059669", fontWeight: "600" }}>
                      ETA: {formatDate(eta.date)}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-sm"
                onClick={async () => {
                  const label = prompt(
                    "Edit milestone label:",
                    milestone.label
                  );
                  if (label && label !== milestone.label) {
                    await updateMilestone(milestone.id, { label });
                    await loadData();
                  }
                }}
                style={{ textDecoration: "none" }}
              >
                Edit
              </button>
              <button
                className="btn btn-sm btn-quiet"
                onClick={async () => {
                  if (confirm("Duplicate this milestone?")) {
                    const { createMilestone } = await import(
                      "@/lib/milestones-local"
                    );
                    await createMilestone({
                      label: `${milestone.label} (Copy)`,
                      targetValue: milestone.target_value,
                      targetDate: milestone.target_date,
                      type: milestone.type,
                      displayOrder: 999,
                    });
                    router.push("/plan");
                  }
                }}
                style={{ textDecoration: "none" }}
              >
                Duplicate
              </button>
              <button
                className="btn btn-sm btn-quiet"
                onClick={async () => {
                  if (
                    confirm("Are you sure you want to delete this milestone?")
                  ) {
                    await deleteMilestone(milestone.id);
                    router.push("/plan");
                  }
                }}
                style={{ textDecoration: "none", color: "#dc2626" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Section A: At a glance tiles */}
        <div>
          <div style={{ marginBottom: "12px" }}>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: "600",
                margin: 0,
                color: "#1f2933",
              }}
            >
              At a glance
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                margin: "4px 0 0 0",
              }}
            >
              Key metrics for this milestone
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <div
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
                boxShadow:
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginBottom: "8px",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Current Net Worth
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#1f2933",
                  lineHeight: "1.2",
                }}
              >
                {formatCurrency(netWorth)}
              </div>
            </div>

            <div
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
                boxShadow:
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginBottom: "8px",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Progress
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#1f2933",
                  marginBottom: "6px",
                  lineHeight: "1.2",
                }}
              >
                {safeProgress.progressPercent.toFixed(1)}%
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: "500",
                }}
              >
                {formatCurrency(
                  milestone.target_value - safeProgress.currentValue
                )}{" "}
                remaining
              </div>
            </div>

            <div
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
                boxShadow:
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginBottom: "8px",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                ETA (base)
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#1f2933",
                  lineHeight: "1.2",
                }}
              >
                {eta ? formatDate(eta.date) : "--"}
              </div>
            </div>

            {requiredContribution && (
              <div
                style={{
                  background: gap && gap > 0 ? "#fef2f2" : "#f0fdf4",
                  border: `2px solid ${gap && gap > 0 ? "#fecaca" : "#a7f3d0"}`,
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow:
                    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)";
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "8px",
                    fontWeight: "500",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Required monthly
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: gap && gap > 0 ? "#dc2626" : "#059669",
                    marginBottom: "6px",
                    lineHeight: "1.2",
                  }}
                >
                  {formatCurrency(requiredContribution)}/mo
                </div>
                {gap !== null && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: gap > 0 ? "#dc2626" : "#059669",
                      fontWeight: "600",
                    }}
                  >
                    {gap > 0
                      ? `+${formatCurrency(gap)}/mo short`
                      : `${formatCurrency(Math.abs(gap))}/mo ahead`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section B: Projection chart */}
        <div
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "4px",
              }}
            >
              Net Worth Projection
            </div>
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              Based on monthly compounding + contributions
            </div>
          </div>

          {netWorth === 0 && effectiveContribution === 0 ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px dashed #cbd5e1",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  marginBottom: "16px",
                }}
              >
                Set your assumptions to see the projection
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {netWorth === 0 && (
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      // Scroll to assumptions section
                      document
                        .getElementById("assumptions-section")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    style={{ textDecoration: "none" }}
                  >
                    Set starting net worth
                  </button>
                )}
                {effectiveContribution === 0 && (
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      document
                        .getElementById("assumptions-section")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    style={{ textDecoration: "none" }}
                  >
                    Set contribution
                  </button>
                )}
              </div>
            </div>
          ) : (
            <MilestoneGraph
              currentNetWorth={netWorth}
              monthlyContribution={effectiveContribution}
              annualReturn={annualReturn}
              milestone={{
                target_value: milestone.target_value,
                target_date: milestone.target_date,
              }}
            />
          )}
        </div>

        {/* Section C: Assumptions & Contribution Engine */}
        <div
          id="assumptions-section"
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "4px",
              }}
            >
              Assumptions & Contribution
            </div>
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              Control panel for your projection
            </div>
          </div>

          {/* Starting Net Worth Input */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#475569",
                  marginBottom: "6px",
                  fontWeight: "500",
                }}
              >
                Starting Net Worth <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={netWorth}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setNetWorth(val);
                  // Save to config
                  if (
                    typeof window !== "undefined" &&
                    (window as any).budgetsimpleRuntime
                  ) {
                    const runtime = (window as any).budgetsimpleRuntime;
                    const config = runtime.config?.() || runtime.getConfig?.();
                    if (config?.settings) {
                      config.settings.netWorthManual = val;
                      if (runtime.saveConfig) {
                        runtime.saveConfig();
                      }
                    }
                  }
                }}
                className="input"
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                }}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#475569",
                  marginBottom: "6px",
                  fontWeight: "500",
                }}
              >
                Annual Return (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={(annualReturn * 100).toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAnnualReturn(val / 100);
                  // Save to config
                  if (
                    typeof window !== "undefined" &&
                    (window as any).budgetsimpleRuntime
                  ) {
                    const runtime = (window as any).budgetsimpleRuntime;
                    const config = runtime.config?.() || runtime.getConfig?.();
                    if (config?.settings) {
                      config.settings.planAnnualReturn = val / 100;
                      if (runtime.saveConfig) {
                        runtime.saveConfig();
                      }
                    }
                  }
                }}
                className="input"
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                }}
                placeholder="7.00"
              />
            </div>
          </div>

          {/* Contribution Mode Selector */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "#475569",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              Contribution Mode
            </label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${
                    contributionMode === "auto" ? "#2563eb" : "#e2e8f0"
                  }`,
                  background: contributionMode === "auto" ? "#eff6ff" : "white",
                  flex: 1,
                }}
              >
                <input
                  type="radio"
                  name="contributionMode"
                  value="auto"
                  checked={contributionMode === "auto"}
                  onChange={(e) => {
                    setContributionMode("auto");
                    // Save to config
                    if (
                      typeof window !== "undefined" &&
                      (window as any).budgetsimpleRuntime
                    ) {
                      const runtime = (window as any).budgetsimpleRuntime;
                      const config =
                        runtime.config?.() || runtime.getConfig?.();
                      if (config?.settings) {
                        config.settings.planContributionMode = "auto";
                        if (runtime.saveConfig) {
                          runtime.saveConfig();
                        }
                      }
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: contributionMode === "auto" ? "500" : "400",
                  }}
                >
                  Auto from cashflow
                </span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${
                    contributionMode === "manual" ? "#2563eb" : "#e2e8f0"
                  }`,
                  background:
                    contributionMode === "manual" ? "#eff6ff" : "white",
                  flex: 1,
                }}
              >
                <input
                  type="radio"
                  name="contributionMode"
                  value="manual"
                  checked={contributionMode === "manual"}
                  onChange={(e) => {
                    setContributionMode("manual");
                    // Save to config
                    if (
                      typeof window !== "undefined" &&
                      (window as any).budgetsimpleRuntime
                    ) {
                      const runtime = (window as any).budgetsimpleRuntime;
                      const config =
                        runtime.config?.() || runtime.getConfig?.();
                      if (config?.settings) {
                        config.settings.planContributionMode = "manual";
                        if (runtime.saveConfig) {
                          runtime.saveConfig();
                        }
                      }
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: contributionMode === "manual" ? "500" : "400",
                  }}
                >
                  Manual fixed amount
                </span>
              </label>
            </div>

            {/* Current Contribution Estimate (Auto mode) */}
            {contributionMode === "auto" && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "#f0fdf4",
                  borderRadius: "6px",
                  border: "1px solid #a7f3d0",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  Current estimate (from transactions)
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#059669",
                  }}
                >
                  {formatCurrency(monthlyContribution)}/mo
                </div>
              </div>
            )}

            {/* Manual Contribution Input (Manual mode) */}
            {contributionMode === "manual" && (
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#475569",
                    marginBottom: "6px",
                    fontWeight: "500",
                  }}
                >
                  Monthly Contribution{" "}
                  <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualContribution || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setManualContribution(val);
                    // Save to config
                    if (
                      typeof window !== "undefined" &&
                      (window as any).budgetsimpleRuntime
                    ) {
                      const runtime = (window as any).budgetsimpleRuntime;
                      const config =
                        runtime.config?.() || runtime.getConfig?.();
                      if (config?.settings) {
                        config.settings.planManualContribution = val;
                        if (runtime.saveConfig) {
                          runtime.saveConfig();
                        }
                      }
                    }
                  }}
                  className="input"
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                  }}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Contribution History Chart */}
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              Contribution History (Last 6 Months)
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "4px",
                height: "100px",
                marginBottom: "8px",
                padding: "8px",
                background: "#f8fafc",
                borderRadius: "8px",
              }}
            >
              {contributionHistory.length > 0 ? (
                contributionHistory.map((h, idx) => {
                  const maxAmount = Math.max(
                    ...contributionHistory.map((h) => h.amount),
                    1
                  );
                  const height =
                    maxAmount > 0 ? (h.amount / maxAmount) * 100 : 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(height, 4)}%`,
                          minHeight: "4px",
                          background: h.amount > 0 ? "#2563eb" : "#ef4444",
                          borderRadius: "4px 4px 0 0",
                          marginBottom: "4px",
                          transition: "height 0.3s ease",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "9px",
                          color: "#64748b",
                          whiteSpace: "nowrap",
                          transform: "rotate(-45deg)",
                          transformOrigin: "center",
                        }}
                      >
                        {new Date(h.month + "-01").toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    fontSize: "12px",
                    color: "#64748b",
                    padding: "2rem 0",
                  }}
                >
                  No contribution history yet
                </div>
              )}
            </div>
          </div>

          {/* Contribution Insights */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              marginTop: "12px",
            }}
          >
            {isVolatile && (
              <div
                style={{
                  padding: "12px",
                  background: "#fffbeb",
                  borderRadius: "8px",
                  border: "1px solid #fde68a",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#92400e",
                    marginBottom: "4px",
                  }}
                >
                  ⚠️ High Volatility
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  Your contributions vary a lot (σ ={" "}
                  {formatCurrency(contributionStdDev)}) → ETA uncertainty
                </div>
              </div>
            )}
            <div
              style={{
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginBottom: "4px",
                }}
              >
                Best Month
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#059669",
                }}
              >
                +{formatCurrency(bestMonth)}
              </div>
            </div>
            <div
              style={{
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginBottom: "4px",
                }}
              >
                Worst Month
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: worstMonth < 0 ? "#dc2626" : "#64748b",
                }}
              >
                {worstMonth < 0
                  ? formatCurrency(worstMonth)
                  : `+${formatCurrency(worstMonth)}`}
              </div>
            </div>
            <div
              style={{
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginBottom: "4px",
                }}
              >
                Consistency Score
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color:
                    consistencyScore >= 80
                      ? "#059669"
                      : consistencyScore >= 60
                      ? "#f59e0b"
                      : "#dc2626",
                }}
              >
                {consistencyScore.toFixed(0)}%
              </div>
              <div
                style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}
              >
                {positiveMonths} of {contributionHistory.length} months positive
              </div>
            </div>
          </div>
        </div>

        {/* Section D: What should I change? (Levers) */}
        <MilestoneLevers
          currentNetWorth={netWorth}
          monthlyContribution={effectiveContribution}
          annualReturn={annualReturn}
          milestone={{
            id: milestone.id,
            label: milestone.label,
            target_value: milestone.target_value,
            target_date: milestone.target_date,
          }}
          onContributionChange={(amount) => {
            setManualContribution(amount);
            setContributionMode("manual");
            setMonthlyContribution(amount);
          }}
          onDateChange={async (date) => {
            const { updateMilestone } = await import("@/lib/milestones-local");
            await updateMilestone(milestone.id, { targetDate: date });
            await loadData();
          }}
        />

        {/* Section E: Why did my ETA change? (Drivers) */}
        <WhatChangedSection
          milestone={milestone}
          currentETA={eta}
          currentContribution={effectiveContribution}
          currentReturn={annualReturn}
          currentNetWorth={netWorth}
        />

        {/* Section F: Advice Cards */}
        <AdviceCardsSection
          milestone={milestone}
          monthlyContribution={effectiveContribution}
          requiredContribution={requiredContribution}
        />

        {/* Section G: Milestone History */}
        <HistorySection milestone={milestone} />
      </div>
    </section>
  );
}
