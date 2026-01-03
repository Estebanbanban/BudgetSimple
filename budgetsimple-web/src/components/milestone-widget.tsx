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
      <div className="card" style={{ 
        border: '2px solid #8b5cf6'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: '#8b5cf6'
        }} />
        <div className="card-title" style={{ marginBottom: '4px' }}>Net Worth</div>
        <div className="card-value" style={{ fontSize: '24px', marginBottom: '2px' }}>
          {netWorth !== null ? formatCurrency(netWorth) : '--'}
        </div>
        <div className="card-sub" style={{ marginBottom: '10px' }}>
          Current total assets
        </div>
        <Link href="/plan" className="btn btn-quiet" style={{ marginTop: 'auto' }}>
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
  // Subtle gradients with accent colors, not fully golden
  const gradientColor = isComplete 
    ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
    : progress.status === 'ahead'
    ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
    : progress.status === 'on_track'
    ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
    : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
  
  const accentColor = isComplete 
    ? '#10b981'
    : progress.status === 'ahead'
    ? '#8b5cf6'
    : progress.status === 'on_track'
    ? '#3b82f6'
    : '#f59e0b'
  
  const textColor = '#1f2933'
  const mutedTextColor = '#6b7280'

  return (
    <div className="card" style={{ 
      background: gradientColor,
      color: textColor,
      border: `2px solid ${accentColor}`,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Accent bar at top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: accentColor
      }} />
      
      {/* Net Worth Display */}
      <div style={{ 
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: `1px solid ${accentColor}20`
      }}>
        <div className="card-title" style={{ color: mutedTextColor, marginBottom: '4px', fontSize: '11px' }}>
          Current Net Worth
        </div>
        <div className="card-value" style={{ 
          color: textColor, 
          fontSize: '24px',
          marginBottom: '2px',
          fontWeight: '700'
        }}>
          {netWorth !== null ? formatCurrency(netWorth) : '--'}
        </div>
      </div>

      {/* Milestone Progress */}
      <div style={{ flex: 1 }}>
        <div className="card-title" style={{ color: mutedTextColor, marginBottom: '6px', fontSize: '11px' }}>
          Next Milestone: {progress.milestone.label}
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: textColor, fontWeight: '500' }}>
              {progressPercent}% Complete
            </span>
            <span style={{ fontSize: '12px', color: textColor, fontWeight: '600' }}>
              {formatCurrency(progress.currentValue)} / {formatCurrency(progress.targetValue)}
            </span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: '#e5e7eb', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, progress.progressPercent)}%`,
              height: '100%',
              backgroundColor: accentColor,
              borderRadius: '4px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {progress.etaDate && (
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '11px', color: mutedTextColor, marginBottom: '2px' }}>
              Estimated completion
            </div>
            <div style={{ fontSize: '12px', color: textColor, fontWeight: '600' }}>
              {formatDate(progress.etaDate)}
              {progress.etaMonths && (
                <span style={{ color: mutedTextColor }}> ({progress.etaMonths} months)</span>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: accentColor
          }} />
          <span style={{ fontSize: '11px', color: textColor, fontWeight: '500' }}>
            {statusLabels[progress.status]}
          </span>
        </div>

        {progress.remaining > 0 && (
          <div style={{ 
            marginTop: '8px',
            padding: '6px 10px',
            background: `${accentColor}15`,
            borderRadius: '4px',
            fontSize: '11px',
            color: textColor
          }}>
            {formatCurrency(progress.remaining)} remaining
          </div>
        )}

        <Link 
          href="/plan" 
          className="btn btn-quiet" 
          style={{ 
            marginTop: '10px',
            fontSize: '11px',
            padding: '4px 10px',
            width: '100%',
            textAlign: 'center'
          }}
        >
          Manage Milestones
        </Link>
      </div>
    </div>
  )
}

