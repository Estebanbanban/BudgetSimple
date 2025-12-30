export default function SettingsPage() {
  return (
    <section className="view" data-view="settings">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Customize your calendar, sidebar, and housing preferences.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-body">
          <div className="form">
            <div className="row row-gap">
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 650 }}>Month starts on</div>
                <div className="small muted">Used everywhere (dashboard, budgets, cashflow).</div>
              </div>
              <select id="settingsMonthStart" className="select" aria-label="Month start day" />
            </div>
            <div className="row row-gap">
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 650 }}>Display currency</div>
                <div className="small muted">Used for all dashboards and benchmarks.</div>
              </div>
              <select id="settingsDisplayCurrency" className="select" aria-label="Display currency" defaultValue="USD">
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
            <div className="row row-gap">
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 650 }}>Default dashboard range</div>
                <div className="small muted">What you see when you open the app.</div>
              </div>
              <select id="settingsDefaultRange" className="select" aria-label="Default dashboard range" defaultValue="month">
                <option value="month">This month</option>
                <option value="quarter">This quarter</option>
                <option value="ytd">Year to date</option>
                <option value="12m">Last 12 months</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div className="row row-gap">
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 650 }}>Housing</div>
                <div className="small muted">Rent affects charts and budgets.</div>
              </div>
              <select id="settingsHousing" className="select" aria-label="Housing mode" defaultValue="rent">
                <option value="rent">Rent</option>
                <option value="own">Own</option>
              </select>
              <input
                id="settingsRentPayDay"
                className="input"
                type="number"
                min={1}
                max={31}
                step={1}
                placeholder="Rent day (1-31)"
              />
            </div>
            <div className="row row-gap">
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 650 }}>Sidebar</div>
                <div className="small muted">Collapse to icons by default.</div>
              </div>
              <label className="toggle">
                <input id="settingsNavCollapsed" type="checkbox" />
                <span>Collapsed</span>
              </label>
            </div>
            <div className="row row-gap">
              <button className="btn" id="btnSaveSettings" type="button">
                Save settings
              </button>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
