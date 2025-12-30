export default function CashflowPage() {
  return (
    <section className="view" data-view="cashflow">
      <div className="page-head">
        <div>
          <h1>Cashflow map</h1>
          <p className="muted">
            Income to destinations: expenses, envelopes, investing, liabilities, transfers, and unallocated.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Cashflow map</div>
            <div className="panel-sub">How income flows into expenses, investing, and savings (in range)</div>
          </div>
          <div className="panel-actions">
            <button className="btn btn-accent" id="btnClearFlowDrill" type="button" hidden>
              Clear drilldown
            </button>
            <button className="btn btn-quiet" id="btnExportFlowPng" type="button">
              PNG
            </button>
            <button className="btn btn-quiet" id="btnCenterFlow" type="button">
              Center
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div className="cashflow-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'stretch' }}>
            {/* Chart Panel (70% on desktop) */}
            <div className="cashflow-chart-panel" style={{ minHeight: '60vh', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="chart-wrap" style={{ width: '100%', height: '100%', flex: '1', display: 'flex', flexDirection: 'column', minHeight: '0' }}>
                <div className="pan-wrap" id="flowPan" aria-label="Cashflow map pan container" style={{ flex: '1', height: '100%', minHeight: '0', display: 'flex', flexDirection: 'column' }}>
                  <div id="flowSankey" className="chart" role="img" aria-label="Cashflow Sankey diagram" style={{ width: '100%', height: '100%', flex: '1', minHeight: '0' }} />
                </div>
                <div className="chart-empty" id="flowSankeyEmpty" hidden>
                  No data yet
                </div>
              </div>
            </div>
            
            {/* Details Panel (30% on desktop) */}
            <div className="cashflow-details-panel">
              <div className="panel" style={{ marginBottom: '16px' }}>
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Top Categories</div>
                    <div className="panel-sub">Expense breakdown</div>
                  </div>
                </div>
                <div className="panel-body">
                  <div id="cashflowCategoryList" className="category-list">
                    {/* Will be populated by renderCashflowMap */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel" id="cashflowExplain" hidden>
        <div className="panel-head">
          <div>
            <div className="panel-title" id="cashflowExplainTitle">
              Explain this number
            </div>
            <div className="panel-sub" id="cashflowExplainSub">
              Filters
            </div>
          </div>
        </div>
        <div className="panel-body">
          <div className="table-wrap">
            <table className="table" id="cashflowExplainTable" />
          </div>
          <div className="chart-empty" id="cashflowExplainEmpty" hidden>
            No records in range
          </div>

          <div className="panel" id="cashflowSavingsWrap" hidden style={{ marginTop: 16 }}>
            <div className="panel-head">
              <div>
                <div className="panel-title">Savings breakdown</div>
                <div className="panel-sub">Where savings are going this period</div>
              </div>
            </div>
            <div className="panel-body">
              <div className="table-wrap">
                <table className="table" id="cashflowSavingsTable" />
              </div>
            </div>
          </div>

          <div className="panel" id="cashflowRunwayWrap" hidden style={{ marginTop: 16 }}>
            <div className="panel-head">
              <div>
                <div className="panel-title">Runway projection</div>
                <div className="panel-sub">Net worth minus monthly expenses if income stops</div>
              </div>
            </div>
            <div className="panel-body">
              <div className="chart-wrap" style={{ minHeight: 240 }}>
                <div id="runwayChart" className="chart" role="img" aria-label="Runway projection chart" />
                <div className="chart-empty" id="runwayChartEmpty" hidden>
                  Add net worth and expense data to see runway
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Cashflow narrative</div>
            <div className="panel-sub">Short summaries that explain the flow</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="action-list" id="cashflowNarrative">
            <div className="action-item">
              <div>
                <div className="action-title">Top sink</div>
                <div className="action-sub">Your largest category is currently dining with 3 merchants driving most spend.</div>
              </div>
              <button className="btn btn-quiet" type="button">
                Drill down
              </button>
            </div>
            <div className="action-item">
              <div>
                <div className="action-title">Savings destination</div>
                <div className="action-sub">Envelope contributions are outpacing plan by 12% this month.</div>
              </div>
              <button className="btn btn-quiet" type="button">
                View envelopes
              </button>
            </div>
            <div className="action-item">
              <div>
                <div className="action-title">Unallocated cashflow</div>
                <div className="action-sub">Allocate the remaining cashflow to reduce idle funds.</div>
              </div>
              <button className="btn btn-quiet" type="button">
                Assign
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Top sinks</div>
              <div className="panel-sub">Largest outflow destinations in the range</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="table" id="flowTopSinks" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Top savings destinations</div>
              <div className="panel-sub">Envelopes and investment allocations</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="table" id="flowTopSavings" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Unallocated</div>
              <div className="panel-sub">Leftover cashflow that needs a plan</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="table" id="flowUnallocated" />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
