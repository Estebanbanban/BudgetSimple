'use strict'

/**
 * Database operations for milestones
 * Supports Epic 5: Milestones & Progress Tracking
 */

/**
 * Get all milestones for a user
 */
async function getMilestones (fastify, userId) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning empty array')
    return []
  }

  try {
    const { data, error } = await fastify.supabase
      .from('milestones')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true })
      .order('target_date', { ascending: true, nullsLast: true })
      .order('target_value', { ascending: true })

    if (error) {
      fastify.log.error(error, 'Error fetching milestones')
      return []
    }

    return data || []
  } catch (error) {
    fastify.log.error(error, 'Exception fetching milestones')
    return []
  }
}

/**
 * Get a single milestone by ID
 */
async function getMilestone (fastify, userId, milestoneId) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning null')
    return null
  }

  try {
    const { data, error } = await fastify.supabase
      .from('milestones')
      .select('*')
      .eq('id', milestoneId)
      .eq('user_id', userId)
      .single()

    if (error) {
      fastify.log.error(error, 'Error fetching milestone')
      return null
    }

    return data
  } catch (error) {
    fastify.log.error(error, 'Exception fetching milestone')
    return null
  }
}

/**
 * Create a new milestone
 */
async function createMilestone (fastify, userId, milestoneData) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning stub')
    return {
      id: `milestone-${Date.now()}`,
      ...milestoneData,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  try {
    const insertData = {
      user_id: userId,
      label: milestoneData.label,
      target_value: milestoneData.targetValue || milestoneData.target_value,
      target_date: milestoneData.targetDate || milestoneData.target_date || null,
      type: milestoneData.type || 'net_worth',
      display_order: milestoneData.displayOrder || milestoneData.display_order || 0
    }

    const { data, error } = await fastify.supabase
      .from('milestones')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      fastify.log.error(error, 'Error creating milestone')
      return null
    }

    return data
  } catch (error) {
    fastify.log.error(error, 'Exception creating milestone')
    return null
  }
}

/**
 * Update a milestone
 */
async function updateMilestone (fastify, userId, milestoneId, updates) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning stub')
    return {
      id: milestoneId,
      ...updates,
      updated_at: new Date().toISOString()
    }
  }

  try {
    const updateData = {}
    if (updates.label !== undefined) updateData.label = updates.label
    if (updates.targetValue !== undefined || updates.target_value !== undefined) {
      updateData.target_value = updates.targetValue || updates.target_value
    }
    if (updates.targetDate !== undefined || updates.target_date !== undefined) {
      updateData.target_date = updates.targetDate || updates.target_date || null
    }
    if (updates.type !== undefined) updateData.type = updates.type
    if (updates.displayOrder !== undefined || updates.display_order !== undefined) {
      updateData.display_order = updates.displayOrder || updates.display_order
    }
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await fastify.supabase
      .from('milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      fastify.log.error(error, 'Error updating milestone')
      return null
    }

    return data
  } catch (error) {
    fastify.log.error(error, 'Exception updating milestone')
    return null
  }
}

/**
 * Delete a milestone
 */
async function deleteMilestone (fastify, userId, milestoneId) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning false')
    return false
  }

  try {
    const { error } = await fastify.supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('user_id', userId)

    if (error) {
      fastify.log.error(error, 'Error deleting milestone')
      return false
    }

    return true
  } catch (error) {
    fastify.log.error(error, 'Exception deleting milestone')
    return false
  }
}

/**
 * Reorder milestones
 */
async function reorderMilestones (fastify, userId, milestoneIds) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning false')
    return false
  }

  try {
    // Update display_order for each milestone
    const updates = milestoneIds.map((id, index) => ({
      id,
      display_order: index
    }))

    for (const update of updates) {
      const { error } = await fastify.supabase
        .from('milestones')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
        .eq('user_id', userId)

      if (error) {
        fastify.log.error(error, `Error updating milestone ${update.id} order`)
        return false
      }
    }

    return true
  } catch (error) {
    fastify.log.error(error, 'Exception reordering milestones')
    return false
  }
}

