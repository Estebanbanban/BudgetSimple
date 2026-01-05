/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateETA,
  generateProjectionCurves,
  type ProjectionCurve,
  type ProjectionInputs,
} from "@/lib/milestone-projection";
import { formatMoney } from "@/lib/money";
import { SegmentedControl } from "@/components/ui/segmented-control";

type Scenario = "Base" | "Conservative" | "Aggressive";
type Horizon = "5y" | "10y" | "target";

export type FocusMilestone = {
  id: string;
  label: string;
  targetValue: number;
  targetDate?: string;
};

interface MilestoneGraphProps {
  currentNetWorth: number;
  monthlyContribution: number;
  annualReturn: number;
  currency?: string;
  focusMilestone?: FocusMilestone;
  defaultScenario?: Scenario;
  defaultHorizon?: Horizon;
}

export default function MilestoneGraph({
  currentNetWorth,
  monthlyContribution,
  annualReturn,
  currency = "USD",
  focusMilestone,
  defaultScenario = "Base",
  defaultHorizon = "10y",
}: MilestoneGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverPoint, setHoverPoint] = useState<{
    x: number;
    y: number;
    data: any;
  } | null>(null);
  const [scenario, setScenario] = useState<Scenario>(defaultScenario);
  const [horizon, setHorizon] = useState<Horizon>(defaultHorizon);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [curves, setCurves] = useState<ProjectionCurve[]>([]);

  const toTargetMonths = useMemo(() => {
    if (!focusMilestone) return 120;
    if (focusMilestone.targetDate) {
      const start = new Date();
      const end = new Date(focusMilestone.targetDate);
      const months = Math.max(
        1,
        (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth())
      );
      return Math.min(Math.max(months, 12), 240);
    }
    // No target date: use projected hit date (base) as a reasonable "to target".
    const eta = calculateETA(
      {
        currentNetWorth,
        monthlyContribution,
        annualReturn,
        monthsToProject: 120,
      },
      focusMilestone.targetValue
    );
    if (!eta) return 120;
    return Math.min(Math.max(eta.month, 12), 240);
  }, [focusMilestone, currentNetWorth, monthlyContribution, annualReturn]);

  const monthsToProject = horizon === "5y" ? 60 : horizon === "10y" ? 120 : toTargetMonths;

  useEffect(() => {
    const inputs: ProjectionInputs = {
      currentNetWorth,
      monthlyContribution,
      annualReturn,
      monthsToProject,
    };
    const next = generateProjectionCurves(inputs);
    setCurves(next);
    // Defer draw to next frame so layout widths are up-to-date.
    requestAnimationFrame(() => drawGraph(next));
  }, [currentNetWorth, monthlyContribution, annualReturn, monthsToProject, scenario, focusMilestone]);

  useEffect(() => {
    const onResize = () => {
      if (curves.length > 0) requestAnimationFrame(() => drawGraph(curves));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [curves]);

  const drawGraph = (projectionCurves: ProjectionCurve[]) => {
    if (!svgRef.current || projectionCurves.length === 0) return;

    const svg = svgRef.current;
    const container = svg.parentElement;
    const width = Math.max(640, container?.clientWidth || svg.clientWidth || 800);
    const height = 360;
    const padding = { top: 18, right: 18, bottom: 38, left: 66 };

    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());
    svg.innerHTML = "";

    const maxFromCurves = Math.max(...projectionCurves.flatMap((c) => c.points.map((p) => p.netWorth)), 1);
    const maxNetWorth = Math.max(maxFromCurves, focusMilestone?.targetValue ?? 0);
    const maxMonth = Math.max(...projectionCurves[0].points.map((p) => p.month), 1);

    const xScale = (month: number) =>
      padding.left + (month / maxMonth) * (width - padding.left - padding.right);
    const yScale = (value: number) =>
      height - padding.bottom - (value / maxNetWorth) * (height - padding.top - padding.bottom);

    const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // Horizontal grid + y labels (4 ticks)
    for (let i = 0; i <= 4; i++) {
      const value = (maxNetWorth / 4) * i;
      const y = yScale(value);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", padding.left.toString());
      line.setAttribute("x2", (width - padding.right).toString());
      line.setAttribute("y1", y.toString());
      line.setAttribute("y2", y.toString());
      line.setAttribute("stroke", "rgba(17,18,22,0.08)");
      line.setAttribute("stroke-width", "1");
      grid.appendChild(line);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", (padding.left - 10).toString());
      text.setAttribute("y", (y + 4).toString());
      text.setAttribute("font-size", "11");
      text.setAttribute("fill", "rgba(17,18,22,0.55)");
      text.setAttribute("text-anchor", "end");
      text.textContent = formatMoney(value, currency);
      grid.appendChild(text);
    }

    // Vertical grid (6 ticks)
    for (let i = 0; i <= 6; i++) {
      const month = (maxMonth / 6) * i;
      const x = xScale(month);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x.toString());
      line.setAttribute("x2", x.toString());
      line.setAttribute("y1", padding.top.toString());
      line.setAttribute("y2", (height - padding.bottom).toString());
      line.setAttribute("stroke", "rgba(17,18,22,0.05)");
      line.setAttribute("stroke-width", "1");
      grid.appendChild(line);
    }

    svg.appendChild(grid);

    // Target line + hit marker for the active curve
    if (focusMilestone) {
      const y = yScale(focusMilestone.targetValue);
      const targetLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      targetLine.setAttribute("x1", padding.left.toString());
      targetLine.setAttribute("x2", (width - padding.right).toString());
      targetLine.setAttribute("y1", y.toString());
      targetLine.setAttribute("y2", y.toString());
      targetLine.setAttribute("stroke", "rgba(244, 183, 64, 0.70)");
      targetLine.setAttribute("stroke-width", "2");
      targetLine.setAttribute("stroke-dasharray", "6,6");
      svg.appendChild(targetLine);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", (width - padding.right).toString());
      label.setAttribute("y", (y - 8).toString());
      label.setAttribute("font-size", "11");
      label.setAttribute("fill", "rgba(146, 64, 14, 0.92)");
      label.setAttribute("text-anchor", "end");
      label.textContent = `${focusMilestone.label} target`;
      svg.appendChild(label);

      const active = projectionCurves.find((c) => c.label === scenario) ?? projectionCurves[0];
      const eta = calculateETA(
        {
          currentNetWorth,
          monthlyContribution,
          annualReturn: annualReturn, // ETA uses base return; scenario affects curve choice below
          monthsToProject,
        },
        focusMilestone.targetValue
      );
      // Better: compute ETA using the active curve points directly.
      const hitPoint = active?.points.find((p) => p.netWorth >= focusMilestone.targetValue) ?? null;
      if (hitPoint) {
        const x = xScale(hitPoint.month);
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", x.toString());
        dot.setAttribute("cy", y.toString());
        dot.setAttribute("r", "6");
        dot.setAttribute("fill", "rgba(244, 183, 64, 0.92)");
        svg.appendChild(dot);

        const hitText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        hitText.setAttribute("x", x.toString());
        hitText.setAttribute("y", (y + 18).toString());
        hitText.setAttribute("font-size", "11");
        hitText.setAttribute("fill", "rgba(17,18,22,0.66)");
        hitText.setAttribute("text-anchor", "middle");
        hitText.textContent = new Date(hitPoint.date).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        svg.appendChild(hitText);
      } else if (eta) {
        // no-op: eta exists but beyond horizon; keep target line only
      }
    }

    // Curves: render active prominent, others faint (premium but not noisy)
    projectionCurves.forEach((curve) => {
      const isActive = curve.label === scenario;
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const d = curve.points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.month)} ${yScale(p.netWorth)}`)
        .join(" ");
      path.setAttribute("d", d);
      path.setAttribute("stroke", curve.color);
      path.setAttribute("stroke-width", isActive ? "3" : "2");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", isActive ? "1" : "0.18");
      group.appendChild(path);

      // Hover points on active curve only
      if (isActive) {
        curve.points.forEach((point, i) => {
          if (i % 4 !== 0) return;
          const cx = xScale(point.month);
          const cy = yScale(point.netWorth);
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", cx.toString());
          circle.setAttribute("cy", cy.toString());
          circle.setAttribute("r", "7");
          circle.setAttribute("fill", "transparent");
          circle.setAttribute("style", "cursor: default");
          circle.addEventListener("mouseenter", () => setHoverPoint({ x: cx, y: cy, data: { ...point, label: curve.label } }));
          circle.addEventListener("mouseleave", () => setHoverPoint(null));
          group.appendChild(circle);
        });
      }

      svg.appendChild(group);
    });

    // Axis labels
    const xAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xAxisLabel.setAttribute("x", (width / 2).toString());
    xAxisLabel.setAttribute("y", (height - 10).toString());
    xAxisLabel.setAttribute("font-size", "12");
    xAxisLabel.setAttribute("fill", "rgba(17,18,22,0.55)");
    xAxisLabel.setAttribute("text-anchor", "middle");
    xAxisLabel.textContent = "Time";
    svg.appendChild(xAxisLabel);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Net worth projection</div>
          <div className="panel-sub">Compounding + monthly contributions</div>
        </div>
        <div className="panel-actions" style={{ flexWrap: "wrap" }}>
          <SegmentedControl<Scenario>
            ariaLabel="Scenario"
            value={scenario}
            onChange={setScenario}
            options={[
              { value: "Conservative", label: "Conservative" },
              { value: "Base", label: "Base" },
              { value: "Aggressive", label: "Aggressive" },
            ]}
          />
          <SegmentedControl<Horizon>
            ariaLabel="Horizon"
            value={horizon}
            onChange={setHorizon}
            options={[
              { value: "5y", label: "5y" },
              { value: "10y", label: "10y" },
              { value: "target", label: "To target" },
            ]}
          />
          <label className="toggle" title="Show tooltip breakdown">
            <input
              type="checkbox"
              checked={showBreakdown}
              onChange={(e) => setShowBreakdown(e.target.checked)}
            />
            <span>Breakdown</span>
          </label>
        </div>
      </div>
      <div className="panel-body">
        <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <svg
            ref={svgRef}
            style={{ width: "100%", height: 360, display: "block" }}
            viewBox="0 0 800 360"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Net worth projection chart"
          />

          {hoverPoint && (
            <div
              style={{
                position: "absolute",
                left: hoverPoint.x + 12,
                top: hoverPoint.y - 14,
                background: "rgba(255,255,255,0.98)",
                padding: "10px 12px",
                borderRadius: "12px",
                boxShadow: "0 18px 48px rgba(17,18,22,0.18)",
                border: "1px solid rgba(17,18,22,0.10)",
                fontSize: "12px",
                zIndex: 10,
                pointerEvents: "none",
                minWidth: 200,
              }}
            >
              <div style={{ fontWeight: 750, letterSpacing: "-0.01em", marginBottom: 6 }}>
                {hoverPoint.data.label}
              </div>
              <div style={{ color: "rgba(17,18,22,0.72)" }}>
                {new Date(hoverPoint.data.date).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div style={{ fontWeight: 750, marginTop: 4 }}>
                {formatMoney(hoverPoint.data.netWorth, currency)}
              </div>
              {showBreakdown && (
                <div style={{ marginTop: 6, color: "rgba(17,18,22,0.65)" }}>
                  <div>Contributions: {formatMoney(hoverPoint.data.contributions, currency)}</div>
                  <div>Growth: {formatMoney(hoverPoint.data.growth, currency)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="panel-note">
          Monthly compounding: \(NW(t+1) = NW(t)\times(1+r) + C\)
        </div>
      </div>
    </div>
  );
}

