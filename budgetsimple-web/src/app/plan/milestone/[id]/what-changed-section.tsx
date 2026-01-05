'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate, type Milestone } from '@/lib/milestones-local'
import { calculateETA, type ProjectionInputs } from '@/lib/milestone-projection'

interface WhatChangedSectionProps {
  milestone: Milestone
  currentETA: { month: number; date: string } | null
  currentContribution: number
  currentReturn: number
  currentNetWorth: number
}

export default function WhatChangedSection({
  milestone,
  currentETA,
  currentContribution,
  currentReturn,
  currentNetWorth
}: WhatChangedSectionProps) {
  const [lastMonthETA, setLastMonthETA] = useState<{ month: number; date: string } | null>(null)
  const [lastMonthContribution, setLastMonthContribution] = useState<number>(0)
  const [lastMonthReturn, setLastMonthReturn] = useState<number>(0.07)
  const [lastMonthNetWorth, setLastMonthNetWorth] = useState<number>(0)
  const [drivers, setDrivers] = useState<Array<{ 
    driver: string
    impact: string
    months: number
  }>>([])

  useEffect(() => {
    loadLastMonthData()
  }, [])

  const loadLastMonthData = () => {
    if (typeof window !== 'undefined') {
      try {
        const CONFIG_KEY = "budgetsimple:v1"
        const raw = localStorage.getItem(CONFIG_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          const config = parsed && typeof parsed === 'object' ? (parsed as any) : null
          const settings =
            config &&
            Object.prototype.hasOwnProperty.call(config, 'settings') &&
            config.settings &&
            typeof config.settings === 'object'
              ? (config.settings as any)
              : null
          // Load last month's assumptions (stored in a separate key or calculated)
          // For now, we'll calculate from transactions
          if ((window as any).budgetsimpleRuntime) {
            const runtime = (window as any).budgetsimpleRuntime
            const transactions = runtime.transactions() || []
            const income = runtime.income() || []
            
            // Calculate last month's contribution
            const now = new Date()
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
            
            const lastMonthIncome = income
              .filter((i: any) => {
                const date = new Date(i.dateISO || i.date)
                return date >= lastMonth && date <= lastMonthEnd
              })
              .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
            
            const lastMonthExpenses = transactions
              .filter((t: any) => {
                const date = new Date(t.dateISO || t.date)
                return date >= lastMonth && date <= lastMonthEnd && (t.type === 'expense' || (t.amount && t.amount < 0))
              })
              .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0)
            
            const computedLastMonthContribution = Math.max(
              0,
              lastMonthIncome - lastMonthExpenses
            )
            setLastMonthContribution(computedLastMonthContribution)

            const ar = settings ? Number(settings.planAnnualReturn) : NaN
            const computedLastMonthReturn =
              Number.isFinite(ar) && ar >= 0 && ar <= 1 ? ar : 0.07
            setLastMonthReturn(computedLastMonthReturn)

            const nw = settings ? Number(settings.netWorthManual) : NaN
            const computedLastMonthNetWorth = Number.isFinite(nw) ? nw : 0
            setLastMonthNetWorth(computedLastMonthNetWorth)
            
            // Calculate last month's ETA
            const lastMonthInputs: ProjectionInputs = {
              currentNetWorth: computedLastMonthNetWorth,
              monthlyContribution: computedLastMonthContribution,
              annualReturn: computedLastMonthReturn,
              monthsToProject: 120
            }
            const lastETA = calculateETA(lastMonthInputs, milestone.target_value)
            setLastMonthETA(lastETA)
            
            // Calculate drivers
            calculateDrivers(
              lastETA,
              currentETA,
              computedLastMonthContribution,
              currentContribution,
              computedLastMonthReturn,
              currentReturn,
              computedLastMonthNetWorth,
              currentNetWorth
            )
          }
        }
      } catch (error) {
        console.error('Error loading last month data:', error)
      }
    }
  }

  const calculateDrivers = (
    lastETA: { month: number; date: string } | null,
    currentETA: { month: number; date: string } | null,
    lastContrib: number,
    currentContrib: number,
    lastReturn: number,
    currentReturn: number,
    lastNW: number,
    currentNW: number
  ) => {
    const driversList: Array<{ driver: string; impact: string; months: number }> = []
    
    if (lastETA && currentETA) {
      const etaDelta = currentETA.month - lastETA.month
      if (Math.abs(etaDelta) > 0) {
        driversList.push({
          driver: 'ETA Movement',
          impact: etaDelta > 0 ? `+${etaDelta} months later` : `${Math.abs(etaDelta)} months earlier`,
          months: etaDelta
        })
      }
    }
    
    const contribDelta = currentContrib - lastContrib
    if (Math.abs(contribDelta) > 10) {
      const impactMonths = contribDelta > 0 ? -Math.round(contribDelta / 100) : Math.round(Math.abs(contribDelta) / 100)
      driversList.push({
        driver: 'Contribution Change',
        impact: `${contribDelta > 0 ? '+' : ''}${formatCurrency(contribDelta)}/mo`,
        months: impactMonths
      })
    }
    
    const returnDelta = currentReturn - lastReturn
    if (Math.abs(returnDelta) > 0.001) {
      driversList.push({
        driver: 'Return Assumption',
        impact: `${returnDelta > 0 ? '+' : ''}${(returnDelta * 100).toFixed(1)}%`,
        months: returnDelta > 0 ? -1 : 1
      })
    }
    
    const nwDelta = currentNW - lastNW
    if (Math.abs(nwDelta) > 100) {
      driversList.push({
        driver: 'Starting Net Worth',
        impact: `${nwDelta > 0 ? '+' : ''}${formatCurrency(nwDelta)}`,
        months: nwDelta > 0 ? -2 : 2
      })
    }
    
    // Calculate MoM expense/income drivers
    if (typeof window !== 'undefined' && (window as any).budgetsimpleRuntime) {
      const runtime = (window as any).budgetsimpleRuntime
      const transactions = runtime.transactions() || []
      const income = runtime.income() || []
      
      const now = new Date()
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      
      // Calculate by category
      const currentByCategory: Record<string, number> = {}
      const lastByCategory: Record<string, number> = {}
      
      transactions
        .filter((t: any) => {
          const date = new Date(t.dateISO || t.date)
          return (t.type === 'expense' || (t.amount && t.amount < 0)) && date >= lastMonth && date <= currentMonthEnd
        })
        .forEach((t: any) => {
          const date = new Date(t.dateISO || t.date)
          const category = t.categoryId || 'Uncategorized'
          const amount = Math.abs(t.amount || 0)
          
          if (date >= currentMonth && date <= currentMonthEnd) {
            currentByCategory[category] = (currentByCategory[category] || 0) + amount
          } else if (date >= lastMonth && date <= lastMonthEnd) {
            lastByCategory[category] = (lastByCategory[category] || 0) + amount
          }
        })
      
      // Find top 3 category changes
      const categoryChanges = Object.keys({ ...currentByCategory, ...lastByCategory })
        .map(category => {
          const current = currentByCategory[category] || 0
          const last = lastByCategory[category] || 0
          const change = current - last
          return { category, change, current, last }
        })
        .filter(c => Math.abs(c.change) > 50)
        .sort((a: { change: number }, b: { change: number }) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 3)
      
      categoryChanges.forEach(({ category, change }) => {
        if (change < 0) {
          // Expense decreased (good for milestone)
          const monthsSaved = Math.round(Math.abs(change) / 100)
          driversList.push({
            driver: `${category} decreased`,
            impact: `-${formatCurrency(Math.abs(change))}/mo savings`,
            months: -monthsSaved
          })
        } else {
          // Expense increased (bad for milestone)
          const monthsLost = Math.round(change / 100)
          driversList.push({
            driver: `${category} increased`,
            impact: `-${formatCurrency(change)}/mo savings`,
            months: monthsLost
          })
        }
      })
      
      // Income change
      const currentIncome = income
        .filter((i: any) => {
          const date = new Date(i.dateISO || i.date)
          return date >= currentMonth && date <= currentMonthEnd
        })
        .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
      
      const lastIncome = income
        .filter((i: any) => {
          const date = new Date(i.dateISO || i.date)
          return date >= lastMonth && date <= lastMonthEnd
        })
        .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
      
      const incomeChange = currentIncome - lastIncome
      if (Math.abs(incomeChange) > 50) {
        const monthsImpact = incomeChange > 0 ? -Math.round(incomeChange / 100) : Math.round(Math.abs(incomeChange) / 100)
        driversList.push({
          driver: 'Income change',
          impact: `${incomeChange > 0 ? '+' : ''}${formatCurrency(incomeChange)}/mo savings`,
          months: monthsImpact
        })
      }
    }
    
    // Sort by absolute months impact
    driversList.sort((a, b) => Math.abs(b.months) - Math.abs(a.months))
    setDrivers(driversList.slice(0, 3))
  }

  const etaDelta = lastMonthETA && currentETA 
    ? currentETA.month - lastMonthETA.month 
    : null

  return (
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
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>What Changed?</div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>Drivers since last month</div>
      </div>

      {/* Delta Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {etaDelta !== null && (
          <div style={{ 
            padding: '12px', 
            background: etaDelta > 0 ? '#fef2f2' : '#f0fdf4', 
            borderRadius: '8px',
            border: `1px solid ${etaDelta > 0 ? '#fecaca' : '#a7f3d0'}`
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>ETA Movement</div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              color: etaDelta > 0 ? '#dc2626' : '#059669' 
            }}>
              {etaDelta > 0 ? `+${etaDelta} months` : `${etaDelta} months`}
            </div>
          </div>
        )}
        {Math.abs(currentContribution - lastMonthContribution) > 10 && (
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Contribution Change</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2933' }}>
              {currentContribution > lastMonthContribution ? '+' : ''}{formatCurrency(currentContribution - lastMonthContribution)}/mo
            </div>
          </div>
        )}
        {Math.abs(currentReturn - lastMonthReturn) > 0.001 && (
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Return Assumption</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2933' }}>
              {currentReturn > lastMonthReturn ? '+' : ''}{(currentReturn - lastMonthReturn) * 100}%
            </div>
          </div>
        )}
        {Math.abs(currentNetWorth - lastMonthNetWorth) > 100 && (
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Starting NW Change</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2933' }}>
              {currentNetWorth > lastMonthNetWorth ? '+' : ''}{formatCurrency(currentNetWorth - lastMonthNetWorth)}
            </div>
          </div>
        )}
      </div>

      {/* Top 3 Drivers */}
      {drivers.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1f2933' }}>
            Top {drivers.length} Drivers of ETA Movement
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {drivers.map((driver, idx) => (
              <div 
                key={idx}
                style={{ 
                  padding: '10px 12px', 
                  background: driver.months < 0 ? '#f0fdf4' : '#fef2f2', 
                  borderRadius: '6px',
                  border: `1px solid ${driver.months < 0 ? '#a7f3d0' : '#fecaca'}`
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2933', marginBottom: '2px' }}>
                  {driver.driver}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {driver.impact} → ETA {driver.months < 0 ? `${Math.abs(driver.months)} months earlier` : `${driver.months} months later`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {drivers.length === 0 && (
        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          No significant changes detected since last month.
        </div>
      )}
    </div>
  )
}

