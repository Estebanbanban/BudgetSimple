'use strict'

const {
  calculateMilestoneProgressFromInputs,
  calculateMonthlyReturn
} = require('./projection')

/**
 * Database operations for milestones
 * Supports Epic 5: Milestones & Progress Tracking
 */

/**
 * Get all milestones for a user
 */
async function getMilestones (fastify, userId) {
  // For MVP, return empty array if Supabase not available (graceful degradation)
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning empty array for milestones')
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
async function calculateMilestoneProgress (fastify, userId, milestoneId, options = {}) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning null for milestone progress')
    return null
  }

  try {
    const milestone = await getMilestone(fastify, userId, milestoneId)
    if (!milestone) return null

    const targetValue = parseFloat(milestone.target_value || 0)

    // Get current net worth
    let currentNetWorth = options.currentNetWorth
    if (currentNetWorth === undefined) {
      const { data: latestSnapshot, error: snapshotError } = await fastify.supabase
        .from('net_worth_snapshots')
        .select('net_worth, snapshot_date')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (snapshotError && snapshotError.code !== 'PGRST116') {
        fastify.log.warn(snapshotError, 'Error fetching net worth snapshot, using 0')
      }

      currentNetWorth = parseFloat(latestSnapshot?.net_worth || 0)
    }

    // Get user assumptions for projection
    let assumptions = options.assumptions
    if (!assumptions) {
      const { data } = await fastify.supabase
        .from('user_assumptions')
        .select('*')
        .eq('user_id', userId)
        .single()
      assumptions = data
    }

    const annualReturnPercent = parseFloat(assumptions?.expected_annual_return ?? 7.0)
    const projectionHorizonMonths = parseInt(assumptions?.projection_horizon_months ?? 360)

    // Calculate monthly contribution (from savings rate or override)
    const monthlyContribution = parseFloat(assumptions?.monthly_contribution_override || 0)
    // TODO: If no override, calculate from actual savings rate

    const progress = calculateMilestoneProgressFromInputs({
      currentNetWorth,
      targetValue,
      targetDate: milestone.target_date,
      annualReturnPercent,
      monthlyContribution,
      projectionHorizonMonths
    })

    return {
      milestone,
      currentValue: currentNetWorth,
      targetValue,
      progressPercent: progress.progressPercent,
      remaining: progress.remaining,
      etaMonths: progress.etaMonths,
      etaDate: progress.etaDate,
      status: progress.status,
      monthlyReturn: calculateMonthlyReturn(annualReturnPercent) * 100
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

