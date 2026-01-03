'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createMilestone as apiCreateMilestone,
  deleteMilestone as apiDeleteMilestone,
  getMilestones as apiGetMilestones,
  reorderMilestones as apiReorderMilestones,
  updateMilestone as apiUpdateMilestone,
  type Milestone
} from './milestones'

interface MilestoneInput {
  label?: string
  targetValue?: number
  targetDate?: string | null
  type?: Milestone['type']
  displayOrder?: number
}

interface UseMilestonesResult {
  milestones: Milestone[]
  loading: boolean
  error: string | null
  validationError: string | null
  optimisticIds: Set<string>
  refresh: () => Promise<void>
  addMilestone: (payload: Required<Pick<MilestoneInput, 'label' | 'targetValue'>> & MilestoneInput) => Promise<Milestone | null>
  updateMilestone: (id: string, updates: MilestoneInput) => Promise<Milestone | null>
  deleteMilestone: (id: string) => Promise<boolean>
  reorder: (ids: string[]) => Promise<boolean>
}

function validateMilestone (payload: MilestoneInput, { partial = false } = {}): string | null {
  const { label, targetValue, targetDate, type, displayOrder } = payload

  if (!partial || label !== undefined) {
    if (!label || !label.trim()) return 'Label is required'
  }

  if (!partial || targetValue !== undefined) {
    if (targetValue === undefined || Number.isNaN(targetValue) || targetValue <= 0) {
      return 'Target value must be a positive number'
    }
  }

  if (!partial || displayOrder !== undefined) {
    if (displayOrder !== undefined && displayOrder < 0) {
      return 'Display order must be zero or greater'
    }
  }

  if (targetDate) {
    const parsed = new Date(targetDate)
    if (Number.isNaN(parsed.getTime())) return 'Target date must be a valid date'
  }

  if (type && !['net_worth', 'invested_assets', 'savings'].includes(type)) {
    return 'Type must be net_worth, invested_assets, or savings'
  }

  return null
}

export default function useMilestones (userId: string = 'demo-user'): UseMilestonesResult {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGetMilestones(userId)
      setMilestones(data)
    } catch (err) {
      console.error(err)
      setError('Unable to load milestones')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addMilestone: UseMilestonesResult['addMilestone'] = useCallback(async (payload) => {
    const validation = validateMilestone(payload)
    if (validation) {
      setValidationError(validation)
      return null
    }

    setValidationError(null)
    const optimisticId = `temp-${Date.now()}`
    const optimisticMilestone: Milestone = {
      id: optimisticId,
      label: payload.label!.trim(),
      target_value: payload.targetValue!,
      target_date: payload.targetDate || undefined,
      type: payload.type || 'net_worth',
      display_order: payload.displayOrder ?? milestones.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setOptimisticIds((prev) => new Set([...prev, optimisticId]))
    setMilestones((prev) => [...prev, optimisticMilestone])

    try {
      const saved = await apiCreateMilestone({
        label: optimisticMilestone.label,
        targetValue: optimisticMilestone.target_value,
        targetDate: optimisticMilestone.target_date,
        type: optimisticMilestone.type,
        displayOrder: optimisticMilestone.display_order
      }, userId)

      if (!saved) throw new Error('Failed to save milestone')

      setMilestones((prev) => prev.map((m) => (m.id === optimisticId ? saved : m)))
      return saved
    } catch (err) {
      console.error(err)
      setError('Unable to create milestone')
      setMilestones((prev) => prev.filter((m) => m.id !== optimisticId))
      return null
    } finally {
      setOptimisticIds((prev) => {
        const next = new Set(prev)
        next.delete(optimisticId)
        return next
      })
    }
  }, [milestones.length, userId])

  const updateMilestone: UseMilestonesResult['updateMilestone'] = useCallback(async (id, updates) => {
    const validation = validateMilestone(updates, { partial: true })
    if (validation) {
      setValidationError(validation)
      return null
    }

    setValidationError(null)
    const previous = [...milestones]
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, ...normalizeUpdates(m, updates) } : m)))
    setOptimisticIds((prev) => new Set([...prev, id]))

    try {
      const saved = await apiUpdateMilestone(id, updates, userId)
      if (!saved) throw new Error('Update failed')
      setMilestones((prev) => prev.map((m) => (m.id === id ? saved : m)))
      return saved
    } catch (err) {
      console.error(err)
      setError('Unable to update milestone')
      setMilestones(previous)
      return null
    } finally {
      setOptimisticIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [milestones, userId])

  const deleteMilestone: UseMilestonesResult['deleteMilestone'] = useCallback(async (id) => {
    const previous = [...milestones]
    setOptimisticIds((prev) => new Set([...prev, id]))
    setMilestones((prev) => prev.filter((m) => m.id !== id))

    try {
      const success = await apiDeleteMilestone(id, userId)
      if (!success) throw new Error('Delete failed')
      return true
    } catch (err) {
      console.error(err)
      setError('Unable to delete milestone')
      setMilestones(previous)
      return false
    } finally {
      setOptimisticIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [milestones, userId])

  const reorder: UseMilestonesResult['reorder'] = useCallback(async (ids) => {
    const previous = [...milestones]
    setMilestones((prev) => ids.map((id, index) => ({
      ...prev.find((m) => m.id === id)!,
      display_order: index
    })))

    try {
      const success = await apiReorderMilestones(ids, userId)
      if (!success) throw new Error('Reorder failed')
      return true
    } catch (err) {
      console.error(err)
      setError('Unable to reorder milestones')
      setMilestones(previous)
      return false
    }
  }, [milestones, userId])

  return useMemo(() => ({
    milestones,
    loading,
    error,
    validationError,
    optimisticIds,
    refresh,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    reorder
  }), [addMilestone, deleteMilestone, error, loading, milestones, optimisticIds, refresh, reorder, updateMilestone, validationError])
}

function normalizeUpdates (existing: Milestone, updates: MilestoneInput): Milestone {
  return {
    ...existing,
    ...(updates.label !== undefined ? { label: updates.label } : {}),
    ...(updates.targetValue !== undefined ? { target_value: updates.targetValue } : {}),
    ...(updates.targetDate !== undefined ? { target_date: updates.targetDate || undefined } : {}),
    ...(updates.type !== undefined ? { type: updates.type } : {}),
    ...(updates.displayOrder !== undefined ? { display_order: updates.displayOrder } : {})
  }
}
