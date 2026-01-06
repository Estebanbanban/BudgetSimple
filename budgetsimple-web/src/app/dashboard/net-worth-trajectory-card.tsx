'use client'

import { useState, useEffect } from 'react'
import NetWorthTrajectory from '@/components/net-worth-trajectory'

export default function NetWorthTrajectoryCard() {
  const [netWorth, setNetWorth] = useState<number>(0)
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0)
  const [annualReturn, setAnnualReturn] = useState<number>(0.07)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlanData()
    const interval = setInterval(loadPlanData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadPlanData = () => {
    if (typeof window !== 'undefined') {
      try {
        // Load from localStorage
        const CONFIG_KEY = "budgetsimple:v1"
        const raw = localStorage.getItem(CONFIG_KEY)
        if (raw) {
          const config = JSON.parse(raw)
          if (config?.settings) {
            setNetWorth(config.settings.netWorthManual || 0)
            setAnnualReturn(config.settings.planAnnualReturn || 0.07)
            
            // Calculate monthly contribution from cashflow
            if (typeof window !== 'undefined' && (window as any).budgetsimpleRuntime) {
              const runtime = (window as any).budgetsimpleRuntime
              const transactions = runtime.transactions() || []
              const income = runtime.income() || []
              
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
              
              if (config.settings.planContributionMode === 'manual') {
                setMonthlyContribution(config.settings.planManualContribution || 0)
              } else {
                setMonthlyContribution(autoContrib)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading plan data:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const hasData = netWorth > 0 || monthlyContribution > 0

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Net worth trajectory</div>
          <div className="panel-sub">Assets + liabilities, with projection</div>
        </div>
        <div className="panel-actions">
          <span className="badge badge-eta">
            <span className="badge-dot" />
            Projection
          </span>
        </div>
      </div>
      <div className="panel-body">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            Loading...
          </div>
        ) : hasData ? (
          <div className="chart-wrap" style={{ minHeight: '200px' }}>
            <NetWorthTrajectory
              currentNetWorth={netWorth}
              monthlyContribution={monthlyContribution}
              annualReturn={annualReturn}
            />
          </div>
        ) : (
          <div className="chart-empty" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '3rem 2rem',
            textAlign: 'center',
            gap: '12px'
          }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
              Set starting net worth in Plan to see your trajectory.
            </div>
            <a href="/plan" className="btn btn-accent" style={{ textDecoration: 'none' }}>
              Go to Plan
            </a>
          </div>
        )}
        <div className="panel-note">Wealth Builder assumptions can be adjusted in Investing.</div>
      </div>
    </section>
  )
}

