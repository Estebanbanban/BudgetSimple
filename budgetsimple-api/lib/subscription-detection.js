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
  const merchant = (tx.merchant || tx.merchant_name || tx.merchantName || '').trim()
  const description = (tx.description || tx.memo || tx.note || '').trim()
  const merchantKey = extractMerchantKey(merchant || description)
  
  // Log if merchant key is unknown (for debugging)
  if (merchantKey === 'unknown' && (merchant || description)) {
    console.log(`[NORMALIZE] Merchant key became 'unknown' for: merchant="${merchant}", description="${description}"`)
  }

  // Extract category (check multiple field names, prioritize category_name from DB)
  const category = tx.category_name || tx.category || tx.category_id || tx.categoryId || tx.categoryName || null
  const categoryStr = category ? String(category).toLowerCase().trim() : null

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
  if (!text || !text.trim()) return 'unknown'

  let key = text.toLowerCase().trim()
  
  // If text is too short after trimming, return 'unknown'
  if (key.length < 2) return 'unknown'

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
 * 
 * Detection prioritizes:
 * 1. Category-based detection (if category contains "subscription" keywords)
 * 2. Known subscription database matching (merchant name/description)
 * 3. Recurring pattern analysis (temporal patterns)
 */
function detectSubscriptions (transactions, options = {}) {
  const {
    minOccurrences = 2,
    amountVarianceTolerance = 0.05, // ±5%
    amountVarianceFixed = 2.0, // ±$2
    // Hard ceiling on variance for *pattern-based* detection. If exceeded, we skip
    // recurrence/fallback detection (but still allow category/known-service matches).
    maxVarianceThreshold = null
  } = options

  if (!transactions || transactions.length === 0) {
    return []
  }

  // Step 1: Normalize all transactions
  console.log(`[DETECTION] Starting detection with ${transactions.length} raw transactions`)
  
  const normalized = transactions
    .map(normalizeTransaction)
    .filter(tx => {
      // More lenient filtering - only require date and direction
      const isValid = tx.date && tx.direction === 'expense'
      if (!isValid) {
        console.log(`[DETECTION] Filtered out transaction: date=${tx.date}, merchantKey=${tx.merchantKey}, direction=${tx.direction}, merchant="${tx.merchant}"`)
      }
      return isValid
    })
  
  // If merchantKey is 'unknown', try to use merchant field directly
  for (const tx of normalized) {
    if (tx.merchantKey === 'unknown' && tx.merchant && tx.merchant !== 'Unknown') {
      // Create a merchant key from the merchant name
      tx.merchantKey = extractMerchantKey(tx.merchant)
      console.log(`[DETECTION] Fixed merchantKey for transaction: "${tx.merchant}" -> "${tx.merchantKey}"`)
    }
  }
  
  // Filter again to remove any that still have 'unknown' merchantKey (but keep if merchant field exists)
  const finalNormalized = normalized.filter(tx => {
    if (tx.merchantKey === 'unknown') {
      // Still allow if merchant field has a value
      return tx.merchant && tx.merchant !== 'Unknown'
    }
    return true
  })

  console.log(`[DETECTION] After normalization: ${finalNormalized.length} valid transactions (from ${normalized.length} after initial filter)`)
  
  if (finalNormalized.length === 0) {
    console.log(`[DETECTION] No valid transactions after normalization. Sample raw transaction:`, transactions[0])
    return []
  }
  
  // Log sample normalized transaction
  console.log(`[DETECTION] Sample normalized transaction:`, {
    merchant: finalNormalized[0].merchant,
    merchantKey: finalNormalized[0].merchantKey,
    category: finalNormalized[0].category,
    amount: finalNormalized[0].amount,
    date: finalNormalized[0].date
  })

  // Step 2: Group by merchant key (use merchant field as fallback)
  const merchantGroups = {}
  for (const tx of finalNormalized) {
    // Use merchantKey if available, otherwise use merchant field
    const key = tx.merchantKey !== 'unknown' ? tx.merchantKey : (tx.merchant || 'unknown')
    if (!merchantGroups[key]) {
      merchantGroups[key] = []
    }
    merchantGroups[key].push(tx)
  }

  console.log(`[DETECTION] Grouped into ${Object.keys(merchantGroups).length} merchant groups:`, Object.keys(merchantGroups).slice(0, 10))

  const candidates = []

  // Step 3: Analyze each merchant group
  for (const [merchantKey, txs] of Object.entries(merchantGroups)) {
    console.log(`[DETECTION] Analyzing merchant group: ${merchantKey} (${txs.length} transactions)`)
    // Sort by date
    txs.sort((a, b) => new Date(a.date) - new Date(b.date))

    // EXCLUDE rent/housing unless explicitly marked as subscription
    const isRentOrHousing = merchantKey.includes('rent') || 
                            merchantKey.includes('housing') ||
                            txs.some(t => {
                              const cat = (t.category || '').toLowerCase()
                              return cat.includes('rent') || cat.includes('housing') || cat.includes('mortgage')
                            })
    
    // PRIORITY 1: Check category signal (strongest indicator)
    const categorySignal = txs.some(t => isSubscriptionCategory(t.category || ''))
    const categoryMatch = categorySignal && !isRentOrHousing // Only match if not rent/housing
    
    if (categoryMatch) {
      console.log(`[DETECTION] Category match found for ${merchantKey}:`, txs.find(t => isSubscriptionCategory(t.category || ''))?.category)
    }

    // PRIORITY 2: Check for known subscription merchant
    const knownService = findKnownSubscription(merchantKey) || 
                        findKnownSubscription(txs[0].merchant) ||
                        findKnownSubscription(txs[0].description)
    
    if (knownService) {
      console.log(`[DETECTION] Known service match found for ${merchantKey}:`, knownService.name)
    }

    // PRIORITY 3: Detect recurrence pattern (if we have enough occurrences)
    const recurrence = txs.length >= 2 ? detectRecurrence(txs) : null

    // PRIORITY 4: Check amount consistency
    const amounts = txs.map(t => t.amount)
    const amountConsistency = checkAmountConsistency(amounts, amountVarianceTolerance, amountVarianceFixed)
    const exceedsMaxVariance =
      typeof maxVarianceThreshold === 'number' &&
      amountConsistency.variancePercentage > maxVarianceThreshold

    // DECISION LOGIC: Accept if ANY of these conditions are met:
    // 1. Category matches (even single occurrence)
    // 2. Known subscription matches (even single occurrence)
    // 3. Recurring pattern + amount consistency (requires 2+ occurrences)

    let shouldDetect = false
    let detectionMethod = 'unknown'
    let frequency = 'monthly' // default
    let confidence = 0
    let medianAmount = amountConsistency.medianAmount || (amounts.length > 0 ? amounts[0] : 0)

    // Case 1: Category-based detection (HIGHEST PRIORITY)
    if (categoryMatch) {
      shouldDetect = true
      detectionMethod = 'category'
      confidence = 0.85 // High confidence for category match
      
      // Try to infer frequency from recurrence if available
      if (recurrence) {
        frequency = recurrence.frequency
        confidence = Math.min(0.95, confidence + 0.1) // Boost if also has recurrence
      } else if (knownService) {
        frequency = knownService.typicalFrequency || 'monthly'
        confidence = 0.9 // Very high if both category and known
      }
    }
    // Case 2: Known subscription match (HIGH PRIORITY)
    else if (knownService) {
      shouldDetect = true
      detectionMethod = 'known_subscription'
      confidence = 0.85 // High confidence for known subscription
      frequency = knownService.typicalFrequency || 'monthly'
      
      // Boost if also has recurrence
      if (recurrence) {
        confidence = Math.min(0.95, confidence + 0.1)
        frequency = recurrence.frequency // Prefer detected frequency
      }
    }
    // Case 3: Recurring pattern (requires 2+ occurrences)
    // EXCLUDE rent/housing from recurrence-based detection unless category says subscription
    else if (recurrence && txs.length >= minOccurrences && !isRentOrHousing && !exceedsMaxVariance) {
      // More lenient: accept if recurrence exists, even if amounts vary
      shouldDetect = true
      detectionMethod = 'recurrence'
      frequency = recurrence.frequency
      // Base confidence on recurrence, boost if amounts are consistent
      confidence = 0.4 + (recurrence.consistency * 0.3)
      if (amountConsistency.isConsistent) {
        confidence += (amountConsistency.score * 0.2)
      } else {
        // Still accept but lower confidence if amounts vary
        confidence = Math.max(0.4, confidence - 0.1)
      }
    }
    // Case 4: Fallback - any merchant with 2+ occurrences (very lenient)
    // EXCLUDE rent/housing from fallback detection
    else if (txs.length >= minOccurrences && txs.length >= 2 && !isRentOrHousing && !exceedsMaxVariance) {
      // Even without clear recurrence, if we have multiple transactions to same merchant, it might be a subscription
      // Check if dates are somewhat spread out (not all on same day)
      const dates = txs.map(t => new Date(t.date).getTime())
      const minDate = Math.min(...dates)
      const maxDate = Math.max(...dates)
      const daysSpan = (maxDate - minDate) / (1000 * 60 * 60 * 24)
      
      // If transactions span at least 30 days, consider it
      if (daysSpan >= 30) {
        shouldDetect = true
        detectionMethod = 'recurrence'
        frequency = 'monthly' // Assume monthly
        confidence = 0.4 // Low confidence but still detect
        console.log(`[DETECTION] Fallback detection for ${merchantKey}: ${txs.length} transactions over ${daysSpan.toFixed(0)} days`)
      }
    }

    // Skip if no detection method matched
    if (!shouldDetect) {
      console.log(
        `[DETECTION] Skipping ${merchantKey}: categoryMatch=${categoryMatch}, knownService=${!!knownService}, recurrence=${!!recurrence}, amountConsistent=${amountConsistency.isConsistent}, variance=${(amountConsistency.variancePercentage || 0).toFixed(2)}, exceedsMaxVariance=${exceedsMaxVariance}`
      )
      continue
    }
    
    console.log(`[DETECTION] ✓ Detected subscription: ${merchantKey} via ${detectionMethod} (confidence: ${confidence.toFixed(2)})`)

    // Calculate next expected date
    const lastDate = new Date(txs[txs.length - 1].date)
    const nextExpectedDate = new Date(lastDate)
    
    if (recurrence) {
      nextExpectedDate.setDate(nextExpectedDate.getDate() + recurrence.medianGap)
    } else if (knownService) {
      // Use typical frequency for known services
      const daysPerPeriod = {
        weekly: 7,
        'bi-weekly': 14,
        monthly: 30,
        quarterly: 90,
        annual: 365
      }
      nextExpectedDate.setDate(nextExpectedDate.getDate() + (daysPerPeriod[frequency] || 30))
    } else {
      // Default to monthly if no other info
      nextExpectedDate.setDate(nextExpectedDate.getDate() + 30)
    }

    // Calculate estimated monthly amount
    const estimatedMonthlyAmount = normalizeToMonthly(medianAmount, frequency)

    // Build signals object
    const signals = {
      recurrenceScore: recurrence ? recurrence.consistency : 0,
      amountConsistencyScore: amountConsistency.score || 0.5, // Default to 0.5 if single occurrence
      keywordScore: knownService ? 0.9 : 0,
      categoryScore: categoryMatch ? 0.9 : 0
    }

    // Build candidate
    candidates.push({
      merchantKey,
      merchant: txs[0].merchant,
      categoryId: getMostCommonCategory(txs),
      estimatedMonthlyAmount,
      frequency,
      firstDetectedDate: txs[0].date,
      lastChargeDate: txs[txs.length - 1].date,
      nextExpectedDate: nextExpectedDate.toISOString().split('T')[0],
      confidenceScore: Math.min(1.0, confidence),
      contributingTransactionIds: txs.map(t => t.id),
      occurrenceCount: txs.length,
      averageAmount: medianAmount,
      variancePercentage: amountConsistency.variancePercentage || 0,
      signals,
      detectionMethod,
      patternType: recurrence 
        ? `${recurrence.frequency}${recurrence.consistency > 0.7 ? '' : '-approximate'}`
        : frequency, // Use frequency if no recurrence detected
      reason: buildReason(signals, recurrence, knownService, categoryMatch, detectionMethod),
      sampleTransactions: txs.slice(0, 3).map(t => ({
        id: t.id,
        date: t.date,
        amount: t.amount
      }))
    })
  }

  // Sort by confidence (highest first)
  const sorted = candidates.sort((a, b) => b.confidenceScore - a.confidenceScore)
  console.log(`[DETECTION] Final result: ${sorted.length} candidates detected`)
  return sorted
}

