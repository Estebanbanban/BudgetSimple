'use strict'

/**
 * Milestones API routes
 * Supports Epic 5: Milestones & Progress Tracking
 */

const db = require('../lib/db-milestones')

const milestoneProperties = {
  id: { type: 'string' },
  label: { type: 'string', minLength: 1 },
  target_value: { type: 'number', exclusiveMinimum: 0 },
  target_date: { type: 'string', format: 'date', nullable: true },
  type: { type: 'string', enum: ['net_worth', 'invested_assets', 'savings'] },
  display_order: { type: 'number', minimum: 0 },
  created_at: { type: 'string' },
  updated_at: { type: 'string' }
}

const milestoneSchema = {
  type: 'object',
  properties: milestoneProperties,
  required: ['id', 'label', 'target_value', 'type', 'display_order']
}

function validatePayload (payload, { partial = false } = {}) {
  const { label, targetValue, targetDate, type, displayOrder } = payload

  if (!partial || label !== undefined) {
    if (!label || typeof label !== 'string' || !label.trim()) {
      return 'Label is required'
    }
  }

  if (!partial || targetValue !== undefined) {
    if (typeof targetValue !== 'number' || Number.isNaN(targetValue) || targetValue <= 0) {
      return 'targetValue must be a positive number'
    }
  }

  if (!partial || displayOrder !== undefined) {
    if (displayOrder !== undefined && (typeof displayOrder !== 'number' || displayOrder < 0)) {
      return 'displayOrder must be zero or greater'
    }
  }

  if (targetDate !== undefined && targetDate !== null && targetDate !== '') {
    const parsed = new Date(targetDate)
    if (Number.isNaN(parsed.getTime())) {
      return 'targetDate must be a valid date'
    }
  }

  if (type !== undefined && !['net_worth', 'invested_assets', 'savings'].includes(type)) {
    return 'type must be one of net_worth, invested_assets, or savings'
  }

  return null
}

