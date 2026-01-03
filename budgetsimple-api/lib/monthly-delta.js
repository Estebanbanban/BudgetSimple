'use strict'

function monthKey (dateValue) {
  if (!dateValue) return ''
  const asString = dateValue instanceof Date
    ? dateValue.toISOString()
    : dateValue.toString()
  return asString.slice(0, 7)
}

function derivePreviousMonth (month) {
  const [year, mon] = month.split('-').map(Number)
  const previous = new Date(year, mon - 2, 1)
  return previous.toISOString().slice(0, 7)
}

function aggregateForMonth (transactions, month) {
  const categoryTotals = new Map()
  let incomeTotal = 0
  let expenseTotal = 0

  for (const tx of transactions) {
    const txMonth = monthKey(tx.date || tx.dateISO)
    if (txMonth !== month) continue

    const type = tx.type || (tx.amount >= 0 ? 'income' : 'expense')
    const amount = Math.abs(Number(tx.amount) || 0)

    if (type === 'income') {
      incomeTotal += amount
    } else {
      const category = tx.category || 'Uncategorized'
      const current = categoryTotals.get(category) || 0
      categoryTotals.set(category, current + amount)
      expenseTotal += amount
    }
  }

  return { categoryTotals, incomeTotal, expenseTotal }
}

function computeChange ({ current, previous }) {
  const delta = current - previous
  const changePercent = previous > 0 ? (delta / previous) * 100 : null
  return { current, previous, delta, changePercent }
}

function computeMonthlyChangeDrivers (transactions = [], options = {}) {
  const month = options.month || monthKey(new Date().toISOString())
  const previousMonth = options.previousMonth || derivePreviousMonth(month)

  const currentAgg = aggregateForMonth(transactions, month)
  const previousAgg = aggregateForMonth(transactions, previousMonth)

  const hasCurrentData =
    currentAgg.incomeTotal > 0 || currentAgg.expenseTotal > 0 || currentAgg.categoryTotals.size > 0
  const hasPreviousData =
    previousAgg.incomeTotal > 0 || previousAgg.expenseTotal > 0 || previousAgg.categoryTotals.size > 0

  const totals = {
    income: computeChange({ current: currentAgg.incomeTotal, previous: previousAgg.incomeTotal }),
    expenses: computeChange({ current: currentAgg.expenseTotal, previous: previousAgg.expenseTotal })
  }

  const categories = []
  const allCategories = new Set([
    ...currentAgg.categoryTotals.keys(),
    ...previousAgg.categoryTotals.keys()
  ])

  for (const category of allCategories) {
    const current = currentAgg.categoryTotals.get(category) || 0
    const previous = previousAgg.categoryTotals.get(category) || 0
    const change = computeChange({ current, previous })
    categories.push({
      category,
      type: 'expense',
      ...change
    })
  }

  const topChanges = []

  if (totals.expenses.current || totals.expenses.previous) {
    topChanges.push({
      category: 'Total Expenses',
      type: 'summary',
      ...totals.expenses
    })
  }

  if (totals.income.current || totals.income.previous) {
    topChanges.push({
      category: 'Income',
      type: 'income',
      ...totals.income
    })
  }

  for (const cat of categories) {
    if (!cat.current && !cat.previous) continue
    topChanges.push(cat)
  }

  topChanges.sort((a, b) => {
    const diff = Math.abs(b.delta) - Math.abs(a.delta)
    if (diff !== 0) return diff
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    return a.category.localeCompare(b.category)
  })

  return {
    month,
    previousMonth,
    hasCurrentData,
    hasPreviousData,
    totals,
    categories,
    topChanges: topChanges.slice(0, 5)
  }
}

module.exports = {
  computeMonthlyChangeDrivers
}
