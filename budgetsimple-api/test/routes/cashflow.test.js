'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { classifyTransaction, computeFlowGraph } = require('../../lib/cashflow-classifier')

test('classifyTransaction: income transaction', () => {
  const tx = {
    id: 'tx1',
    type: 'income',
    amount: 1000,
    currency: 'USD',
    source: 'Job'
  }
  const result = classifyTransaction(tx)
  assert.strictEqual(result, 'income')
})

test('classifyTransaction: expense transaction', () => {
  const tx = {
    id: 'tx2',
    type: 'expense',
    amount: -50,
    currency: 'USD',
    category: 'Groceries'
  }
  const result = classifyTransaction(tx)
  assert.strictEqual(result, 'expense')
})

test('classifyTransaction: transfer transaction (included)', () => {
  const tx = {
    id: 'tx3',
    type: 'transfer',
    amount: -200,
    currency: 'USD'
  }
  const result = classifyTransaction(tx)
  assert.strictEqual(result, 'transfer')
})

test('classifyTransaction: split transaction (excluded)', () => {
  const tx = {
    id: 'tx4',
    type: 'expense',
    amount: -100,
    currency: 'USD',
    isSplit: true
  }
  const result = classifyTransaction(tx)
  assert.strictEqual(result, null)
})

test('classifyTransaction: investment buy (excluded)', () => {
  const tx = {
    id: 'tx5',
    type: 'investment-buy',
    amount: -500,
    currency: 'USD'
  }
  const result = classifyTransaction(tx)
  assert.strictEqual(result, null)
})

test('classifyTransaction: investment sell (excluded)', () => {
  const tx = {
    id: 'tx6',
    type: 'investment-sell',
    amount: 600,
    currency: 'USD'
  }
  const result = classifyTransaction(tx)
  assert.strictEqual(result, null)
})

test('computeFlowGraph: basic income and expenses', () => {
  const transactions = [
    {
      id: 'tx1',
      type: 'income',
      amount: 3000,
      currency: 'USD',
      source: 'Job',
      date: '2025-01-01'
    },
    {
      id: 'tx2',
      type: 'expense',
      amount: -500,
      currency: 'USD',
      category: 'Groceries',
      date: '2025-01-02',
      incomeSource: 'Job'
    },
    {
      id: 'tx3',
      type: 'expense',
      amount: -200,
      currency: 'USD',
      category: 'Transportation',
      date: '2025-01-03',
      incomeSource: 'Job'
    }
  ]

  const result = computeFlowGraph(transactions, 'USD')

  assert.ok(result.nodes)
  assert.ok(result.edges)
  assert.ok(result.metadata)

  // Should have income node
  const incomeNode = result.nodes.find(n => n.type === 'income')
  assert.ok(incomeNode)
  assert.strictEqual(incomeNode.amount, 3000)

  // Should have expense category nodes
  const groceriesNode = result.nodes.find(n => n.id === 'expense-category:Groceries')
  assert.ok(groceriesNode)
  assert.strictEqual(groceriesNode.amount, 500)

  // Should have edges from income to expenses
  const edge = result.edges.find(e => 
    e.source === 'income:Job' && e.target === 'expense-category:Groceries'
  )
  assert.ok(edge)
  assert.strictEqual(edge.amount, 500)
})

test('computeFlowGraph: excludes split transactions', () => {
  const transactions = [
    {
      id: 'tx1',
      type: 'income',
      amount: 1000,
      currency: 'USD',
      source: 'Job',
      date: '2025-01-01'
    },
    {
      id: 'tx2',
      type: 'expense',
      amount: -100,
      currency: 'USD',
      category: 'Dining',
      isSplit: true, // Should be excluded
      date: '2025-01-02'
    }
  ]

  const result = computeFlowGraph(transactions, 'USD')

  // Should not have the split transaction in any nodes
  const diningNode = result.nodes.find(n => n.id === 'expense-category:Dining')
  assert.strictEqual(diningNode, undefined)
})

test('computeFlowGraph: includes transfers as category', () => {
  const transactions = [
    {
      id: 'tx1',
      type: 'income',
      amount: 2000,
      currency: 'USD',
      source: 'Job',
      date: '2025-01-01'
    },
    {
      id: 'tx2',
      type: 'transfer',
      amount: -300,
      currency: 'USD',
      date: '2025-01-02',
      incomeSource: 'Job'
    }
  ]

  const result = computeFlowGraph(transactions, 'USD')

  // Should have transfer node
  const transferNode = result.nodes.find(n => n.type === 'transfer')
  assert.ok(transferNode)
  assert.strictEqual(transferNode.id, 'transfer:all')
  assert.strictEqual(transferNode.amount, 300)

  // Should have edge from income to transfer
  const edge = result.edges.find(e => e.target === 'transfer:all')
  assert.ok(edge)
})

