'use strict'

/**
 * Cashflow Classification Rules
 * 
 * Based on PRD Section 9, Open Question 1:
 * - Transfers are shown as a category
 * - Split transactions are excluded
 * - Investment buy/sell transactions are excluded
 */

/**
 * Classifies a transaction type for cashflow computation
 * @param {Object} transaction - Transaction object
 * @returns {string|null} - Transaction type or null if excluded
 */
function classifyTransaction (transaction) {
  // Exclude split transactions
  if (transaction.isSplit === true || transaction.splitId) {
    return null
  }

  // Exclude investment buy/sell
  if (transaction.type === 'investment-buy' || transaction.type === 'investment-sell') {
    return null
  }

  // Classify by transaction type
  const type = transaction.type || 'expense'

  switch (type) {
    case 'income':
      return 'income'
    case 'expense':
      return 'expense'
    case 'transfer':
      return 'transfer'
    case 'investment':
      // Investment contributions (not buy/sell) are included
      return 'investing'
    case 'liability':
      return 'liability'
    default:
      // Default to expense if unknown
      return 'expense'
  }
}

/**
 * Computes a flow graph from transactions
 * @param {Array} transactions - Array of transaction objects
 * @param {string} displayCurrency - Target currency for amounts
 * @param {Array} subscriptions - Array of confirmed subscription objects (optional)
 * @returns {Object} - Flow graph with nodes and edges
 */
