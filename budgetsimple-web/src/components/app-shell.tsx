"use client";

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppRuntime from "@/components/app-runtime";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13a1 1 0 0 1 1-1h5v8H5a1 1 0 0 1-1-1v-6Zm10-9h5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-5V4Zm-9 0h5v6H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      </svg>
    ),
  },
  {
    href: "/cashflow",
    label: "Cashflow Map",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7a1 1 0 0 1 1-1h6v3h8a1 1 0 1 1 0 2h-8v3h6a1 1 0 0 1 1 1v4H4V7Zm2 1v10h10v-2H9a1 1 0 1 1 0-2h7V8H6Z" />
      </svg>
    ),
  },
  {
    href: "/plan",
    label: "Plan",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.22-1.05 4.22-2.7 5.5V21a1 1 0 0 1-1.64.77L12 19.5l-2.66 2.27A1 1 0 0 1 7.7 21v-6.5A6.98 6.98 0 0 1 5 9a7 7 0 0 1 7-7Zm0 2a5 5 0 0 0-3.5 8.57 1 1 0 0 1 .2.61v5.66l1.66-1.41a1 1 0 0 1 1.28 0l1.66 1.41v-5.66a1 1 0 0 1 .2-.61A5 5 0 0 0 12 4Z" />
      </svg>
    ),
  },
  // PAUSED: Investing - not in MVP golden path (keep page for manual entries but remove from nav)
  // {
  //   href: "/investing",
  //   label: "Investing",
  //   icon: (
  //     <svg viewBox="0 0 24 24" aria-hidden="true">
  //       <path d="M4 19a1 1 0 0 1 1-1h2V9H5a1 1 0 0 1 0-2h3a1 1 0 0 1 1 1v10h2V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v13h2v-7a1 1 0 0 1 2 0v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
  //     </svg>
  //   ),
  // },
  {
    href: "/connect",
    label: "Connect / Import",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4A1 1 0 1 1 8.6 10.3l2.4 2.3V4a1 1 0 0 1 1-1ZM5 19a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z" />
      </svg>
    ),
  },
  {
    href: "/subscriptions",
    label: "Subscriptions",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.14 12.94a7.77 7.77 0 0 0 .05-.94 7.77 7.77 0 0 0-.05-.94l2.03-1.58a1 1 0 0 0 .23-1.3l-1.92-3.32a1 1 0 0 0-1.2-.45l-2.39.96a7.5 7.5 0 0 0-1.63-.94l-.36-2.54A1 1 0 0 0 12.9 1h-3.8a1 1 0 0 0-.99.86l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a1 1 0 0 0-1.2.45L.6 8.15a1 1 0 0 0 .23 1.3l2.03 1.58c-.03.31-.05.62-.05.94s.02.63.05.94L.83 14.5a1 1 0 0 0-.23 1.3l1.92 3.32a1 1 0 0 0 1.2.45l2.39-.96c.51.4 1.05.71 1.63.94l.36 2.54a1 1 0 0 0 .99.86h3.8a1 1 0 0 0 .99-.86l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96a1 1 0 0 0 1.2-.45l1.92-3.32a1 1 0 0 0-.23-1.3l-2.03-1.56ZM11 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
      </svg>
    ),
  },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() || "/dashboard";

  return (
    <>
      <div className="app" id="app">
        <header className="topbar">
          <Link className="brand brand-btn" href="/dashboard" aria-label="Go to dashboard">
            <span className="logo" aria-hidden="true">
              <img className="logo-img" src="/logo.png" alt="Budgetsimple logo" />
            </span>
            <div>
              <div className="brand-name">budgetsimple</div>
              <div className="brand-sub">Local-first budget & investing tracker</div>
            </div>
          </Link>
          <div className="topbar-actions">
            <button className="icon-btn" id="btnToggleNav" type="button" title="Toggle sidebar" aria-label="Toggle sidebar">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm0 6a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm0 6a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z" />
              </svg>
            </button>
            <select id="currencySelect" className="select select-compact" aria-label="Currency" defaultValue="USD">
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CHF">CHF</option>
              <option value="JPY">JPY</option>
            </select>
            <button className="icon-btn" id="btnOpenRange" type="button" title="Change range" aria-label="Change range">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v13A2.5 2.5 0 0 1 19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-13A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1Zm12.5 6h-15a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5ZM7 12h4v4H7v-4Z" />
              </svg>
            </button>
            <button className="icon-btn" id="btnQuickAdd" type="button" title="Quick add" aria-label="Quick add">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
              </svg>
            </button>
            <button
              className="icon-btn"
              id="btnExportSummaryCsv"
              type="button"
              title="Export"
              aria-label="Export summary CSV"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1ZM5 19a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z" />
              </svg>
            </button>
            <button className="icon-btn" id="btnSetup" type="button" title="Settings" aria-label="Open settings">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.14 12.94a7.77 7.77 0 0 0 .05-.94 7.77 7.77 0 0 0-.05-.94l2.03-1.58a1 1 0 0 0 .23-1.3l-1.92-3.32a1 1 0 0 0-1.2-.45l-2.39.96a7.5 7.5 0 0 0-1.63-.94l-.36-2.54A1 1 0 0 0 12.9 1h-3.8a1 1 0 0 0-.99.86l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a1 1 0 0 0-1.2.45L.6 8.15a1 1 0 0 0 .23 1.3l2.03 1.58c-.03.31-.05.62-.05.94s.02.63.05.94L.83 14.5a1 1 0 0 0-.23 1.3l1.92 3.32a1 1 0 0 0 1.2.45l2.39-.96c.51.4 1.05.71 1.63.94l.36 2.54a1 1 0 0 0 .99.86h3.8a1 1 0 0 0 .99-.86l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96a1 1 0 0 0 1.2-.45l1.92-3.32a1 1 0 0 0-.23-1.3l-2.03-1.56ZM11 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
              </svg>
            </button>
            <button
              className="icon-btn icon-btn-danger"
              id="btnResetAll"
              type="button"
              title="Reset"
              aria-label="Reset all data"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h1v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7h1a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9Zm1 4a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm5 1v10a1 1 0 1 1-2 0V8a1 1 0 0 1 2 0Z" />
              </svg>
            </button>
          </div>
        </header>

        <nav className="nav" aria-label="Primary">
          <button className="nav-edge-toggle" id="navEdgeToggle" type="button" aria-label="Toggle sidebar" title="Toggle sidebar">
            <svg className="nav-edge-ico nav-edge-ico-expand" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.5 19a1 1 0 0 1-.7-.3l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 1 1 1.4 1.4L11.91 12l4.29 4.3A1 1 0 0 1 15.5 19Z" />
            </svg>
            <svg className="nav-edge-ico nav-edge-ico-collapse" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 19a1 1 0 0 1-.7-1.7l4.29-4.3-4.3-4.3a1 1 0 0 1 1.42-1.4l6 6a1 1 0 0 1 0 1.4l-6 6c-.2.2-.45.3-.71.3Z" />
            </svg>
          </button>
          <div className="nav-scroll" id="navScroll" aria-label="Sidebar">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  className={`nav-item${isActive ? " is-active" : ""}`}
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span className="nav-ico" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="main">{children}</main>

        <footer className="footer">
          <div className="footer-left">
            <div className="muted small">
              Local-first by default. Your data stays on this device unless you enable cloud sync.
            </div>
          </div>
          <div className="footer-right">
            <a className="footer-link" href="#" id="footerExport">
              Export
            </a>
            <a className="footer-link" href="#" id="footerPrivacy">
              Privacy
            </a>
            <a className="footer-link" href="#" id="footerDocs">
              Deploy
            </a>
          </div>
        </footer>
      </div>

      <div className="toast" id="toast" role="status" aria-live="polite" hidden />

      <div className="modal" id="quickAdd" hidden>
        <div className="modal-backdrop" data-close />
        <div className="modal-card" role="dialog" aria-modal="true" aria-label="Quick add">
          <div className="modal-head">
            <div>
              <div className="modal-title">Quick add</div>
              <div className="modal-sub muted">
                Add income, an expense, or an investment without leaving the dashboard.
              </div>
            </div>
            <button className="btn btn-quiet" type="button" data-close>
              Close
            </button>
          </div>
          <div className="modal-body">
            <div className="onboard-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <div className="onboard-step">
                <div className="onboard-kicker">Income</div>
                <div className="onboard-title">Add income</div>
                <div className="row row-gap">
                  <input id="qaIncomeDate" className="input" type="date" />
                  <input id="qaIncomeSource" className="input" type="text" placeholder="Source (e.g., Job)" />
                  <input id="qaIncomeAmount" className="input" type="number" step="0.01" placeholder="Amount" />
                  <button className="btn" id="qaAddIncome" type="button">
                    Add
                  </button>
                </div>
              </div>
              <div className="onboard-step">
                <div className="onboard-kicker">Expense</div>
                <div className="onboard-title">Add expense</div>
                <div className="row row-gap">
                  <input id="qaExpenseDate" className="input" type="date" />
                  <select id="qaExpenseCategory" className="select" />
                  <input id="qaExpenseAmount" className="input" type="number" step="0.01" placeholder="Amount" />
                  <input id="qaExpenseDesc" className="input" type="text" placeholder="Description" />
                  <input id="qaExpenseAccount" className="input" type="text" placeholder="Account" />
                  <button className="btn" id="qaAddExpense" type="button">
                    Add
                  </button>
                </div>
              </div>
              <div className="onboard-step">
                <div className="onboard-kicker">Invest</div>
                <div className="onboard-title">Add investment</div>
                <div className="row row-gap">
                  <input id="qaInvestDate" className="input" type="date" />
                  <select id="qaInvestInstrument" className="select" />
                  <input id="qaInvestAmount" className="input" type="number" step="0.01" placeholder="Amount" />
                  <button className="btn" id="qaAddInvest" type="button">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn btn-quiet" type="button" data-close>
              Done
            </button>
          </div>
        </div>
      </div>

      <div className="modal" id="onboarding" hidden>
        <div className="modal-backdrop" data-close />
        <div className="modal-card" role="dialog" aria-modal="true" aria-label="Welcome to budgetsimple">
          <div className="modal-head">
            <div>
              <div className="modal-title">Welcome to budgetsimple</div>
              <div className="modal-sub muted">3 steps to your first dashboard.</div>
            </div>
            <button className="btn btn-quiet" type="button" data-close>
              Close
            </button>
          </div>
          <div className="modal-body">
            <div className="onboard-grid">
              <div className="onboard-step">
                <div className="onboard-kicker">Step 1</div>
                <div className="onboard-title">Rent (optional)</div>
                <div className="onboard-text muted">Track rent even if it is missing from your CSV.</div>
                <div className="row row-gap">
                  <input id="onboardRent" className="input" type="number" step="0.01" placeholder="Monthly rent budget" />
                  <select id="onboardRentMode" className="select" aria-label="Rent mode" defaultValue="monthly">
                    <option value="monthly">Monthly</option>
                    <option value="once">Once</option>
                    <option value="off">Budget only</option>
                  </select>
                  <button className="btn" id="btnOnboardSaveRent" type="button">
                    Save
                  </button>
                </div>
              </div>
              <div className="onboard-step">
                <div className="onboard-kicker">Step 2</div>
                <div className="onboard-title">Import expenses</div>
                <div className="onboard-text muted">Upload your bank CSV and map columns once.</div>
                <div className="dropzone" id="onboardTxDropzone" role="button" tabIndex={0} aria-label="Upload transactions CSV in setup">
                  <div className="dropzone-title">Drop your transactions CSV here</div>
                  <div className="dropzone-sub muted">or</div>
                  <div className="row">
                    <input id="onboardTxCsvFile" className="input" type="file" accept=".csv,text/csv" hidden />
                    <button className="btn" id="btnOnboardChooseTxCsv" type="button">
                      Choose CSV
                    </button>
                    <button className="btn" id="btnOnboardLoadTxCsv" type="button" disabled>
                      Use file
                    </button>
                  </div>
                </div>
                <div className="row row-gap">
                  <button className="btn" id="btnGoImport" type="button">
                    Open Import
                  </button>
                </div>
              </div>
              <div className="onboard-step">
                <div className="onboard-kicker">Step 3</div>
                <div className="onboard-title">Add income</div>
                <div className="onboard-text muted">Import income or enter it manually (Job, Parents, etc.).</div>
                <div className="row row-gap">
                  <input id="onboardIncomeTotal" className="input" type="number" step="0.01" placeholder="Income total (optional)" />
                  <button className="btn" id="btnOnboardAddIncomeTotal" type="button">
                    Add
                  </button>
                </div>
                <div className="row row-gap">
                  <button className="btn" id="btnGoIncome" type="button">
                    Open Income
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn btn-quiet" id="btnOnboardDone" type="button">
              Done
            </button>
          </div>
        </div>
      </div>

      <div className="modal" id="envelopeModal" hidden>
        <div className="modal-backdrop" data-close />
        <div className="modal-card" role="dialog" aria-modal="true" aria-label="Envelope details">
          <div className="modal-head">
            <div>
              <div className="modal-title" id="envelopeModalTitle">
                Envelope
              </div>
              <div className="modal-sub muted" id="envelopeModalSub" />
            </div>
            <div className="row">
              <button className="btn btn-quiet" id="btnEditEnvelope" type="button">
                Edit
              </button>
              <button className="btn btn-quiet" type="button" data-close>
                Close
              </button>
            </div>
          </div>
          <div className="modal-body">
            <div className="row row-gap">
              <div className="chart-wrap" style={{ minHeight: 220, width: "100%" }}>
                <div id="envelopeChart" className="chart" role="img" aria-label="Envelope balance over time" />
                <div className="chart-empty" id="envelopeChartEmpty" hidden>
                  No contributions yet
                </div>
              </div>
            </div>
            <div className="panel" style={{ boxShadow: "none", border: "1px solid rgba(17,18,22,0.08)", marginTop: 12 }}>
              <div className="panel-head">
                <div>
                  <div className="panel-title">Add contribution</div>
                  <div className="panel-sub">Moves money into this goal.</div>
                </div>
                <div className="panel-actions">
                  <button className="icon-btn icon-btn-sm" id="btnToggleEnvelopeContrib" type="button" title="Add contribution" aria-label="Add contribution">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="panel-body">
                <div id="envelopeContribFormWrap" hidden>
                  <form id="envelopeContribForm" className="form">
                    <div className="row">
                      <input id="envelopeContribDate" className="input" type="date" required />
                      <select id="envelopeFromAccount" className="select" aria-label="From account" />
                      <select id="envelopeToAccount" className="select" aria-label="To account" />
                      <input id="envelopeContribAmount" className="input" type="number" step="0.01" placeholder="Amount" required />
                      <input id="envelopeContribNote" className="input" type="text" placeholder="Note (optional)" />
                      <button className="btn" type="submit">
                        Add
                      </button>
                      <button className="btn btn-quiet" id="btnCancelEnvelopeContrib" type="button">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
                <div className="table-wrap">
                  <table className="table" id="envelopeContribTable" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal" id="createAccountModal" hidden>
        <div className="modal-backdrop" data-close />
        <div className="modal-card" role="dialog" aria-modal="true" aria-label="Add account">
          <div className="modal-head">
            <div>
              <div className="modal-title" id="createAccountTitle">Add account</div>
              <div className="modal-sub muted" id="createAccountSub">Name and type for importing transactions.</div>
            </div>
            <button className="btn btn-quiet" type="button" data-close>
              Close
            </button>
          </div>
          <div className="modal-body">
            <form className="form" id="createAccountForm">
              <div className="row">
                <input id="createAccountName" className="input" type="text" placeholder="Account name" required />
                <select id="createAccountKind" className="select" defaultValue="bank">
                  <option value="bank">Bank</option>
                  <option value="savings">Savings</option>
                  <option value="brokerage">Brokerage</option>
                  <option value="cash">Cash</option>
                </select>
                <button className="btn" id="createAccountSubmit" type="submit">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="modal" id="createEnvelopeModal" hidden>
        <div className="modal-backdrop" data-close />
        <div className="modal-card" role="dialog" aria-modal="true" aria-label="Create envelope">
          <div className="modal-head">
            <div>
              <div className="modal-title" id="createEnvelopeTitle">Create envelope</div>
              <div className="modal-sub muted" id="createEnvelopeSub">Set a goal and target amount.</div>
            </div>
            <button className="btn btn-quiet" type="button" data-close>
              Close
            </button>
          </div>
          <div className="modal-body">
            <form className="form" id="createEnvelopeForm">
              <div className="row">
                <input id="createEnvelopeName" className="input" type="text" placeholder="Envelope name" required />
                <input id="createEnvelopeTarget" className="input" type="number" step="0.01" placeholder="Target amount" required />
                <button className="btn" type="submit">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <AppRuntime />
    </>
  );
}
