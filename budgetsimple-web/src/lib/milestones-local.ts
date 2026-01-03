/**
 * Local-first Milestones Management
 * Stores milestones in IndexedDB and calculates progress from local transaction data
 */

export interface Milestone {
  id: string
  label: string
  target_value: number
  target_date?: string
  type: 'net_worth' | 'invested_assets' | 'savings'
  display_order: number
  created_at: string
  updated_at: string
}

export interface MilestoneProgress {
  milestone: Milestone
  currentValue: number
  targetValue: number
  progressPercent: number
  remaining: number
  etaMonths?: number
  etaDate?: string
  status: 'ahead' | 'on_track' | 'behind' | 'no_data'
}

// Get the store from runtime
function getStore() {
  if (typeof window === 'undefined') return null
  const runtime = (window as any).budgetsimpleRuntime
  if (!runtime || !runtime.getStore) return null
  return runtime.getStore()
}

// Get transactions and income from runtime
function getFinancialData() {
  if (typeof window === 'undefined') return { transactions: [], income: [] }
  const runtime = (window as any).budgetsimpleRuntime
  if (!runtime) return { transactions: [], income: [] }
  return {
    transactions: runtime.transactions() || [],
    income: runtime.income() || []
  }
}

/**
 * Get all milestones from IndexedDB
 */
export async function getMilestones(): Promise<Milestone[]> {
  const store = getStore()
  if (!store) return []
  
  try {
    const milestones = await store.getAll('milestones')
    return milestones.sort((a: Milestone, b: Milestone) => 
      (a.display_order || 0) - (b.display_order || 0)
    )
  } catch (error) {
    console.error('Error fetching milestones:', error)
    return []
  }
}

/**
 * Create a new milestone
 */
export async function createMilestone(
  milestone: {
    label: string
    targetValue: number
    targetDate?: string
    type?: 'net_worth' | 'invested_assets' | 'savings'
    displayOrder?: number
  }
): Promise<Milestone | null> {
  const store = getStore()
  if (!store) return null

  const now = new Date().toISOString()
  const newMilestone: Milestone = {
    id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    label: milestone.label,
    target_value: milestone.targetValue,
    target_date: milestone.targetDate,
    type: milestone.type || 'net_worth',
    display_order: milestone.displayOrder || 0,
    created_at: now,
    updated_at: now
  }

  try {
    await store.put('milestones', newMilestone)
    return newMilestone
  } catch (error) {
    console.error('Error creating milestone:', error)
    return null
  }
}

/**
 * Update a milestone
 */
export async function updateMilestone(
  id: string,
  updates: Partial<{
    label: string
    targetValue: number
    targetDate?: string
    type: 'net_worth' | 'invested_assets' | 'savings'
    displayOrder: number
  }>
): Promise<Milestone | null> {
  const store = getStore()
  if (!store) return null

  try {
    const milestones = await store.getAll('milestones')
    const milestone = milestones.find((m: Milestone) => m.id === id)
    if (!milestone) return null

    const updated: Milestone = {
      ...milestone,
      ...(updates.label && { label: updates.label }),
      ...(updates.targetValue !== undefined && { target_value: updates.targetValue }),
      ...(updates.targetDate !== undefined && { target_date: updates.targetDate }),
      ...(updates.type && { type: updates.type }),
      ...(updates.displayOrder !== undefined && { display_order: updates.displayOrder }),
      updated_at: new Date().toISOString()
    }

    await store.put('milestones', updated)
    return updated
  } catch (error) {
    console.error('Error updating milestone:', error)
    return null
  }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(id: string): Promise<boolean> {
  const store = getStore()
  if (!store) return false

  try {
    await store.remove('milestones', id)
    return true
  } catch (error) {
    console.error('Error deleting milestone:', error)
    return false
  }
}

/**
 * Reorder milestones
 */
export async function reorderMilestones(ids: string[]): Promise<boolean> {
  const store = getStore()
  if (!store) return false

  try {
    const milestones = await store.getAll('milestones')
    for (let i = 0; i < ids.length; i++) {
      const milestone = milestones.find((m: Milestone) => m.id === ids[i])
      if (milestone) {
        milestone.display_order = i
        milestone.updated_at = new Date().toISOString()
        await store.put('milestones', milestone)
      }
    }
    return true
  } catch (error) {
    console.error('Error reordering milestones:', error)
    return false
  }
}

/**
 * Calculate current value based on milestone type
 */
function calculateCurrentValue(milestone: Milestone, transactions: any[], income: any[]): number {
  switch (milestone.type) {
    case 'net_worth':
      // Net worth = total income - total expenses + investments
      const totalIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0)
      const totalExpenses = transactions
        .filter(t => t.type === 'expense' || (t.amount && t.amount < 0))
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
      // For MVP, assume net worth = income - expenses (simplified)
      return Math.max(0, totalIncome - totalExpenses)
    
    case 'invested_assets':
      // Sum of investment transactions
      return transactions
        .filter(t => t.type === 'investment' || (t.categoryId && t.categoryId.includes('invest')))
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    
    case 'savings':
      // Savings = income - expenses (positive cash flow)
      const savingsIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0)
      const savingsExpenses = transactions
        .filter(t => t.type === 'expense' || (t.amount && t.amount < 0))
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
      return Math.max(0, savingsIncome - savingsExpenses)
    
    default:
      return 0
  }
}

