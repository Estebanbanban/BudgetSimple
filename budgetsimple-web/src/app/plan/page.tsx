export default function PlanPage() {
  return (
    <section className="view" data-view="plan">
      <div className="page-head">
        <div>
          <h1>Plan</h1>
        </div>
      </div>

      {/* PAUSED: Envelope savings goals - not in MVP golden path */}
      {/* <div id="envelopesHero" />

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Your envelopes</div>
            <div className="panel-sub">Click a card to open it (contributions + projection).</div>
          </div>
          <div className="panel-actions">
            <button className="btn btn-quiet" id="btnCreateEnvelope" type="button">
              Create envelope
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div id="envelopesGrid" />
          <div className="table-wrap" hidden>
            <table className="table" id="envelopesTable" />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Envelope projections</div>
            <div className="panel-sub">Plan vs historical pace, with ETA dates</div>
          </div>
          <div className="panel-actions">
            <span className="badge">
              <span className="badge-dot" />
              Plan curve
            </span>
            <span className="badge badge-eta">
              <span className="badge-dot" />
              Historical pace
            </span>
          </div>
        </div>
        <div className="panel-body">
          <div className="chart-wrap" style={{ minHeight: 220 }}>
            <div id="envelopeProjectionChart" className="chart" role="img" aria-label="Envelope projection chart" />
            <div className="chart-empty" id="envelopeProjectionEmpty" hidden>
              Create an envelope to see projections
            </div>
          </div>
          <div className="panel-note">To hit target by date, the app will suggest a monthly contribution.</div>
        </div>
      </section> */}

      <div className="section-head">
        <div>
          <h2>Milestones</h2>
          <p className="muted">Track your progress toward long-term financial goals. Set targets and see when you'll reach them.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Your Milestones</div>
            <div className="panel-sub">Financial goals with progress tracking</div>
          </div>
          <div className="panel-actions">
            <button 
              className="btn btn-quiet" 
              onClick={() => milestonesManagerRef.current?.showAddForm()}
            >
              Add Milestone
            </button>
          </div>
        </div>
        <div className="panel-body">
          <MilestonesManager ref={milestonesManagerRef} />
        </div>
      </section>

      <div className="section-head">
        <div>
          <h2>Category Budgets</h2>
          <p className="muted">Set monthly budget targets per category. Track spending vs targets on dashboard.</p>
        </div>
      </div>

      {/* PAUSED: Rent shortcut - not in MVP golden path (use category budgets instead) */}
      {/* <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Rent</div>
            <div className="panel-sub">Quick monthly target (creates/updates "Rent" budget)</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="row">
            <input id="rentAmount" className="input" type="number" step="0.01" placeholder="Monthly rent budget" />
            <select id="rentMode" className="select" aria-label="Rent mode" defaultValue="monthly">
              <option value="monthly">Monthly</option>
              <option value="once">Once</option>
              <option value="off">Budget only</option>
            </select>
            <button className="btn" id="btnSaveRent" type="button">
              Save
            </button>
            <div className="small muted" id="rentSavedNote" />
          </div>
        </div>
      </section> */}

      <section className="panel">
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
              <input id="budgetAmount" className="input" type="number" step="0.01" placeholder="Monthly budget" required />
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
    </section>
  );
}
