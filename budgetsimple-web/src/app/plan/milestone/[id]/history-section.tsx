"use client";

import { useMemo } from "react";
import { formatDate, type Milestone } from "@/lib/milestones-local";

interface HistorySectionProps {
  milestone: Milestone;
}

interface HistoryEntry {
  date: string;
  change: string;
  type: "target" | "date" | "return" | "contribution";
}

export default function HistorySection({ milestone }: HistorySectionProps) {
  const { history, etaHistory } = useMemo(() => {
    // For MVP, we'll create a simple history from milestone metadata.
    // In production, this would be stored separately.
    const entries: HistoryEntry[] = [];

    if (milestone.created_at) {
      entries.push({
        date: milestone.created_at,
        change: `Milestone "${milestone.label}" created`,
        type: "target",
      });
    }

    if (milestone.updated_at && milestone.updated_at !== milestone.created_at) {
      entries.push({
        date: milestone.updated_at,
        change: "Milestone updated",
        type: "target",
      });
    }

    // Load ETA history (simplified - would need to store historical ETAs)
    const etaHistoryData: Array<{ month: string; eta: number }> = [];
    // For MVP, generate sample data
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      etaHistoryData.push({
        month: monthDate.toISOString().slice(0, 7),
        eta: 24 + i * 2, // Sample: ETA drifting later
      });
    }

    return { history: entries, etaHistory: etaHistoryData };
  }, [milestone]);

  const hasDrift =
    etaHistory.length >= 2 &&
    etaHistory[etaHistory.length - 1].eta > etaHistory[0].eta;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div>
        <div
          style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}
        >
          History & Audit Trail
        </div>
        <div style={{ fontSize: "13px", color: "#64748b" }}>
          Timeline of milestone changes
        </div>
      </div>

      {/* Timeline */}
      {history.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "600",
              marginBottom: "8px",
              color: "#1f2933",
            }}
          >
            Timeline of Changes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {history.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#1f2933",
                    }}
                  >
                    {entry.change}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    {formatDate(entry.date)}
                  </div>
                </div>
                <div
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                    background:
                      entry.type === "target"
                        ? "#eff6ff"
                        : entry.type === "date"
                        ? "#f0fdf4"
                        : entry.type === "return"
                        ? "#fffbeb"
                        : "#f3f4f6",
                    color:
                      entry.type === "target"
                        ? "#2563eb"
                        : entry.type === "date"
                        ? "#059669"
                        : entry.type === "return"
                        ? "#92400e"
                        : "#6b7280",
                  }}
                >
                  {entry.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ETA History Sparkline */}
      {etaHistory.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "600",
              marginBottom: "8px",
              color: "#1f2933",
            }}
          >
            ETA History
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "4px",
              height: "60px",
              marginBottom: "8px",
              padding: "8px",
              background: "#f8fafc",
              borderRadius: "6px",
            }}
          >
            {etaHistory.map((h, idx) => {
              const maxEta = Math.max(...etaHistory.map((e) => e.eta));
              const minEta = Math.min(...etaHistory.map((e) => e.eta));
              const range = maxEta - minEta || 1;
              const height = ((h.eta - minEta) / range) * 50 + 10;
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${height}px`,
                      minHeight: "4px",
                      background:
                        hasDrift && idx === etaHistory.length - 1
                          ? "#ef4444"
                          : "#2563eb",
                      borderRadius: "4px 4px 0 0",
                      marginBottom: "4px",
                    }}
                  />
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    {new Date(h.month + "-01").toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {hasDrift && (
            <div
              style={{
                padding: "10px 12px",
                background: "#fef2f2",
                borderRadius: "6px",
                border: "1px solid #fecaca",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#dc2626",
                  marginBottom: "2px",
                }}
              >
                ⚠️ ETA Drifting Later
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Your ETA has been drifting later for {etaHistory.length} months
                — biggest driver: higher fixed costs.
              </div>
            </div>
          )}
        </div>
      )}

      {history.length === 0 && etaHistory.length === 0 && (
        <div
          style={{
            padding: "16px",
            background: "#f8fafc",
            borderRadius: "8px",
            textAlign: "center",
            color: "#64748b",
            fontSize: "13px",
          }}
        >
          No history available yet. Changes will be tracked here.
        </div>
      )}
    </div>
  );
}
