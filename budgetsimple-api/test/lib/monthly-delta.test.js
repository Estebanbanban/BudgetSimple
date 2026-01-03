'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { computeMonthlyChangeDrivers } = require('../../lib/monthly-delta')

test('computeMonthlyChangeDrivers handles missing previous month gracefully', () => {
  const transactions = [
    { id: '1', date: '2025-05-05', amount: -200, category: 'Groceries', type: 'expense' },
    { id: '2', date: '2025-05-10', amount: 1500, category: 'Salary', type: 'income' }
  ]

  const result = computeMonthlyChangeDrivers(transactions, { month: '2025-05' })

  assert.strictEqual(result.month, '2025-05')
  assert.strictEqual(result.previousMonth, '2025-04')
  assert.ok(result.hasCurrentData)
  assert.strictEqual(result.hasPreviousData, false)
  assert.strictEqual(result.totals.expenses.changePercent, null)
  assert.strictEqual(result.totals.income.changePercent, null)
  assert.deepStrictEqual(result.topChanges.length, 3)
  assert.strictEqual(result.topChanges[0].category, 'Income')
  assert.strictEqual(result.topChanges[1].category, 'Groceries')
})

test('computeMonthlyChangeDrivers merges sparse categories with deterministic sorting', () => {
  const transactions = [
    { id: '1', date: '2025-05-02', amount: -100, category: 'Dining', type: 'expense' },
    { id: '2', date: '2025-04-15', amount: -100, category: 'Dining', type: 'expense' },
    { id: '3', date: '2025-05-03', amount: -50, category: 'Utilities', type: 'expense' },
    { id: '4', date: '2025-04-01', amount: -200, category: 'Rent', type: 'expense' }
  ]

  const result = computeMonthlyChangeDrivers(transactions, { month: '2025-05', previousMonth: '2025-04' })

  assert.ok(result.hasPreviousData)
  assert.strictEqual(result.categories.length, 3)
  assert.strictEqual(result.topChanges[0].category, 'Rent')
  assert.strictEqual(result.topChanges[1].category, 'Total Expenses')
  assert.strictEqual(result.topChanges[2].category, 'Utilities')
})

test('computeMonthlyChangeDrivers avoids divide-by-zero for zero denominators', () => {
  const transactions = [
    { id: '1', date: '2025-05-02', amount: -200, category: 'Dining', type: 'expense' },
    { id: '2', date: '2025-04-15', amount: 0, category: 'Dining', type: 'expense' }
  ]

  const result = computeMonthlyChangeDrivers(transactions, { month: '2025-05', previousMonth: '2025-04' })

  const dining = result.categories.find(c => c.category === 'Dining')
  assert.ok(dining)
  assert.strictEqual(dining.changePercent, null)
})
