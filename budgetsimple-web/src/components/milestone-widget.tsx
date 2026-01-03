'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getNextMilestone, formatCurrency, formatDate, type MilestoneProgress } from '@/lib/milestones-local'

export default function MilestoneWidget() {
  const [progress, setProgress] = useState<MilestoneProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [netWorth, setNetWorth] = useState<number | null>(null)

  const loadNetWorth = () => {
    try {
      if (typeof window !== 'undefined' && (window as any).budgetsimpleRuntime) {
        const runtime = (window as any).budgetsimpleRuntime
        const transactions = runtime.transactions() || []
        const income = runtime.income() || []
        
        // Calculate net worth: total income - total expenses
        const totalIncome = income.reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
        const totalExpenses = transactions
          .filter((t: any) => t.type === 'expense' || (t.amount && t.amount < 0))
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0)
        
        const calculatedNetWorth = totalIncome - totalExpenses
        setNetWorth(Math.max(0, calculatedNetWorth))
      }
    } catch (error) {
      console.error('Error loading net worth:', error)
      setNetWorth(null)
    }
  }

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

  useEffect(() => {
    loadNextMilestone()
    loadNetWorth()
    // Refresh every 30 seconds to update progress
    const interval = setInterval(() => {
      loadNextMilestone()
      loadNetWorth()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="card">
        <div className="card-title">Net Worth & Milestones</div>
        <div className="card-value">Loading...</div>
        <div className="card-sub">Calculating your progress</div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="card">
        <div className="card-title">Net Worth</div>
        <div className="card-value">
          {netWorth !== null ? formatCurrency(netWorth) : '--'}
        </div>
        <div className="card-sub">
          Current total assets
        </div>
        <Link href="/plan" className="btn btn-quiet">
          Add Milestone
        </Link>
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

  const progressPercent = Math.round(progress.progressPercent)
  const isComplete = progress.progressPercent >= 100

  const statusColor = isComplete 
    ? '#10b981'
    : progress.status === 'ahead'
    ? '#8b5cf6'
    : progress.status === 'on_track'
    ? '#3b82f6'
    : '#f59e0b'

  return (
    <div className="card">
      <div className="card-title">Next Milestone</div>
      <div className="card-value" style={{ fontSize: 'clamp(18px, 1.8vw, 22px)' }}>
        {progress.milestone.label}
      </div>
      <div className="card-sub">
        {formatCurrency(progress.currentValue)} / {formatCurrency(progress.targetValue)} • {progressPercent}%
      </div>
      
      {/* Progress Bar */}
      <div style={{ 
        width: '100%', 
        height: '6px', 
        backgroundColor: '#e5e7eb', 
        borderRadius: '3px',
        overflow: 'hidden',
        marginTop: '8px',
        marginBottom: '8px'
      }}>
        <div style={{
          width: `${Math.min(100, progress.progressPercent)}%`,
          height: '100%',
          backgroundColor: statusColor,
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Status and ETA */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontSize: '11px',
        color: 'var(--muted)',
        marginBottom: '8px'
      }}>
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px' 
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: statusColor
          }} />
          {statusLabels[progress.status]}
        </span>
        {progress.etaDate && (
          <span>ETA: {formatDate(progress.etaDate)}</span>
        )}
      </div>

      <Link href="/plan" className="btn btn-quiet">
        Manage Milestones
      </Link>
    </div>
  )
}

