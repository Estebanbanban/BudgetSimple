'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const {
  createMilestone,
  getMilestones,
  updateMilestone,
  reorderMilestones,
  getMilestone
} = require('../../lib/db-milestones')
const { MockSupabase } = require('../mocks/mock-supabase')

const fastifyStub = () => ({
  supabase: new MockSupabase(),
  log: { warn () {}, error () {}, info () {} }
})

test('getMilestones returns ordered milestones for a user', async () => {
  const fastify = fastifyStub()
  await createMilestone(fastify, 'user-1', { label: 'Third', targetValue: 3000, displayOrder: 2 })
  await createMilestone(fastify, 'user-1', { label: 'First', targetValue: 1000, displayOrder: 0, targetDate: '2024-01-01' })
  await createMilestone(fastify, 'user-1', { label: 'Second', targetValue: 2000, displayOrder: 1 })

  const milestones = await getMilestones(fastify, 'user-1')

  assert.strictEqual(milestones.length, 3)
  assert.deepStrictEqual(
    milestones.map((m) => m.label),
    ['First', 'Second', 'Third']
  )
})

test('milestones are isolated per user and enforce id lookup', async () => {
  const fastify = fastifyStub()
  const other = await createMilestone(fastify, 'user-2', { label: 'Other user', targetValue: 100 })
  await createMilestone(fastify, 'user-1', { label: 'Mine', targetValue: 50 })

  const userOneMilestones = await getMilestones(fastify, 'user-1')
  assert.strictEqual(userOneMilestones.length, 1)
  assert.strictEqual(userOneMilestones[0].label, 'Mine')

  const missing = await getMilestone(fastify, 'user-1', other.id)
  assert.strictEqual(missing, null)
})

test('updateMilestone keeps zero display_order values and applies changes', async () => {
  const fastify = fastifyStub()
  const milestone = await createMilestone(fastify, 'user-1', { label: 'Adjust me', targetValue: 1500, displayOrder: 3 })

  const updated = await updateMilestone(fastify, 'user-1', milestone.id, {
    label: 'Adjusted',
    targetValue: 1750,
    displayOrder: 0
  })

  assert.strictEqual(updated.label, 'Adjusted')
  assert.strictEqual(updated.target_value, 1750)
  assert.strictEqual(updated.display_order, 0)
})

test('reorderMilestones updates display order sequentially', async () => {
  const fastify = fastifyStub()
  const first = await createMilestone(fastify, 'user-1', { label: 'A', targetValue: 1, displayOrder: 0 })
  const second = await createMilestone(fastify, 'user-1', { label: 'B', targetValue: 2, displayOrder: 1 })

  const success = await reorderMilestones(fastify, 'user-1', [second.id, first.id])
  assert.ok(success)

  const reordered = await getMilestones(fastify, 'user-1')
  assert.deepStrictEqual(
    reordered.map((m) => ({ id: m.id, order: m.display_order })),
    [
      { id: second.id, order: 0 },
      { id: first.id, order: 1 }
    ]
  )
})
