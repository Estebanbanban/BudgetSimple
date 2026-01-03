/**
 * Milestones management functions
 * Supports Epic 5: Milestones & Progress Tracking
 */

const API_BASE = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
  : 'http://localhost:3001'

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

function normalizeProgress (
  milestone: Milestone,
  progress?: Partial<MilestoneProgress> | null
): MilestoneProgress {
  const currentValue = progress?.currentValue ?? 0
  const targetValue = progress?.targetValue ?? milestone.target_value ?? 0
  const calculatedPercent = targetValue > 0 ? (currentValue / targetValue) * 100 : 0

  return {
    milestone,
    currentValue,
    targetValue,
    progressPercent: Math.min(100, progress?.progressPercent ?? calculatedPercent),
    remaining: progress?.remaining ?? Math.max(0, targetValue - currentValue),
    etaMonths: progress?.etaMonths,
    etaDate: progress?.etaDate,
    status: progress?.status ?? 'no_data'
  }
}

export async function getMilestones(userId: string = 'demo-user'): Promise<Milestone[]> {
  try {
    const response = await fetch(`${API_BASE}/api/milestones?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'include'
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return data.milestones || []
  } catch (error) {
    console.error('Error fetching milestones:', error)
    return []
  }
}

export async function getMilestone(id: string, userId: string = 'demo-user'): Promise<MilestoneProgress | null> {
  try {
    const response = await fetch(`${API_BASE}/api/milestones/${id}?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'include'
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (!data?.milestone) return null

    return normalizeProgress(data.milestone, data.progress)
  } catch (error) {
    console.error('Error fetching milestone:', error)
    return null
  }
}

export async function calculateMilestoneProgress(
  milestone: Milestone,
  userId: string = 'demo-user'
): Promise<MilestoneProgress | null> {
  try {
    const response = await fetch(`${API_BASE}/api/milestones/${milestone.id}?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'include'
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()

    return normalizeProgress(milestone, data?.progress)
  } catch (error) {
    console.error('Error calculating milestone progress:', error)
    return normalizeProgress(milestone, null)
  }
}

export async function createMilestone(
  milestone: {
    label: string
    targetValue: number
    targetDate?: string
    type?: 'net_worth' | 'invested_assets' | 'savings'
    displayOrder?: number
  },
  userId: string = 'demo-user'
): Promise<Milestone | null> {
  try {
    const response = await fetch(`${API_BASE}/api/milestones?userId=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify(milestone)
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return data.milestone
  } catch (error) {
    console.error('Error creating milestone:', error)
    return null
  }
}

export async function updateMilestone(
  id: string,
  updates: Partial<{
    label: string
    targetValue: number
    targetDate?: string
    type: 'net_worth' | 'invested_assets' | 'savings'
    displayOrder: number
  }>,
  userId: string = 'demo-user'
): Promise<Milestone | null> {
  try {
    const response = await fetch(`${API_BASE}/api/milestones/${id}?userId=${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return data.milestone
  } catch (error) {
    console.error('Error updating milestone:', error)
    return null
  }
}

export async function deleteMilestone(id: string, userId: string = 'demo-user'): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/milestones/${id}?userId=${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'include'
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Error deleting milestone:', error)
    return false
  }
}

export async function reorderMilestones(ids: string[], userId: string = 'demo-user'): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/milestones/reorder?userId=${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify({ milestoneIds: ids })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Error reordering milestones:', error)
    return false
  }
}

export async function getNextMilestone(userId: string = 'demo-user'): Promise<MilestoneProgress | null> {
  try {
    const response = await fetch(`${API_BASE}/api/milestones/next?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'include'
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()

    if (!data?.milestone) return null
    return normalizeProgress(data.milestone, data.progress)
  } catch (error) {
    console.error('Error fetching next milestone:', error)
    return null
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatDate(dateString?: string): string | null {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  })
}

