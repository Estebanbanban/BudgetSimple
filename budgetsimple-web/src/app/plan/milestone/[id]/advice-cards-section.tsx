'use client'

import { useMemo } from 'react'
import { formatCurrency, type Milestone } from '@/lib/milestones-local'

interface AdviceCardsSectionProps {
  milestone: Milestone
  monthlyContribution: number
  requiredContribution: number | null
}

export default function AdviceCardsSection({
  milestone,
  monthlyContribution,
  requiredContribution
}: AdviceCardsSectionProps) {
  const adviceCards = useMemo(() => {
    const cards: Array<{
      type: 'subscription' | 'budget' | 'lifestyle' | 'spike'
      title: string
      message: string
      impact: string
      action?: string
    }> = []

    if (typeof window !== 'undefined' && (window as any).budgetsimpleRuntime) {
      const runtime = (window as any).budgetsimpleRuntime
      const transactions = runtime.transactions() || []
      const config = runtime.config?.() || runtime.getConfig?.()
      const budgets = config?.budgets || {}

      // 1. Subscription leverage
      const subscriptions = runtime.analyzeMerchants?.()?.subscriptions || []
      if (subscriptions.length > 0) {
        const topSubscription = subscriptions[0]
        const monthlySavings = topSubscription.monthly || 0
        if (monthlySavings > 0 && requiredContribution) {
          const monthsSaved = Math.round((milestone.target_value - (milestone.target_value * 0.9)) / monthlySavings)
          cards.push({
            type: 'subscription',
            title: 'Subscription Leverage',
            message: `Your confirmed subscriptions are ${formatCurrency(monthlySavings)}/mo.`,
            impact: `Cutting the top subscription (${topSubscription.merchant}) saves ~${monthsSaved} months.`,
            action: 'Review subscriptions'
          })
        }
      }

      // 2. Budget breach
      const now = new Date()
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      
      const currentByCategory: Record<string, number> = {}
      transactions
        .filter((t: any) => {
          const date = new Date(t.dateISO || t.date)
          return (t.type === 'expense' || (t.amount && t.amount < 0)) && date >= currentMonth && date <= currentMonthEnd
        })
        .forEach((t: any) => {
          const category = t.categoryId || 'Uncategorized'
          const amount = Math.abs(t.amount || 0)
          currentByCategory[category] = (currentByCategory[category] || 0) + amount
        })

      for (const [categoryId, spent] of Object.entries(currentByCategory)) {
        const budget = budgets[categoryId]
        if (budget && spent > budget) {
          const over = spent - budget
          cards.push({
            type: 'budget',
            title: 'Budget Breach',
            message: `${categoryId} is ${formatCurrency(over)} over target this month.`,
            impact: `If fixed, you regain ${formatCurrency(over)}/mo toward milestone.`,
            action: 'Adjust budget'
          })
          break // Only show top breach
        }
      }

      // 3. Lifestyle inflation alert
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      const threeMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0)
      
      const recentSpending = transactions
        .filter((t: any) => {
          const date = new Date(t.dateISO || t.date)
          return (t.type === 'expense' || (t.amount && t.amount < 0)) && date >= threeMonthsAgo && date <= currentMonthEnd
        })
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0)
      
      const oldSpending = transactions
        .filter((t: any) => {
          const date = new Date(t.dateISO || t.date)
          return (t.type === 'expense' || (t.amount && t.amount < 0)) && date >= new Date(now.getFullYear(), now.getMonth() - 6, 1) && date < threeMonthsAgo
        })
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0)
      
      if (oldSpending > 0) {
        const inflationPercent = ((recentSpending - oldSpending) / oldSpending) * 100
        if (inflationPercent > 15) {
          const income = runtime.income() || []
          const recentIncome = income
            .filter((i: any) => {
              const date = new Date(i.dateISO || i.date)
              return date >= threeMonthsAgo
            })
            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
          
          const oldIncome = income
            .filter((i: any) => {
              const date = new Date(i.dateISO || i.date)
              return date >= new Date(now.getFullYear(), now.getMonth() - 6, 1) && date < threeMonthsAgo
            })
            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
          
          if (Math.abs((recentIncome - oldIncome) / oldIncome) < 0.05) { // Income flat (<5% change)
            const monthsLost = Math.round((recentSpending - oldSpending) / (requiredContribution || monthlyContribution || 1))
            cards.push({
              type: 'lifestyle',
              title: 'Lifestyle Inflation Alert',
              message: `Spending rose ${inflationPercent.toFixed(0)}% over 3 months while income flat.`,
              impact: `Milestone pushed out ~${monthsLost} months.`,
              action: 'Review spending'
            })
          }
        }
      }

      // 4. Big spikes
      const monthTransactions = transactions
        .filter((t: any) => {
          const date = new Date(t.dateISO || t.date)
          return (t.type === 'expense' || (t.amount && t.amount < 0)) && date >= currentMonth && date <= currentMonthEnd
        })
        .map((t: any) => ({ ...t, absAmount: Math.abs(t.amount || 0) }))
        .sort((a: { absAmount: number }, b: { absAmount: number }) => b.absAmount - a.absAmount)
      
      const totalMonthSpending = monthTransactions.reduce((sum: number, t: { absAmount: number }) => sum + t.absAmount, 0)
      if (totalMonthSpending > 0 && monthTransactions.length >= 2) {
        const topTwo = monthTransactions.slice(0, 2)
        const topTwoTotal = topTwo.reduce((sum: number, t: { absAmount: number }) => sum + t.absAmount, 0)
        const percentage = (topTwoTotal / totalMonthSpending) * 100
        
        if (percentage > 30) {
          cards.push({
            type: 'spike',
            title: 'Big Spending Spikes',
            message: `2 transactions represent ${percentage.toFixed(0)}% of this month's overspend.`,
            impact: `${topTwo[0].description || 'Transaction 1'}: ${formatCurrency(topTwo[0].absAmount)}, ${topTwo[1].description || 'Transaction 2'}: ${formatCurrency(topTwo[1].absAmount)}`,
            action: 'Review transactions'
          })
        }
      }
    }

    return cards.slice(0, 3) // Max 3 cards
  }, [milestone, monthlyContribution, requiredContribution])

  if (adviceCards.length === 0) {
    return null
  }

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
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>Recommendations</div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>Actionable insights to accelerate your timeline</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {adviceCards.map((card, idx) => {
          const bgColor = card.type === 'subscription' ? '#eff6ff' :
                          card.type === 'budget' ? '#fef2f2' :
                          card.type === 'lifestyle' ? '#fffbeb' :
                          '#f0fdf4'
          const borderColor = card.type === 'subscription' ? '#bfdbfe' :
                              card.type === 'budget' ? '#fecaca' :
                              card.type === 'lifestyle' ? '#fde68a' :
                              '#a7f3d0'
          
          return (
            <div 
              key={idx}
              style={{ 
                padding: '12px', 
                background: bgColor, 
                borderRadius: '8px',
                border: `1px solid ${borderColor}`
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2933', marginBottom: '4px' }}>
                {card.title}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                {card.message}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#059669', marginBottom: card.action ? '6px' : '0' }}>
                {card.impact}
              </div>
              {card.action && (
                <a 
                  href={card.type === 'subscription' ? '/subscriptions' : card.type === 'budget' ? '/plan' : '/dashboard'}
                  className="btn btn-sm btn-quiet"
                  style={{ 
                    marginTop: '8px', 
                    textDecoration: 'none',
                    fontSize: '11px',
                    padding: '4px 8px'
                  }}
                >
                  {card.action}
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

