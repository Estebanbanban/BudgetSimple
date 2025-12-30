'use strict'

/**
 * Database functions for subscriptions
 * Uses Supabase client from fastify.supabase
 */

/**
 * Get transactions for a date range (for subscription detection)
 */
async function getTransactionsForRange (fastify, userId, startDate, endDate) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning empty array')
    return []
  }

  try {
    // First, try to get all transactions without type filter to see what we have
    let query = fastify.supabase
      .from('transactions')
      .select('id, date, merchant, description, amount, currency, category_id, category_name, type')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    // Try to filter by type if the field exists, but don't fail if it doesn't
    // Also filter by negative amounts (expenses) as a fallback
    const { data: allData, error: allError } = await query.order('date', { ascending: true })

    if (allError) {
      fastify.log.error(allError, 'Error fetching transactions (with type field)')
      // Try without type filter
      const { data: dataNoType, error: errorNoType } = await fastify.supabase
        .from('transactions')
        .select('id, date, merchant, description, amount, currency, category_id, category_name')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (errorNoType) {
        fastify.log.error(errorNoType, 'Error fetching transactions (without type field)')
        return []
      }

      // Filter by negative amounts (expenses) if no type field
      const expenses = (dataNoType || []).filter(tx => {
        const amount = parseFloat(tx.amount || 0)
        return amount < 0 // Expenses are negative
      })

      fastify.log.info(`Fetched ${expenses.length} expense transactions (filtered by negative amount) for subscription detection (${startDate} to ${endDate})`)
      return expenses
    }

    // If we got data, filter by type if it exists, otherwise filter by negative amounts
    let expenses = allData || []
    
    // Check if type field exists in the data
    const hasTypeField = expenses.length > 0 && expenses[0].type !== undefined
    
    if (hasTypeField) {
      expenses = expenses.filter(tx => tx.type === 'expense' || tx.type === 'EXPENSE')
      fastify.log.info(`Fetched ${expenses.length} expense transactions (filtered by type='expense') for subscription detection (${startDate} to ${endDate})`)
    } else {
      // Filter by negative amounts (expenses)
      expenses = expenses.filter(tx => {
        const amount = parseFloat(tx.amount || 0)
        return amount < 0 // Expenses are negative
      })
      fastify.log.info(`Fetched ${expenses.length} expense transactions (filtered by negative amount) for subscription detection (${startDate} to ${endDate})`)
    }

    // Remove the type field from the response to keep it consistent
    return expenses.map(tx => {
      const { type, ...rest } = tx
      return rest
    })
  } catch (error) {
    fastify.log.error(error, 'Exception fetching transactions')
    return []
  }
}

/**
 * Get subscription candidates by status
 */
async function getSubscriptionCandidates (fastify, userId, status) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning empty array')
    return []
  }

  try {
    let query = fastify.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('confidence_score', { ascending: false })

    if (error) {
      fastify.log.error(error, 'Error fetching subscription candidates')
      return []
    }

    return data || []
  } catch (error) {
    fastify.log.error(error, 'Exception fetching subscription candidates')
    return []
  }
}

/**
 * Get subscription candidate details with contributing transactions
 */
async function getSubscriptionCandidateDetails (fastify, userId, candidateId) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning null')
    return null
  }

  try {
    // Get subscription
    const { data: subscription, error: subError } = await fastify.supabase
      .from('subscriptions')
      .select('*')
      .eq('id', candidateId)
      .eq('user_id', userId)
      .single()

    if (subError || !subscription) {
      return null
    }

    // Get contributing transactions
    const { data: transactions, error: txError } = await fastify.supabase
      .from('subscription_transactions')
      .select(`
        transaction_id,
        transactions (
          id,
          date,
          description,
          merchant,
          amount,
          currency,
          category_id
        )
      `)
      .eq('subscription_id', candidateId)

    if (txError) {
      fastify.log.error(txError, 'Error fetching contributing transactions')
    }

    return {
      ...subscription,
      contributingTransactions: (transactions || []).map(st => st.transactions).filter(Boolean)
    }
  } catch (error) {
    fastify.log.error(error, 'Exception fetching subscription candidate details')
    return null
  }
}

/**
 * Confirm a subscription
 */