module.exports = async function milestonesRoute (fastify) {
  // GET /api/milestones - List all milestones for user
  fastify.get('/api/milestones', {
    schema: {
      summary: 'Get all milestones for the authenticated user',
      tags: ['milestones'],
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            milestones: {
              type: 'array',
              items: milestoneSchema
            }
          }
        }
      }
    }
  }, async function listHandler (request, reply) {
    const { userId = 'demo-user' } = request.query

    try {
      const milestones = await db.getMilestones(fastify, userId)
      return { milestones }
    } catch (error) {
      fastify.log.error(error, 'Error listing milestones')
      return reply.code(500).send({ error: 'Failed to fetch milestones' })
    }
  })

  // GET /api/milestones/next - Get next milestone for dashboard widget
  fastify.get('/api/milestones/next', {
    schema: {
      summary: 'Get next milestone for dashboard widget',
      tags: ['milestones'],
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          }
        }
      }
    }
  }, async function nextHandler (request, reply) {
    const { userId = 'demo-user' } = request.query

    try {
      // Check if Supabase is available
      if (!fastify.supabase) {
        fastify.log.warn('Supabase not available, returning empty milestone')
        return { milestone: null, progress: null }
      }

      const milestone = await db.getNextMilestone(fastify, userId)
      if (!milestone) {
        return { milestone: null, progress: null }
      }

      // Calculate progress
      const progress = await db.calculateMilestoneProgress(fastify, userId, milestone.id)
      return { milestone, progress }
    } catch (error) {
      fastify.log.error(error, 'Error getting next milestone')
      // Return empty instead of error for graceful degradation
      return { milestone: null, progress: null }
    }
  })

  // GET /api/milestones/:id - Get milestone details with progress
  fastify.get('/api/milestones/:id', {
    schema: {
      summary: 'Get milestone details with progress calculation',
      tags: ['milestones'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            milestone: milestoneSchema,
            progress: { type: 'object' }
          }
        }
      }
    }
  }, async function getHandler (request, reply) {
    const { id } = request.params
    const { userId = 'demo-user' } = request.query

    try {
      if (!fastify.supabase) {
        return reply.code(404).send({ error: 'Milestone not found' })
      }

      const milestone = await db.getMilestone(fastify, userId, id)
      if (!milestone) {
        return reply.code(404).send({ error: 'Milestone not found' })
      }

      const progress = await db.calculateMilestoneProgress(fastify, userId, id)
      return { milestone, progress }
    } catch (error) {
      fastify.log.error(error, 'Error getting milestone')
      return reply.code(500).send({ error: 'Failed to fetch milestone' })
    }
  })

  // POST /api/milestones - Create milestone
  fastify.post('/api/milestones', {
    schema: {
      summary: 'Create a new milestone',
      tags: ['milestones'],
      body: {
        type: 'object',
        required: ['label', 'targetValue'],
        properties: {
          label: { type: 'string', minLength: 1 },
          targetValue: { type: 'number', exclusiveMinimum: 0 },
          targetDate: { type: 'string', format: 'date' },
          type: { type: 'string', enum: ['net_worth', 'invested_assets', 'savings'], default: 'net_worth' },
          displayOrder: { type: 'number', default: 0, minimum: 0 }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            milestone: milestoneSchema
          }
        }
      }
    }
  }, async function createHandler (request, reply) {
    const { userId = 'demo-user' } = request.query
    const { label, targetValue, targetDate, type, displayOrder } = request.body

    const validationError = validatePayload({ label, targetValue, targetDate, type, displayOrder })
    if (validationError) {
      return reply.code(400).send({ error: validationError })
    }

    try {
      const milestone = await db.createMilestone(fastify, userId, {
        label: label.trim(),
        targetValue,
        targetDate: targetDate || null,
        type: type || 'net_worth',
        displayOrder: displayOrder || 0
      })

      if (!milestone) {
        return reply.code(500).send({ error: 'Failed to create milestone' })
      }

      return { milestone }
    } catch (error) {
      fastify.log.error(error, 'Error creating milestone')
      return reply.code(500).send({ error: 'Failed to create milestone' })
    }
  })

  // PATCH /api/milestones/:id - Update milestone
  fastify.patch('/api/milestones/:id', {
    schema: {
      summary: 'Update a milestone',
      tags: ['milestones'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          label: { type: 'string', minLength: 1 },
          targetValue: { type: 'number', exclusiveMinimum: 0 },
          targetDate: { type: 'string', format: 'date' },
          type: { type: 'string', enum: ['net_worth', 'invested_assets', 'savings'] },
          displayOrder: { type: 'number', minimum: 0 }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: { milestone: milestoneSchema }
        }
      }
    }
  }, async function updateHandler (request, reply) {
    const { id } = request.params
    const { userId = 'demo-user' } = request.query
    const updates = request.body

    const validationError = validatePayload(updates, { partial: true })
    if (validationError) {
      return reply.code(400).send({ error: validationError })
    }

    try {
      const milestone = await db.updateMilestone(fastify, userId, id, updates)
      if (!milestone) {
        return reply.code(404).send({ error: 'Milestone not found' })
      }

      return { milestone }
    } catch (error) {
      fastify.log.error(error, 'Error updating milestone')
      return reply.code(500).send({ error: 'Failed to update milestone' })
    }
  })

  // DELETE /api/milestones/:id - Delete milestone
  fastify.delete('/api/milestones/:id', {
    schema: {
      summary: 'Delete a milestone',
      tags: ['milestones'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          }
        }
      }
    }
  }, async function deleteHandler (request, reply) {
    const { id } = request.params
    const { userId = 'demo-user' } = request.query

    try {
      const success = await db.deleteMilestone(fastify, userId, id)
      if (!success) {
        return reply.code(404).send({ error: 'Milestone not found' })
      }

      return { success: true }
    } catch (error) {
      fastify.log.error(error, 'Error deleting milestone')
      return reply.code(500).send({ error: 'Failed to delete milestone' })
    }
  })

  // PATCH /api/milestones/reorder - Reorder milestones
  fastify.patch('/api/milestones/reorder', {
    schema: {
      summary: 'Reorder milestones',
      tags: ['milestones'],
      body: {
        type: 'object',
        required: ['milestoneIds'],
        properties: {
          milestoneIds: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          }
        }
      }
    }
  }, async function reorderHandler (request, reply) {
    const { userId = 'demo-user' } = request.query
    const { milestoneIds } = request.body

    if (!Array.isArray(milestoneIds) || milestoneIds.length === 0) {
      return reply.code(400).send({ error: 'milestoneIds array is required' })
    }

    try {
      const success = await db.reorderMilestones(fastify, userId, milestoneIds)
      if (!success) {
        return reply.code(500).send({ error: 'Failed to reorder milestones' })
      }

      return { success: true }
    } catch (error) {
      fastify.log.error(error, 'Error reordering milestones')
      return reply.code(500).send({ error: 'Failed to reorder milestones' })
    }
  })

  // GET /api/milestones/projection - Get projection curve
  fastify.get('/api/milestones/projection', {
    schema: {
      summary: 'Get net worth projection curve with milestone markers',
      tags: ['milestones'],
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          },
          months: {
            type: 'number',
            default: 360
          }
        }
      }
    }
  }, async function projectionHandler (request, reply) {
    const { userId = 'demo-user', months = 360 } = request.query

    try {
      if (!fastify.supabase) {
        return {
          projection: [],
          milestones: [],
          assumptions: {
            currentNetWorth: 0,
            annualReturn: 7.0,
            monthlyContribution: 0,
            monthlyReturn: 0.565
          }
        }
      }

      // Get current net worth
      const { data: latestSnapshot, error: snapshotError } = await fastify.supabase
        .from('net_worth_snapshots')
        .select('net_worth, snapshot_date')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (snapshotError && snapshotError.code !== 'PGRST116') {
        fastify.log.warn(snapshotError, 'Error fetching net worth snapshot')
      }

      const currentNetWorth = parseFloat(latestSnapshot?.net_worth || 0)

      // Get user assumptions
      const { data: assumptions, error: assumptionsError } = await fastify.supabase
        .from('user_assumptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (assumptionsError && assumptionsError.code !== 'PGRST116') {
        fastify.log.warn(assumptionsError, 'Error fetching user assumptions')
      }

      const annualReturn = parseFloat(assumptions?.expected_annual_return || 7.0) / 100
      const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1
      const monthlyContribution = parseFloat(assumptions?.monthly_contribution_override || 0)

      // Calculate projection curve
      const projection = []
      let projectedNW = currentNetWorth
      const startDate = new Date()

      for (let i = 0; i < months; i++) {
        const date = new Date(startDate)
        date.setMonth(date.getMonth() + i)
        projectedNW = projectedNW * (1 + monthlyReturn) + monthlyContribution
        projection.push({
          date: date.toISOString().split('T')[0],
          netWorth: projectedNW
        })
      }

      // Get all milestones with progress
      const milestones = await db.getMilestones(fastify, userId)
      const milestonesWithProgress = await Promise.all(
        milestones.map(async (m) => {
          const progress = await db.calculateMilestoneProgress(fastify, userId, m.id)
          return { ...m, progress }
        })
      )

      return {
        projection,
        milestones: milestonesWithProgress,
        assumptions: {
          currentNetWorth,
          annualReturn: annualReturn * 100,
          monthlyContribution,
          monthlyReturn: monthlyReturn * 100
        }
      }
    } catch (error) {
      fastify.log.error(error, 'Error calculating projection')
      return reply.code(500).send({ error: 'Failed to calculate projection' })
    }
  })
}

