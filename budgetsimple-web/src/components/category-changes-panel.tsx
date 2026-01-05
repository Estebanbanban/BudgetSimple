"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CategoryChange = {
  category: string;
  change: number;
  percent: number;
  direction: "increase" | "decrease";
  drilldownUrl?: string;
  label?: string;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const MOM_ENDPOINT = `${API_BASE}/api/mom`;

export default function CategoryChangesPanel() {
  const [changes, setChanges] = useState<CategoryChange[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function fetchChanges() {
      try {
        const response = await fetch(`${MOM_ENDPOINT}?userId=demo-user`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`MoM API responded with ${response.status}`);
        }

        const payload = (await response.json()) as { changes?: unknown };
        const normalized: CategoryChange[] = (Array.isArray(payload?.changes)
          ? payload?.changes
          : [])
          .filter((item): item is CategoryChange => {
            if (typeof item !== "object" || item === null) return false;
            const candidate = item as Record<string, unknown>;
            return (
              typeof candidate.category === "string" &&
              typeof candidate.change === "number" &&
              typeof candidate.percent === "number" &&
              (candidate.direction === "increase" ||
                candidate.direction === "decrease")
            );
          })
          .slice(0, 5);

        if (!active) return;

        setChanges(normalized);
        setStatus("ready");
      } catch (error: unknown) {
        if (!active) return;
        console.error("Unable to load MoM changes", error);
        setErrorMessage("Unable to load changes right now.");
        setStatus("error");
      }
    }

    fetchChanges();

    return () => {
      active = false;
    };
  }, []);

  const visibleChanges = useMemo(() => changes.slice(0, 5), [changes]);
  const hasPartialData = status === "ready" && visibleChanges.length > 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);

  const buildFallbackLink = (category: string) => {
    const params = new URLSearchParams({
      source: "category-spike",
      category,
    });
    return `/cashflow?${params.toString()}`;
  };

  return (
    <section className="panel" id="categoryChangesPanel">
      <div className="panel-head">
        <div>
          <div className="panel-title">What Changed</div>
          <div className="panel-sub">
            Top category deltas (month over month)
          </div>
        </div>
      </div>
      <div className="panel-body">
        {status === "loading" && (
          <div
            className="chart-empty"
            data-testid="category-changes-loading"
            role="status"
          >
            Loading changes...
          </div>
        )}

        {status === "error" && (
          <div
            className="chart-empty"
            data-testid="category-changes-error"
            role="alert"
          >
            {errorMessage || "Unable to load changes right now."}
          </div>
        )}

        {status === "ready" && visibleChanges.length === 0 && (
          <div className="chart-empty" id="categoryChangesEmpty">
            Need at least two months of data to see category changes.
          </div>
        )}

        {hasPartialData && (
          <div className="action-list" id="categoryChangesList">
            {visibleChanges.map((change) => {
              const isDecrease = change.direction === "decrease";
              const directionArrow = isDecrease ? "↓" : "↑";
              const colorClass = isDecrease ? "text-success" : "text-danger";
              const summaryLabel =
                change.label ||
                `${directionArrow} ${formatCurrency(Math.abs(change.change))} (${Math.abs(change.percent).toFixed(1)}%)`;
              const href = change.drilldownUrl || buildFallbackLink(change.category);

              return (
                <div className="action-item" key={change.category}>
                  <div>
                    <div className="action-title">
                      {change.category}
                      <span className={`small ${colorClass}`} style={{ marginLeft: 8 }}>
                        {summaryLabel}
                      </span>
                    </div>
                    <div className="action-sub">
                      {isDecrease
                        ? "Lower spend than last month"
                        : "Higher spend than last month"}
                    </div>
                  </div>
                  <Link
                    className="btn btn-quiet"
                    href={href}
                    prefetch={false}
                    data-testid="category-changes-link"
                  >
                    See details
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {hasPartialData && visibleChanges.length < 3 && (
          <div className="panel-note">
            More data points will surface additional category changes.
          </div>
        )}
      </div>
    </section>
  );
}

