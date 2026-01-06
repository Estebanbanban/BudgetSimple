"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getNextMilestone,
  formatCurrency,
  formatDate,
  type MilestoneProgress,
} from "@/lib/milestones-local";
import {
  calculateETA,
  calculateRequiredContribution,
} from "@/lib/milestone-projection";

interface MilestoneHeroProps {
  currentNetWorth?: number;
  monthlyContribution?: number;
  annualReturn?: number;
}

export default function MilestoneHero({
  currentNetWorth: propNetWorth,
  monthlyContribution: propContribution,
  annualReturn: propReturn = 0.07,
}: MilestoneHeroProps) {
  // All hooks must be called at the top, before any conditional returns
  const router = useRouter();
  const [progress, setProgress] = useState<MilestoneProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [netWorth, setNetWorth] = useState<number | null>(propNetWorth ?? null);
  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(
    propContribution ?? null
  );
  const [annualReturn, setAnnualReturn] = useState<number>(propReturn);
  const [requiredContribution, setRequiredContribution] = useState<
    number | null
  >(null);
  const [eta, setEta] = useState<{ month: number; date: string } | null>(null);

  useEffect(() => {
    if (propNetWorth !== undefined) setNetWorth(propNetWorth);
    if (propContribution !== undefined)
      setMonthlyContribution(propContribution);
    if (propReturn !== undefined) setAnnualReturn(propReturn);
  }, [propNetWorth, propContribution, propReturn]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress) {
      calculateProjection();
    }
  }, [
    progress,
    propNetWorth,
    propContribution,
    propReturn,
    netWorth,
    monthlyContribution,
    annualReturn,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const next = await getNextMilestone();
      setProgress(next);

      // Load net worth from saved settings if not provided as prop
      if (propNetWorth === undefined && typeof window !== "undefined") {
        try {
          const CONFIG_KEY = "budgetsimple:v1";
          const raw = localStorage.getItem(CONFIG_KEY);
          if (raw) {
            const config = JSON.parse(raw);
            if (config?.settings?.netWorthManual !== undefined) {
              setNetWorth(config.settings.netWorthManual);
            } else {
              // Fallback: calculate from transactions
              if ((window as any).budgetsimpleRuntime) {
                const runtime = (window as any).budgetsimpleRuntime;
                const transactions = runtime.transactions() || [];
                const income = runtime.income() || [];

                const totalIncome = income.reduce(
                  (sum: number, i: any) => sum + (i.amount || 0),
                  0
                );
                const totalExpenses = transactions
                  .filter(
                    (t: any) =>
                      t.type === "expense" || (t.amount && t.amount < 0)
                  )
                  .reduce(
                    (sum: number, t: any) => sum + Math.abs(t.amount || 0),
                    0
                  );

                setNetWorth(Math.max(0, totalIncome - totalExpenses));
              }
            }
          }
        } catch (error) {
          console.error("Error loading net worth:", error);
        }
      }
    } catch (error) {
      console.error("Error loading milestone data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjection = () => {
    if (!progress) return;

    // Use props if available, otherwise use state
    const effectiveNetWorth =
      propNetWorth !== undefined ? propNetWorth : netWorth ?? 0;
    const effectiveContribution =
      propContribution !== undefined
        ? propContribution
        : monthlyContribution ?? 0;
    const effectiveReturn =
      propReturn !== undefined ? propReturn : annualReturn;

    if (effectiveNetWorth === null || effectiveContribution === null) return;

    const inputs = {
      currentNetWorth: effectiveNetWorth,
      monthlyContribution: effectiveContribution,
      annualReturn: effectiveReturn,
      monthsToProject: 120,
    };

    const etaResult = calculateETA(inputs, progress.targetValue);
    setEta(etaResult);

    if (progress.milestone.target_date) {
      const required = calculateRequiredContribution(
        effectiveNetWorth,
        progress.targetValue,
        progress.milestone.target_date,
        effectiveReturn
      );
      setRequiredContribution(required);
    } else {
      setRequiredContribution(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          padding: "1.25rem",
        }}
      >
        <div style={{ fontSize: "13px", color: "#64748b" }}>
          Loading milestone...
        </div>
      </div>
    );
  }

  if (!progress) {
    return null; // Empty state handled in parent
  }

  const progressPercent = Math.round(progress.progressPercent);
  const effectiveNetWorth =
    propNetWorth !== undefined ? propNetWorth : netWorth ?? 0;
  const effectiveContribution =
    propContribution !== undefined
      ? propContribution
      : monthlyContribution ?? 0;

  // Determine status
  let statusLabel = "No data";
  let statusBg = "#f1f5f9";
  let statusText = "#475569";
  let statusBorder = "#cbd5e1";

  if (effectiveNetWorth === 0 && effectiveContribution === 0) {
    statusLabel = "Set net worth";
  } else if (effectiveContribution === 0) {
    statusLabel = "Set contribution";
  } else {
    statusLabel =
      progress.status === "ahead"
        ? "Ahead of schedule"
        : progress.status === "on_track"
        ? "On track"
        : progress.status === "behind"
        ? "Behind schedule"
        : "On track";
    statusBg =
      progress.status === "ahead" || progress.status === "on_track"
        ? "#ecfdf5"
        : "#fffbeb";
    statusText =
      progress.status === "ahead" || progress.status === "on_track"
        ? "#065f46"
        : "#92400e";
    statusBorder =
      progress.status === "ahead" || progress.status === "on_track"
        ? "#a7f3d0"
        : "#fde68a";
  }

  const gap =
    requiredContribution && effectiveContribution
      ? Math.max(0, requiredContribution - effectiveContribution)
      : null;

  return (
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
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={(e) => {
        // Don't navigate if clicking on buttons
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.tagName === "BUTTON") {
          return;
        }
        router.push(`/plan/milestone/${progress.milestone.id}`);
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
        e.currentTarget.style.borderColor = "#cbd5e1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
        e.currentTarget.style.borderColor = "#e2e8f0";
      }}
    >
      {/* Header with title and status badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}
          >
            {progress.milestone.label}
          </div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>
            Target: {formatCurrency(progress.targetValue)}
            {progress.milestone.target_date &&
              ` by ${formatDate(progress.milestone.target_date)}`}
          </div>
        </div>
        <div
          style={{
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "600",
            background: statusBg,
            color: statusText,
            border: `1px solid ${statusBorder}`,
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel}
        </div>
      </div>

      {/* Status line under title */}
      {eta && effectiveNetWorth > 0 && effectiveContribution > 0 && (
        <div style={{ fontSize: "13px", color: "#64748b" }}>
          {progress.milestone.target_date &&
          requiredContribution &&
          gap &&
          gap > 0 ? (
            <>
              To hit {formatDate(progress.milestone.target_date)}: +
              {formatCurrency(gap)}/mo needed
            </>
          ) : eta ? (
            <>At current pace: ETA {formatDate(eta.date)}</>
          ) : null}
        </div>
      )}

      {/* Progress Bar - h-2.5 (10px), bg-blue-600, % label right-aligned */}
      <div>
        <div
          style={{
            width: "100%",
            height: "10px", // h-2.5
            backgroundColor: "#f1f5f9", // bg-slate-100
            borderRadius: "9999px", // rounded-full
            overflow: "hidden",
            marginBottom: "8px",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${Math.min(
                100,
                Math.max(0, progress.progressPercent || 0)
              )}%`,
              height: "100%",
              background:
                progressPercent >= 75
                  ? "#10b981" // Green for 75%+
                  : progressPercent >= 50
                  ? "#2563eb" // Blue for 50-74%
                  : progressPercent >= 25
                  ? "#f59e0b" // Amber for 25-49%
                  : progressPercent > 0
                  ? "#ef4444" // Red for <25%
                  : "#cbd5e1", // Gray for 0%
              borderRadius: "9999px",
              transition: "width 0.5s ease",
              position: "relative",
              minWidth: progressPercent > 0 ? "2px" : "0",
            }}
          >
            {progress.progressPercent > 5 && (
              <span
                style={{
                  position: "absolute",
                  right: "4px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "9px",
                  fontWeight: "600",
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                {progressPercent}%
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          <span style={{ fontWeight: "500" }}>
            {formatCurrency(progress.currentValue)}
          </span>
          <span style={{ fontWeight: "700", color: "#1f2933" }}>
            {progressPercent}%
          </span>
          <span style={{ fontWeight: "500" }}>
            {formatCurrency(progress.targetValue)}
          </span>
        </div>
      </div>

      {/* Three Key Numbers Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginTop: "8px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#64748b",
              marginBottom: "4px",
              fontWeight: "500",
            }}
          >
            Current Net Worth
          </div>
          <div
            style={{ fontSize: "18px", fontWeight: "700", color: "#1f2933" }}
          >
            {effectiveNetWorth > 0 ? formatCurrency(effectiveNetWorth) : "--"}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#64748b",
              marginBottom: "4px",
              fontWeight: "500",
            }}
          >
            ETA
          </div>
          <div
            style={{ fontSize: "18px", fontWeight: "700", color: "#1f2933" }}
          >
            {eta ? formatDate(eta.date) : "--"}
          </div>
        </div>
        {requiredContribution !== null && (
          <div>
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                marginBottom: "4px",
                fontWeight: "500",
              }}
            >
              Required Monthly
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: gap && gap > 0 ? "#dc2626" : "#059669",
              }}
            >
              {formatCurrency(requiredContribution)}/mo
            </div>
          </div>
        )}
      </div>

      {/* CTA Buttons */}
      <div
        style={{ display: "flex", gap: "8px", marginTop: "8px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href={`/plan/milestone/${progress.milestone.id}`}
          className="btn btn-accent"
          style={{ textDecoration: "none", cursor: "pointer" }}
        >
          View Details
        </Link>
        <button
          className="btn btn-quiet"
          style={{ textDecoration: "none", cursor: "pointer" }}
          onClick={() => {
            setTimeout(() => {
              const manager = document.querySelector(
                "[data-milestone-manager]"
              );
              if (manager) {
                manager.scrollIntoView({ behavior: "smooth", block: "start" });
                setTimeout(() => {
                  const editBtn = document.querySelector(
                    `[data-milestone-edit="${progress.milestone.id}"]`
                  ) as HTMLButtonElement;
                  if (editBtn) editBtn.click();
                }, 500);
              }
            }, 100);
          }}
        >
          Edit Milestone
        </button>
      </div>
    </div>
  );
}
