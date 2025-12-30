export default function InvestingPage() {
  return (
    <section className="view" data-view="investing">
      <div className="page-head">
        <div>
          <h1>Investing</h1>
          <p className="muted">
            Manual entries now; connectors require a secure cloud backend (see Deploy in footer).
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Connect accounts (coming soon)</div>
            <div className="panel-sub">
              Powens (Budget Insight), Plaid, finAPI require server-side OAuth + token storage.
            </div>
          </div>
        </div>
        <div className="panel-body">
          <div className="row">
            <button className="btn btn-quiet" id="btnConnectPowens" type="button" disabled>
              Connect Powens
            </button>
            <button className="btn btn-quiet" id="btnConnectPlaid" type="button" disabled>
              Connect Plaid
            </button>
            <button className="btn btn-quiet" id="btnConnectFinapi" type="button" disabled>
              Connect finAPI
            </button>
          </div>
          <div className="small muted">
            Enable cloud mode to securely sync accounts and keep secrets off the browser.
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Add investment</div>
            <div className="panel-sub">Use positive amounts; they will be tracked as invested outflows.</div>
          </div>
        </div>
        <div className="panel-body">
          <form id="investmentForm" className="form">
            <div className="row">
              <input id="investmentDate" className="input" type="date" required />
              <select id="investmentInstrument" className="select" required />
              <input id="investmentInstrumentCustom" className="input" type="text" placeholder="Custom instrument" hidden />
              <input id="investmentAmount" className="input" type="number" step="0.01" placeholder="Amount" required />
              <button className="btn" type="submit">
                Add
              </button>
            </div>
          </form>
          <div className="table-wrap">
            <table className="table" id="investmentTable" />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Accounts</div>
            <div className="panel-sub">Used for envelope contributions and (later) investment connectors.</div>
          </div>
        </div>
        <div className="panel-body">
          <form id="accountCreateForm" className="form">
            <div className="row">
              <input
                id="accountName"
                className="input"
                type="text"
                placeholder="Account name (e.g., Bank, TFSA, PEA)"
                required
              />
              <select id="accountKind" className="select" required defaultValue="bank">
                <option value="bank">Bank</option>
                <option value="savings">Savings</option>
                <option value="brokerage">Brokerage</option>
                <option value="retirement">Retirement</option>
                <option value="crypto">Crypto</option>
                <option value="cash">Cash</option>
              </select>
              <button className="btn" type="submit">
                Add
              </button>
            </div>
          </form>
          <div className="table-wrap">
            <table className="table" id="accountsTable" />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Wealth Builder</div>
            <div className="panel-sub">Net worth projections and compounding scenarios</div>
          </div>
        </div>
        <div className="panel-body">
          <form className="form" id="wealthBuilderForm">
            <div className="row">
              <input
                id="wealthStartNetWorth"
                className="input"
                type="number"
                step="0.01"
                placeholder="Starting net worth"
              />
              <input
                id="wealthMonthlyContribution"
                className="input"
                type="number"
                step="0.01"
                placeholder="Monthly contribution"
              />
              <input
                id="wealthAnnualReturn"
                className="input"
                type="number"
                step="0.1"
                placeholder="Expected annual return %"
              />
              <input id="wealthYears" className="input" type="number" step="1" placeholder="Years" />
              <button className="btn" id="btnRunWealthScenario" type="button">
                Run scenario
              </button>
            </div>
            <div className="small muted">Use conservative assumptions; projections are deterministic.</div>
          </form>
          <div className="chart-wrap" style={{ minHeight: 240 }}>
            <div id="wealthBuilderChart" className="chart" role="img" aria-label="Wealth Builder projection chart" />
            <div className="chart-empty" id="wealthBuilderEmpty" hidden>
              Enter assumptions to generate a projection
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
