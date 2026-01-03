import SubscriptionWidget from "@/components/subscription-widget";
import MilestoneWidget from "@/components/milestone-widget";

export default function DashboardPage() {
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
          <button className="btn btn-accent" id="btnClearFilter" type="button" hidden>
            Clear drilldown
          </button>
        </div>
      </div>

      <div className="cards" id="summaryCards" aria-label="Summary">
        <div className="card">
          <div className="card-title">Total expenses</div>
          <div className="card-value" id="kpiTotalExpenses">
            --
          </div>
          <div className="card-sub" id="kpiTotalExpensesSub">
            In this range
          </div>
          <button className="btn btn-quiet" data-drilldown="kpi" data-drilldown-metric="total-expenses" type="button">
            Explain this number
          </button>
        </div>
        <SubscriptionWidget />
        <MilestoneWidget />
        <div className="card">
          <div className="card-title">Total income</div>
          <div className="card-value" id="kpiTotalIncome">
            --
          </div>
          <div className="card-sub" id="kpiTotalIncomeSub">
            In this range
          </div>
          <button className="btn btn-quiet" data-drilldown="kpi" data-drilldown-metric="total-income" type="button">
            Explain this number
          </button>
        </div>
        <div className="card">
          <div className="card-title">Savings rate</div>
          <div className="card-value" id="kpiSavingsRate">
            --
          </div>
          <div className="card-sub" id="kpiSavingsRateSub">
            Based on net income
          </div>
          <button className="btn btn-quiet" data-drilldown="kpi" data-drilldown-metric="savings-rate" type="button">
            Explain this number
          </button>
        </div>
        <div className="card">
          <div className="card-title">Runway</div>
          <div className="card-value" id="kpiRunway">
            --
          </div>
          <div className="card-sub" id="kpiRunwaySub">
            Cash + liquid assets
          </div>
          <button className="btn btn-quiet" data-drilldown="kpi" data-drilldown-metric="runway" type="button">
            Explain this number
          </button>
        </div>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Expenses by category</div>
              <div className="panel-sub" id="pieSubtitle">
                Click a slice to drill into transactions
              </div>
            </div>
            <div className="panel-actions">
              <button
                className="btn btn-quiet"
                data-drilldown="chart"
                data-drilldown-chart="expense-pie"
                data-drilldown-uses-category="true"
                type="button"
              >
                Explain
              </button>
              <button className="btn btn-quiet" id="btnExportPiePng" type="button">
                PNG
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-wrap">
              <div id="expensePie" className="chart" role="img" aria-label="Expense category pie chart" />
              <div className="chart-empty" id="expensePieEmpty" hidden>
                No expenses in range
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Month over month</div>
              <div className="panel-sub" id="momSubtitle">Savings (green) = income - expenses - invested</div>
            </div>
            <div className="panel-actions">
              <button
                className="btn btn-quiet"
                data-drilldown="chart"
                data-drilldown-chart="mom"
                data-drilldown-uses-category="true"
                type="button"
              >
                Explain
              </button>
              <label className="toggle">
                <input id="momAsPercent" type="checkbox" />
                <span>% income</span>
              </label>
              <label className="toggle">
                <input id="momStacked" type="checkbox" defaultChecked />
                <span>categories</span>
              </label>
              <button className="btn btn-quiet" id="btnExportMoMPng" type="button">
                PNG
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-wrap">
              <div id="momChart" className="chart" role="img" aria-label="Month over month chart" />
              <div className="chart-empty" id="momChartEmpty" hidden>
                No data yet
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Cashflow map snapshot</div>
              <div className="panel-sub">Quick view of where income goes this period</div>
            </div>
            <div className="panel-actions">
              <a className="btn btn-quiet" href="/cashflow">
                Open map
              </a>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-wrap" style={{ minHeight: 220 }}>
              <div id="cashflowPreview" className="chart" role="img" aria-label="Cashflow map preview" />
              <div className="chart-empty" id="cashflowPreviewEmpty" hidden>
                No data yet
              </div>
            </div>
            <div className="panel-note">
              Transfers are shown as a category; split transactions and investment buy/sell are excluded.
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">What Changed</div>
              <div className="panel-sub">Month-over-month comparison and drivers</div>
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
              <div className="panel-sub">Spending vs monthly targets in range</div>
            </div>
            <div className="panel-actions">
              <a className="btn btn-quiet" href="/plan">
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

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Net worth trajectory</div>
              <div className="panel-sub">Assets + liabilities, with projection</div>
            </div>
            <div className="panel-actions">
              <span className="badge badge-eta">
                <span className="badge-dot" />
                Projection
              </span>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-wrap" style={{ minHeight: 220 }}>
              <div id="netWorthChart" className="chart" role="img" aria-label="Net worth chart" />
              <div className="chart-empty" id="netWorthChartEmpty" hidden>
                Add assets and liabilities to see projections
              </div>
            </div>
            <div className="panel-note">Wealth Builder assumptions can be adjusted in Investing.</div>
          </div>
        </section>


        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Top categories</div>
              <div className="panel-sub">Largest expense categories in range</div>
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
              <div className="panel-title">Daily spending</div>
              <div className="panel-sub" id="dailySpendSub">Last 30 days (expenses only)</div>
            </div>
            <div className="panel-actions">
              <button
                className="btn btn-quiet"
                data-drilldown="chart"
                data-drilldown-chart="daily"
                data-drilldown-uses-category="true"
                type="button"
              >
                Explain
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-wrap" style={{ minHeight: 220 }}>
              <div id="dailySpend" className="chart" role="img" aria-label="Daily spending chart" />
              <div className="chart-empty" id="dailySpendEmpty" hidden>
                No data yet
              </div>
            </div>
          </div>
        </section>

        {/* PAUSED: Rent benchmark - not in MVP golden path */}
        {/* <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Rent analysis</div>
              <div className="panel-sub">Actual vs budget + benchmark</div>
            </div>
            <div className="panel-actions">
              <span className="badge">
                <span className="badge-dot" />
                Canada + France
              </span>
            </div>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="table" id="rentBenchmarkTable" />
            </div>
            <div className="panel-note">Benchmarks are normalized to your display currency with source metadata.</div>
          </div>
        </section> */}

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Subscriptions</div>
              <div className="panel-sub">Detected recurring merchants to review</div>
            </div>
            <div className="panel-actions">
              <button className="btn btn-quiet" id="btnReviewSubscriptions" type="button">
                Review
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="table" id="subscriptionsTable" />
            </div>
            <div className="panel-note">Confirmed subscriptions appear in your monthly summaries.</div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Action items</div>
              <div className="panel-sub">Insights that move savings and goals forward</div>
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