/**
 * Detect recurrence pattern using median gaps
 * More lenient thresholds to catch more patterns
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

  // More lenient consistency threshold (allow ±5-7 days drift for monthly)
  // Lower threshold to catch more patterns
  if (consistency < 0.4) {
    return null
  }

  // Determine frequency with even wider ranges
  let frequency = 'monthly'
  if (medianGap >= 4 && medianGap <= 12) {
    frequency = 'weekly'
  } else if (medianGap >= 10 && medianGap <= 20) {
    frequency = 'bi-weekly'
  } else if (medianGap >= 20 && medianGap <= 45) {
    frequency = 'monthly' // Very wide range for monthly (allows billing drift)
  } else if (medianGap >= 80 && medianGap <= 100) {
    frequency = 'quarterly'
  } else if (medianGap >= 340 && medianGap <= 390) {
    frequency = 'annual'
  } else {
    // For gaps that don't match exactly, still accept if somewhat consistent
    // This catches approximate monthly patterns - be very lenient
    if (medianGap >= 15 && medianGap <= 50) {
      frequency = 'monthly'
      console.log(`[RECURRENCE] Approximate monthly pattern detected: ${medianGap} days`)
    } else {
      return null
    }
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
 * More lenient for single occurrences (assumes consistent)
 */
function checkAmountConsistency (amounts, tolerancePercent, toleranceFixed) {
  if (amounts.length === 0) {
    return { isConsistent: false, score: 0, medianAmount: 0, variancePercentage: 0 }
  }

  // Single occurrence: assume consistent
  if (amounts.length === 1) {
    return {
      isConsistent: true,
      score: 0.7, // Good score for single occurrence
      medianAmount: amounts[0],
      variancePercentage: 0,
      maxDeviation: 0
    }
  }

  // Use median amount (more robust than average)
  const sorted = [...amounts].sort((a, b) => a - b)
  const medianAmount = sorted[Math.floor(sorted.length / 2)]

  // Calculate variance
  const deviations = amounts.map(a => Math.abs(a - medianAmount))
  const maxDeviation = Math.max(...deviations)
  const variancePercentage = medianAmount > 0 ? maxDeviation / medianAmount : 0

  // Check consistency: ±5% OR ±$2, whichever is larger
  // Make tolerance even more lenient
  const tolerance = Math.max(medianAmount * tolerancePercent * 1.5, toleranceFixed * 1.5) // 1.5x more lenient
  const isConsistent = maxDeviation <= tolerance

  // Score: 1.0 if perfect, decreases with variance
  // Very lenient scoring - accept even with significant variance
  const score = isConsistent 
    ? Math.max(0.4, 1 - (variancePercentage / (tolerancePercent * 3))) // More lenient
    : (maxDeviation <= tolerance * 2 ? 0.3 : 0) // Allow even more variance

  const finalIsConsistent = isConsistent || (maxDeviation <= tolerance * 2) // Very lenient
  
  console.log(`[AMOUNT] Checking consistency: median=${medianAmount.toFixed(2)}, maxDev=${maxDeviation.toFixed(2)}, tolerance=${tolerance.toFixed(2)}, consistent=${finalIsConsistent}`)

  return {
    isConsistent: finalIsConsistent,
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
function buildReason (signals, recurrence, knownService, categorySignal, detectionMethod) {
  const parts = []

  // Lead with detection method
  if (detectionMethod === 'category') {
    parts.push('Detected via subscription category')
  } else if (detectionMethod === 'known_subscription') {
    parts.push(`Detected via known subscription database (${knownService?.name || 'matched service'})`)
  } else if (detectionMethod === 'recurrence') {
    parts.push('Detected via recurring pattern analysis')
  }

  if (categorySignal) {
    parts.push('Category marked as subscription')
  }

  if (knownService) {
    parts.push(`Known subscription service: ${knownService.name}`)
  }

  if (recurrence) {
    if (signals.recurrenceScore > 0.7) {
      parts.push(`Strong recurring pattern (${recurrence.frequency}, ${recurrence.consistency.toFixed(2)} consistency)`)
    } else if (signals.recurrenceScore > 0.5) {
      parts.push(`Moderate recurring pattern (${recurrence.frequency})`)
    } else {
      parts.push(`Recurring pattern detected (${recurrence.frequency})`)
    }
  }

  if (signals.amountConsistencyScore > 0.8) {
    parts.push('Very consistent amounts')
  } else if (signals.amountConsistencyScore > 0.6) {
    parts.push('Mostly consistent amounts')
  } else if (signals.amountConsistencyScore > 0) {
    parts.push('Amounts vary but within tolerance')
  }

  return parts.join('; ') || 'Subscription pattern detected'
}

module.exports = {
  detectSubscriptions,
  normalizeTransaction,
  extractMerchantKey,
  detectRecurrence,
  checkAmountConsistency
}
