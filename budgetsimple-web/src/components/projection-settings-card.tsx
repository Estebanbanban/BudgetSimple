"use client";

import { formatMoney } from "@/lib/money";
import type { ContributionMode } from "@/lib/plan-settings";
import { SegmentedControl } from "@/components/ui/segmented-control";

type Preset = "conservative" | "base" | "aggressive" | "custom";

export default function ProjectionSettingsCard({
  startingNetWorth,
  currency,
  annualReturn,
  contributionMode,
  manualMonthlyContribution,
  autoMonthlyContribution,
  autoMonthlyContributionNote,
  onChange,
  onCommit,
}: {
  startingNetWorth: number;
  currency: string;
  annualReturn: number;
  contributionMode: ContributionMode;
  manualMonthlyContribution: number;
  autoMonthlyContribution: number;
  autoMonthlyContributionNote?: string;
  onChange: (patch: Partial<{
    startingNetWorth: number;
    currency: string;
    annualReturn: number;
    contributionMode: ContributionMode;
    manualMonthlyContribution: number;
  }>) => void;
  onCommit: () => void;
}) {
  const percent = Math.round(annualReturn * 1000) / 10;
  const preset: Preset =
    percent === 5 ? "conservative" : percent === 7 ? "base" : percent === 9 ? "aggressive" : "custom";

  return (
    <section className="panel" aria-label="Projection settings">
      <div className="panel-head">
        <div>
          <div className="panel-title">Projection settings</div>
          <div className="panel-sub">These settings control how projections and ETAs are computed.</div>
        </div>
      </div>
      <div className="panel-body">
        <div className="form">
          <div className="row">
            <div style={{ flex: "1 1 240px" }}>
              <label className="label" htmlFor="planStartingNetWorth">
                Starting net worth
              </label>
              <div className="row" style={{ gap: 10 }}>
                <input
                  id="planStartingNetWorth"
                  className="input"
                  type="number"
                  step="0.01"
                  value={Number.isFinite(startingNetWorth) ? startingNetWorth : 0}
                  onChange={(e) => onChange({ startingNetWorth: Number(e.target.value || 0) })}
                  onBlur={onCommit}
                  placeholder="0"
                />
                <select
                  className="select"
                  value={currency}
                  onChange={(e) => {
                    onChange({ currency: e.target.value });
                    onCommit();
                  }}
                  aria-label="Currency"
                  style={{ maxWidth: 110 }}
                >
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CHF">CHF</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
              <div className="panel-note">The starting point for your net worth trajectory.</div>
            </div>

            <div style={{ flex: "1 1 240px" }}>
              <label className="label" htmlFor="planAnnualReturn">
                Annual return (%)
              </label>
              <div className="row" style={{ gap: 10 }}>
                <input
                  id="planAnnualReturn"
                  className="input"
                  type="number"
                  step="0.1"
                  min="0"
                  value={Number.isFinite(percent) ? percent : 7}
                  onChange={(e) => onChange({ annualReturn: Number(e.target.value || 0) / 100 })}
                  onBlur={onCommit}
                  placeholder="7.0"
                />
                <SegmentedControl<Preset>
                  ariaLabel="Return presets"
                  value={preset}
                  onChange={(p) => {
                    if (p === "conservative") onChange({ annualReturn: 0.05 });
                    if (p === "base") onChange({ annualReturn: 0.07 });
                    if (p === "aggressive") onChange({ annualReturn: 0.09 });
                    onCommit();
                  }}
                  options={[
                    { value: "conservative", label: "Conservative" },
                    { value: "base", label: "Base" },
                    { value: "aggressive", label: "Aggressive" },
                  ]}
                />
              </div>
              <div className="panel-note">Used to estimate compounding growth month-to-month.</div>
            </div>
          </div>

          <div className="divider" />

          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              Monthly contribution
            </div>

            <div className="row" style={{ justifyContent: "space-between" }}>
              <SegmentedControl<ContributionMode>
                ariaLabel="Contribution mode"
                value={contributionMode}
                onChange={(m) => {
                  onChange({ contributionMode: m });
                  onCommit();
                }}
                options={[
                  { value: "auto", label: "Auto from cashflow" },
                  { value: "manual", label: "Manual" },
                ]}
              />

              {contributionMode === "auto" ? (
                <div className="small muted" style={{ textAlign: "right" }}>
                  Auto estimate: <b>{formatMoney(autoMonthlyContribution, currency)}/mo</b>
                  {autoMonthlyContributionNote ? ` (${autoMonthlyContributionNote})` : ""}
                </div>
              ) : null}
            </div>

            {contributionMode === "manual" ? (
              <div style={{ marginTop: 10 }}>
                <label className="label" htmlFor="planManualContribution">
                  Manual monthly contribution
                </label>
                <div className="row">
                  <input
                    id="planManualContribution"
                    className="input"
                    type="number"
                    step="0.01"
                    value={Number.isFinite(manualMonthlyContribution) ? manualMonthlyContribution : 0}
                    onChange={(e) =>
                      onChange({ manualMonthlyContribution: Number(e.target.value || 0) })
                    }
                    onBlur={onCommit}
                    placeholder="0"
                  />
                  <div className="small muted" style={{ minWidth: 160 }}>
                    Used for projection and milestone ETA.
                  </div>
                </div>
              </div>
            ) : (
              <div className="panel-note">Auto uses your last full month of net cashflow.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

