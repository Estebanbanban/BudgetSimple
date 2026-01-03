'use strict'

class QueryBuilder {
  constructor (db, table) {
    this.db = db
    this.table = table
    this.filters = []
    this.orders = []
    this.limitValue = null
    this.singleFlag = false
    this.maybeSingleFlag = false
    this.action = 'select'
    this.insertRows = null
    this.updateData = null
    this.selectColumns = null
  }

  select (columns = '*') {
    this.action = this.action || 'select'
    this.selectColumns = columns
    return this
  }

  insert (rows) {
    this.action = 'insert'
    this.insertRows = Array.isArray(rows) ? rows : [rows]
    return this
  }

  update (data) {
    this.action = 'update'
    this.updateData = data
    return this
  }

  delete () {
    this.action = 'delete'
    return this
  }

  eq (column, value) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  order (column, { ascending = true, nullsLast = false } = {}) {
    this.orders.push({ column, ascending, nullsLast })
    return this
  }

  limit (count) {
    this.limitValue = count
    return this
  }

  single () {
    this.singleFlag = true
    return this
  }

  maybeSingle () {
    this.maybeSingleFlag = true
    return this
  }

  then (resolve, reject) {
    return this.execute().then(resolve, reject)
  }

  async execute () {
    switch (this.action) {
      case 'insert':
        return this.#executeInsert()
      case 'update':
        return this.#executeUpdate()
      case 'delete':
        return this.#executeDelete()
      default:
        return this.#executeSelect()
    }
  }

  #applyFilters (rows) {
    return this.filters.reduce((current, predicate) => current.filter(predicate), rows)
  }

  #applySorting (rows) {
    if (this.orders.length === 0) return rows

    return [...rows].sort((a, b) => {
      for (const { column, ascending, nullsLast } of this.orders) {
        const aVal = a[column]
        const bVal = b[column]

        if (aVal == null && bVal == null) continue
        if (aVal == null) return nullsLast ? 1 : -1
        if (bVal == null) return nullsLast ? -1 : 1
        if (aVal === bVal) continue

        const comparison = aVal > bVal ? 1 : -1
        return ascending ? comparison : -comparison
      }
      return 0
    })
  }

  #applyLimit (rows) {
    if (typeof this.limitValue === 'number') {
      return rows.slice(0, this.limitValue)
    }
    return rows
  }

  #wrapSingle (rows, allowEmpty = false) {
    const first = rows[0]
    if (!first) {
      return { data: allowEmpty ? null : null, error: { code: 'PGRST116', message: 'No rows found' } }
    }
    return { data: first, error: null }
  }

  async #executeSelect () {
    const tableData = this.db.tables[this.table] || []
    let rows = this.#applyFilters(tableData)
    rows = this.#applySorting(rows)
    rows = this.#applyLimit(rows)

    if (this.singleFlag) return this.#wrapSingle(rows)
    if (this.maybeSingleFlag) return this.#wrapSingle(rows, true)

    return { data: rows, error: null }
  }

  async #executeInsert () {
    const tableData = this.db.tables[this.table] || []
    const inserted = this.insertRows.map((row) => ({
      id: row.id || this.db.nextId(),
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
      ...row
    }))

    tableData.push(...inserted)
    this.db.tables[this.table] = tableData

    const payload = this.selectColumns ? inserted : null
    if (this.singleFlag) return this.#wrapSingle(payload || inserted)

    return { data: payload || inserted, error: null }
  }

  async #executeUpdate () {
    const tableData = this.db.tables[this.table] || []
    const filtered = this.#applyFilters(tableData)

    if (filtered.length === 0) {
      return { data: null, error: { message: 'No rows updated', code: 'PGRST116' } }
    }

    const updatedRows = filtered.map((row) => {
      const updated = { ...row, ...this.updateData, updated_at: new Date().toISOString() }
      const index = tableData.indexOf(row)
      tableData[index] = updated
      return updated
    })

    this.db.tables[this.table] = tableData

    if (this.singleFlag) return this.#wrapSingle(updatedRows)

    return { data: this.selectColumns ? updatedRows : null, error: null }
  }

  async #executeDelete () {
    const tableData = this.db.tables[this.table] || []
    const remaining = tableData.filter((row) => !this.filters.every((predicate) => predicate(row)))
    this.db.tables[this.table] = remaining
    return { data: null, error: null }
  }
}

class MockSupabase {
  constructor (seed = {}) {
    this.tables = {
      milestones: [],
      net_worth_snapshots: [],
      user_assumptions: [],
      ...seed
    }
    this.counter = 0
  }

  from (table) {
    return new QueryBuilder(this, table)
  }

  nextId () {
    this.counter += 1
    return `mock-${this.counter}`
  }
}

module.exports = { MockSupabase }