async function confirmSubscription (fastify, userId, subscriptionId) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning stub')
    return {
      id: subscriptionId,
      status: 'confirmed',
      confirmedDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    }
  }

  try {
    const { data, error } = await fastify.supabase
      .from('subscriptions')
      .update({
        status: 'confirmed',
        confirmed_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      fastify.log.error(error, 'Error confirming subscription')
      return null
    }

    return {
      id: data.id,
      status: data.status,
      confirmedDate: data.confirmed_date,
      updatedAt: data.updated_at
    }
  } catch (error) {
    fastify.log.error(error, 'Exception confirming subscription')
    return null
  }
}

/**
 * Reject a subscription
 */
async function rejectSubscription (fastify, userId, subscriptionId) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning stub')
    return {
      id: subscriptionId,
      status: 'rejected',
      updatedAt: new Date().toISOString()
    }
  }

  try {
    const { data, error } = await fastify.supabase
      .from('subscriptions')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      fastify.log.error(error, 'Error rejecting subscription')
      return null
    }

    return {
      id: data.id,
      status: data.status,
      updatedAt: data.updated_at
    }
  } catch (error) {
    fastify.log.error(error, 'Exception rejecting subscription')
    return null
  }
}

/**
 * Update subscription details
 */
async function updateSubscription (fastify, userId, subscriptionId, updates) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning stub')
    return {
      id: subscriptionId,
      ...updates,
      status: 'confirmed',
      updatedAt: new Date().toISOString()
    }
  }

  try {
    const updateData = {
      ...updates,
      status: 'confirmed', // Auto-confirm on update
      updated_at: new Date().toISOString()
    }

    const { data, error } = await fastify.supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      fastify.log.error(error, 'Error updating subscription')
      return null
    }

    return data
  } catch (error) {
    fastify.log.error(error, 'Exception updating subscription')
    return null
  }
}

/**
 * Create a subscription manually
 */
async function createSubscription (fastify, userId, subscriptionData) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning stub')
    return {
      id: `sub-${Date.now()}`,
      ...subscriptionData,
      createdAt: new Date().toISOString()
    }
  }

  try {
    const insertData = {
      user_id: userId,
      merchant: subscriptionData.merchant,
      category_id: subscriptionData.categoryId || null,
      estimated_monthly_amount: subscriptionData.estimatedMonthlyAmount,
      frequency: subscriptionData.frequency,
      status: subscriptionData.status || 'confirmed',
      first_detected_date: new Date().toISOString().split('T')[0],
      confidence_score: 1.0, // Manual subscriptions have 100% confidence
      occurrence_count: 0,
      pattern_type: 'manual'
    }

    const { data, error } = await fastify.supabase
      .from('subscriptions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      fastify.log.error(error, 'Error creating subscription')
      return null
    }

    return {
      id: data.id,
      merchant: data.merchant,
      categoryId: data.category_id,
      estimatedMonthlyAmount: parseFloat(data.estimated_monthly_amount),
      frequency: data.frequency,
      status: data.status,
      createdAt: data.created_at
    }
  } catch (error) {
    fastify.log.error(error, 'Exception creating subscription')
    return null
  }
}

/**
 * Store detected subscription candidates
 */
async function storeSubscriptionCandidates (fastify, userId, candidates) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, skipping storage')
    return []
  }

  try {
    const subscriptions = candidates.map(candidate => ({
      user_id: userId,
      merchant: candidate.merchant,
      category_id: candidate.categoryId || null,
      estimated_monthly_amount: candidate.estimatedMonthlyAmount,
      frequency: candidate.frequency,
      first_detected_date: candidate.firstDetectedDate,
      confidence_score: candidate.confidenceScore,
      pattern_type: candidate.patternType,
      occurrence_count: candidate.occurrenceCount,
      average_amount: candidate.averageAmount,
      variance_percentage: candidate.variancePercentage,
      status: 'pending'
    }))

    const { data, error } = await fastify.supabase
      .from('subscriptions')
      .insert(subscriptions)
      .select()

    if (error) {
      fastify.log.error(error, 'Error storing subscription candidates')
      return []
    }

    // Store subscription-transaction mappings
    const mappings = []
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const subscriptionId = data[i].id
      for (const txId of candidate.contributingTransactionIds) {
        mappings.push({
          subscription_id: subscriptionId,
          transaction_id: txId
        })
      }
    }

    if (mappings.length > 0) {
      await fastify.supabase
        .from('subscription_transactions')
        .insert(mappings)
    }

    return data || []
  } catch (error) {
    fastify.log.error(error, 'Exception storing subscription candidates')
    return []
  }
}

/**
 * Get subscription summary
 */
