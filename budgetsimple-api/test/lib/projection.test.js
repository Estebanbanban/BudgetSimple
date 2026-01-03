'use strict'

const { test } = require('node:test')
const assert = require('node:assert')

const {
  calculateProjection,
  calculateMilestoneProgressFromInputs,
  calculateMonthlyReturn
} = require('../../lib/projection')

const FIXED_START = new Date('2024-01-01')

function approxEqual (a, b, epsilon = 1e-6) {
  assert.ok(Math.abs(a - b) < epsilon, `${a} is not within ${epsilon} of ${b}`)
}

test('calculates monthly compounded projection with contributions', () => {
  const annualReturnPercent = 12
  const monthlyReturn = calculateMonthlyReturn(annualReturnPercent)
  const { projection } = calculateProjection({
    currentNetWorth: 1000,
    months: 3,
    annualReturnPercent,
    monthlyContribution: 100,
    startDate: FIXED_START
  })

  assert.equal(projection.length, 3)
  const expectedValues = []
  let value = 1000
  for (let i = 0; i < 3; i++) {
    value = value * (1 + monthlyReturn) + 100
    expectedValues.push(value)
  }

  projection.forEach((point, index) => {
    approxEqual(point.netWorth, expectedValues[index])
    const expectedDate = new Date(FIXED_START)
    expectedDate.setMonth(expectedDate.getMonth() + index)
    assert.equal(point.date, expectedDate.toISOString().split('T')[0])
  })
})

test('calculates milestone progress, ETA, and status', () => {
  const startDate = new Date('2024-02-01')
  const targetDate = '2024-06-01'
  const progress = calculateMilestoneProgressFromInputs({
    currentNetWorth: 5000,
    targetValue: 10000,
    targetDate,
    annualReturnPercent: 6,
    monthlyContribution: 1000,
    projectionHorizonMonths: 24,
    startDate
  })

  assert.equal(Math.round(progress.progressPercent), 50)
  assert.ok(progress.etaMonths !== null)
  assert.ok(progress.etaDate)
  assert.equal(progress.status, 'on_track')
})

test('returns behind status when progress is unreachable within horizon', () => {
  const progress = calculateMilestoneProgressFromInputs({
    currentNetWorth: 0,
    targetValue: 100000,
    annualReturnPercent: 0,
    monthlyContribution: 100,
    projectionHorizonMonths: 12,
    startDate: FIXED_START
  })

  assert.equal(progress.etaMonths, null)
  assert.equal(progress.status, 'behind')
})