/**
 * Calculate progress for a milestone
 */
export async function calculateMilestoneProgress(milestone: Milestone): Promise<MilestoneProgress | null> {
  const { transactions, income } = getFinancialData()
  const currentValue = calculateCurrentValue(milestone, transactions, income)
  const targetValue = milestone.target_value
  const progressPercent = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0
  const remaining = Math.max(0, targetValue - currentValue)

  // Calculate ETA based on historical pace
  let etaMonths: number | undefined
  let etaDate: string | undefined
  let status: 'ahead' | 'on_track' | 'behind' | 'no_data' = 'no_data'

  if (transactions.length > 0 || income.length > 0) {
    // Calculate monthly pace (simplified: average monthly change)
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    
    const recentIncome = income
      .filter(i => new Date(i.dateISO || i.date) >= threeMonthsAgo)
      .reduce((sum, i) => sum + (i.amount || 0), 0)
    
    const recentExpenses = transactions
      .filter(t => {
        const date = new Date(t.dateISO || t.date)
        return date >= threeMonthsAgo && (t.type === 'expense' || (t.amount && t.amount < 0))
      })
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    
    const monthlyPace = (recentIncome - recentExpenses) / 3 // Average over 3 months
    
    if (monthlyPace > 0 && remaining > 0) {
      etaMonths = Math.ceil(remaining / monthlyPace)
      const eta = new Date(now.getFullYear(), now.getMonth() + etaMonths, 1)
      etaDate = eta.toISOString().split('T')[0]

      // Determine status
      if (milestone.target_date) {
        const targetDate = new Date(milestone.target_date)
        const daysUntilTarget = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        const monthsUntilTarget = daysUntilTarget / 30
        
        if (etaMonths < monthsUntilTarget * 0.9) {
          status = 'ahead'
        } else if (etaMonths <= monthsUntilTarget * 1.1) {
          status = 'on_track'
        } else {
          status = 'behind'
        }
      } else {
        // No target date, just use pace
        status = monthlyPace > (remaining / 12) ? 'on_track' : 'behind'
      }
    } else {
      status = 'no_data'
    }
  }

  return {
    milestone,
    currentValue,
    targetValue,
    progressPercent,
    remaining,
    etaMonths,
    etaDate,
    status
  }
}

/**
 * Get the next milestone (first incomplete milestone)
 */
export async function getNextMilestone(): Promise<MilestoneProgress | null> {
  const milestones = await getMilestones()
  if (milestones.length === 0) return null

  // Find first incomplete milestone
  for (const milestone of milestones) {
    const progress = await calculateMilestoneProgress(milestone)
    if (progress && progress.progressPercent < 100) {
      return progress
    }
  }

  return null
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format date
 */
export function formatDate(dateString?: string): string | null {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  })
}

