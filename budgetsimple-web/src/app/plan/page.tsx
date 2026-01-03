'use client'

import { useState, useEffect, useRef } from 'react'
import MilestonesManager, { type MilestonesManagerRef } from '@/components/milestones-manager'
import MilestoneHero from '@/components/milestone-hero'
import MilestoneGraph from '@/components/milestone-graph'
import MilestoneLevers from '@/components/milestone-levers'
import { getNextMilestone, type MilestoneProgress } from '@/lib/milestones-local'

export default function PlanPage() {
  const milestonesManagerRef = useRef<MilestonesManagerRef>(null)
  const [netWorth, setNetWorth] = useState<number>(0)
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0)
  const [annualReturn, setAnnualReturn] = useState<number>(0.07)
  const [contributionMode, setContributionMode] = useState<'auto' | 'manual'>('auto')
  const [manualContribution, setManualContribution] = useState<number>(0)
  const [nextMilestone, setNextMilestone] = useState<MilestoneProgress | null>(null)

  useEffect(() => {
    loadFinancialData()
    loadNextMilestone()
    const interval = setInterval(() => {
      loadFinancialData()
      loadNextMilestone()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadFinancialData = () => {
    if (typeof window !== 'undefined' && (window as any).budgetsimpleRuntime) {
      const runtime = (window as any).budgetsimpleRuntime
      const transactions = runtime.transactions() || []
      const income = runtime.income() || []
      
      // Calculate net worth
      const totalIncome = income.reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
      const totalExpenses = transactions
        .filter((t: any) => t.type === 'expense' || (t.amount && t.amount < 0))
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0)
      
      setNetWorth(Math.max(0, totalIncome - totalExpenses))
      
      // Calculate monthly contribution from cashflow
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const recentIncome = income
        .filter((i: any) => {
          const date = new Date(i.dateISO || i.date)
          return date >= thirtyDaysAgo
        })
        .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
      
      const recentExpenses = transactions
        .filter((t: any) => {
          const date = new Date(t.dateISO || t.date)
          return date >= thirtyDaysAgo && (t.type === 'expense' || (t.amount && t.amount < 0))
        })
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0)
      
      const cashflow = recentIncome - recentExpenses
      const autoContrib = Math.max(0, (cashflow / 30) * 30)
      setMonthlyContribution(contributionMode === 'auto' ? autoContrib : manualContribution)
    }
  }

  const loadNextMilestone = async () => {
    try {
      const next = await getNextMilestone()
      setNextMilestone(next)
    } catch (error) {
      console.error('Error loading next milestone:', error)
    }
  }

  const effectiveContribution = contributionMode === 'auto' ? monthlyContribution : manualContribution

  return (
    <section className="view" data-view="plan">
      {/* Header + Controls (sticky) */}
      <div className="page-head" style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(250, 250, 250, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '16px'
      }}>
        <div>
          <h1>Plan</h1>
          <p className="muted">Milestones & projections — track your net worth trajectory</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label className="label" style={{ fontSize: '12px', margin: 0 }}>Annual return:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={(annualReturn * 100).toFixed(1)}
              onChange={(e) => setAnnualReturn(parseFloat(e.target.value) / 100)}
              className="input"
              style={{ width: '60px', fontSize: '12px', padding: '4px 8px' }}
            />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>%</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label className="label" style={{ fontSize: '12px', margin: 0 }}>Contribution:</label>
            <select
              value={contributionMode}
              onChange={(e) => {
                setContributionMode(e.target.value as 'auto' | 'manual')
                if (e.target.value === 'auto') {
                  loadFinancialData()
                }
              }}
              className="select"
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              <option value="auto">Auto from cashflow</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          {contributionMode === 'manual' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label className="label" style={{ fontSize: '12px', margin: 0 }}>Amount:</label>
              <input
                type="number"
                step="0.01"
                value={manualContribution}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  setManualContribution(val)
                  setMonthlyContribution(val)
                }}
                className="input"
                style={{ width: '100px', fontSize: '12px', padding: '4px 8px' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Next Milestone Hero Card */}
      <MilestoneHero />

      {/* Projection Graph + Levers */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <MilestoneGraph
          currentNetWorth={netWorth}
          monthlyContribution={effectiveContribution}
          annualReturn={annualReturn}
          onReturnChange={setAnnualReturn}
        />
        {nextMilestone && (
          <MilestoneLevers
            currentNetWorth={netWorth}
            monthlyContribution={effectiveContribution}
            annualReturn={annualReturn}
            milestone={nextMilestone.milestone}
            onContributionChange={(amount) => {
              setManualContribution(amount)
              setContributionMode('manual')
              setMonthlyContribution(amount)
            }}
            onDateChange={async (date) => {
              // Update milestone target date
              if (nextMilestone) {
                const { updateMilestone } = await import('@/lib/milestones-local')
                await updateMilestone(nextMilestone.milestone.id, {
                  targetDate: date
                })
                await loadNextMilestone()
              }
            }}
          />
        )}
      </div>

      {/* Milestones List */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">All Milestones</div>
            <div className="panel-sub">Complete list of your financial goals</div>
          </div>
          <div className="panel-actions">
            <button 
              className="btn btn-accent" 
              onClick={() => milestonesManagerRef.current?.showAddForm()}
            >
              Add Milestone
            </button>
          </div>
        </div>
        <div className="panel-body">
          <MilestonesManager ref={milestonesManagerRef} />
        </div>
      </section>

      <div className="section-head">
        <div>
          <h2>Category Budgets</h2>
          <p className="muted">Set monthly budget targets per category. Track spending vs targets on dashboard.</p>
        </div>
      </div>

      {/* PAUSED: Rent shortcut - not in MVP golden path (use category budgets instead) */}
      {/* <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Rent</div>
            <div className="panel-sub">Quick monthly target (creates/updates "Rent" budget)</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="row">
            <input id="rentAmount" className="input" type="number" step="0.01" placeholder="Monthly rent budget" />
            <select id="rentMode" className="select" aria-label="Rent mode" defaultValue="monthly">
              <option value="monthly">Monthly</option>
              <option value="once">Once</option>
              <option value="off">Budget only</option>
            </select>
            <button className="btn" id="btnSaveRent" type="button">
              Save
            </button>
            <div className="small muted" id="rentSavedNote" />
          </div>
        </div>
      </section> */}

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Category budgets</div>
            <div className="panel-sub">Budgets apply monthly.</div>
          </div>
        </div>
        <div className="panel-body">
          <form id="budgetForm" className="form">
            <div className="row">
              <select id="budgetCategory" className="select" />
              <input id="budgetAmount" className="input" type="number" step="0.01" placeholder="Monthly budget" required />
              <button className="btn" type="submit">
                Set
              </button>
            </div>
          </form>
          <div className="table-wrap">
            <table className="table" id="budgetsTable" />
          </div>
        </div>
      </section>
    </section>
  );
}
