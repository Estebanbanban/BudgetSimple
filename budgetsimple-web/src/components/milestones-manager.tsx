"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  calculateMilestoneProgress,
  formatCurrency,
  formatDate,
  type Milestone,
  type MilestoneProgress,
} from "@/lib/milestones-local";

export interface MilestonesManagerRef {
  showAddForm: () => void;
}

const MilestonesManager = forwardRef<MilestonesManagerRef>((props, ref) => {
  const [showAddForm, setShowAddForm] = useState(false);

  useImperativeHandle(ref, () => ({
    showAddForm: () => setShowAddForm(true),
  }));
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progresses, setProgresses] = useState<Map<string, MilestoneProgress>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    targetValue: "",
    targetDate: "",
    type: "net_worth" as "net_worth" | "invested_assets" | "savings",
  });

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    setLoading(true);
    try {
      const ms = await getMilestones();
      setMilestones(ms);

      // Calculate progress for each milestone
      const progressMap = new Map<string, MilestoneProgress>();
      for (const milestone of ms) {
        const progress = await calculateMilestoneProgress(milestone);
        if (progress) {
          progressMap.set(milestone.id, progress);
        }
      }
      setProgresses(progressMap);
    } catch (error) {
      console.error("Error loading milestones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const milestone = await createMilestone({
      label: formData.label,
      targetValue: parseFloat(formData.targetValue) || 0,
      targetDate: formData.targetDate || undefined,
      type: formData.type,
      displayOrder: milestones.length,
    });

    if (milestone) {
      await loadMilestones();
      setShowAddForm(false);
      setFormData({
        label: "",
        targetValue: "",
        targetDate: "",
        type: "net_worth",
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const updated = await updateMilestone(editingId, {
      label: formData.label,
      targetValue: parseFloat(formData.targetValue) || 0,
      targetDate: formData.targetDate || undefined,
      type: formData.type,
    });

    if (updated) {
      await loadMilestones();
      setEditingId(null);
      setFormData({
        label: "",
        targetValue: "",
        targetDate: "",
        type: "net_worth",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this milestone?")) {
      await deleteMilestone(id);
      await loadMilestones();
    }
  };

  const startEdit = (milestone: Milestone) => {
    setEditingId(milestone.id);
    setFormData({
      label: milestone.label,
      targetValue: milestone.target_value.toString(),
      targetDate: milestone.target_date || "",
      type: milestone.type,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      label: "",
      targetValue: "",
      targetDate: "",
      type: "net_worth",
    });
  };

  if (loading) {
    return <div className="small muted">Loading milestones...</div>;
  }

  return (
    <div data-milestone-manager>
      {milestones.length > 0 && (
        <div>
          {/* Compact list view for all milestones */}
          {milestones.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>Target</th>
                    <th>Target Date</th>
                    <th>Progress</th>
                    <th>ETA</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((milestone) => {
                    const progress = progresses.get(milestone.id);
                    const progressPercent = progress
                      ? Math.round(progress.progressPercent)
                      : 0;
                    return (
                      <tr
                        key={milestone.id}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          (window.location.href = `/plan/milestone/${milestone.id}`)
                        }
                      >
                        <td style={{ fontWeight: "500" }}>{milestone.label}</td>
                        <td>{formatCurrency(milestone.target_value)}</td>
                        <td>
                          {milestone.target_date
                            ? formatDate(milestone.target_date)
                            : "—"}
                        </td>
                        <td>
                          {progress ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  width: "60px",
                                  height: "8px",
                                  background: "#f1f5f9",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      progress.progressPercent
                                    )}%`,
                                    height: "100%",
                                    background:
                                      progressPercent >= 75
                                        ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                                        : progressPercent >= 50
                                        ? "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)"
                                        : progressPercent >= 25
                                        ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"
                                        : "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
                                    transition: "width 0.3s ease",
                                  }}
                                />
                              </div>
                              <span
                                style={{ fontSize: "12px", minWidth: "40px" }}
                              >
                                {progress.progressPercent.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {progress?.etaDate
                            ? formatDate(progress.etaDate)
                            : "—"}
                        </td>
                        <td>
                          {progress && progress.status !== "no_data" && (
                            <span
                              className={`badge ${
                                progress.status === "ahead"
                                  ? "text-success"
                                  : progress.status === "on_track"
                                  ? "text-info"
                                  : "text-warning"
                              }`}
                            >
                              {progress.status.replace("_", " ")}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <a
                              href={`/plan/milestone/${milestone.id}`}
                              className="btn btn-sm"
                              style={{ textDecoration: "none" }}
                            >
                              See more
                            </a>
                            <button
                              className="btn btn-sm btn-quiet"
                              onClick={() => startEdit(milestone)}
                              data-milestone-edit={milestone.id}
                              style={{ textDecoration: "none" }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-quiet"
                              onClick={() => handleDelete(milestone.id)}
                              style={{ textDecoration: "none" }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Edit form modal */}
          {editingId && (
            <div className="panel" style={{ marginTop: "1rem" }}>
              <div className="panel-head">
                <div className="panel-title">Edit Milestone</div>
                <button className="btn btn-quiet" onClick={cancelEdit}>
                  Close
                </button>
              </div>
              <div className="panel-body">
                <form onSubmit={handleUpdate}>
                  <div className="form">
                    <div className="row">
                      <label className="label">Label</label>
                      <input
                        className="input"
                        value={formData.label}
                        onChange={(e) =>
                          setFormData({ ...formData, label: e.target.value })
                        }
                        placeholder="Milestone label"
                        required
                      />
                    </div>
                    <div className="row">
                      <label className="label">Target Value</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={formData.targetValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetValue: e.target.value,
                          })
                        }
                        placeholder="Target value"
                        required
                      />
                    </div>
                    <div className="row">
                      <label className="label">Type</label>
                      <select
                        className="select"
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            type: e.target.value as any,
                          })
                        }
                      >
                        <option value="net_worth">Net Worth</option>
                        <option value="invested_assets">Invested Assets</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>
                    <div className="row">
                      <label className="label">Target Date (Optional)</label>
                      <input
                        className="input"
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="row">
                      <button className="btn btn-accent" type="submit">
                        Save Changes
                      </button>
                      <button
                        className="btn btn-quiet"
                        type="button"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showAddForm && (
            <div
              className="card"
              style={{ padding: "1rem", marginTop: "1rem" }}
            >
              <form onSubmit={handleAdd}>
                <div className="row" style={{ marginBottom: "0.5rem" }}>
                  <input
                    className="input"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    placeholder="Milestone label (e.g., 'Save $50k')"
                    required
                  />
                </div>
                <div
                  className="row"
                  style={{ gap: "0.5rem", marginBottom: "0.5rem" }}
                >
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={formData.targetValue}
                    onChange={(e) =>
                      setFormData({ ...formData, targetValue: e.target.value })
                    }
                    placeholder="Target value"
                    required
                  />
                  <select
                    className="select"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any })
                    }
                  >
                    <option value="net_worth">Net Worth</option>
                    <option value="invested_assets">Invested Assets</option>
                    <option value="savings">Savings</option>
                  </select>
                  <input
                    className="input"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) =>
                      setFormData({ ...formData, targetDate: e.target.value })
                    }
                    placeholder="Target date (optional)"
                  />
                </div>
                <div className="row" style={{ gap: "0.5rem" }}>
                  <button
                    className="btn btn-sm"
                    type="submit"
                    data-milestone-add
                    style={{ textDecoration: "none" }}
                  >
                    Add Milestone
                  </button>
                  <button
                    className="btn btn-sm btn-quiet"
                    type="button"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MilestonesManager.displayName = "MilestonesManager";

export default MilestonesManager;
