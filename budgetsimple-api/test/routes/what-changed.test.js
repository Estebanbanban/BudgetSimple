'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { build } = require('../helper')

test('POST /api/cashflow/what-changed returns change drivers', async (t) => {
  const app = await build(t)

  const payload = {
    month: '2025-05',
    previousMonth: '2025-04',
    transactions: [
      { date: '2025-05-02', amount: -120, category: 'Dining', type: 'expense' },
      { date: '2025-05-10', amount: 1800, category: 'Salary', type: 'income' },
      { date: '2025-04-12', amount: -80, category: 'Dining', type: 'expense' }
    ]
  }

  const response = await app.inject({
    method: 'POST',
    url: '/api/cashflow/what-changed',
    payload
  })

  assert.strictEqual(response.statusCode, 200)
  const body = response.json()
  assert.strictEqual(body.month, '2025-05')
  assert.strictEqual(body.previousMonth, '2025-04')
  assert.ok(Array.isArray(body.topChanges))
  assert.ok(body.topChanges.length > 0)
  assert.strictEqual(body.topChanges[0].category, 'Income')
})

test('POST /api/cashflow/what-changed validates month input', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/api/cashflow/what-changed',
    payload: { month: '2025/05' }
  })

  assert.strictEqual(response.statusCode, 400)
})
