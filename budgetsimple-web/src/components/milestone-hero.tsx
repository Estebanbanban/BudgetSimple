/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { calculateETA, calculateRequiredContribution } from "@/lib/milestone-projection";
import { formatMoney } from "@/lib/money";
import { formatDate, type MilestoneProgress } from "@/lib/milestones-local";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export default function MilestoneHero({
  progress,
  startingNetWorth,
  monthlyContribution,
  annualReturn,
  currency = "USD",
  onEdit,
  onAdd,
}: {
  progress: MilestoneProgress | null;
  startingNetWorth: number;
  monthlyContribution: number;
  annualReturn: number;
  currency?: string;
  onEdit?: () => void;
  onAdd?: () => void;
}) {
  if (!progress) {
    return (
      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Next milestone</div>
            <div className="panel-sub">Add a milestone to start tracking progress.</div>
          </div>
          <div className="panel-actions">
            <button className="btn btn-accent" type="button" onClick={onAdd}>
              Add milestone
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div className="chart-empty">Your milestones will appear here once created.</div>
        </div>
      </div>
    );
  }

  const status =
    progress.status === "ahead"
      ? { label: "Ahead", tone: "success" as const }
      : progress.status === "on_track"
      ? { label: "On track", tone: "info" as const }
      : progress.status === "behind"
      ? { label: "Behind", tone: "warning" as const }
      : { label: "No data", tone: "neutral" as const };

  const requiredContribution = progress.milestone.target_date
    ? calculateRequiredContribution(
        startingNetWorth,
        progress.targetValue,
        progress.milestone.target_date,
        annualReturn
      )
    : null;

  const gap =
    requiredContribution !== null ? Math.max(0, requiredContribution - monthlyContribution) : null;

  const eta = calculateETA(
    {
      currentNetWorth: startingNetWorth,
      monthlyContribution,
      annualReturn,
      monthsToProject: 120,
    },
    progress.targetValue
  );

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Next milestone</div>
          <div className="panel-sub">
            {progress.milestone.label} • Target {formatMoney(progress.targetValue, currency)}
            {progress.milestone.target_date ? ` by ${formatDate(progress.milestone.target_date)}` : ""}
          </div>
        </div>
        <div className="panel-actions">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <div className="panel-body">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="progress" aria-label="Milestone progress">
              <div style={{ width: `${Math.min(100, Math.max(0, progress.progressPercent))}%` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span className="small muted">{formatMoney(progress.currentValue, currency)}</span>
              <span className="small muted">{formatMoney(progress.targetValue, currency)}</span>
            </div>
          </div>

          <div className="plan-metrics">
            <div className="plan-metric">
              <div className="plan-metric-label">Current net worth</div>
              <div className="plan-metric-value">{formatMoney(startingNetWorth, currency)}</div>
            </div>
            <div className="plan-metric">
              <div className="plan-metric-label">Required / mo</div>
              <div className="plan-metric-value">
                {requiredContribution !== null ? `${formatMoney(requiredContribution, currency)}` : "—"}
              </div>
            </div>
            <div className="plan-metric">
              <div className="plan-metric-label">Current / mo</div>
              <div className="plan-metric-value">{formatMoney(monthlyContribution, currency)}</div>
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

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <ButtonLink variant="accent" href={`/plan/milestone/${progress.milestone.id}`}>
              View details
            </ButtonLink>
            <button className="btn btn-quiet" type="button" onClick={onEdit}>
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

