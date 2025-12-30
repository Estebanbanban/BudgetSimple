'use strict'

const { classifyTransaction, computeFlowGraph } = require('../lib/cashflow-classifier')

module.exports = async function cashflowRoute (fastify) {
  // POST /api/cashflow/compute
  fastify.post('/api/cashflow/compute', {
    schema: {
      summary: 'Compute cashflow map flow graph',
      description: 'Computes a flow graph showing income sources → sinks (expenses, savings, investing, etc.) for a given time range. Excludes split transactions and investment buy/sell. Includes transfers as a category.',
      tags: ['cashflow'],
      body: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date of the time range (ISO 8601 date)'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date of the time range (ISO 8601 date)'
          },
          displayCurrency: {
            type: 'string',
            pattern: '^[A-Z]{3}$',
            description: 'Display currency code (e.g., CAD, EUR, USD). Defaults to user preference.',
            default: 'USD'
          },
          userId: {
            type: 'string',
            description: 'User ID for data isolation (from auth token in production)',
            default: 'demo-user'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            nodes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Unique node identifier' },
                  label: { type: 'string', description: 'Display label' },
                  type: {
                    type: 'string',
                    enum: ['income', 'expense-category', 'merchant', 'subscription', 'envelope', 'investing', 'liability', 'transfer', 'unallocated'],
                    description: 'Node type'
                  },
                  amount: { type: 'number', description: 'Total amount in display currency' },
                  currency: { type: 'string', description: 'Display currency code' }
                },
                required: ['id', 'label', 'type', 'amount', 'currency']
              }
            },
            edges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: { type: 'string', description: 'Source node ID' },
                  target: { type: 'string', description: 'Target node ID' },
                  amount: { type: 'number', description: 'Flow amount in display currency' },
                  currency: { type: 'string', description: 'Display currency code' },
                  transactionIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Transaction IDs contributing to this edge (for drilldown)'
                  }
                },
                required: ['source', 'target', 'amount', 'currency', 'transactionIds']
              }
            },
            metadata: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
                displayCurrency: { type: 'string' },
                fxRateDate: { type: 'string', format: 'date', description: 'FX rate as-of date used for conversions' },
                totalIncome: { type: 'number' },
                totalExpenses: { type: 'number' },
                totalSavings: { type: 'number' },
                totalUnallocated: { type: 'number' }
              }
            }
          },
          required: ['nodes', 'edges', 'metadata']
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async function computeHandler (request, reply) {
    const { startDate, endDate, displayCurrency = 'USD', userId = 'demo-user' } = request.body

    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return reply.code(400).send({ error: 'Invalid date format' })
    }
    if (start > end) {
      return reply.code(400).send({ error: 'startDate must be before endDate' })
    }

    try {
      // TODO: Replace with actual database query when available
      // For now, use mock data or stub implementation
      const transactions = await getTransactionsForRange(fastify, userId, startDate, endDate)

      // Get confirmed subscriptions for the user
      const subscriptions = await getSubscriptionsForRange(fastify, userId, startDate, endDate)

      // Compute flow graph
      const flowGraph = computeFlowGraph(transactions, displayCurrency, subscriptions)

      return flowGraph
    } catch (error) {
      fastify.log.error(error, 'Error computing cashflow')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // GET /api/cashflow/drilldown
  fastify.get('/api/cashflow/drilldown', {
    schema: {
      summary: 'Get transactions for a cashflow node',
      description: 'Returns the list of transactions that contribute to a specific node in the cashflow map',
      tags: ['cashflow'],
      querystring: {
        type: 'object',
        required: ['nodeId', 'startDate', 'endDate'],
        properties: {
          nodeId: {
            type: 'string',
            description: 'Node ID from the flow graph'
          },
          startDate: {
            type: 'string',
            format: 'date'
          },
          endDate: {
            type: 'string',
            format: 'date'
          },
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
            nodeId: { type: 'string' },
            nodeLabel: { type: 'string' },
            nodeType: { type: 'string' },
            totalAmount: { type: 'number' },
            currency: { type: 'string' },
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  description: { type: 'string' },
                  merchant: { type: 'string' },
                  category: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  accountId: { type: 'string' },
                  accountName: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async function drilldownHandler (request, reply) {
    const { nodeId, startDate, endDate, userId = 'demo-user' } = request.query

    try {
      // TODO: Replace with actual database query
      const transactions = await getTransactionsForNode(fastify, userId, nodeId, startDate, endDate)

      return transactions
    } catch (error) {
      fastify.log.error(error, 'Error fetching drilldown')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // GET /api/cashflow/narrative
  fastify.get('/api/cashflow/narrative', {
    schema: {
      summary: 'Get cashflow narrative summaries',
      description: 'Returns textual summaries of cashflow: top sinks, top savings destinations, and unallocated highlights',
      tags: ['cashflow'],
      querystring: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          startDate: {
            type: 'string',
            format: 'date'
          },
          endDate: {
            type: 'string',
            format: 'date'
          },
          displayCurrency: {
            type: 'string',
            pattern: '^[A-Z]{3}$',
            default: 'USD'
          },
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
            summaries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['top-sink', 'top-savings', 'unallocated'],
                    description: 'Summary type'
                  },
                  title: { type: 'string', description: 'Summary title' },
                  text: { type: 'string', description: 'Summary text' },
                  amount: { type: 'number', description: 'Amount in display currency' },
                  currency: { type: 'string', description: 'Display currency code' },
                  nodeId: { type: 'string', description: 'Node ID for drilldown link' },
                  percentage: { type: 'number', description: 'Percentage of income or total' }
                },
                required: ['type', 'title', 'text', 'amount', 'currency', 'nodeId']
              }
            }
          },
          required: ['summaries']
        }
      }
    }
  }, async function narrativeHandler (request, reply) {
    const { startDate, endDate, displayCurrency = 'USD', userId = 'demo-user' } = request.query

    try {
      // Get flow graph first
      const transactions = await getTransactionsForRange(fastify, userId, startDate, endDate)
      const flowGraph = computeFlowGraph(transactions, displayCurrency)

      // Generate narrative summaries
      const summaries = generateNarrativeSummaries(flowGraph)

      return { summaries }
    } catch (error) {
      fastify.log.error(error, 'Error generating narrative')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}

function generateNarrativeSummaries (flowGraph) {
  const summaries = []
  const { nodes, edges, metadata } = flowGraph

  // Top sinks (expense categories/merchants)
  const expenseNodes = nodes
    .filter(n => n.type === 'expense-category' || n.type === 'merchant')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  expenseNodes.forEach((node, index) => {
    const percentage = metadata.totalIncome > 0 ? (node.amount / metadata.totalIncome) * 100 : 0
    summaries.push({
      type: 'top-sink',
      title: index === 0 ? 'Top sink' : `#${index + 1} expense`,
      text: `Your largest ${index === 0 ? 'category' : 'category'} is ${node.label} with ${percentage.toFixed(1)}% of income (${formatCurrency(node.amount)})`,
      amount: node.amount,
      currency: node.currency,
      nodeId: node.id,
      percentage
    })
  })

  // Top savings destinations
  const savingsNodes = nodes
    .filter(n => n.type === 'envelope' || n.type === 'investing')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  savingsNodes.forEach((node, index) => {
    const percentage = metadata.totalIncome > 0 ? (node.amount / metadata.totalIncome) * 100 : 0
    summaries.push({
      type: 'top-savings',
      title: index === 0 ? 'Top savings destination' : `#${index + 1} savings`,
      text: `${node.label} is receiving ${formatCurrency(node.amount)} (${percentage.toFixed(1)}% of income)`,
      amount: node.amount,
      currency: node.currency,
      nodeId: node.id,
      percentage
    })
  })

  // Unallocated (if significant)
  const unallocatedNode = nodes.find(n => n.type === 'unallocated')
  if (unallocatedNode && unallocatedNode.amount > 0) {
    const percentage = metadata.totalIncome > 0 ? (unallocatedNode.amount / metadata.totalIncome) * 100 : 0
    if (percentage > 5 || unallocatedNode.amount > 100) {
      summaries.push({
        type: 'unallocated',
        title: 'Unallocated cashflow',
        text: `You have ${formatCurrency(unallocatedNode.amount)} (${percentage.toFixed(1)}% of income) that needs allocation to reduce idle funds`,
        amount: unallocatedNode.amount,
        currency: unallocatedNode.currency,
        nodeId: unallocatedNode.id,
        percentage
      })
    }
  }

  return summaries
}

function formatCurrency (amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

// TODO: Replace with actual database queries when Supabase is integrated
async function getTransactionsForRange (fastify, userId, startDate, endDate) {
  // Stub: return empty array for now
  // In production, this would query Supabase with RLS:
  // SELECT * FROM transactions 
  // WHERE user_id = $1 AND date >= $2 AND date <= $3
  // ORDER BY date DESC
  fastify.log.warn('Using stub transaction data - replace with database query')
  return []
}

async function getTransactionsForNode (fastify, userId, nodeId, startDate, endDate) {
  // Stub: return empty result for now
  fastify.log.warn('Using stub drilldown data - replace with database query')
  return {
    nodeId,
    nodeLabel: nodeId,
    nodeType: 'expense-category',
    totalAmount: 0,
    currency: 'USD',
    transactions: []
  }
}

async function getSubscriptionsForRange (fastify, userId, startDate, endDate) {
  // Get all confirmed subscriptions (not filtered by date range since they're recurring)
  return await db.getSubscriptionCandidates(fastify, userId, 'confirmed')
}

