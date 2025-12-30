'use strict'

const { detectSubscriptions } = require('../lib/subscription-detection')
const db = require('../lib/db-subscriptions')

module.exports = async function subscriptionsRoute (fastify) {
  // GET /api/subscriptions/debug - Diagnostic endpoint to check database
  fastify.get('/api/subscriptions/debug', {
    schema: {
      summary: 'Debug endpoint to check database connectivity and transaction data',
      tags: ['subscriptions'],
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
  }, async function debugHandler (request, reply) {
    const { userId = 'demo-user' } = request.query

    const diagnostics = {
      supabaseAvailable: !!fastify.supabase,
      userId,
      checks: {}
    }

    if (!fastify.supabase) {
      return {
        ...diagnostics,
        error: 'Supabase not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      }
    }

    try {
      // Check if transactions table exists and get count
      const { count, error: countError } = await fastify.supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      diagnostics.checks.transactionCount = countError ? `Error: ${countError.message}` : count

      // Get sample transactions
      const { data: sampleData, error: sampleError } = await fastify.supabase
        .from('transactions')
        .select('id, date, merchant, description, amount, type, category_id')
        .eq('user_id', userId)
        .limit(5)
        .order('date', { ascending: false })

      diagnostics.checks.sampleTransactions = sampleError ? `Error: ${sampleError.message}` : (sampleData || [])

      // Check date range
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 6)
      const startDateStr = startDate.toISOString().split('T')[0]

      const { count: rangeCount, error: rangeError } = await fastify.supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', endDate)

      diagnostics.checks.transactionsInLast6Months = rangeError ? `Error: ${rangeError.message}` : rangeCount

      // Check for expense transactions
      const { count: expenseCount, error: expenseError } = await fastify.supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .lt('amount', 0)

      diagnostics.checks.expenseTransactions = expenseError ? `Error: ${expenseError.message}` : expenseCount

      return diagnostics
    } catch (error) {
      fastify.log.error(error, 'Error in debug endpoint')
      return {
        ...diagnostics,
        error: error.message
      }
    }
  })

  // POST /api/subscriptions/detect
  fastify.post('/api/subscriptions/detect', {
    schema: {
      summary: 'Detect subscription candidates from transactions',
      description: 'Analyzes user transactions to detect recurring subscription patterns. Returns a list of subscription candidates with confidence scores.',
      tags: ['subscriptions'],
      body: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date of the analysis range (ISO 8601 date)'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date of the analysis range (ISO 8601 date)'
          },
          userId: {
            type: 'string',
            description: 'User ID for data isolation (from auth token in production)',
            default: 'demo-user'
          },
          minOccurrences: {
            type: 'integer',
            minimum: 2,
            maximum: 10,
            default: 2,
            description: 'Minimum number of occurrences to qualify as a subscription'
          },
          amountVarianceTolerance: {
            type: 'number',
            minimum: 0,
            maximum: 0.5,
            default: 0.05,
            description: 'Amount variance tolerance as percentage (e.g., 0.05 = 5%)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            candidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Temporary candidate ID (will be replaced with DB ID after storage)' },
                  merchant: { type: 'string', description: 'Merchant name' },
                  categoryId: { type: 'string', nullable: true, description: 'Category ID (if available)' },
                  estimatedMonthlyAmount: { type: 'number', description: 'Estimated monthly amount' },
                  frequency: {
                    type: 'string',
                    enum: ['monthly', 'bi-weekly', 'quarterly', 'annual'],
                    description: 'Detected frequency'
                  },
                  firstDetectedDate: { type: 'string', format: 'date', description: 'Date of first occurrence' },
                  confidenceScore: { type: 'number', minimum: 0, maximum: 1, description: 'Confidence score (0-1)' },
                  contributingTransactionIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Transaction IDs that contributed to this detection'
                  },
                  patternType: { type: 'string', description: 'Pattern type (e.g., monthly, monthly-approximate)' },
                  occurrenceCount: { type: 'integer', description: 'Number of occurrences detected' },
                  averageAmount: { type: 'number', description: 'Average transaction amount' },
                  variancePercentage: { type: 'number', description: 'Amount variance as percentage' }
                },
                required: ['merchant', 'estimatedMonthlyAmount', 'frequency', 'firstDetectedDate', 'confidenceScore', 'contributingTransactionIds']
              }
            },
            metadata: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
                totalCandidates: { type: 'integer' },
                analysisDate: { type: 'string', format: 'date-time' }
              }
            }
          },
          required: ['candidates', 'metadata']
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async function detectHandler (request, reply) {
    const {
      startDate,
      endDate,
      userId = 'demo-user',
      minOccurrences = 2,
      amountVarianceTolerance = 0.05
    } = request.body

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
      // Get transactions for the date range
      const transactions = await db.getTransactionsForRange(fastify, userId, startDate, endDate)

      fastify.log.info(`Running subscription detection on ${transactions.length} transactions for user ${userId}, date range: ${startDate} to ${endDate}`)
      
      // Log sample transaction if available for debugging
      if (transactions.length > 0) {
        fastify.log.info(`Sample transaction: ${JSON.stringify(transactions[0])}`)
      } else {
        fastify.log.warn(`No transactions found. This could mean: (1) No transactions in date range, (2) Wrong user_id, (3) Database connection issue, (4) Transactions table doesn't exist or has different schema`)
      }

      // Run detection algorithm
      const candidates = detectSubscriptions(transactions, {
        minOccurrences,
        amountVarianceTolerance
      })

      fastify.log.info(`Detected ${candidates.length} subscription candidates`)

      // Store candidates in database
      const storedCandidates = await db.storeSubscriptionCandidates(fastify, userId, candidates)

      // Map stored candidates with their IDs
      const candidatesWithIds = storedCandidates.map((stored, index) => {
        const candidate = candidates[index]
        return {
          id: stored.id,
          merchant: candidate.merchant,
          merchantKey: candidate.merchantKey,
          categoryId: candidate.categoryId,
          estimatedMonthlyAmount: candidate.estimatedMonthlyAmount,
          frequency: candidate.frequency,
          firstDetectedDate: candidate.firstDetectedDate,
          lastChargeDate: candidate.lastChargeDate,
          nextExpectedDate: candidate.nextExpectedDate,
          confidenceScore: candidate.confidenceScore,
          contributingTransactionIds: candidate.contributingTransactionIds,
          occurrenceCount: candidate.occurrenceCount,
          averageAmount: candidate.averageAmount,
          variancePercentage: candidate.variancePercentage,
          signals: candidate.signals,
          reason: candidate.reason,
          sampleTransactions: candidate.sampleTransactions,
          status: 'pending'
        }
      })

      return {
        candidates: candidatesWithIds,
        metadata: {
          startDate,
          endDate,
          totalCandidates: candidatesWithIds.length,
          totalTransactions: transactions.length,
          analysisDate: new Date().toISOString()
        }
      }
    } catch (error) {
      fastify.log.error(error, 'Error detecting subscriptions')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // GET /api/subscriptions/candidates
  fastify.get('/api/subscriptions/candidates', {
    schema: {
      summary: 'Get pending subscription candidates',
      description: 'Returns all pending subscription candidates for the user that need review',
      tags: ['subscriptions'],
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'rejected', 'all'],
            default: 'pending',
            description: 'Filter by status'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            candidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  merchant: { type: 'string' },
                  categoryId: { type: 'string', nullable: true },
                  estimatedMonthlyAmount: { type: 'number' },
                  frequency: { type: 'string' },
                  firstDetectedDate: { type: 'string', format: 'date' },
                  confidenceScore: { type: 'number' },
                  status: { type: 'string', enum: ['pending', 'confirmed', 'rejected'] },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          },
          required: ['candidates']
        }
      }
    }
  }, async function getCandidatesHandler (request, reply) {
    const { userId = 'demo-user', status = 'pending' } = request.query

    try {
      const candidates = await db.getSubscriptionCandidates(fastify, userId, status)

      // Transform database format to API format
      const formattedCandidates = candidates.map(c => ({
        id: c.id,
        merchant: c.merchant,
        categoryId: c.category_id,
        estimatedMonthlyAmount: parseFloat(c.estimated_monthly_amount || 0),
        frequency: c.frequency,
        firstDetectedDate: c.first_detected_date,
        confidenceScore: parseFloat(c.confidence_score || 0),
        status: c.status,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }))

      return { candidates: formattedCandidates }
    } catch (error) {
      fastify.log.error(error, 'Error fetching subscription candidates')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // GET /api/subscriptions/candidates/:id
  fastify.get('/api/subscriptions/candidates/:id', {
    schema: {
      summary: 'Get subscription candidate details',
      description: 'Returns detailed information about a specific subscription candidate, including contributing transactions',
      tags: ['subscriptions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Subscription candidate ID' }
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
            id: { type: 'string' },
            merchant: { type: 'string' },
            categoryId: { type: 'string', nullable: true },
            estimatedMonthlyAmount: { type: 'number' },
            frequency: { type: 'string' },
            firstDetectedDate: { type: 'string', format: 'date' },
            confidenceScore: { type: 'number' },
            patternType: { type: 'string' },
            occurrenceCount: { type: 'integer' },
            averageAmount: { type: 'number' },
            variancePercentage: { type: 'number' },
            status: { type: 'string' },
            contributingTransactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  description: { type: 'string' },
                  merchant: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  categoryId: { type: 'string', nullable: true }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'merchant', 'estimatedMonthlyAmount', 'frequency', 'confidenceScore']
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async function getCandidateDetailsHandler (request, reply) {
    const { id } = request.params
    const { userId = 'demo-user' } = request.query

    try {
      const candidate = await db.getSubscriptionCandidateDetails(fastify, userId, id)

      if (!candidate) {
        return reply.code(404).send({ error: 'Subscription candidate not found' })
      }

      // Transform database format to API format
      return {
        id: candidate.id,
        merchant: candidate.merchant,
        categoryId: candidate.category_id,
        estimatedMonthlyAmount: parseFloat(candidate.estimated_monthly_amount || 0),
        frequency: candidate.frequency,
        firstDetectedDate: candidate.first_detected_date,
        confidenceScore: parseFloat(candidate.confidence_score || 0),
        patternType: candidate.pattern_type,
        occurrenceCount: candidate.occurrence_count,
        averageAmount: parseFloat(candidate.average_amount || 0),
        variancePercentage: parseFloat(candidate.variance_percentage || 0),
        status: candidate.status,
        contributingTransactions: candidate.contributingTransactions || [],
        createdAt: candidate.created_at,
        updatedAt: candidate.updated_at
      }
    } catch (error) {
      fastify.log.error(error, 'Error fetching subscription candidate details')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // PATCH /api/subscriptions/:id/confirm
  fastify.patch('/api/subscriptions/:id/confirm', {
    schema: {
      summary: 'Confirm a subscription candidate',
      description: 'Marks a subscription candidate as confirmed and sets the confirmed date',
      tags: ['subscriptions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Subscription ID' }
        }
      },
      body: {
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
            id: { type: 'string' },
            status: { type: 'string' },
            confirmedDate: { type: 'string', format: 'date' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async function confirmHandler (request, reply) {
    const { id } = request.params
    const { userId = 'demo-user' } = request.body

    try {
      const subscription = await db.confirmSubscription(fastify, userId, id)

      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' })
      }

      return subscription
    } catch (error) {
      fastify.log.error(error, 'Error confirming subscription')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // PATCH /api/subscriptions/:id/reject
  fastify.patch('/api/subscriptions/:id/reject', {
    schema: {
      summary: 'Reject a subscription candidate',
      description: 'Marks a subscription candidate as rejected',
      tags: ['subscriptions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Subscription ID' }
        }
      },
      body: {
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
            id: { type: 'string' },
            status: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async function rejectHandler (request, reply) {
    const { id } = request.params
    const { userId = 'demo-user' } = request.body

    try {
      const subscription = await db.rejectSubscription(fastify, userId, id)

      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' })
      }

      return subscription
    } catch (error) {
      fastify.log.error(error, 'Error rejecting subscription')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // PATCH /api/subscriptions/:id
  fastify.patch('/api/subscriptions/:id', {
    schema: {
      summary: 'Update subscription details',
      description: 'Updates merchant, category, amount, or frequency of a subscription',
      tags: ['subscriptions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Subscription ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          },
          merchant: { type: 'string', description: 'Updated merchant name' },
          categoryId: { type: 'string', nullable: true, description: 'Updated category ID' },
          estimatedMonthlyAmount: { type: 'number', description: 'Updated monthly amount' },
          frequency: {
            type: 'string',
            enum: ['monthly', 'bi-weekly', 'quarterly', 'annual'],
            description: 'Updated frequency'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            merchant: { type: 'string' },
            categoryId: { type: 'string', nullable: true },
            estimatedMonthlyAmount: { type: 'number' },
            frequency: { type: 'string' },
            status: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async function updateHandler (request, reply) {
    const { id } = request.params
    const { userId = 'demo-user', ...updates } = request.body

    try {
      // Transform API format to database format
      const dbUpdates = {}
      if (updates.merchant !== undefined) dbUpdates.merchant = updates.merchant
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId
      if (updates.estimatedMonthlyAmount !== undefined) dbUpdates.estimated_monthly_amount = updates.estimatedMonthlyAmount
      if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency

      const subscription = await db.updateSubscription(fastify, userId, id, dbUpdates)

      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' })
      }

      // Transform database format to API format
      return {
        id: subscription.id,
        merchant: subscription.merchant,
        categoryId: subscription.category_id,
        estimatedMonthlyAmount: parseFloat(subscription.estimated_monthly_amount || 0),
        frequency: subscription.frequency,
        status: subscription.status,
        updatedAt: subscription.updated_at
      }
    } catch (error) {
      fastify.log.error(error, 'Error updating subscription')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // POST /api/subscriptions
  fastify.post('/api/subscriptions', {
    schema: {
      summary: 'Create subscription manually',
      description: 'Creates a subscription entry without detection (user-provided)',
      tags: ['subscriptions'],
      body: {
        type: 'object',
        required: ['merchant', 'estimatedMonthlyAmount', 'frequency'],
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          },
          merchant: { type: 'string', description: 'Merchant name' },
          categoryId: { type: 'string', nullable: true, description: 'Category ID' },
          estimatedMonthlyAmount: { type: 'number', description: 'Monthly amount' },
          frequency: {
            type: 'string',
            enum: ['monthly', 'bi-weekly', 'quarterly', 'annual'],
            description: 'Frequency'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            merchant: { type: 'string' },
            categoryId: { type: 'string', nullable: true },
            estimatedMonthlyAmount: { type: 'number' },
            frequency: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async function createHandler (request, reply) {
    const { userId = 'demo-user', merchant, categoryId, estimatedMonthlyAmount, frequency } = request.body

    // Validate required fields
    if (!merchant || !estimatedMonthlyAmount || !frequency) {
      return reply.code(400).send({ error: 'Missing required fields: merchant, estimatedMonthlyAmount, frequency' })
    }

    try {
      const subscription = await db.createSubscription(fastify, userId, {
        merchant,
        categoryId,
        estimatedMonthlyAmount,
        frequency,
        status: 'confirmed' // Manual subscriptions are confirmed by default
      })

      if (!subscription) {
        return reply.code(500).send({ error: 'Failed to create subscription' })
      }

      return reply.code(201).send(subscription)
    } catch (error) {
      fastify.log.error(error, 'Error creating subscription')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // GET /api/subscriptions/summary
  fastify.get('/api/subscriptions/summary', {
    schema: {
      summary: 'Get subscription summary',
      description: 'Returns total monthly subscriptions and breakdowns by merchant and category',
      tags: ['subscriptions'],
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
            totalMonthly: { type: 'number', description: 'Total monthly subscription amount' },
            byMerchant: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  merchant: { type: 'string' },
                  amount: { type: 'number' },
                  frequency: { type: 'string' },
                  subscriptionId: { type: 'string' }
                }
              }
            },
            byCategory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  categoryId: { type: 'string', nullable: true },
                  categoryName: { type: 'string', nullable: true },
                  amount: { type: 'number' },
                  count: { type: 'integer' }
                }
              }
            },
            subscriptions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  merchant: { type: 'string' },
                  categoryId: { type: 'string', nullable: true },
                  estimatedMonthlyAmount: { type: 'number' },
                  frequency: { type: 'string' },
                  lastTransactionDate: { type: 'string', format: 'date', nullable: true }
                }
              }
            }
          },
          required: ['totalMonthly', 'byMerchant', 'byCategory', 'subscriptions']
        }
      }
    }
  }, async function getSummaryHandler (request, reply) {
    const { userId = 'demo-user' } = request.query

    try {
      const summary = await db.getSubscriptionSummary(fastify, userId)

      return summary
    } catch (error) {
      fastify.log.error(error, 'Error fetching subscription summary')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // GET /api/subscriptions/:id/transactions
  fastify.get('/api/subscriptions/:id/transactions', {
    schema: {
      summary: 'Get transactions for a subscription',
      description: 'Returns contributing transactions for a specific subscription',
      tags: ['subscriptions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Subscription ID' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            default: 'demo-user'
          },
          startDate: {
            type: 'string',
            format: 'date'
          },
          endDate: {
            type: 'string',
            format: 'date'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string' },
            merchant: { type: 'string' },
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  description: { type: 'string' },
                  merchant: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  categoryId: { type: 'string', nullable: true }
                }
              }
            },
            totalAmount: { type: 'number' },
            currency: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async function getTransactionsHandler (request, reply) {
    const { id } = request.params
    const { userId = 'demo-user', startDate, endDate } = request.query

    try {
      const result = await db.getSubscriptionTransactions(fastify, userId, id, startDate, endDate)

      if (!result) {
        return reply.code(404).send({ error: 'Subscription not found' })
      }

      return result
    } catch (error) {
      fastify.log.error(error, 'Error fetching subscription transactions')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}