async function getSubscriptionSummary (fastify, userId) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning empty summary')
    return {
      totalMonthly: 0,
      byMerchant: [],
      byCategory: [],
      subscriptions: []
    }
  }

  try {
    // Get all confirmed subscriptions
    const { data: subscriptions, error } = await fastify.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .order('estimated_monthly_amount', { ascending: false })

    if (error) {
      fastify.log.error(error, 'Error fetching subscriptions')
      return {
        totalMonthly: 0,
        byMerchant: [],
        byCategory: [],
        subscriptions: []
      }
    }

    // Calculate totals
    const totalMonthly = subscriptions.reduce((sum, s) => sum + parseFloat(s.estimated_monthly_amount || 0), 0)

    // Group by merchant
    const byMerchant = subscriptions.map(s => ({
      merchant: s.merchant,
      amount: parseFloat(s.estimated_monthly_amount || 0),
      frequency: s.frequency,
      subscriptionId: s.id
    }))

    // Group by category
    const categoryMap = new Map()
    for (const s of subscriptions) {
      const catId = s.category_id || 'uncategorized'
      const existing = categoryMap.get(catId) || { categoryId: catId, amount: 0, count: 0 }
      existing.amount += parseFloat(s.estimated_monthly_amount || 0)
      existing.count += 1
      categoryMap.set(catId, existing)
    }

    const byCategory = Array.from(categoryMap.values())

    // Get last transaction dates
    const subscriptionsWithDates = await Promise.all(
      subscriptions.map(async (s) => {
        const { data: txData } = await fastify.supabase
          .from('subscription_transactions')
          .select('transactions(date)')
          .eq('subscription_id', s.id)
          .order('transactions(date)', { ascending: false })
          .limit(1)

        return {
          id: s.id,
          merchant: s.merchant,
          categoryId: s.category_id,
          estimatedMonthlyAmount: parseFloat(s.estimated_monthly_amount || 0),
          frequency: s.frequency,
          lastTransactionDate: txData?.[0]?.transactions?.date || null
        }
      })
    )

    return {
      totalMonthly,
      byMerchant,
      byCategory,
      subscriptions: subscriptionsWithDates
    }
  } catch (error) {
    fastify.log.error(error, 'Exception fetching subscription summary')
    return {
      totalMonthly: 0,
      byMerchant: [],
      byCategory: [],
      subscriptions: []
    }
  }
}

/**
 * Get transactions for a subscription
 */
async function getSubscriptionTransactions (fastify, userId, subscriptionId, startDate, endDate) {
  if (!fastify.supabase) {
    fastify.log.warn('Supabase not available, returning empty result')
    return {
      subscriptionId,
      merchant: 'Unknown',
      transactions: [],
      totalAmount: 0,
      currency: 'USD'
    }
  }

  try {
    // Get subscription
    const { data: subscription, error: subError } = await fastify.supabase
      .from('subscriptions')
      .select('merchant')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (subError || !subscription) {
      return null
    }

    // Get transactions
    let query = fastify.supabase
      .from('subscription_transactions')
      .select(`
        transactions (
          id,
          date,
          description,
          merchant,
          amount,
          currency,
          category_id
        )
      `)
      .eq('subscription_id', subscriptionId)

    if (startDate) {
      query = query.gte('transactions.date', startDate)
    }
    if (endDate) {
      query = query.lte('transactions.date', endDate)
    }

    const { data, error } = await query.order('transactions(date)', { ascending: false })

    if (error) {
      fastify.log.error(error, 'Error fetching subscription transactions')
      return {
        subscriptionId,
        merchant: subscription.merchant,
        transactions: [],
        totalAmount: 0,
        currency: 'USD'
      }
    }

    const transactions = (data || [])
      .map(st => st.transactions)
      .filter(Boolean)

    const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount || 0)), 0)

    return {
      subscriptionId,
      merchant: subscription.merchant,
      transactions,
      totalAmount,
      currency: transactions[0]?.currency || 'USD'
    }
  } catch (error) {
    fastify.log.error(error, 'Exception fetching subscription transactions')
    return {
      subscriptionId,
      merchant: 'Unknown',
      transactions: [],
      totalAmount: 0,
      currency: 'USD'
    }
  }
}

module.exports = {
  getTransactionsForRange,
  getSubscriptionCandidates,
  getSubscriptionCandidateDetails,
  confirmSubscription,
  rejectSubscription,
  updateSubscription,
  createSubscription,
  storeSubscriptionCandidates,
  getSubscriptionSummary,
  getSubscriptionTransactions
}

