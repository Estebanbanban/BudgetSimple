/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useMemo, useState } from "react";
import { calculateRequiredContribution } from "@/lib/milestone-projection";
import { formatMoney } from "@/lib/money";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";

type Tab = "target" | "optimize";

interface MilestoneLeversProps {
  currentNetWorth: number;
  monthlyContribution: number;
  annualReturn: number;
  currency?: string;
  milestone: {
    id: string;
    label: string;
    targetValue: number;
    targetDate?: string;
  };
  onContributionChange?: (amount: number) => void;
  onDateChange?: (date: string) => void;
}

function addMonths(dateISO: string, deltaMonths: number) {
  const d = new Date(dateISO);
  const next = new Date(d.getFullYear(), d.getMonth() + deltaMonths, Math.min(d.getDate(), 28));
  return next.toISOString().split("T")[0];
}

export default function MilestoneLevers({
  currentNetWorth,
  monthlyContribution,
  annualReturn,
  currency = "USD",
  milestone,
  onContributionChange,
  onDateChange,
}: MilestoneLeversProps) {
  const [tab, setTab] = useState<Tab>("target");
  const [candidateDate, setCandidateDate] = useState<string>(milestone.targetDate || "");

  const requiredNow = useMemo(() => {
    if (!milestone.targetDate) return null;
    return calculateRequiredContribution(currentNetWorth, milestone.targetValue, milestone.targetDate, annualReturn);
  }, [currentNetWorth, milestone.targetValue, milestone.targetDate, annualReturn]);

  const gapNow = requiredNow !== null ? Math.max(0, requiredNow - monthlyContribution) : null;

  const requiredCandidate = useMemo(() => {
    if (!candidateDate) return null;
    return calculateRequiredContribution(currentNetWorth, milestone.targetValue, candidateDate, annualReturn);
  }, [currentNetWorth, milestone.targetValue, candidateDate, annualReturn]);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">What should I change?</div>
          <div className="panel-sub">Quick actions to get on track or move faster.</div>
        </div>
        <div className="panel-actions">
          <SegmentedControl<Tab>
            ariaLabel="Advice tabs"
            value={tab}
            onChange={setTab}
            options={[
              { value: "target", label: "Hit target date" },
              { value: "optimize", label: "Optimize faster" },
            ]}
          />
        </div>
      </div>

      <div className="panel-body">
        {tab === "target" ? (
          milestone.targetDate ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="plan-metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <div className="plan-metric">
                  <div className="plan-metric-label">Required monthly contribution</div>
                  <div className="plan-metric-value">
                    {requiredNow !== null ? `${formatMoney(requiredNow, currency)}/mo` : "—"}
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    To hit {new Date(milestone.targetDate).toLocaleDateString("en-US")}
                  </div>
                </div>
                <div className="plan-metric">
                  <div className="plan-metric-label">Your current monthly contribution</div>
                  <div className="plan-metric-value">{formatMoney(monthlyContribution, currency)}/mo</div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {gapNow && gapNow > 0 ? `Gap: +${formatMoney(gapNow, currency)}/mo` : "On pace"}
                  </div>
                </div>
              </div>

              <div className="row" style={{ justifyContent: "flex-end" }}>
                <Button
                  variant="accent"
                  type="button"
                  onClick={() => {
                    if (requiredNow === null) return;
                    onContributionChange?.(requiredNow);
                  }}
                  disabled={requiredNow === null}
                >
                  Set manual contribution
                </Button>
                <Button
                  variant="quiet"
                  type="button"
                  onClick={() => {
                    setTab("optimize");
                    setCandidateDate(milestone.targetDate || "");
                  }}
                >
                  Explore date options
                </Button>
              </div>
            </div>
          ) : (
            <div className="small muted">Set a target date to see required monthly contribution.</div>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!milestone.targetDate ? (
              <div className="small muted">Set a target date first to optimize it.</div>
            ) : (
              <>
                <div className="row" style={{ alignItems: "flex-end" }}>
                  <div style={{ flex: "1 1 260px" }}>
                    <label className="label" htmlFor="candidateTargetDate">
                      Target date
                    </label>
                    <input
                      id="candidateTargetDate"
                      className="input"
                      type="date"
                      value={candidateDate}
                      onChange={(e) => setCandidateDate(e.target.value)}
                    />
                    <div className="panel-note">Move the date and we’ll recompute the required monthly contribution.</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-quiet" type="button" onClick={() => setCandidateDate(addMonths(candidateDate, -12))}>
                      -1y
                    </button>
                    <button className="btn btn-quiet" type="button" onClick={() => setCandidateDate(addMonths(candidateDate, -6))}>
                      -6m
                    </button>
                    <button className="btn btn-quiet" type="button" onClick={() => setCandidateDate(addMonths(candidateDate, 6))}>
                      +6m
                    </button>
                    <button className="btn btn-quiet" type="button" onClick={() => setCandidateDate(addMonths(candidateDate, 12))}>
                      +1y
                    </button>
                  </div>
                </div>

                <div className="plan-metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <div className="plan-metric">
                    <div className="plan-metric-label">Required / mo (new date)</div>
                    <div className="plan-metric-value">
                      {requiredCandidate !== null ? `${formatMoney(requiredCandidate, currency)}/mo` : "—"}
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>
                      Compared to {formatMoney(monthlyContribution, currency)}/mo today
                    </div>
                  </div>
                </div>

                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <Button
                    variant="accent"
                    type="button"
                    onClick={() => onDateChange?.(candidateDate)}
                    disabled={!candidateDate || candidateDate === milestone.targetDate}
                  >
                    Apply target date
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

