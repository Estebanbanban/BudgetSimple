'use strict'

const { test } = require('node:test')
const assert = require('node:assert')

const { build } = require('../helper')

function approxEqual (a, b, epsilon = 1e-6) {
  assert.ok(Math.abs(a - b) < epsilon, `${a} is not within ${epsilon} of ${b}`)
}

test('projection endpoint applies assumption overrides', async (t) => {
  const app = await build(t)
  const annualReturn = 10
  const monthlyContribution = 200
  const response = await app.inject({
    method: 'GET',
    url: '/api/milestones/projection',
    query: {
      months: 2,
      annualReturn,
      monthlyContribution
    }
  })

  const body = response.json()
  assert.equal(response.statusCode, 200)
  assert.equal(body.projection.length, 2)
  assert.equal(body.assumptions.annualReturn, annualReturn)
  assert.equal(body.assumptions.monthlyContribution, monthlyContribution)

  const monthlyReturn = Math.pow(1 + annualReturn / 100, 1 / 12) - 1
  approxEqual(body.assumptions.monthlyReturn, monthlyReturn * 100)
  approxEqual(body.projection[0].netWorth, monthlyContribution)
  approxEqual(body.projection[1].netWorth, monthlyContribution * (1 + monthlyReturn) + monthlyContribution)
})

test('projection endpoint honors horizon limit', async (t) => {
  const app = await build(t)
  const response = await app.inject({
    method: 'GET',
    url: '/api/milestones/projection',
    query: {
      months: 12,
      horizonMonths: 6
    }
  })

  const body = response.json()
  assert.equal(response.statusCode, 200)
  assert.equal(body.projection.length, 6)
})
