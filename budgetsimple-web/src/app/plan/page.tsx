"use client";

import { useEffect, useRef, useState } from "react";
import MilestonesManager, { type MilestonesManagerRef } from "@/components/milestones-manager";
import MilestoneHero from "@/components/milestone-hero";
import MilestoneGraph from "@/components/milestone-graph";
import MilestoneLevers from "@/components/milestone-levers";
import ProjectionSettingsCard from "@/components/projection-settings-card";
import { getNextMilestone, updateMilestone, type MilestoneProgress } from "@/lib/milestones-local";
import { calculateMonthlyContributionFromCashflow } from "@/lib/milestone-projection";
import { readPlanSettings, writePlanSettings, type ContributionMode } from "@/lib/plan-settings";
import { showToast } from "@/lib/toast";

/**
 * PLAN PAGE LAYOUT (top → bottom)
 * 1) Next milestone + Net worth projection (2-col grid)
 * 2) All milestones (compact table)
 * 3) Projection settings (intuitive form)
 * 4) (Optional) Legacy budgets/tools collapsed below
 */
export default function PlanPage() {
  const milestonesManagerRef = useRef<MilestonesManagerRef>(null);
  const startingTouchedRef = useRef(false);

  const [startingNetWorth, setStartingNetWorth] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [annualReturn, setAnnualReturn] = useState(0.07);
  const [contributionMode, setContributionMode] = useState<ContributionMode>("auto");
  const [manualMonthlyContribution, setManualMonthlyContribution] = useState(0);

  const [autoMonthlyContribution, setAutoMonthlyContribution] = useState(0);
  const [autoMonthlyContributionNote, setAutoMonthlyContributionNote] = useState<string>("");

  const [nextMilestone, setNextMilestone] = useState<MilestoneProgress | null>(null);

  const effectiveMonthlyContribution =
    contributionMode === "auto" ? autoMonthlyContribution : manualMonthlyContribution;

  useEffect(() => {
    const settings = readPlanSettings();
    setStartingNetWorth(settings.startingNetWorth);
    setCurrency(settings.currency);
    setAnnualReturn(settings.annualReturn);
    setContributionMode(settings.contributionMode);
    setManualMonthlyContribution(settings.manualMonthlyContribution);
  }, []);

  useEffect(() => {
    const tick = async () => {
      await loadNextMilestone();
      loadAutoEstimates();
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAutoEstimates = () => {
    if (typeof window === "undefined") return;
    const runtime = (window as any).budgetsimpleRuntime;
    if (!runtime) return;

    const transactions = runtime.transactions?.() || [];
    const income = runtime.income?.() || [];

    // Auto estimate: last full month net cashflow (income - expenses)
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
      .filter((t: any) => inMonth(t.dateISO || t.date) && (t.type === "expense" || (t.amount && t.amount < 0)))
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);

    const cashflow = lastMonthIncome - lastMonthExpenses;
    const contrib = Math.max(0, cashflow);

    // Fallback: if last month is empty, use 30-day estimate.
    const fallback = calculateMonthlyContributionFromCashflow(transactions, income, 30);
    const finalEstimate = contrib > 0 ? contrib : Math.max(0, fallback);

    setAutoMonthlyContribution(finalEstimate);
    setAutoMonthlyContributionNote(
      contrib > 0 ? "last full month" : "last 30 days"
    );

    // Convenience: if the user hasn't set a starting point yet, seed from simple net worth estimate.
    if (!startingTouchedRef.current && (!startingNetWorth || startingNetWorth === 0)) {
      const totalIncome = income.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
      const totalExpenses = transactions
        .filter((t: any) => t.type === "expense" || (t.amount && t.amount < 0))
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);
      const estimatedNW = Math.max(0, totalIncome - totalExpenses);
      if (estimatedNW > 0) setStartingNetWorth(estimatedNW);
    }
  };

  const loadNextMilestone = async () => {
    try {
      const next = await getNextMilestone();
      setNextMilestone(next);
    } catch (error) {
      console.error("Error loading next milestone:", error);
    }
  };

  const commitSettings = () => {
    writePlanSettings({
      startingNetWorth,
      currency,
      annualReturn,
      contributionMode,
      manualMonthlyContribution,
    });
    showToast("Saved", "success");
  };

  return (
    <section className="view" data-view="plan">
      <div className="page-head">
        <div>
          <h1>Plan</h1>
          <p className="muted">Milestones & projections — track your net worth trajectory.</p>
        </div>
      </div>

      <div className="grid" style={{ alignItems: "start" }}>
        <MilestoneHero
          progress={nextMilestone}
          startingNetWorth={startingNetWorth}
          monthlyContribution={effectiveMonthlyContribution}
          annualReturn={annualReturn}
          currency={currency}
          onAdd={() => milestonesManagerRef.current?.showAddForm()}
          onEdit={() => {
            if (!nextMilestone) return;
            document.getElementById("all-milestones")?.scrollIntoView({ behavior: "smooth" });
            milestonesManagerRef.current?.editMilestone(nextMilestone.milestone.id);
          }}
        />

        <MilestoneGraph
          currentNetWorth={startingNetWorth}
          monthlyContribution={effectiveMonthlyContribution}
          annualReturn={annualReturn}
          currency={currency}
          focusMilestone={
            nextMilestone
              ? {
                  id: nextMilestone.milestone.id,
                  label: nextMilestone.milestone.label,
                  targetValue: nextMilestone.targetValue,
                  targetDate: nextMilestone.milestone.target_date,
                }
              : undefined
          }
        />
      </div>

      <section className="panel" id="all-milestones">
        <div className="panel-head">
          <div>
            <div className="panel-title">All milestones</div>
            <div className="panel-sub">A compact list of your goals and ETAs.</div>
          </div>
          <div className="panel-actions">
            <button className="btn btn-accent" type="button" onClick={() => milestonesManagerRef.current?.showAddForm()}>
              Add milestone
            </button>
          </div>
        </div>
        <div className="panel-body">
          <MilestonesManager ref={milestonesManagerRef} />
        </div>
      </section>

      <ProjectionSettingsCard
        startingNetWorth={startingNetWorth}
        currency={currency}
        annualReturn={annualReturn}
        contributionMode={contributionMode}
        manualMonthlyContribution={manualMonthlyContribution}
        autoMonthlyContribution={autoMonthlyContribution}
        autoMonthlyContributionNote={autoMonthlyContributionNote}
        onChange={(patch) => {
          if (patch.startingNetWorth !== undefined) startingTouchedRef.current = true;
          if (patch.startingNetWorth !== undefined) setStartingNetWorth(patch.startingNetWorth);
          if (patch.currency !== undefined) setCurrency(patch.currency);
          if (patch.annualReturn !== undefined) setAnnualReturn(patch.annualReturn);
          if (patch.contributionMode !== undefined) setContributionMode(patch.contributionMode);
          if (patch.manualMonthlyContribution !== undefined) setManualMonthlyContribution(patch.manualMonthlyContribution);
        }}
        onCommit={commitSettings}
      />

      {/* Projection tuning for the next milestone (kept below the data-first section). */}
      {nextMilestone ? (
        <MilestoneLevers
          currentNetWorth={startingNetWorth}
          monthlyContribution={effectiveMonthlyContribution}
          annualReturn={annualReturn}
          currency={currency}
          milestone={{
            id: nextMilestone.milestone.id,
            label: nextMilestone.milestone.label,
            targetValue: nextMilestone.targetValue,
            targetDate: nextMilestone.milestone.target_date,
          }}
          onContributionChange={(amount) => {
            setContributionMode("manual");
            setManualMonthlyContribution(amount);
            writePlanSettings({ contributionMode: "manual", manualMonthlyContribution: amount });
            showToast("Saved", "success");
          }}
          onDateChange={async (date) => {
            await updateMilestone(nextMilestone.milestone.id, { targetDate: date });
            await loadNextMilestone();
            showToast("Saved", "success");
          }}
        />
      ) : null}

      {/* Legacy budgets/tools (kept out of the primary Plan MVP flow). */}
      <details className="panel" style={{ overflow: "visible" }}>
        <summary className="panel-head" style={{ cursor: "pointer" }}>
          <div>
            <div className="panel-title">More planning tools</div>
            <div className="panel-sub">Optional: budgets (legacy) and other utilities.</div>
          </div>
        </summary>
        <div className="panel-body">
          <section className="panel" style={{ boxShadow: "none" }}>
            <div className="panel-head">
              <div>
                <div className="panel-title">Category budgets</div>
                <div className="panel-sub">Budgets apply monthly.</div>
              </div>
            </div>
            <div className="panel-body">
              <form id="budgetForm" className="form">
                <div className="row">
                  <select id="budgetCategory" className="select" />
                  <input
                    id="budgetAmount"
                    className="input"
                    type="number"
                    step="0.01"
                    placeholder="Monthly budget"
                    required
                  />
                  <button className="btn" type="submit">
                    Set
                  </button>
                </div>
              </form>
              <div className="table-wrap">
                <table className="table" id="budgetsTable" />
              </div>
            </div>
          </section>
        </div>
      </details>
    </section>
  );
}
