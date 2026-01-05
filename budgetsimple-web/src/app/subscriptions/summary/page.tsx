'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getLocalSubscriptionSummary, getLocalSubscriptionTransactions } from '@/lib/subscriptions-local'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const USE_BACKEND_SUBSCRIPTIONS = process.env.NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS === 'true'

interface Subscription {
  id: string
  merchant: string
  categoryId?: string
  estimatedMonthlyAmount: number
  frequency: string
  lastTransactionDate?: string
}

interface Summary {
  totalMonthly: number
  byMerchant: Array<{
    merchant: string
    amount: number
    frequency: string
    subscriptionId: string
  }>
  byCategory: Array<{
    categoryId?: string
    categoryName?: string
    amount: number
    count: number
  }>
  subscriptions: Subscription[]
}

export default function SubscriptionSummaryPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const tick = () => {
      if (cancelled) return
      attempts += 1
      if (!USE_BACKEND_SUBSCRIPTIONS && typeof window !== 'undefined') {
        const rt = (window as any).budgetsimpleRuntime
        const storeReady = rt && typeof rt.getStore === 'function' && rt.getStore()
        if (!storeReady) {
          if (attempts < 100) {
            setTimeout(tick, 200)
            return
          }
        }
      }
      loadSummary()
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [])

  const loadSummary = async () => {
    try {
      setLoading(true)
      if (!USE_BACKEND_SUBSCRIPTIONS) {
        const local = await getLocalSubscriptionSummary()
        setSummary(local)
      } else {
        const response = await fetch(`${API_BASE}/api/subscriptions/summary?userId=demo-user`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Error loading summary:', error)
      // Set empty summary on error
      setSummary({
        totalMonthly: 0,
        byMerchant: [],
        byCategory: [],
        subscriptions: []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <section className="view" data-view="subscriptions-summary">
        <div className="page-head">
          <h1>Subscription Summary</h1>
          <p className="muted">Loading...</p>
        </div>
      </section>
    )
  }

  if (!summary) {
    return (
      <section className="view" data-view="subscriptions-summary">
        <div className="page-head">
          <h1>Subscription Summary</h1>
          <p className="muted">No subscription data available</p>
        </div>
      </section>
    )
  }

  return (
    <section className="view" data-view="subscriptions-summary">
      <div className="page-head">
        <div>
          <h1>Subscription Summary</h1>
          <p className="muted">Your recurring subscription spend</p>
        </div>
        <Link href="/subscriptions" className="btn btn-quiet">
          Review Subscriptions
        </Link>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-title">Total Monthly Subscriptions</div>
          <div className="card-value">{formatCurrency(summary.totalMonthly)}</div>
          <div className="card-sub">Per month</div>
        </div>
        <div className="card">
          <div className="card-title">Annual Total</div>
          <div className="card-value">{formatCurrency(summary.totalMonthly * 12)}</div>
          <div className="card-sub">Per year</div>
        </div>
        <div className="card">
          <div className="card-title">Active Subscriptions</div>
          <div className="card-value">{summary.subscriptions.length}</div>
          <div className="card-sub">Confirmed subscriptions</div>
        </div>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">By Merchant</div>
              <div className="panel-sub">Monthly amount per subscription</div>
            </div>
          </div>
          <div className="panel-body">
            {summary.byMerchant.length === 0 ? (
              <p className="muted">No subscriptions found</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Merchant</th>
                      <th>Amount</th>
                      <th>Frequency</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byMerchant.map((item) => (
                      <tr key={item.subscriptionId}>
                        <td>{item.merchant}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>{item.frequency}</td>
                        <td>
                          <button
                            className="btn btn-quiet"
                            onClick={() => setSelectedSubscription(item.subscriptionId)}
                          >
                            View Transactions
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">By Category</div>
              <div className="panel-sub">Total monthly spend per category</div>
            </div>
          </div>
          <div className="panel-body">
            {summary.byCategory.length === 0 ? (
              <p className="muted">No category breakdown available</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byCategory.map((item, index) => (
                      <tr key={item.categoryId || `uncategorized-${index}`}>
                        <td>{item.categoryName || 'Uncategorized'}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {selectedSubscription && (
          <SubscriptionTransactions
            subscriptionId={selectedSubscription}
            onClose={() => setSelectedSubscription(null)}
          />
        )}
      </div>
    </section>
  )
}

function SubscriptionTransactions({
  subscriptionId,
  onClose
}: {
  subscriptionId: string
  onClose: () => void
}) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalAmount, setTotalAmount] = useState(0)

  useEffect(() => {
    loadTransactions()
  }, [subscriptionId])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      if (!USE_BACKEND_SUBSCRIPTIONS) {
        const data = await getLocalSubscriptionTransactions(subscriptionId)
        setTransactions(data.transactions || [])
        setTotalAmount(data.totalAmount || 0)
      } else {
        const response = await fetch(
          `${API_BASE}/api/subscriptions/${subscriptionId}/transactions?userId=demo-user`
        )
        const data = await response.json()
        setTransactions(data.transactions || [])
        setTotalAmount(data.totalAmount || 0)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Contributing Transactions</div>
          <div className="panel-sub">Total: {formatCurrency(totalAmount)}</div>
        </div>
        <button className="btn btn-quiet" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="panel-body">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="muted">No transactions found</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.date).toLocaleDateString()}</td>
                    <td>{tx.description || '-'}</td>
                    <td>{tx.merchant || '-'}</td>
                    <td>{formatCurrency(Math.abs(tx.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

