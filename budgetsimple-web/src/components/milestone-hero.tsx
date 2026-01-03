'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  getNextMilestone, 
  calculateMilestoneProgress,
  formatCurrency,
  formatDate,
  type MilestoneProgress 
} from '@/lib/milestones-local'
import { calculateETA, calculateRequiredContribution, type ProjectionInputs } from '@/lib/milestone-projection'

export default function MilestoneHero() {
  const [progress, setProgress] = useState<MilestoneProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [netWorth, setNetWorth] = useState<number | null>(null)
  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(null)
  const [annualReturn, setAnnualReturn] = useState<number>(0.07) // Default 7%
  const [requiredContribution, setRequiredContribution] = useState<number | null>(null)
  const [eta, setEta] = useState<{ month: number; date: string } | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (progress && netWorth !== null && monthlyContribution !== null) {
      calculateProjection()
    }
  }, [progress, netWorth, monthlyContribution, annualReturn])

  const loadData = async () => {
    try {
      const next = await getNextMilestone()
      setProgress(next)
      
      // Load net worth
      if (typeof window !== 'undefined' && (window as any).budgetsimpleRuntime) {
        const runtime = (window as any).budgetsimpleRuntime
        const transactions = runtime.transactions() || []
        const income = runtime.income() || []
        
        const totalIncome = income.reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
        const totalExpenses = transactions
          .filter((t: any) => t.type === 'expense' || (t.amount && t.amount < 0))
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0)
        
        const calculatedNetWorth = Math.max(0, totalIncome - totalExpenses)
        setNetWorth(calculatedNetWorth)
        
        // Calculate monthly contribution from cashflow
        const recentIncome = income
          .filter((i: any) => {
            const date = new Date(i.dateISO || i.date)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return date >= thirtyDaysAgo
          })
          .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
        
        const recentExpenses = transactions
          .filter((t: any) => {
            const date = new Date(t.dateISO || t.date)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return date >= thirtyDaysAgo && (t.type === 'expense' || (t.amount && t.amount < 0))
          })
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0)
        
        const cashflow = recentIncome - recentExpenses
        const monthlyContrib = Math.max(0, (cashflow / 30) * 30)
        setMonthlyContribution(monthlyContrib)
      }
    } catch (error) {
      console.error('Error loading milestone data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProjection = () => {
    if (!progress || netWorth === null || monthlyContribution === null) return

    const inputs: ProjectionInputs = {
      currentNetWorth: netWorth,
      monthlyContribution,
      annualReturn,
      monthsToProject: 120 // 10 years
    }

    const etaResult = calculateETA(inputs, progress.targetValue)
    setEta(etaResult)

    if (progress.milestone.target_date) {
      const required = calculateRequiredContribution(
        netWorth,
        progress.targetValue,
        progress.milestone.target_date,
        annualReturn
      )
      setRequiredContribution(required)
    } else {
      setRequiredContribution(null)
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-body">
          <div className="small muted">Loading milestone...</div>
        </div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Next Milestone</div>
            <div className="panel-sub">No milestones yet</div>
          </div>
          <div className="panel-actions">
            <Link href="/plan" className="btn btn-accent">
              Add Milestone
            </Link>
          </div>
        </div>
        <div className="panel-body">
          <div className="chart-empty">
            Add your first milestone to track progress toward your financial goals.
          </div>
        </div>
      </div>
    )
  }

  const progressPercent = Math.round(progress.progressPercent)
  const isOnTrack = progress.status === 'on_track' || progress.status === 'ahead'
  const gap = requiredContribution && monthlyContribution !== null
    ? Math.max(0, requiredContribution - monthlyContribution)
    : null

  return (
    <div className="panel" style={{ 
      background: isOnTrack 
        ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
        : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      border: `2px solid ${isOnTrack ? '#10b981' : '#f59e0b'}`,
      position: 'relative'
    }}>
      {/* Accent bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: isOnTrack ? '#10b981' : '#f59e0b'
      }} />

      <div className="panel-head">
        <div>
          <div className="panel-title" style={{ fontSize: '20px', fontWeight: '700' }}>
            {progress.milestone.label}
          </div>
          <div className="panel-sub">
            Target: {formatCurrency(progress.targetValue)}
            {progress.milestone.target_date && ` by ${formatDate(progress.milestone.target_date)}`}
          </div>
        </div>
        <div className="panel-actions">
          <Link href="/plan" className="btn btn-quiet">
            Edit
          </Link>
        </div>
      </div>

      <div className="panel-body">
        {/* Status Line */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnTrack ? '#10b981' : '#f59e0b'
            }} />
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: isOnTrack ? '#059669' : '#d97706'
            }}>
              {progress.status === 'ahead' ? 'Ahead of schedule' : 
               progress.status === 'on_track' ? 'On track' : 
               'Behind schedule'}
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ 
            width: '100%', 
            height: '12px', 
            backgroundColor: '#e5e7eb', 
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              width: `${Math.min(100, progress.progressPercent)}%`,
              height: '100%',
              background: isOnTrack ? '#10b981' : '#f59e0b',
              borderRadius: '6px',
              transition: 'width 0.5s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
            <span>{formatCurrency(progress.currentValue)}</span>
            <span>{formatCurrency(progress.targetValue)}</span>
          </div>
        </div>

        {/* Three Key Numbers */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Current Net Worth</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2933' }}>
              {netWorth !== null ? formatCurrency(netWorth) : '--'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>ETA</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2933' }}>
              {eta ? formatDate(eta.date) : '--'}
            </div>
          </div>
          {requiredContribution !== null && (
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Required Monthly</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: gap && gap > 0 ? '#dc2626' : '#059669' }}>
                {formatCurrency(requiredContribution)}/mo
              </div>
            </div>
          )}
        </div>

        {/* Microcopy */}
        <div style={{ 
          padding: '12px',
          background: 'rgba(255,255,255,0.6)',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {isOnTrack && eta ? (
            <div style={{ fontSize: '13px', color: '#059669' }}>
              ✓ At your current pace, you hit this in {formatDate(eta.date)}.
            </div>
          ) : gap && gap > 0 && progress.milestone.target_date ? (
            <div style={{ fontSize: '13px', color: '#d97706' }}>
              ⚠ To hit {formatDate(progress.milestone.target_date)}, you need +{formatCurrency(gap)}/mo more.
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Track your progress toward this milestone.
            </div>
          )}
        </div>

        {/* CTA Row */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/plan" className="btn btn-quiet" style={{ flex: 1 }}>
            Edit Milestone
          </Link>
          <Link href="/plan" className="btn btn-accent" style={{ flex: 1 }}>
            Add Milestone
          </Link>
        </div>
      </div>
    </div>
  )
}

