'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getLocalSubscriptionSummary } from '@/lib/subscriptions-local'

// MVP: Local-first - compute from IndexedDB, no backend dependency
const USE_BACKEND_SUBSCRIPTIONS = process.env.NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS === 'true'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function SubscriptionWidget() {
  const [totalMonthly, setTotalMonthly] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSummary()
    // Re-compute when window data changes (after CSV import, etc.)
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).budgetsimpleRuntime) {
        loadSummary()
      }
    }, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadSummary = async () => {
    try {
      // MVP: Use local IndexedDB data first
      if (!USE_BACKEND_SUBSCRIPTIONS && typeof window !== 'undefined') {
        const summary = await getLocalSubscriptionSummary()
        setTotalMonthly(summary.totalMonthly || 0)
          setLoading(false)
          return
      }

      // Fallback to API if backend is enabled
      if (USE_BACKEND_SUBSCRIPTIONS) {
        const url = `${API_BASE}/api/subscriptions/summary?userId=demo-user`
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setTotalMonthly(data.totalMonthly || 0)
      } else {
        // No backend, no local runtime yet - show 0
        setTotalMonthly(0)
      }
    } catch (error) {
      console.error('Error loading subscription summary:', error)
      setTotalMonthly(0)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="card">
      <div className="card-title">Subscriptions</div>
      <div className="card-value" id="kpiSubscriptions">
        {loading ? '--' : formatCurrency(totalMonthly || 0)}
      </div>
      <div className="card-sub">
        Per month
      </div>
      <Link href="/subscriptions" className="btn btn-quiet">
        View subscriptions
      </Link>
    </div>
  )
}