function computeFlowGraph (transactions, displayCurrency = 'USD', subscriptions = []) {
  const nodes = new Map() // nodeId -> { id, label, type, amount, currency }
  const edges = new Map() // sourceId:targetId -> { source, target, amount, currency, transactionIds }

  let totalIncome = 0
  let totalExpenses = 0
  let totalSavings = 0
  let totalUnallocated = 0

  // Process each transaction
  for (const tx of transactions) {
    const txType = classifyTransaction(tx)
    if (!txType) {
      // Excluded transaction (split or investment buy/sell)
      continue
    }

    // Convert amount to display currency (stub: assume 1:1 for now)
    // TODO: Use actual FX conversion when FX rates are available
    const amount = convertToDisplayCurrency(tx.amount, tx.currency, displayCurrency)

    if (txType === 'income') {
      // Income source node
      const sourceId = `income:${tx.source || tx.category || 'other'}`
      const sourceLabel = tx.source || tx.category || 'Other Income'

      if (!nodes.has(sourceId)) {
        nodes.set(sourceId, {
          id: sourceId,
          label: sourceLabel,
          type: 'income',
          amount: 0,
          currency: displayCurrency
        })
      }
      nodes.get(sourceId).amount += amount
      totalIncome += amount

      // Determine destination (sink)
      // For now, we'll create edges in a second pass after aggregating all transactions
      // This is a simplified version - in production, we'd need to track
      // where income goes (expenses, savings, etc.) based on transaction flow
    } else if (txType === 'expense') {
      // Expense sink node (expenses are negative, convert to positive for display)
      const categoryId = `expense-category:${tx.category || 'uncategorized'}`
      const categoryLabel = tx.category || 'Uncategorized'
      const expenseAmount = Math.abs(amount) // Expenses are negative, use absolute value

      if (!nodes.has(categoryId)) {
        nodes.set(categoryId, {
          id: categoryId,
          label: categoryLabel,
          type: 'expense-category',
          amount: 0,
          currency: displayCurrency
        })
      }
      nodes.get(categoryId).amount += expenseAmount
      totalExpenses += expenseAmount

      // Create edge from income to this expense category
      // Simplified: assume income flows to expenses proportionally
      // In production, we'd need to track actual account flows
      const incomeSourceId = `income:${tx.incomeSource || 'other'}`
      const edgeKey = `${incomeSourceId}:${categoryId}`
      if (!edges.has(edgeKey)) {
        edges.set(edgeKey, {
          source: incomeSourceId,
          target: categoryId,
          amount: 0,
          currency: displayCurrency,
          transactionIds: []
        })
      }
      edges.get(edgeKey).amount += expenseAmount
      edges.get(edgeKey).transactionIds.push(tx.id || `tx-${tx.date}-${tx.amount}`)
    } else if (txType === 'transfer') {
      // Transfer node (shown as category)
      const transferId = 'transfer:all'
      const transferLabel = 'Transfers'

      if (!nodes.has(transferId)) {
        nodes.set(transferId, {
          id: transferId,
          label: transferLabel,
          type: 'transfer',
          amount: 0,
          currency: displayCurrency
        })
      }
      nodes.get(transferId).amount += Math.abs(amount)

      // Create edge from income to transfers
      const incomeSourceId = `income:${tx.incomeSource || 'other'}`
      const edgeKey = `${incomeSourceId}:${transferId}`
      if (!edges.has(edgeKey)) {
        edges.set(edgeKey, {
          source: incomeSourceId,
          target: transferId,
          amount: 0,
          currency: displayCurrency,
          transactionIds: []
        })
      }
      edges.get(edgeKey).amount += Math.abs(amount)
      edges.get(edgeKey).transactionIds.push(tx.id || `tx-${tx.date}-${tx.amount}`)
    } else if (txType === 'investing') {
      // Investing destination node
      const investingId = `investing:${tx.accountId || 'all'}`
      const investingLabel = tx.accountName || 'Investing'

      if (!nodes.has(investingId)) {
        nodes.set(investingId, {
          id: investingId,
          label: investingLabel,
          type: 'investing',
          amount: 0,
          currency: displayCurrency
        })
      }
      nodes.get(investingId).amount += amount
      totalSavings += amount

      // Create edge from income to investing
      const incomeSourceId = `income:${tx.incomeSource || 'other'}`
      const edgeKey = `${incomeSourceId}:${investingId}`
      if (!edges.has(edgeKey)) {
        edges.set(edgeKey, {
          source: incomeSourceId,
          target: investingId,
          amount: 0,
          currency: displayCurrency,
          transactionIds: []
        })
      }
      edges.get(edgeKey).amount += amount
      edges.get(edgeKey).transactionIds.push(tx.id || `tx-${tx.date}-${tx.amount}`)
    }
  }

  // Add subscription nodes if provided
  let totalSubscriptions = 0
  if (subscriptions && subscriptions.length > 0) {
    const subscriptionNodeId = 'subscription:all'
    subscriptions.forEach((sub) => {
      const monthlyAmount = parseFloat(sub.estimated_monthly_amount || 0)
      totalSubscriptions += monthlyAmount
    })

    if (totalSubscriptions > 0) {
      nodes.set(subscriptionNodeId, {
        id: subscriptionNodeId,
        label: 'Subscriptions',
        type: 'subscription',
        amount: totalSubscriptions,
        currency: displayCurrency
      })

      // Edge from expenses to subscriptions (subscriptions are part of expenses)
      if (totalExpenses > 0) {
        const expensesNodeId = 'expenses:all'
        if (!nodes.has(expensesNodeId)) {
          nodes.set(expensesNodeId, {
            id: expensesNodeId,
            label: 'Expenses',
            type: 'expenses',
            amount: totalExpenses,
            currency: displayCurrency
          })
        }
        edges.set(`${expensesNodeId}:${subscriptionNodeId}`, {
          source: expensesNodeId,
          target: subscriptionNodeId,
          amount: totalSubscriptions,
          currency: displayCurrency,
          transactionIds: []
        })
      }
    }
  }

  // Calculate unallocated (income - expenses - savings - transfers - subscriptions)
  const totalTransfers = nodes.get('transfer:all')?.amount || 0
  totalUnallocated = totalIncome - totalExpenses - totalSavings - totalTransfers - totalSubscriptions

  if (totalUnallocated > 0) {
    // Add unallocated node
    const unallocatedId = 'unallocated'
    nodes.set(unallocatedId, {
      id: unallocatedId,
      label: 'Unallocated',
      type: 'unallocated',
      amount: totalUnallocated,
      currency: displayCurrency
    })

    // Create edge from income to unallocated
    // Simplified: distribute proportionally from all income sources
    for (const [nodeId, node] of nodes) {
      if (node.type === 'income' && node.amount > 0) {
        const proportion = node.amount / totalIncome
        const unallocatedAmount = totalUnallocated * proportion
        const edgeKey = `${nodeId}:${unallocatedId}`
        edges.set(edgeKey, {
          source: nodeId,
          target: unallocatedId,
          amount: unallocatedAmount,
          currency: displayCurrency,
          transactionIds: [] // Unallocated is computed, not from specific transactions
        })
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    metadata: {
      startDate: transactions[0]?.date || new Date().toISOString().split('T')[0],
      endDate: transactions[transactions.length - 1]?.date || new Date().toISOString().split('T')[0],
      displayCurrency,
      fxRateDate: new Date().toISOString().split('T')[0], // TODO: Use actual FX rate date
      totalIncome,
      totalExpenses,
      totalSavings,
      totalUnallocated
    }
  }
}

/**
 * Converts amount to display currency
 * TODO: Implement actual FX conversion using stored rates
 */
function convertToDisplayCurrency (amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount
  }
  // Stub: 1:1 conversion for now
  // In production, use FX rates from database
  return amount
}

module.exports = {
  classifyTransaction,
  computeFlowGraph,
  convertToDisplayCurrency
}