/**
 * Get next milestone (for dashboard widget)
 */
async function getNextMilestone (fastify, userId) {
  if (!fastify.supabase) {
    return null
  }

  try {
    // Get all milestones
    const milestones = await getMilestones(fastify, userId)
    if (milestones.length === 0) return null

    // Get current net worth (from latest snapshot or calculate)
    const { data: latestSnapshot } = await fastify.supabase
      .from('net_worth_snapshots')
      .select('net_worth')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    const currentNetWorth = latestSnapshot?.net_worth || 0

    // Find next milestone (not yet reached)
    const nextMilestone = milestones.find(m => {
      const target = parseFloat(m.target_value || 0)
      return currentNetWorth < target
    })

    return nextMilestone || milestones[milestones.length - 1] // Return last if all reached
  } catch (error) {
    fastify.log.error(error, 'Exception getting next milestone')
    return null
  }
}

/**
 * Calculate milestone progress and ETA
 */
async function calculateMilestoneProgress (fastify, userId, milestoneId) {
  if (!fastify.supabase) {
    return null
  }

  try {
    const milestone = await getMilestone(fastify, userId, milestoneId)
    if (!milestone) return null

    // Get current net worth
    const { data: latestSnapshot } = await fastify.supabase
      .from('net_worth_snapshots')
      .select('net_worth, snapshot_date')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    const currentNetWorth = parseFloat(latestSnapshot?.net_worth || 0)
    const targetValue = parseFloat(milestone.target_value || 0)

    // Calculate progress
    const progressPercent = targetValue > 0 ? (currentNetWorth / targetValue) * 100 : 0
    const remaining = Math.max(0, targetValue - currentNetWorth)

    // Get user assumptions for projection
    const { data: assumptions } = await fastify.supabase
      .from('user_assumptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    const annualReturn = parseFloat(assumptions?.expected_annual_return || 7.0) / 100
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1

    // Calculate monthly contribution (from savings rate or override)
    const monthlyContribution = parseFloat(assumptions?.monthly_contribution_override || 0)
    // TODO: If no override, calculate from actual savings rate

    // Calculate ETA (simplified: linear projection if no return, or compound if return > 0)
    let etaMonths = null
    if (monthlyContribution > 0 || monthlyReturn > 0) {
      if (monthlyReturn > 0) {
        // Compound growth: NW(t) = NW(0) * (1+r)^t + C * ((1+r)^t - 1) / r
        // Solve for t where NW(t) >= target
        let months = 0
        let projectedNW = currentNetWorth
        while (projectedNW < targetValue && months < 360) {
          projectedNW = projectedNW * (1 + monthlyReturn) + monthlyContribution
          months++
        }
        etaMonths = months < 360 ? months : null
      } else {
        // Linear: months = remaining / monthlyContribution
        etaMonths = monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null
      }
    }

    // Calculate ETA date
    let etaDate = null
    if (etaMonths !== null) {
      const eta = new Date()
      eta.setMonth(eta.getMonth() + etaMonths)
      etaDate = eta.toISOString().split('T')[0]
    }

    // Determine status
    let status = 'on_track'
    if (milestone.target_date) {
      const targetDate = new Date(milestone.target_date)
      if (etaDate) {
        const eta = new Date(etaDate)
        const diffMonths = (eta.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        if (diffMonths < -3) status = 'ahead'
        else if (diffMonths > 3) status = 'behind'
      }
    }

    return {
      milestone,
      currentValue: currentNetWorth,
      targetValue,
      progressPercent: Math.min(100, progressPercent),
      remaining,
      etaMonths,
      etaDate,
      status
    }
  } catch (error) {
    fastify.log.error(error, 'Exception calculating milestone progress')
    return null
  }
}

module.exports = {
  getMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  reorderMilestones,
  getNextMilestone,
  calculateMilestoneProgress
}

