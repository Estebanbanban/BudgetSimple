export default function ConnectPage() {
  return (
    <section className="view" data-view="connect">
      <div className="page-head">
        <div>
          <h1>Connect / Import</h1>
          <p className="muted">
            A guided flow to import CSVs, set rent, add salary, and review your data.
          </p>
        </div>
      </div>

      <div className="onboard-layout">
        <aside className="onboard-rail">
          <div className="onboard-rail-title">Onboarding tour</div>
          <div className="onboard-rail-sub muted">4 steps to first insights</div>
          <div className="onboard-step-list" id="onboardStepList">
            <button className="onboard-step" type="button" data-step-target="upload">
              <span className="onboard-step-index">1</span>
              <span className="onboard-step-label">Upload expenses CSV</span>
              <span className="onboard-step-status" data-step-status="upload" />
            </button>
            <button className="onboard-step" type="button" data-step-target="map">
              <span className="onboard-step-index">2</span>
              <span className="onboard-step-label">Map columns</span>
              <span className="onboard-step-status" data-step-status="map" />
            </button>
            <button className="onboard-step" type="button" data-step-target="rent">
              <span className="onboard-step-index">3</span>
              <span className="onboard-step-label">Set rent</span>
              <span className="onboard-step-status" data-step-status="rent" />
            </button>
            <button className="onboard-step" type="button" data-step-target="salary">
              <span className="onboard-step-index">4</span>
              <span className="onboard-step-label">Add salary</span>
              <span className="onboard-step-status" data-step-status="salary" />
            </button>
          </div>
        </aside>

        <div className="onboard-stage">
          <div className="onboard-message muted" id="onboardMessage" hidden />

          <section className="panel onboard-panel" data-step="upload">
            <div className="panel-head">
              <div>
                <div className="panel-title">Upload transactions CSV</div>
                <div className="panel-sub">Required: date + amount</div>
              </div>
            </div>
            <div className="panel-body onboard-panel-body">
              <div className="dropzone" id="txDropzone" role="button" tabIndex={0} aria-label="Upload transactions CSV">
                <div className="dropzone-title">Drop your transactions CSV here</div>
                <div className="dropzone-sub muted">or</div>
                <div className="row">
                  <input id="txCsvFile" className="input" type="file" accept=".csv,text/csv" hidden />
                  <button className="btn" id="btnChooseTxCsv" type="button">
                    Choose CSV
                  </button>
                  <span className="small muted" id="txAnalyzing" hidden>
                    Analyzing...
                  </span>
                </div>
              </div>
              <div className="small muted" id="txFileNote" />
            </div>
            <div className="onboard-actions" data-onboard-actions="upload">
              <div />
              <button className="btn" type="button" data-onboard-next>
                Next
              </button>
            </div>
          </section>

          <section className="panel onboard-panel" data-step="map">
            <div className="panel-head">
              <div>
                <div className="panel-title">Map columns + format</div>
                <div className="panel-sub">Confirm mappings and import your data.</div>
              </div>
            </div>
            <div className="panel-body onboard-panel-body">
              <section className="panel" id="formatPanel" hidden>
                <div className="panel-head">
                  <div>
                    <div className="panel-title">CSV Format Settings</div>
                    <div className="panel-sub">Adjust format detection for international CSV files</div>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="row row-gap">
                    <div>
                      <label className="label">Date Format</label>
                      <select id="dateFormat" className="select">
                        <option value="auto">Auto-detect</option>
                        <option value="iso">ISO (YYYY-MM-DD)</option>
                        <option value="us">US (MM/DD/YYYY)</option>
                        <option value="eu">European (DD/MM/YYYY)</option>
                        <option value="long">Long (November 2, 2025)</option>
                      </select>
                      <div className="small muted" id="detectedDateFormat">Detected: Auto</div>
                    </div>
                    <div>
                      <label className="label">Number Format</label>
                      <select id="numberFormat" className="select">
                        <option value="auto">Auto-detect</option>
                        <option value="us">US (1,234.56)</option>
                        <option value="eu">European (1.234,56)</option>
                        <option value="swiss">Swiss (1'234.56)</option>
                      </select>
                      <div className="small muted" id="detectedNumberFormat">Detected: Auto</div>
                    </div>
                    <div>
                      <label className="label">Currency Symbol</label>
                      <input id="currencySymbol" className="input" type="text" placeholder="CA$, $, €, etc." />
                      <div className="small muted">Leave empty for auto-detection</div>
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn btn-quiet" id="btnResetFormat" type="button">
                      Reset to Auto
                    </button>
                  </div>
                </div>
              </section>

              <section className="panel" id="mappingPanel">
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Map columns</div>
                    <div className="panel-sub">Map what exists; use fixed values for anything missing.</div>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="mapping-grid" id="mappingGrid" />
                  <div className="row row-gap">
                    <label className="toggle">
                      <input id="inferTypeFromSign" type="checkbox" defaultChecked />
                      <span>Infer type from amount sign</span>
                    </label>
                    <label className="toggle">
                      <input id="doNotDeduplicate" type="checkbox" defaultChecked />
                      <span>Import everything (do not skip duplicates)</span>
                    </label>
                  </div>
                  <div className="row">
                    <button className="btn" id="btnImportTx" type="button">
                      Import
                    </button>
                    <div className="small muted" id="importResult" />
                  </div>
                </div>
              </section>

              <section className="panel" id="previewPanel" hidden>
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Preview</div>
                    <div className="panel-sub">First 50 rows</div>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="table-wrap">
                    <table className="table" id="previewTable" />
                  </div>
                </div>
              </section>
            </div>
            <div className="onboard-actions" data-onboard-actions="map">
              <button className="btn btn-quiet" type="button" data-onboard-back>
                Back
              </button>
              <button className="btn" type="button" data-onboard-next>
                Next
              </button>
            </div>
          </section>

          <section className="panel onboard-panel" data-step="rent">
            <div className="panel-head">
              <div>
                <div className="panel-title">Set your rent</div>
                <div className="panel-sub">Monthly rent amount and payment date</div>
              </div>
            </div>
            <div className="panel-body onboard-panel-body">
              <div className="row row-gap">
                <div>
                  <label className="label">Monthly rent amount</label>
                  <input id="importRentAmount" className="input" type="number" step="0.01" placeholder="e.g., 1200" />
                </div>
                <div>
                  <label className="label">Pay day (1-28)</label>
                  <input id="importRentPayDay" className="input" type="number" min="1" max="28" placeholder="1" defaultValue="1" />
                </div>
              </div>
              <div className="row" style={{ marginTop: '12px' }}>
                <button className="btn" id="btnSaveRentFromImport" type="button">
                  Save rent
                </button>
                <div className="small muted" id="importRentSavedNote" />
              </div>
              <div className="panel-note" style={{ marginTop: '12px' }}>
                You can edit rent periods with date ranges later. This sets your default monthly rent.
              </div>
            </div>
            <div className="onboard-actions" data-onboard-actions="rent">
              <button className="btn btn-quiet" type="button" data-onboard-back>
                Back
              </button>
              <button className="btn" type="button" data-onboard-next>
                Next
              </button>
              <button className="btn btn-quiet" type="button" data-onboard-skip>
                Skip
              </button>
            </div>
          </section>

          <section className="panel onboard-panel" data-step="salary">
            <div className="panel-head">
              <div>
                <div className="panel-title">Add your salary</div>
                <div className="panel-sub">Upload CSV or enter manually</div>
              </div>
            </div>
            <div className="panel-body onboard-panel-body">
              <div className="grid income-grid onboard-subgrid">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <div className="panel-title">Upload income CSV</div>
                      <div className="panel-sub">Required: date + amount</div>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="dropzone" id="incomeDropzone" role="button" tabIndex={0} aria-label="Upload income CSV">
                      <div className="dropzone-title">Drop your income CSV here</div>
                      <div className="dropzone-sub muted">or</div>
                      <div className="row">
                        <input id="incomeCsvFile" className="input" type="file" accept=".csv,text/csv" hidden />
                        <button className="btn" id="btnChooseIncomeCsv" type="button">
                          Choose CSV
                        </button>
                        <button className="btn" id="btnLoadIncomeCsv" type="button" disabled>
                          Preview
                        </button>
                      </div>
                    </div>
                    <div className="small muted" id="incomeFileNote" />
                    <div id="incomeMappingWrap" hidden>
                      <div className="divider" />
                      <div className="mapping-grid" id="incomeMappingGrid" />
                      <div className="row">
                        <button className="btn" id="btnImportIncome" type="button">
                          Import income
                        </button>
                        <div className="small muted" id="incomeImportResult" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <div className="panel-title">Manual income</div>
                      <div className="panel-sub">Add sources like "Job", "Parents", etc.</div>
                    </div>
                  </div>
                  <div className="panel-body">
                    <form id="manualIncomeForm" className="form">
                      <div className="row">
                        <input id="manualIncomeDate" className="input" type="date" required />
                        <select id="manualIncomeSourceSelect" className="select" required />
                        <input id="manualIncomeSourceCustom" className="input" type="text" placeholder="Custom source" hidden />
                        <input id="manualIncomeAmount" className="input" type="number" step="0.01" placeholder="Amount" required />
                        <button className="btn" type="submit">
                          Add
                        </button>
                      </div>
                      <div className="small muted">Tip: use positive amounts. Income is never treated as an expense.</div>
                    </form>
                    <div className="table-wrap">
                      <table className="table" id="incomeTable" />
                    </div>
                  </div>
                </section>
              </div>
            </div>
            <div className="onboard-actions" data-onboard-actions="salary">
              <button className="btn btn-quiet" type="button" data-onboard-back>
                Back
              </button>
              <button className="btn btn-accent" type="button" data-onboard-finish>
                Finish → Dashboard
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

