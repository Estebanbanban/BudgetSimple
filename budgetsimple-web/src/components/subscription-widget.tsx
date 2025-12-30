'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function SubscriptionWidget() {
  const [totalMonthly, setTotalMonthly] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
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
    } catch (error) {
      console.error('Error loading subscription summary:', error)
      // Set to null to show loading state, or 0 to show $0
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
      <Link href="/subscriptions/summary" className="btn btn-quiet">
        View subscriptions
      </Link>
    </div>
  )
}

