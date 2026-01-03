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
  reorderMilestones,
  type Milestone,
  type MilestoneProgress
} from '@/lib/milestones'

export interface MilestonesManagerRef {
  showAddForm: () => void
}

const MilestonesManager = forwardRef<MilestonesManagerRef>((props, ref) => {
  const userId = 'demo-user'
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
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const statusLabels: Record<MilestoneProgress['status'], string> = {
    ahead: 'Ahead of schedule',
    on_track: 'On track',
    behind: 'Behind schedule',
    no_data: 'Not enough data yet'
  }
  const statusClasses: Record<MilestoneProgress['status'], string> = {
    ahead: 'text-success',
    on_track: 'text-info',
    behind: 'text-warning',
    no_data: 'text-muted'
  }

  useEffect(() => {
    loadMilestones()
  }, [])

  const loadMilestones = async () => {
    setLoading(true)
    try {
      const ms = await getMilestones(userId)
      setMilestones(ms)

      // Calculate progress for each milestone
      const progressMap = new Map<string, MilestoneProgress>()
      for (const milestone of ms) {
        const progress = await calculateMilestoneProgress(milestone, userId)
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
    }, userId)
    
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
    }, userId)
    
    if (updated) {
      await loadMilestones()
      setEditingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      await deleteMilestone(id, userId)
      await loadMilestones()
    }
  }

  const handleDragStart = (id: string) => {
    setDraggingId(id)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault()
    if (!draggingId || draggingId === targetId) return

    setMilestones(prev => {
      const updated = [...prev]
      const fromIndex = updated.findIndex(m => m.id === draggingId)
      const toIndex = updated.findIndex(m => m.id === targetId)

      if (fromIndex === -1 || toIndex === -1) return prev

      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)

      return updated.map((milestone, index) => ({ ...milestone, display_order: index }))
    })
  }

  const handleDrop = async () => {
    setDraggingId(null)
    if (milestones.length === 0) return

    const ids = milestones.map(m => m.id)
    await reorderMilestones(ids, userId)
    await loadMilestones()
  }

  const handleDragEnd = () => setDraggingId(null)

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {milestones.map((milestone) => {
            const progress = progresses.get(milestone.id)
            const isEditing = editingId === milestone.id
            
            return (
              <div
                key={milestone.id}
                className="card"
                style={{
                  padding: '1rem',
                  cursor: 'grab',
                  opacity: draggingId === milestone.id ? 0.9 : 1
                }}
                draggable
                onDragStart={() => handleDragStart(milestone.id)}
                onDragOver={(event) => handleDragOver(event, milestone.id)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              >
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
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="small muted" style={{ cursor: 'grab', userSelect: 'none' }} aria-hidden>
                          ↕
                        </span>
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{milestone.label}</div>
                          <div className="small muted">
                            Target: {formatCurrency(milestone.target_value)} • {milestone.type.replace('_', ' ')}
                            {milestone.target_date && ` • Target date: ${formatDate(milestone.target_date)}`}
                          </div>
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
                            <span
                              className={`badge ${statusClasses[progress.status]}`}
                              style={{ marginLeft: '0.5rem' }}
                            >
                              {statusLabels[progress.status]}
                            </span>
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

