'use strict'

const { computeMonthlyChangeDrivers } = require('../lib/monthly-delta')

module.exports = async function whatChangedRoute (fastify) {
  fastify.post('/api/cashflow/what-changed', {
    schema: {
      summary: 'Compute month-over-month change drivers',
      description: 'Returns totals and per-category deltas for a given month versus the previous month.',
      tags: ['cashflow'],
      body: {
        type: 'object',
        required: ['month'],
        properties: {
          month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          previousMonth: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          transactions: {
            type: 'array',
            default: [],
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                date: { type: 'string' },
                dateISO: { type: 'string' },
                amount: { type: 'number' },
                category: { type: 'string' },
                type: { type: 'string', enum: ['income', 'expense', 'transfer', 'investment', 'liability'] }
              }
            }
          },
          income: {
            type: 'array',
            default: [],
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                dateISO: { type: 'string' },
                date: { type: 'string' },
                amount: { type: 'number' },
                source: { type: 'string' }
              }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            month: { type: 'string' },
            previousMonth: { type: 'string' },
            hasCurrentData: { type: 'boolean' },
            hasPreviousData: { type: 'boolean' },
            totals: { type: 'object' },
            categories: { type: 'array' },
            topChanges: { type: 'array' }
          }
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function whatChangedHandler (request, reply) {
    const { month, previousMonth, transactions = [], income = [] } = request.body

    if (!/^[0-9]{4}-[0-9]{2}$/.test(month)) {
      return reply.code(400).send({ error: 'month must be in YYYY-MM format' })
    }
    if (previousMonth && !/^[0-9]{4}-[0-9]{2}$/.test(previousMonth)) {
      return reply.code(400).send({ error: 'previousMonth must be in YYYY-MM format' })
    }

    const merged = [
      ...transactions,
      ...income.map(item => ({
        id: item.id,
        date: item.dateISO || item.date,
        dateISO: item.dateISO || item.date,
        amount: item.amount,
        category: item.source || 'Income',
        type: 'income'
      }))
    ]

    const result = computeMonthlyChangeDrivers(merged, { month, previousMonth })
    return result
  })
}
