"use client";

import { useEffect } from "react";
import SubscriptionWidget from "@/components/subscription-widget";
import MilestoneWidget from "@/components/milestone-widget";
import NetWorthTrajectoryCard from "./net-worth-trajectory-card";

// Simple tooltip component
function InfoTooltip({ content }: { content: string }) {
  return (
    <span
      className="info-tooltip"
      title={content}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        backgroundColor: "#e2e8f0",
        color: "#64748b",
        fontSize: "11px",
        fontWeight: "600",
        cursor: "help",
        marginLeft: "6px",
        verticalAlign: "middle",
        lineHeight: "1",
        flexShrink: "0",
      }}
    >
      ⓘ
    </span>
  );
}

// KPI explanation texts
const KPI_EXPLANATIONS = {
  "total-expenses":
    "Total expenses in the selected date range. Includes all transactions marked as expenses.",
  "total-income":
    "Total income in the selected date range. Includes all income entries from salary, investments, and other sources.",
  "savings-rate":
    "Percentage of net income saved. Calculated as (Income - Expenses) / Income × 100%.",
  runway:
    "Months of expenses that can be covered by current net worth. Calculated as Net Worth / Average Monthly Expenses.",
};

export default function DashboardPage() {
  // Listen for transaction updates and refresh the dashboard
  useEffect(() => {
    const handleTransactionsUpdate = () => {
      // Force a re-render of the dashboard by calling renderAll if runtime is available
      if (
        typeof window !== "undefined" &&
        (window as any).budgetsimpleRuntime
      ) {
        const runtime = (window as any).budgetsimpleRuntime;
        if (runtime && typeof runtime.renderAll === "function") {
          runtime.renderAll();
        }
      }
    };

    window.addEventListener("transactionsUpdated", handleTransactionsUpdate);

    return () => {
      window.removeEventListener(
        "transactionsUpdated",
        handleTransactionsUpdate
      );
    };
  }, []);

  return (
    <section className="view" data-view="dashboard">
      <div className="toolbar">
        <div className="toolbar-group" id="rangeControls" hidden>
          <label className="label">Range</label>
          <select id="rangePreset" className="select" defaultValue="month">
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
            <option value="ytd">Year to date</option>
            <option value="12m">Last 12 months</option>
            <option value="all">All time</option>
            <option value="custom">Custom</option>
          </select>
          <div className="toolbar-group" id="customRangeGroup" hidden>
            <label className="label">From</label>
            <input id="rangeFrom" className="input" type="date" />
            <label className="label">To</label>
            <input id="rangeTo" className="input" type="date" />
            <button className="btn" id="applyCustomRange" type="button">
              Apply
            </button>
          </div>
          <button className="btn btn-quiet" id="btnCloseRange" type="button">
            Done
          </button>
        </div>
        <div className="toolbar-spacer" />
        <div className="toolbar-group">
          <button
            className="btn btn-accent"
            id="btnClearFilter"
            type="button"
            hidden
          >
            Clear drilldown
          </button>
        </div>
      </div>

      <div className="cards" id="summaryCards" aria-label="Summary">
        <div className="card">
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center" }}
          >
            Total expenses
            <InfoTooltip content={KPI_EXPLANATIONS["total-expenses"]} />
          </div>
          <div className="card-value" id="kpiTotalExpenses">
            --
          </div>
          <div className="card-sub" id="kpiTotalExpensesSub">
            In this range
          </div>
        </div>
        <SubscriptionWidget />
        <MilestoneWidget />
        <div className="card">
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center" }}
          >
            Total income
            <InfoTooltip content={KPI_EXPLANATIONS["total-income"]} />
          </div>
          <div className="card-value" id="kpiTotalIncome">
            --
          </div>
          <div className="card-sub" id="kpiTotalIncomeSub">
            In this range
          </div>
        </div>
        <div className="card">
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center" }}
          >
            Savings rate
            <InfoTooltip content={KPI_EXPLANATIONS["savings-rate"]} />
          </div>
          <div className="card-value" id="kpiSavingsRate">
            --
          </div>
          <div className="card-sub" id="kpiSavingsRateSub">
            Based on net income
          </div>
        </div>
        <div className="card">
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center" }}
          >
            Runway
            <InfoTooltip content={KPI_EXPLANATIONS["runway"]} />
          </div>
          <div className="card-value" id="kpiRunway">
            --
          </div>
          <div className="card-sub" id="kpiRunwaySub">
            Cash + liquid assets
          </div>
        </div>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div
                className="panel-title"
                style={{ display: "flex", alignItems: "center" }}
              >
                Expenses by category
                <InfoTooltip content="Click a slice to drill into transactions for that category" />
              </div>
              <div className="panel-sub" id="pieSubtitle">
                Click a slice to drill into transactions
              </div>
            </div>
            <div className="panel-actions">
              <button
                className="btn btn-quiet"
                id="btnExportPiePng"
                type="button"
                style={{ textDecoration: "none" }}
              >
                PNG
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-wrap">
              <div
                id="expensePie"
                className="chart"
                role="img"
                aria-label="Expense category pie chart"
              />
              <div className="chart-empty" id="expensePieEmpty" hidden>
                No expenses in range
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div
                className="panel-title"
                style={{ display: "flex", alignItems: "center" }}
              >
                Month over month
                <InfoTooltip content="Compare spending across months. Savings (green) = income - expenses - invested" />
              </div>
              <div className="panel-sub" id="momSubtitle">
                Savings (green) = income - expenses - invested
              </div>
            </div>
            <div
              className="panel-actions"
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <label className="toggle">
                <input id="momAsPercent" type="checkbox" />
                <span>% income</span>
              </label>
              <label className="toggle">
                <input id="momStacked" type="checkbox" defaultChecked />
                <span>categories</span>
              </label>
              <button
                className="btn btn-quiet"
                id="btnExportMoMPng"
                type="button"
                style={{ textDecoration: "none" }}
              >
                PNG
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-wrap">
              <div
                id="momChart"
                className="chart"
                role="img"
                aria-label="Month over month chart"
              />
              <div className="chart-empty" id="momChartEmpty" hidden>
                No data yet
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div
                className="panel-title"
                style={{ display: "flex", alignItems: "center" }}
              >
                Cashflow map snapshot
                <InfoTooltip content="Transfers are shown as a category; split transactions and investment buy/sell are excluded." />
              </div>
              <div className="panel-sub">
                Quick view of where income goes this period
              </div>
            </div>
            <div className="panel-actions">
              <a
                className="btn btn-quiet"
                href="/cashflow"
                style={{ textDecoration: "none" }}
              >
                Open map
              </a>
            </div>
          </div>
          <div className="panel-body">
            <div
              className="chart-wrap"
              style={{
                height: "400px",
                minHeight: "400px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <div
                id="cashflowPreview"
                className="chart"
                role="img"
                aria-label="Cashflow map preview"
                style={{ width: "100%", height: "100%" }}
              />
              <div className="chart-empty" id="cashflowPreviewEmpty" hidden>
                No data yet
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">What Changed</div>
              <div className="panel-sub">
                Month-over-month comparison and drivers
              </div>
            </div>
          </div>
          <div className="panel-body">
            <div id="whatChangedList" />
            <div className="chart-empty" id="whatChangedEmpty" hidden>
              Need at least 2 months of data to see changes.
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Budget progress</div>
              <div className="panel-sub">
                Spending vs monthly targets in range
              </div>
            </div>
            <div className="panel-actions">
              <a
                className="btn btn-quiet"
                href="/plan"
                style={{ textDecoration: "none" }}
              >
                Edit budgets
              </a>
            </div>
          </div>
          <div className="panel-body">
            <div id="budgetList" />
            <div className="chart-empty" id="budgetListEmpty" hidden>
              Set budgets in Plan to see progress.
            </div>
          </div>
        </section>

        <NetWorthTrajectoryCard />

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Top categories</div>
              <div className="panel-sub">
                Largest expense categories in range
              </div>
            </div>
            <div className="panel-actions">
              <button
                className="btn btn-quiet btn-sm"
                id="btnToggleTopCategories"
                type="button"
                style={{ textDecoration: "none", fontSize: "12px" }}
              >
                Show all
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="table" id="topCategoriesTable" />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Top merchants</div>
              <div className="panel-sub">Biggest spenders in range</div>
            </div>
            <div className="panel-actions">
              <button
                className="btn btn-quiet btn-sm"
                id="btnToggleTopMerchants"
                type="button"
                style={{ textDecoration: "none", fontSize: "12px" }}
              >
                Show all
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="table" id="topMerchantsTable" />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div
                className="panel-title"
                style={{ display: "flex", alignItems: "center" }}
              >
                Daily spending
                <InfoTooltip content="Daily expense totals over the last 30 days. Click a bar to see transactions for that day." />
              </div>
              <div className="panel-sub" id="dailySpendSub">
                Last 30 days (expenses only)
              </div>
            </div>
            <div className="panel-actions">
              <button
                className="btn btn-quiet"
                id="btnExportDailyPng"
                type="button"
                style={{ textDecoration: "none" }}
              >
                PNG
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-wrap" style={{ minHeight: 220 }}>
              <div
                id="dailySpend"
                className="chart"
                role="img"
                aria-label="Daily spending chart"
              />
              <div className="chart-empty" id="dailySpendEmpty" hidden>
                No data yet
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Subscriptions</div>
              <div className="panel-sub">
                Detected recurring merchants to review
              </div>
            </div>
            <div className="panel-actions">
              <a
                href="/subscriptions"
                className="btn btn-quiet"
                style={{ textDecoration: "none" }}
              >
                Review
              </a>
            </div>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="table" id="subscriptionsTable" />
            </div>
            <div className="panel-note">
              Confirmed subscriptions appear in your monthly summaries.
            </div>
          </div>
        </section>

        {/* Action Items - Moved to bottom after all data sections */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Action items</div>
              <div className="panel-sub">
                Insights that move savings and goals forward
              </div>
            </div>
          </div>
          <div className="panel-body">
            <div className="action-list" id="actionItems" />
            <div className="chart-empty" id="actionItemsEmpty" hidden>
              Add at least one month of data to see action items.
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
