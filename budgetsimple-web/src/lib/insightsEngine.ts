/**
 * Deterministic Insights Engine
 * MVP: Rules-based, explainable insights from local IndexedDB data
 * No LLM/AI - all calculations are deterministic and reproducible
 */

export interface MonthlyDelta {
  category: string
  current: number
  previous: number
  change: number
  changePercent: number
  transactions: Array<{
    id: string
    date: string
    amount: number
    description: string
  }>
}

export interface BudgetPace {
  category: string
  budget: number
  spent: number
  remaining: number
  daysRemaining: number
  projectedOverspend: number
  paceStatus: 'on_track' | 'overspending' | 'under_budget'
  transactions: Array<{
    id: string
    date: string
    amount: number
    description: string
  }>
}

export interface RecurringNew {
  merchant: string
  firstSeen: string
  monthlyAmount: number
  occurrenceCount: number
  confidence: 'high' | 'medium' | 'low'
  transactions: Array<{
    id: string
    date: string
    amount: number
    description: string
  }>
}

export interface Insights {
  monthlyDelta: MonthlyDelta[]
  budgetPace: BudgetPace[]
  recurringNew: RecurringNew[]
  generatedAt: string
}

/**
 * Calculate month-over-month changes
 */
export function calculateMonthlyDelta(
  currentMonthTransactions: Array<{
    id: string
    date: string
    amount: number
    description: string
    category: string
  }>,
  previousMonthTransactions: Array<{
    id: string
    date: string
    amount: number
    description: string
    category: string
  }>
): MonthlyDelta[] {
  const currentByCategory = new Map<string, { total: number; transactions: any[] }>()
  const previousByCategory = new Map<string, { total: number; transactions: any[] }>()

  // Aggregate current month
  for (const tx of currentMonthTransactions) {
    const category = tx.category || 'Uncategorized'
    const existing = currentByCategory.get(category) || { total: 0, transactions: [] }
    existing.total += Math.abs(tx.amount)
    existing.transactions.push({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      description: tx.description
    })
    currentByCategory.set(category, existing)
  }

  // Aggregate previous month
  for (const tx of previousMonthTransactions) {
    const category = tx.category || 'Uncategorized'
    const existing = previousByCategory.get(category) || { total: 0, transactions: [] }
    existing.total += Math.abs(tx.amount)
    existing.transactions.push({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      description: tx.description
    })
    previousByCategory.set(category, existing)
  }

  // Calculate deltas
  const deltas: MonthlyDelta[] = []
  const allCategories = new Set([
    ...currentByCategory.keys(),
    ...previousByCategory.keys()
  ])

  for (const category of allCategories) {
    const current = currentByCategory.get(category) || { total: 0, transactions: [] }
    const previous = previousByCategory.get(category) || { total: 0, transactions: [] }
    
    if (current.total === 0 && previous.total === 0) continue

    const change = current.total - previous.total
    const changePercent = previous.total > 0 
      ? (change / previous.total) * 100 
      : (current.total > 0 ? 100 : 0)

    // Only include significant changes (>$50 or >10%)
    if (Math.abs(change) > 50 || Math.abs(changePercent) > 10) {
      deltas.push({
        category,
        current: current.total,
        previous: previous.total,
        change,
        changePercent,
        transactions: current.transactions
      })
    }
  }

  // Sort by absolute change (largest first)
  deltas.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

  return deltas.slice(0, 10) // Top 10
}

/**
 * Calculate budget pace (forecast overspend)
 */
export function calculateBudgetPace(
  transactions: Array<{
    id: string
    date: string
    amount: number
    description: string
    category: string
  }>,
  budgets: Record<string, number>, // category -> monthly budget
  currentMonth: string, // YYYY-MM
  daysInMonth: number
): BudgetPace[] {
  const now = new Date()
  const currentDay = now.getDate()
  const daysRemaining = daysInMonth - currentDay

  const spentByCategory = new Map<string, { total: number; transactions: any[] }>()

  // Aggregate spending for current month
  for (const tx of transactions) {
    if (!tx.date.startsWith(currentMonth)) continue
    if (tx.amount >= 0) continue // Only expenses

    const category = tx.category || 'Uncategorized'
    const existing = spentByCategory.get(category) || { total: 0, transactions: [] }
    existing.total += Math.abs(tx.amount)
    existing.transactions.push({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      description: tx.description
    })
    spentByCategory.set(category, existing)
  }

  const paceResults: BudgetPace[] = []

  for (const [category, budget] of Object.entries(budgets)) {
    const spent = spentByCategory.get(category) || { total: 0, transactions: [] }
    
    // Calculate daily pace
    const dailyPace = currentDay > 0 ? spent.total / currentDay : 0
    const projectedTotal = dailyPace * daysInMonth
    const projectedOverspend = projectedTotal - budget

    let paceStatus: 'on_track' | 'overspending' | 'under_budget'
    if (projectedOverspend > budget * 0.1) {
      paceStatus = 'overspending'
    } else if (projectedOverspend < -budget * 0.1) {
      paceStatus = 'under_budget'
    } else {
      paceStatus = 'on_track'
    }

    paceResults.push({
      category,
      budget,
      spent: spent.total,
      remaining: budget - spent.total,
      daysRemaining,
      projectedOverspend,
      paceStatus,
      transactions: spent.transactions
    })
  }

  // Sort by projected overspend (worst first)
  paceResults.sort((a, b) => b.projectedOverspend - a.projectedOverspend)

  return paceResults.filter(p => p.paceStatus === 'overspending' || p.projectedOverspend > 0)
}

