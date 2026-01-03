'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { 
  getMilestones, 
  createMilestone, 
  updateMilestone, 
  deleteMilestone,
  calculateMilestoneProgress,
  formatCurrency,
  formatDate,
  type Milestone,
  type MilestoneProgress
} from '@/lib/milestones-local'

export interface MilestonesManagerRef {
  showAddForm: () => void
}

const MilestonesManager = forwardRef<MilestonesManagerRef>((props, ref) => {
  const [showAddForm, setShowAddForm] = useState(false)
  
  useImperativeHandle(ref, () => ({
    showAddForm: () => setShowAddForm(true)
  }))
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [progresses, setProgresses] = useState<Map<string, MilestoneProgress>>(new Map())
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    label: '',
    targetValue: '',
    targetDate: '',
    type: 'net_worth' as 'net_worth' | 'invested_assets' | 'savings'
  })

  useEffect(() => {
    loadMilestones()
  }, [])

  const loadMilestones = async () => {
    setLoading(true)
    try {
      const ms = await getMilestones()
      setMilestones(ms)
      
      // Calculate progress for each milestone
      const progressMap = new Map<string, MilestoneProgress>()
      for (const milestone of ms) {
        const progress = await calculateMilestoneProgress(milestone)
        if (progress) {
          progressMap.set(milestone.id, progress)
        }
      }
      setProgresses(progressMap)
    } catch (error) {
      console.error('Error loading milestones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const milestone = await createMilestone({
      label: formData.label,
      targetValue: parseFloat(formData.targetValue) || 0,
      targetDate: formData.targetDate || undefined,
      type: formData.type,
      displayOrder: milestones.length
    })
    
    if (milestone) {
      await loadMilestones()
      setShowAddForm(false)
      setFormData({ label: '', targetValue: '', targetDate: '', type: 'net_worth' })
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Milestone>) => {
    const updated = await updateMilestone(id, {
      label: updates.label,
      targetValue: updates.target_value,
      targetDate: updates.target_date,
      type: updates.type,
      displayOrder: updates.display_order
    })
    
    if (updated) {
      await loadMilestones()
      setEditingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      await deleteMilestone(id)
      await loadMilestones()
    }
  }

  const startEdit = (milestone: Milestone) => {
    setEditingId(milestone.id)
    setFormData({
      label: milestone.label,
      targetValue: milestone.target_value.toString(),
      targetDate: milestone.target_date || '',
      type: milestone.type
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ label: '', targetValue: '', targetDate: '', type: 'net_worth' })
  }

  if (loading) {
    return <div className="small muted">Loading milestones...</div>
  }

  return (
    <div>
      {milestones.length === 0 && !showAddForm ? (
        <div className="chart-empty">
          No milestones yet. Click "Add Milestone" to create your first financial goal.
        </div>
      ) : (
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
                    const progress = progresses.get(milestone.id)
                    return (
                      <tr key={milestone.id}>
                        <td style={{ fontWeight: '500' }}>{milestone.label}</td>
                        <td>{formatCurrency(milestone.target_value)}</td>
                        <td>{milestone.target_date ? formatDate(milestone.target_date) : '—'}</td>
                        <td>
                          {progress ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ 
                                width: '60px', 
                                height: '6px', 
                                background: '#e5e7eb', 
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${Math.min(100, progress.progressPercent)}%`,
                                  height: '100%',
                                  background: progress.progressPercent >= 100 ? '#10b981' : '#3b82f6',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '12px', minWidth: '40px' }}>
                                {progress.progressPercent.toFixed(1)}%
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                        <td>{progress?.etaDate ? formatDate(progress.etaDate) : '—'}</td>
                        <td>
                          {progress && progress.status !== 'no_data' && (
                            <span className={`badge ${
                              progress.status === 'ahead' ? 'text-success' :
                              progress.status === 'on_track' ? 'text-info' :
                              'text-warning'
                            }`}>
                              {progress.status.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              className="btn btn-sm btn-quiet"
                              onClick={() => startEdit(milestone)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-quiet"
                              onClick={() => handleDelete(milestone.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed card view (for editing) */}
          {editingId && (
            <div style={{ marginTop: '1rem' }}>
              {milestones.filter(m => m.id === editingId).map((milestone) => {
            const progress = progresses.get(milestone.id)
            const isEditing = editingId === milestone.id
            
            return (
              <div key={milestone.id} className="card" style={{ padding: '1rem' }}>
                {isEditing ? (
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    handleUpdate(milestone.id, {
                      label: formData.label,
                      target_value: parseFloat(formData.targetValue) || 0,
                      target_date: formData.targetDate || undefined,
                      type: formData.type
                    })
                  }}>
                    <div className="row" style={{ marginBottom: '0.5rem' }}>
                      <input
                        className="input"
                        value={formData.label}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        placeholder="Milestone label"
                        required
                      />
                    </div>
                    <div className="row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={formData.targetValue}
                        onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                        placeholder="Target value"
                        required
                      />
                      <select
                        className="select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      >
                        <option value="net_worth">Net Worth</option>
                        <option value="invested_assets">Invested Assets</option>
                        <option value="savings">Savings</option>
                      </select>
                      <input
                        className="input"
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                        placeholder="Target date (optional)"
                      />
                    </div>
                    <div className="row" style={{ gap: '0.5rem' }}>
                      <button className="btn btn-sm" type="submit">Save</button>
                      <button className="btn btn-sm btn-quiet" type="button" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{milestone.label}</div>
                        <div className="small muted">
                          Target: {formatCurrency(milestone.target_value)} • {milestone.type.replace('_', ' ')}
                          {milestone.target_date && ` • Target date: ${formatDate(milestone.target_date)}`}
                        </div>
                      </div>
                      <div className="row" style={{ gap: '0.25rem' }}>
                        <button className="btn btn-sm btn-quiet" onClick={() => startEdit(milestone)}>Edit</button>
                        <button className="btn btn-sm btn-quiet" onClick={() => handleDelete(milestone.id)}>Delete</button>
                      </div>
                    </div>
                    
                    {progress && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span className="small muted">Progress</span>
                          <span className="small">{progress.progressPercent.toFixed(1)}%</span>
                        </div>
                        <div style={{ 
                          width: '100%', 
                          height: '8px', 
                          backgroundColor: '#e0e0e0', 
                          borderRadius: '4px',
                          marginBottom: '0.25rem'
                        }}>
                          <div style={{
                            width: `${Math.min(100, progress.progressPercent)}%`,
                            height: '100%',
                            backgroundColor: progress.progressPercent >= 100 ? '#4caf50' : '#2196f3',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span className="small muted">{formatCurrency(progress.currentValue)}</span>
                          <span className="small muted">{formatCurrency(progress.targetValue)}</span>
                        </div>
                        {progress.remaining > 0 && (
                          <div className="small muted">
                            {formatCurrency(progress.remaining)} remaining
                            {progress.etaDate && ` • ETA: ${formatDate(progress.etaDate)}`}
                            {progress.status !== 'no_data' && (
                              <span className={`badge ${progress.status === 'ahead' ? 'text-success' : progress.status === 'on_track' ? 'text-info' : 'text-warning'}`} style={{ marginLeft: '0.5rem' }}>
                                {progress.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        )}
                        {progress.progressPercent >= 100 && (
                          <div className="small text-success" style={{ marginTop: '0.25rem' }}>
                            ✓ Milestone achieved!
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddForm && (
        <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
          <form onSubmit={handleAdd}>
            <div className="row" style={{ marginBottom: '0.5rem' }}>
              <input
                className="input"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Milestone label (e.g., 'Save $50k')"
                required
              />
            </div>
            <div className="row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                className="input"
                type="number"
                step="0.01"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                placeholder="Target value"
                required
              />
              <select
                className="select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="net_worth">Net Worth</option>
                <option value="invested_assets">Invested Assets</option>
                <option value="savings">Savings</option>
              </select>
              <input
                className="input"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                placeholder="Target date (optional)"
              />
            </div>
            <div className="row" style={{ gap: '0.5rem' }}>
              <button className="btn btn-sm" type="submit">Add Milestone</button>
              <button className="btn btn-sm btn-quiet" type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
})

MilestonesManager.displayName = 'MilestonesManager'

export default MilestonesManager

