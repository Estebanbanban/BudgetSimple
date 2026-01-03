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
      <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
        <div className="card-title" style={{ color: 'rgba(255,255,255,0.9)' }}>Net Worth & Milestones</div>
        <div className="card-value" style={{ color: 'white' }}>Loading...</div>
        <div className="card-sub" style={{ color: 'rgba(255,255,255,0.8)' }}>Calculating your progress</div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        border: 'none',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
      }}>
        <div className="card-title" style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>Net Worth</div>
        <div className="card-value" style={{ color: 'white', fontSize: '32px', marginBottom: '4px' }}>
          {netWorth !== null ? formatCurrency(netWorth) : '--'}
        </div>
        <div className="card-sub" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '12px' }}>
          Current total assets
        </div>
        <Link href="/plan" className="btn" style={{ 
          background: 'rgba(255,255,255,0.2)', 
          color: 'white', 
          border: '1px solid rgba(255,255,255,0.3)',
          marginTop: 'auto'
        }}>
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
  const gradientColor = isComplete 
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    : progress.status === 'ahead'
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : progress.status === 'on_track'
    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'

  return (
    <div className="card" style={{ 
      background: gradientColor,
      color: 'white',
      border: 'none',
      boxShadow: isComplete 
        ? '0 4px 20px rgba(16, 185, 129, 0.3)'
        : '0 4px 20px rgba(102, 126, 234, 0.25)',
      minHeight: '180px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Net Worth Display */}
      <div style={{ 
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div className="card-title" style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '6px', fontSize: '11px' }}>
          Current Net Worth
        </div>
        <div className="card-value" style={{ 
          color: 'white', 
          fontSize: '28px',
          marginBottom: '4px',
          fontWeight: '800'
        }}>
          {netWorth !== null ? formatCurrency(netWorth) : '--'}
        </div>
      </div>

      {/* Milestone Progress */}
      <div style={{ flex: 1 }}>
        <div className="card-title" style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '8px', fontSize: '11px' }}>
          Next Milestone: {progress.milestone.label}
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
              {progressPercent}% Complete
            </span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>
              {formatCurrency(progress.currentValue)} / {formatCurrency(progress.targetValue)}
            </span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '10px', 
            backgroundColor: 'rgba(255,255,255,0.2)', 
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: `${Math.min(100, progress.progressPercent)}%`,
              height: '100%',
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: '6px',
              transition: 'width 0.5s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>

        {progress.etaDate && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginBottom: '2px' }}>
              Estimated completion
            </div>
            <div style={{ fontSize: '13px', color: 'white', fontWeight: '600' }}>
              {formatDate(progress.etaDate)}
              {progress.etaMonths && (
                <span style={{ opacity: 0.8 }}> ({progress.etaMonths} months)</span>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.9)',
            boxShadow: '0 0 8px rgba(255,255,255,0.5)'
          }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
            {statusLabels[progress.status]}
          </span>
        </div>

        {progress.remaining > 0 && (
          <div style={{ 
            marginTop: '12px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.95)'
          }}>
            {formatCurrency(progress.remaining)} remaining
          </div>
        )}

        <Link 
          href="/plan" 
          className="btn" 
          style={{ 
            background: 'rgba(255,255,255,0.2)', 
            color: 'white', 
            border: '1px solid rgba(255,255,255,0.3)',
            marginTop: '16px',
            fontSize: '12px',
            padding: '6px 12px',
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

