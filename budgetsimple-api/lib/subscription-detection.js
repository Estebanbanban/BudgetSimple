'use strict'

const { findKnownSubscription, isSubscriptionCategory } = require('./known-subscriptions')

/**
 * Subscription Detection Service - Rewritten with proper normalization and recurrence detection
 */

/**
 * Normalize a transaction to consistent schema
 * Handles different data formats and sign conventions
 */
function normalizeTransaction (tx) {
  // Extract date - handle various formats
  let date = tx.date
  if (!date) {
    date = tx.transaction_date || tx.timestamp || null
  }
  if (date) {
    // Ensure ISO date format
    const d = new Date(date)
    if (!isNaN(d.getTime())) {
      date = d.toISOString().split('T')[0]
    } else {
      date = null
    }
  }

  // Extract amount - handle string/number
  let amount = tx.amount
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[^0-9.-]/g, ''))
  }
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0
  }

  // Determine direction (expense vs income)
  let direction = 'expense'
  if (tx.type) {
    const type = String(tx.type).toLowerCase()
    if (type === 'income' || type === 'credit' || type === 'deposit') {
      direction = 'income'
    } else if (type === 'expense' || type === 'debit' || type === 'withdrawal' || type === 'payment') {
      direction = 'expense'
    }
  } else if (tx.direction) {
    direction = String(tx.direction).toLowerCase()
  } else {
    // Fallback: negative = expense, positive = income
    direction = amount < 0 ? 'expense' : 'income'
  }

  // Normalize amount: always positive, direction tells us expense/income
  const normalizedAmount = Math.abs(amount)

  // Extract merchant/description - best effort
  const merchant = (tx.merchant || tx.merchant_name || '').trim()
  const description = (tx.description || tx.memo || tx.note || '').trim()
  const merchantKey = extractMerchantKey(merchant || description)

  // Extract category
  const category = tx.category || tx.category_id || tx.category_name || null
  const categoryStr = category ? String(category).toLowerCase() : null

  return {
    id: tx.id || tx.transaction_id || `tx-${Date.now()}-${Math.random()}`,
    date,
    amount: normalizedAmount,
    direction,
    merchant: merchant || description || 'Unknown',
    description: description || merchant || '',
    merchantKey,
    category: categoryStr,
    original: tx // Keep original for debugging
  }
}

/**
 * Extract a normalized merchant key for grouping
 * Removes invoice IDs, punctuation, normalizes variations
 */
