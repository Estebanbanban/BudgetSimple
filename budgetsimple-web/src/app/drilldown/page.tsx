export default function DrilldownPage() {
  return (
    <section className="view" data-view="drilldown">
      <div className="toolbar">
        <div className="toolbar-group">
          <a className="btn btn-quiet" href="/dashboard">
            Back to dashboard
          </a>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title" id="drilldownTitle">
              Drilldown
            </div>
            <div className="panel-sub" id="drilldownFilters">
              Filters
            </div>
          </div>
          <div className="panel-actions">
            <span className="badge badge-eta" id="drilldownTotal">
              --
            </span>
          </div>
        </div>
        <div className="panel-body">
          <div className="table-wrap">
            <table className="table" id="drilldownTable" />
          </div>
          <div className="chart-empty" id="drilldownEmpty" hidden>
            No records in range
          </div>
        </div>
      </section>
    </section>
  );
}