/**
 * Detect new recurring charges
 */
export function detectNewRecurring(
  transactions: Array<{
    id: string
    date: string
    amount: number
    description: string
    merchant?: string
  }>,
  lookbackDays: number = 90
): RecurringNew[] {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)

  // Group by merchant (normalized)
  const byMerchant = new Map<string, {
    transactions: any[]
    dates: string[]
    amounts: number[]
  }>()

  for (const tx of transactions) {
    if (new Date(tx.date) < cutoffDate) continue
    if (tx.amount >= 0) continue // Only expenses

    const merchant = normalizeMerchant(tx.merchant || tx.description || 'Unknown')
    const existing = byMerchant.get(merchant) || {
      transactions: [],
      dates: [],
      amounts: []
    }
    
    existing.transactions.push({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      description: tx.description
    })
    existing.dates.push(tx.date)
    existing.amounts.push(Math.abs(tx.amount))
    byMerchant.set(merchant, existing)
  }

  const recurring: RecurringNew[] = []

  for (const [merchant, data] of byMerchant.entries()) {
    // Need at least 2 occurrences to be "recurring"
    if (data.dates.length < 2) continue

    // Check if dates are roughly periodic (monthly, bi-weekly, etc.)
    const sortedDates = data.dates.sort()
    const gaps: number[] = []
    for (let i = 1; i < sortedDates.length; i++) {
      const gap = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i-1]).getTime()) / (1000 * 60 * 60 * 24)
      gaps.push(gap)
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
    const isMonthly = avgGap >= 25 && avgGap <= 35
    const isBiWeekly = avgGap >= 12 && avgGap <= 18
    const isQuarterly = avgGap >= 85 && avgGap <= 95

    if (!isMonthly && !isBiWeekly && !isQuarterly) continue

    // Check amount consistency
    const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
    const variance = data.amounts.reduce((sum, amt) => {
      return sum + Math.pow(amt - avgAmount, 2)
    }, 0) / data.amounts.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = avgAmount > 0 ? stdDev / avgAmount : 0

    // High confidence: consistent amounts and clear periodicity
    let confidence: 'high' | 'medium' | 'low' = 'low'
    if (coefficientOfVariation < 0.1 && data.dates.length >= 3) {
      confidence = 'high'
    } else if (coefficientOfVariation < 0.2 && data.dates.length >= 2) {
      confidence = 'medium'
    }

    // Calculate monthly equivalent
    let monthlyAmount = avgAmount
    if (isBiWeekly) monthlyAmount = avgAmount * 2.17 // ~26/12
    if (isQuarterly) monthlyAmount = avgAmount / 3

    recurring.push({
      merchant,
      firstSeen: sortedDates[0],
      monthlyAmount,
      occurrenceCount: data.dates.length,
      confidence,
      transactions: data.transactions
    })
  }

  // Sort by confidence and recency
  recurring.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 }
    if (confidenceOrder[b.confidence] !== confidenceOrder[a.confidence]) {
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
    }
    return new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime()
  })

  return recurring.slice(0, 10) // Top 10
}

/**
 * Generate all insights
 */
export function generateInsights(
  transactions: Array<{
    id: string
    date: string
    amount: number
    description: string
    category: string
    merchant?: string
  }>,
  budgets: Record<string, number>,
  currentMonth: string
): Insights {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  // Get current and previous month transactions
  const currentMonthTxs = transactions.filter(tx => tx.date.startsWith(currentMonth))
  const prevMonth = (() => {
    const [year, month] = currentMonth.split('-').map(Number)
    const date = new Date(year, month - 2, 1)
    return date.toISOString().slice(0, 7)
  })()
  const previousMonthTxs = transactions.filter(tx => tx.date.startsWith(prevMonth))

  const monthlyDelta = calculateMonthlyDelta(currentMonthTxs, previousMonthTxs)
  const budgetPace = calculateBudgetPace(transactions, budgets, currentMonth, daysInMonth)
  const recurringNew = detectNewRecurring(transactions)

  return {
    monthlyDelta,
    budgetPace,
    recurringNew,
    generatedAt: new Date().toISOString()
  }
}

/**
 * Normalize merchant name for grouping
 */
function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
}

