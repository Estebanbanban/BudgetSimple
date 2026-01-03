'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { formatDate } from '@/lib/milestones-local'
import { useMilestoneProjection } from '@/lib/use-milestone-projection'

const statusLabels = {
  ahead: 'Ahead of schedule',
  on_track: 'On track',
  behind: 'Behind schedule'
}

const statusColors = {
  ahead: 'text-success',
  on_track: 'text-info',
  behind: 'text-warning'
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export default function MilestoneWidget() {
  const { data, loading, error, reload } = useMilestoneProjection()

  const nextMilestone = useMemo(() => data?.nextMilestone ?? null, [data])

  const renderProgressBar = () => {
    if (!nextMilestone) return null
    return (
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span className="small muted">Progress</span>
          <span className="small">{nextMilestone.progressPercent.toFixed(1)}%</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${Math.min(100, nextMilestone.progressPercent)}%`,
              height: '100%',
              backgroundColor: nextMilestone.progressPercent >= 100 ? '#4caf50' : '#2196f3',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <span className="small muted">{formatCurrency(nextMilestone.currentValue)}</span>
          <span className="small muted">{formatCurrency(nextMilestone.targetValue)}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card" data-testid="next-milestone-widget">
        <div className="card-title">Next milestone</div>
        <div className="card-value">--</div>
        <div className="card-sub">Loading projection...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" data-testid="next-milestone-widget">
        <div className="card-title">Next milestone</div>
        <div className="card-sub text-warning" data-testid="next-milestone-error">
          Unable to load milestone projection.
        </div>
        <button className="btn btn-quiet" type="button" onClick={reload}>
          Retry
        </button>
      </div>
    )
  }

  if (!nextMilestone) {
    return (
      <div className="card" data-testid="next-milestone-widget">
        <div className="card-title">Next milestone</div>
        <div className="card-sub" data-testid="next-milestone-empty">
          No milestones yet. Add your first goal to see projections.
        </div>
        <Link href="/plan" className="btn btn-quiet">
          Add milestone
        </Link>
      </div>
    )
  }

  return (
    <div className="card" data-testid="next-milestone-widget">
      <div className="card-title">Next milestone</div>
      <div className="card-value">{nextMilestone.label}</div>
      <div className="card-sub">{nextMilestone.statusMessage}</div>
      {renderProgressBar()}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={`badge ${statusColors[nextMilestone.status]}`}>
          <span className="badge-dot" />
          {statusLabels[nextMilestone.status]}
        </span>
        {nextMilestone.etaDate && (
          <span className="small muted">ETA: {formatDate(nextMilestone.etaDate)}</span>
        )}
      </div>
    </div>
  )
}
