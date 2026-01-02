'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Milestone {
  id: string
  label: string
  target_value: number
  target_date?: string
  type: string
}

interface Progress {
  currentValue: number
  targetValue: number
  progressPercent: number
  remaining: number
  etaMonths?: number
  etaDate?: string
  status: 'ahead' | 'on_track' | 'behind'
}

export default function MilestoneWidget() {
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNextMilestone()
  }, [])

  const loadNextMilestone = async () => {
    try {
      const url = `${API_BASE}/api/milestones/next?userId=demo-user`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setMilestone(data.milestone)
      setProgress(data.progress)
    } catch (error) {
      console.error('Error loading next milestone:', error)
      setMilestone(null)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Next Milestone</div>
            <div className="panel-sub">Your progress toward financial goals</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="small muted">Loading...</div>
        </div>
      </div>
    )
  }

  if (!milestone || !progress) {
    return (
      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Next Milestone</div>
            <div className="panel-sub">Your progress toward financial goals</div>
          </div>
          <div className="panel-actions">
            <Link href="/plan" className="btn btn-quiet">
              Add Milestone
            </Link>
          </div>
        </div>
        <div className="panel-body">
          <div className="chart-empty">
            No milestones yet. Add your first milestone to track progress.
          </div>
        </div>
      </div>
    )
  }

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

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Next Milestone</div>
          <div className="panel-sub">{milestone.label}</div>
        </div>
        <div className="panel-actions">
          <Link href="/plan" className="btn btn-quiet">
            Manage
          </Link>
        </div>
      </div>
      <div className="panel-body">
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="small muted">Progress</span>
            <span className="small">{progress.progressPercent.toFixed(1)}%</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: '#e0e0e0', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, progress.progressPercent)}%`,
              height: '100%',
              backgroundColor: progress.progressPercent >= 100 ? '#4caf50' : '#2196f3',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <span className="small muted">{formatCurrency(progress.currentValue)}</span>
            <span className="small muted">{formatCurrency(progress.targetValue)}</span>
          </div>
        </div>

        {progress.etaDate && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div className="small muted">Estimated completion</div>
            <div className="small">
              {formatDate(progress.etaDate)}
              {progress.etaMonths && (
                <span className="muted"> ({progress.etaMonths} months)</span>
              )}
            </div>
          </div>
        )}

        {milestone.target_date && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div className="small muted">Target date</div>
            <div className="small">{formatDate(milestone.target_date)}</div>
          </div>
        )}

        <div>
          <span className={`badge ${statusColors[progress.status]}`}>
            <span className="badge-dot" />
            {statusLabels[progress.status]}
          </span>
        </div>

        {progress.remaining > 0 && (
          <div className="panel-note" style={{ marginTop: '0.5rem' }}>
            {formatCurrency(progress.remaining)} remaining to reach this milestone
          </div>
        )}
      </div>
    </div>
  )
}