function extractMerchantKey (text) {
  if (!text) return 'unknown'

  let key = text.toLowerCase().trim()

  // Remove invoice/transaction IDs (numbers at end, patterns like #12345, INV-123, etc.)
  key = key.replace(/\s*(#|inv|invoice|txn|trans|ref|ref#)[\s-]*[0-9]+/gi, '')
  key = key.replace(/\s+[0-9]{6,}/g, '') // Remove long number sequences

  // Remove domain suffixes
  key = key.replace(/\.(com|net|org|io|co|app|tv|plus|us|ca|uk)\b/gi, '')

  // Remove company suffixes
  key = key.replace(/\s+(inc|llc|ltd|corp|co|usa|ab|gmbh|pty|limited)\b/gi, '')

  // Normalize common variations
  key = key.replace(/\s*\+\s*/g, ' plus ')
  key = key.replace(/\s*&\s*/g, ' and ')
  key = key.replace(/\s*-\s*/g, ' ')

  // Remove extra whitespace and punctuation
  key = key.replace(/[^\w\s]/g, ' ')
  key = key.replace(/\s+/g, ' ').trim()

  return key || 'unknown'
}

/**
 * Detect subscription candidates from normalized transactions
 */
function detectSubscriptions (transactions, options = {}) {
  const {
    minOccurrences = 2,
    amountVarianceTolerance = 0.05, // ±5%
    amountVarianceFixed = 2.0 // ±$2
  } = options

  if (!transactions || transactions.length === 0) {
    return []
  }

  // Step 1: Normalize all transactions
  const normalized = transactions
    .map(normalizeTransaction)
    .filter(tx => tx.date && tx.merchantKey !== 'unknown' && tx.direction === 'expense')

  if (normalized.length === 0) {
    return []
  }

  // Step 2: Group by merchant key
  const merchantGroups = {}
  for (const tx of normalized) {
    if (!merchantGroups[tx.merchantKey]) {
      merchantGroups[tx.merchantKey] = []
    }
    merchantGroups[tx.merchantKey].push(tx)
  }

  const candidates = []

  // Step 3: Analyze each merchant group
  for (const [merchantKey, txs] of Object.entries(merchantGroups)) {
    // Need at least minOccurrences
    if (txs.length < minOccurrences) {
      continue
    }

    // Sort by date
    txs.sort((a, b) => new Date(a.date) - new Date(b.date))

    // Step 4: Detect recurrence pattern
    const recurrence = detectRecurrence(txs)
    if (!recurrence) {
      continue
    }

    // Step 5: Check amount consistency
    const amounts = txs.map(t => t.amount)
    const amountConsistency = checkAmountConsistency(amounts, amountVarianceTolerance, amountVarianceFixed)
    if (!amountConsistency.isConsistent) {
      continue
    }

    // Step 6: Check for known subscription merchant
    const knownService = findKnownSubscription(merchantKey) || findKnownSubscription(txs[0].merchant)

    // Step 7: Check category signal
    const categorySignal = txs.some(t => isSubscriptionCategory(t.category || ''))

    // Step 8: Calculate confidence scores
    const signals = {
      recurrenceScore: recurrence.consistency,
      amountConsistencyScore: amountConsistency.score,
      keywordScore: knownService ? 0.9 : 0,
      categoryScore: categorySignal ? 0.3 : 0
    }

    // Weighted confidence
    const confidence = (
      signals.recurrenceScore * 0.5 + // Strong signal
      signals.amountConsistencyScore * 0.3 + // Strong signal
      signals.keywordScore * 0.15 + // Medium signal
      signals.categoryScore * 0.05 // Weak signal
    )

    // Minimum confidence threshold
    if (confidence < 0.4) {
      continue
    }

    // Step 9: Calculate next expected date
    const lastDate = new Date(txs[txs.length - 1].date)
    const nextExpectedDate = new Date(lastDate)
    nextExpectedDate.setDate(nextExpectedDate.getDate() + recurrence.medianGap)

    // Step 10: Build candidate
    const medianAmount = amountConsistency.medianAmount
    const estimatedMonthlyAmount = normalizeToMonthly(medianAmount, recurrence.frequency)

    candidates.push({
      merchantKey,
      merchant: txs[0].merchant,
      categoryId: getMostCommonCategory(txs),
      estimatedMonthlyAmount,
      frequency: recurrence.frequency,
      firstDetectedDate: txs[0].date,
      lastChargeDate: txs[txs.length - 1].date,
      nextExpectedDate: nextExpectedDate.toISOString().split('T')[0],
      confidenceScore: Math.min(1.0, confidence),
      contributingTransactionIds: txs.map(t => t.id),
      occurrenceCount: txs.length,
      averageAmount: medianAmount,
      variancePercentage: amountConsistency.variancePercentage,
      signals,
      reason: buildReason(signals, recurrence, knownService, categorySignal),
      sampleTransactions: txs.slice(0, 3).map(t => ({
        id: t.id,
        date: t.date,
        amount: t.amount
      }))
    })
  }

  // Sort by confidence (highest first)
  return candidates.sort((a, b) => b.confidenceScore - a.confidenceScore)
}

/**
 * Detect recurrence pattern using median gaps
 */
function detectRecurrence (txs) {
  if (txs.length < 2) {
    return null
  }

  // Calculate gaps between consecutive transactions
  const gaps = []
  for (let i = 1; i < txs.length; i++) {
    const date1 = new Date(txs[i - 1].date)
    const date2 = new Date(txs[i].date)
    const days = Math.round((date2 - date1) / (1000 * 60 * 60 * 24))
    if (days > 0) {
      gaps.push(days)
    }
  }

  if (gaps.length === 0) {
    return null
  }

  // Use median gap (more robust than average)
  const sortedGaps = [...gaps].sort((a, b) => a - b)
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)]

  // Calculate consistency (how close gaps are to median)
  const deviations = gaps.map(g => Math.abs(g - medianGap))
  const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length
  const consistency = Math.max(0, 1 - (avgDeviation / medianGap))

  // Minimum consistency threshold (allow ±3-5 days drift)
  if (consistency < 0.6) {
    return null
  }

  // Determine frequency
  let frequency = 'monthly'
  if (medianGap >= 6 && medianGap <= 8) {
    frequency = 'weekly'
  } else if (medianGap >= 13 && medianGap <= 15) {
    frequency = 'bi-weekly'
  } else if (medianGap >= 28 && medianGap <= 35) {
    frequency = 'monthly'
  } else if (medianGap >= 88 && medianGap <= 93) {
    frequency = 'quarterly'
  } else if (medianGap >= 350 && medianGap <= 380) {
    frequency = 'annual'
  } else if (medianGap >= 25 && medianGap <= 40) {
    frequency = 'monthly' // Approximate monthly
  } else {
    // Not a recognized pattern
    return null
  }

  return {
    frequency,
    medianGap,
    consistency,
    gaps
  }
}

