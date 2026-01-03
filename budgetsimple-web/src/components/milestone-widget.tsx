'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getNextMilestone, formatCurrency, formatDate, type MilestoneProgress } from '@/lib/milestones-local'

export default function MilestoneWidget() {
  const [progress, setProgress] = useState<MilestoneProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNextMilestone()
    // Refresh every 30 seconds to update progress
    const interval = setInterval(loadNextMilestone, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNextMilestone = async () => {
    try {
      const next = await getNextMilestone()
      setProgress(next)
    } catch (error) {
      console.error('Error loading next milestone:', error)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card card-highlight">
        <div className="card-title">Next Milestone</div>
        <div className="card-sub">Your progress toward financial goals</div>
        <div className="small muted">Loading...</div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="card card-highlight">
        <div className="card-header">
          <div>
            <div className="card-title">Next Milestone</div>
            <div className="card-sub">Your progress toward financial goals</div>
          </div>
          <Link href="/plan" className="btn btn-quiet card-inline">
            Add milestone
          </Link>
        </div>
        <div className="small muted">
          No milestones yet. Add your first milestone to track progress.
        </div>
      </div>
    )
  }

  const statusLabels = {
    ahead: 'Ahead of schedule',
    on_track: 'On track',
    behind: 'Behind schedule',
    no_data: 'Tracking soon'
  }

  const statusStyles = {
    ahead: 'badge is-success',
    on_track: 'badge is-info',
    behind: 'badge is-warning',
    no_data: 'badge'
  }

  const percent = Math.max(0, Math.min(100, progress.progressPercent))

  return (
    <div className="card card-highlight">
      <div className="card-header">
        <div>
          <div className="card-title">Next Milestone</div>
          <div className="card-sub">{progress.milestone.label}</div>
        </div>
        <Link href="/plan" className="btn btn-quiet card-inline">
          Manage
        </Link>
      </div>

      <div className="card-value">{percent.toFixed(1)}%</div>
      <div className="card-sub">toward {formatCurrency(progress.targetValue)}</div>

      <div className="card-progress">
        <div className="card-progress-track">
          <div className="card-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="card-meta">
          <span>{formatCurrency(progress.currentValue)}</span>
          <span>{formatCurrency(progress.remaining)} left</span>
        </div>
      </div>

      <div className="card-meta">
        <span>
          {progress.etaDate ? (
            <>
              Est. {formatDate(progress.etaDate)}
              {progress.etaMonths && <span className="muted"> ({progress.etaMonths} months)</span>}
            </>
          ) : (
            'Estimated date coming soon'
          )}
        </span>
        <span className={statusStyles[progress.status]}>
          <span className="badge-dot" />
          {statusLabels[progress.status]}
        </span>
      </div>

      {progress.remaining > 0 && (
        <div className="card-meta" style={{ marginTop: 4 }}>
          <span>{formatCurrency(progress.milestone.target_value || progress.targetValue)} goal</span>
          {progress.milestone.target_date && <span>{formatDate(progress.milestone.target_date)}</span>}
        </div>
      )}
    </div>
  )
}

