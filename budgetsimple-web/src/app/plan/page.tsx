'use client'

import { useState, useEffect, useRef } from 'react'
import MilestonesManager, { type MilestonesManagerRef } from '@/components/milestones-manager'
import MilestoneHero from '@/components/milestone-hero'
import MilestoneGraph from '@/components/milestone-graph'
import MilestoneLevers from '@/components/milestone-levers'
import { getNextMilestone, type MilestoneProgress } from '@/lib/milestones-local'
import Link from 'next/link'

export default function PlanPage() {
  const milestonesManagerRef = useRef<MilestonesManagerRef>(null)
  const [netWorth, setNetWorth] = useState<number>(0)
  const [netWorthCurrency, setNetWorthCurrency] = useState<string>('USD')
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0)
  const [annualReturn, setAnnualReturn] = useState<number>(0.07)
  const [contributionMode, setContributionMode] = useState<'auto' | 'manual'>('auto')
  const [manualContribution, setManualContribution] = useState<number>(0)
  const [nextMilestone, setNextMilestone] = useState<MilestoneProgress | null>(null)
  const [hasTransactions, setHasTransactions] = useState<boolean>(false)

  useEffect(() => {
    loadPlanAssumptions()
    loadFinancialData()
    loadNextMilestone()
    const interval = setInterval(() => {
      loadFinancialData()
      loadNextMilestone()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadPlanAssumptions = () => {
    if (typeof window !== 'undefined') {
      try {
        // Load from localStorage directly
        const CONFIG_KEY = "budgetsimple:v1"
        const raw = localStorage.getItem(CONFIG_KEY)
        if (raw) {
          const config = JSON.parse(raw)
          if (config?.settings) {
            // Load saved net worth
            if (config.settings.netWorthManual !== undefined) {
              setNetWorth(config.settings.netWorthManual)
            }
            // Load saved currency (default to display currency)
            setNetWorthCurrency(config.settings.netWorthCurrency || config.settings.currency || 'USD')
            // Load saved annual return
            if (config.settings.planAnnualReturn !== undefined) {
              setAnnualReturn(config.settings.planAnnualReturn)
            }
            // Load saved contribution mode
            if (config.settings.planContributionMode) {
              setContributionMode(config.settings.planContributionMode)
            }
            // Load saved manual contribution
            if (config.settings.planManualContribution !== undefined) {
              setManualContribution(config.settings.planManualContribution)
            }
          }
        }
      } catch (error) {
        console.error('Error loading plan assumptions:', error)
      }
    }
  }

  const savePlanAssumptions = () => {
    if (typeof window !== 'undefined' && (window as any).budgetsimpleRuntime) {
      const runtime = (window as any).budgetsimpleRuntime
      // Access config through the runtime's internal structure
      try {
        // Try to get config from runtime
        const configGetter = runtime.config || runtime.getConfig
        if (configGetter) {
          const config = configGetter()
          if (config && config.settings) {
            config.settings.netWorthManual = netWorth
            config.settings.netWorthCurrency = netWorthCurrency
            config.settings.planAnnualReturn = annualReturn
            config.settings.planContributionMode = contributionMode
            config.settings.planManualContribution = manualContribution
            // Save via runtime's saveConfig
            if (runtime.saveConfig) {
              runtime.saveConfig()
            } else {
              // Fallback: save directly to localStorage
              const CONFIG_KEY = "budgetsimple:v1"
              localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
            }
          }
        }
      } catch (error) {
        console.error('Error saving plan assumptions:', error)
      }
    }
  }

  const loadFinancialData = () => {
    if (typeof window !== 'undefined') {
      // Load saved net worth first
      try {
        const CONFIG_KEY = "budgetsimple:v1"
        const raw = localStorage.getItem(CONFIG_KEY)
        if (raw) {
          const config = JSON.parse(raw)
          if (config?.settings?.netWorthManual !== undefined) {
            setNetWorth(config.settings.netWorthManual)
          }
        }
      } catch (error) {
        console.error('Error loading net worth:', error)
      }
      
      if ((window as any).budgetsimpleRuntime) {
        const runtime = (window as any).budgetsimpleRuntime
        const transactions = runtime.transactions() || []
        const income = runtime.income() || []
        
        setHasTransactions(transactions.length > 0 || income.length > 0)
        
        // Only calculate net worth if not manually set
        const CONFIG_KEY = "budgetsimple:v1"
        const raw = localStorage.getItem(CONFIG_KEY)
        if (raw) {
          const config = JSON.parse(raw)
          if (config?.settings?.netWorthManual === undefined) {
            // Calculate net worth
            const totalIncome = income.reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
            const totalExpenses = transactions
              .filter((t: any) => t.type === 'expense' || (t.amount && t.amount < 0))
              .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0)
            
            setNetWorth(Math.max(0, totalIncome - totalExpenses))
          }
        }
        
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
  const canProject = netWorth > 0 || effectiveContribution > 0

  return (
    <section className="view" data-view="plan">
      {/* Main container with consistent spacing */}
      <div style={{
        maxWidth: '72rem',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        {/* Page Header */}
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Plan</h1>
          <p className="muted" style={{ fontSize: '14px' }}>
            Milestones & projections — track your net worth trajectory
          </p>
        </div>

        {/* Next Milestone Hero Card - PRIMARY ELEMENT */}
        {nextMilestone ? (
          <MilestoneHero 
            currentNetWorth={netWorth}
            monthlyContribution={effectiveContribution}
            annualReturn={annualReturn}
          />
        ) : (
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2933' }}>
              Create your first milestone
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Set a financial goal and track your progress over time.
            </p>
            <button
              onClick={() => milestonesManagerRef.current?.showAddForm()}
              className="btn btn-accent"
              style={{ textDecoration: 'none', marginTop: '4px' }}
            >
              Add milestone
            </button>
          </div>
        )}

        {/* Compact Assumptions Card - 1 row */}
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '1rem 1.25rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#475569', 
                marginBottom: '6px',
                fontWeight: '500'
              }}>
                Starting Net Worth <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={netWorth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setNetWorth(val)
                    }}
                    className="input"
                    style={{ 
                      flex: 1,
                      height: '36px',
                      padding: '8px 12px',
                      borderRadius: '8px'
                    }}
                    placeholder="0.00"
                    required
                  />
                  <select
                    value={netWorthCurrency}
                    onChange={(e) => {
                      setNetWorthCurrency(e.target.value)
                    }}
                    className="select"
                    style={{ 
                      width: '80px',
                      height: '36px',
                      padding: '8px 12px',
                      borderRadius: '8px'
                    }}
                  >
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    savePlanAssumptions()
                    loadNextMilestone()
                  }}
                  className="btn btn-accent"
                  style={{ 
                    height: '36px',
                    padding: '8px 16px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#475569', 
                marginBottom: '6px',
                fontWeight: '500'
              }}>
                Annual Return
              </label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={(annualReturn * 100).toFixed(1)}
                  onChange={(e) => {
                    setAnnualReturn(parseFloat(e.target.value) / 100)
                    savePlanAssumptions()
                  }}
                  onBlur={savePlanAssumptions}
                  className="input"
                  style={{ 
                    flex: 1, 
                    height: '36px',
                    padding: '8px 12px',
                    borderRadius: '8px'
                  }}
                />
                <span style={{ fontSize: '13px', color: '#64748b' }}>%</span>
              </div>
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#475569', 
                marginBottom: '6px',
                fontWeight: '500'
              }}>
                Contribution
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={contributionMode}
                  onChange={(e) => {
                    setContributionMode(e.target.value as 'auto' | 'manual')
                    savePlanAssumptions()
                    if (e.target.value === 'auto') {
                      loadFinancialData()
                    }
                  }}
                  className="select"
                  style={{ 
                    flex: 1,
                    height: '36px',
                    padding: '8px 12px',
                    borderRadius: '8px'
                  }}
                >
                  <option value="auto">Auto</option>
                  <option value="manual">Manual</option>
                </select>
                {contributionMode === 'manual' && (
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
                    style={{ 
                      width: '120px',
                      height: '36px',
                      padding: '8px 12px',
                      borderRadius: '8px'
                    }}
                    placeholder="Amount"
                  />
                )}
              </div>
              {contributionMode === 'auto' && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {monthlyContribution > 0 
                    ? 'Uses last full month cashflow (after CSV import)'
                    : !hasTransactions ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706' }}>
                        <span>Import CSV to estimate</span>
                        <Link href="/connect" className="btn btn-sm" style={{ textDecoration: 'none', padding: '2px 8px', fontSize: '11px' }}>
                          Import CSV
                        </Link>
                      </span>
                    ) : 'No recent transactions'
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projection Graph + Levers - Responsive Grid */}
        {nextMilestone && (
          <style>{`
            .plan-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 1.5rem;
            }
            @media (min-width: 1024px) {
              .plan-grid {
                grid-template-columns: 2fr 1fr;
              }
            }
          `}</style>
        )}
        <div className="plan-grid">
          <div>
            <MilestoneGraph
              currentNetWorth={netWorth}
              monthlyContribution={effectiveContribution}
              annualReturn={annualReturn}
              onReturnChange={setAnnualReturn}
            />
          </div>
          {nextMilestone && (
            <div>
              <MilestoneLevers
                currentNetWorth={netWorth}
                monthlyContribution={effectiveContribution}
                annualReturn={annualReturn}
                milestone={{
                  id: nextMilestone.milestone.id,
                  label: nextMilestone.milestone.label,
                  target_value: nextMilestone.milestone.target_value,
                  target_date: nextMilestone.milestone.target_date
                }}
                onContributionChange={(amount) => {
                  setManualContribution(amount)
                  setContributionMode('manual')
                  setMonthlyContribution(amount)
                }}
                onDateChange={async (date) => {
                  if (nextMilestone) {
                    const { updateMilestone } = await import('@/lib/milestones-local')
                    await updateMilestone(nextMilestone.milestone.id, {
                      targetDate: date
                    })
                    await loadNextMilestone()
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Milestones List - Only show if milestones exist */}
        {nextMilestone && (
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>All Milestones</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Complete list of your financial goals
                </div>
              </div>
              <button 
                className="btn btn-accent" 
                onClick={() => milestonesManagerRef.current?.showAddForm()}
                style={{ textDecoration: 'none' }}
              >
                Add Milestone
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <MilestonesManager ref={milestonesManagerRef} />
            </div>
          </div>
        )}

        {/* Rent Section */}
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Rent</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Edit rent periods with date ranges (handle lease changes and gaps)
              </div>
            </div>
            <button 
              className="btn btn-accent" 
              id="btnEditRent"
              type="button"
              style={{ textDecoration: 'none' }}
            >
              Edit Rent Periods
            </button>
          </div>
          <div className="small muted" id="rentPeriodsSummary" style={{ fontSize: '13px', color: '#64748b' }}>
            Click "Edit Rent Periods" to manage your rent with date ranges.
          </div>
        </div>

        {/* Category Budgets */}
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Category Budgets</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Budgets apply monthly.</div>
          </div>
          <form id="budgetForm" className="form">
            <div className="row">
              <select id="budgetCategory" className="select" />
              <input id="budgetAmount" className="input" type="number" step="0.01" placeholder="Monthly budget" required />
              <button className="btn" type="submit" style={{ textDecoration: 'none' }}>
                Set
              </button>
            </div>
          </form>
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table className="table" id="budgetsTable" />
          </div>
        </div>
      </div>
    </section>
  );
}