/**
 * Check if amounts are consistent (±5% or ±$2, whichever is larger)
 */
function checkAmountConsistency (amounts, tolerancePercent, toleranceFixed) {
  if (amounts.length === 0) {
    return { isConsistent: false, score: 0, medianAmount: 0, variancePercentage: 0 }
  }

  // Use median amount (more robust than average)
  const sorted = [...amounts].sort((a, b) => a - b)
  const medianAmount = sorted[Math.floor(sorted.length / 2)]

  // Calculate variance
  const deviations = amounts.map(a => Math.abs(a - medianAmount))
  const maxDeviation = Math.max(...deviations)
  const variancePercentage = maxDeviation / medianAmount

  // Check consistency: ±5% OR ±$2, whichever is larger
  const tolerance = Math.max(medianAmount * tolerancePercent, toleranceFixed)
  const isConsistent = maxDeviation <= tolerance

  // Score: 1.0 if perfect, decreases with variance
  const score = isConsistent ? Math.max(0, 1 - (variancePercentage / tolerancePercent)) : 0

  return {
    isConsistent,
    score: Math.min(1.0, score),
    medianAmount,
    variancePercentage,
    maxDeviation
  }
}

/**
 * Normalize amount to monthly equivalent
 */
function normalizeToMonthly (amount, frequency) {
  switch (frequency) {
    case 'weekly':
      return amount * 4.33
    case 'bi-weekly':
      return amount * 2.17
    case 'monthly':
      return amount
    case 'quarterly':
      return amount / 3
    case 'annual':
      return amount / 12
    default:
      return amount
  }
}

/**
 * Get most common category
 */
function getMostCommonCategory (txs) {
  const counts = {}
  let maxCount = 0
  let mostCommon = null

  for (const tx of txs) {
    if (tx.category) {
      counts[tx.category] = (counts[tx.category] || 0) + 1
      if (counts[tx.category] > maxCount) {
        maxCount = counts[tx.category]
        mostCommon = tx.category
      }
    }
  }

  return mostCommon
}

/**
 * Build human-readable reason for detection
 */
function buildReason (signals, recurrence, knownService, categorySignal) {
  const parts = []

  if (signals.recurrenceScore > 0.7) {
    parts.push(`Strong recurring pattern (${recurrence.frequency}, ${recurrence.consistency.toFixed(2)} consistency)`)
  } else if (signals.recurrenceScore > 0.5) {
    parts.push(`Moderate recurring pattern (${recurrence.frequency})`)
  }

  if (signals.amountConsistencyScore > 0.8) {
    parts.push('Very consistent amounts')
  } else if (signals.amountConsistencyScore > 0.6) {
    parts.push('Mostly consistent amounts')
  }

  if (knownService) {
    parts.push(`Known subscription service (${knownService.name})`)
  }

  if (categorySignal) {
    parts.push('Category suggests subscription')
  }

  return parts.join('; ') || 'Recurring pattern detected'
}

module.exports = {
  detectSubscriptions,
  normalizeTransaction,
  extractMerchantKey,
  detectRecurrence,
  checkAmountConsistency
}
