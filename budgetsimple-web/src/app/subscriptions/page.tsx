'use client'

import { useState, useEffect } from 'react'
import {
  getLocalCandidates,
  upsertLocalSubscriptionRecord,
  type SubscriptionFrequency
} from '@/lib/subscriptions-local'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface SubscriptionCandidate {
  id: string
  merchant: string
  categoryId?: string
  estimatedMonthlyAmount: number
  frequency: 'monthly' | 'bi-weekly' | 'quarterly' | 'annual'
  firstDetectedDate: string
  confidenceScore: number
  status: 'pending' | 'confirmed' | 'rejected'
  occurrenceCount: number
  averageAmount: number
  variancePercentage: number
  merchantKey?: string
}

export default function SubscriptionsPage() {
  const [candidates, setCandidates] = useState<SubscriptionCandidate[]>([])
  const [summary, setSummary] = useState<{ totalMonthly: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<SubscriptionCandidate | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null)
  const [detectionMonths, setDetectionMonths] = useState(6)

  // MVP: Local-first - use IndexedDB data
  const USE_BACKEND_SUBSCRIPTIONS = process.env.NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS === 'true'

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const tick = () => {
      if (cancelled) return
      attempts += 1

      // Wait briefly for the global runtime to initialize (it attaches to window asynchronously).
      if (!USE_BACKEND_SUBSCRIPTIONS && typeof window !== 'undefined') {
        const rt = (window as any).budgetsimpleRuntime
        const storeReady = rt && typeof rt.getStore === 'function' && rt.getStore()
        if (!storeReady && attempts < 25) {
          setTimeout(tick, 200)
          return
        }
      }

      loadCandidates()
      loadLocalSummary()
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [])

  const loadLocalSummary = () => {
    // Try to get summary from local runtime
    if (typeof window !== 'undefined' && (window as any).budgetsimpleRuntime) {
      try {
        const runtime = (window as any).budgetsimpleRuntime
        if (typeof runtime.analyzeMerchants === 'function') {
          const analysis = runtime.analyzeMerchants()
          const subTotal = analysis.subscriptions.reduce(
            (sum: number, row: any) => sum + (row.monthly || 0),
            0
          )
          setSummary({
            totalMonthly: subTotal,
            count: analysis.subscriptions.length
          })
        }
      } catch (error) {
        console.error('Error loading local summary:', error)
      }
    }
  }

  const loadCandidates = async () => {
    try {
      setLoading(true)

      // MVP: Local-first - compute from IndexedDB
      if (!USE_BACKEND_SUBSCRIPTIONS && typeof window !== 'undefined') {
        const localCandidates = await getLocalCandidates()
        setCandidates(localCandidates as unknown as SubscriptionCandidate[])
        setLoading(false)
        return
      }

      // Fallback to API if backend is enabled
      if (USE_BACKEND_SUBSCRIPTIONS) {
        const url = `${API_BASE}/api/subscriptions/candidates?status=pending`
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
        setCandidates(data.candidates || [])
      } else {
        setCandidates([])
      }
    } catch (error: any) {
      console.error('Error loading candidates:', error)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (id: string) => {
    try {
      if (!USE_BACKEND_SUBSCRIPTIONS) {
        const existing = candidates.find(c => c.id === id)
        await upsertLocalSubscriptionRecord({
          merchant: existing?.merchant || id,
          estimatedMonthlyAmount: existing?.estimatedMonthlyAmount || 0,
          frequency: (existing?.frequency || 'monthly') as SubscriptionFrequency,
          status: 'confirmed',
          source: 'detected'
        })
        await loadCandidates()
        setSelectedCandidate(null)
        loadLocalSummary()
        return
      }
      const response = await fetch(`${API_BASE}/api/subscriptions/${id}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' })
      })
      if (response.ok) {
        await loadCandidates()
        setSelectedCandidate(null)
      }
    } catch (error) {
      console.error('Error confirming subscription:', error)
    }
  }

  const handleReject = async (id: string) => {
    try {
      if (!USE_BACKEND_SUBSCRIPTIONS) {
        const existing = candidates.find(c => c.id === id)
        await upsertLocalSubscriptionRecord({
          merchant: existing?.merchant || id,
          estimatedMonthlyAmount: existing?.estimatedMonthlyAmount || 0,
          frequency: (existing?.frequency || 'monthly') as SubscriptionFrequency,
          status: 'rejected',
          source: 'detected'
        })
        await loadCandidates()
        setSelectedCandidate(null)
        loadLocalSummary()
        return
      }
      const response = await fetch(`${API_BASE}/api/subscriptions/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' })
      })
      if (response.ok) {
        await loadCandidates()
        setSelectedCandidate(null)
      }
    } catch (error) {
      console.error('Error rejecting subscription:', error)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<SubscriptionCandidate>) => {
    try {
      if (!USE_BACKEND_SUBSCRIPTIONS) {
        const merchantKey = id.startsWith('local-') ? id.slice('local-'.length) : id
        const existing = candidates.find(c => c.id === id)
        const merchant = updates.merchant || existing?.merchant || merchantKey
        const estimatedMonthlyAmount = updates.estimatedMonthlyAmount ?? existing?.estimatedMonthlyAmount ?? 0
        const frequency = (updates.frequency || existing?.frequency || 'monthly') as SubscriptionFrequency
        const status = (existing?.status === 'rejected' ? 'rejected' : 'confirmed') as 'confirmed' | 'rejected'
        await upsertLocalSubscriptionRecord({
          merchant,
          estimatedMonthlyAmount,
          frequency,
          status,
          source: 'detected'
        })
        await loadCandidates()
        setSelectedCandidate(null)
        loadLocalSummary()
        return
      }
      const response = await fetch(`${API_BASE}/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user', ...updates })
      })
      if (response.ok) {
        await loadCandidates()
        setSelectedCandidate(null)
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatConfidence = (score: number) => {
    return `${(score * 100).toFixed(0)}%`
  }

  const handleDetect = async () => {
    try {
      setDetecting(true)
      setDetectionMessage(null)

      if (!USE_BACKEND_SUBSCRIPTIONS) {
        // Local-first: detection is just re-running local analysis; no API call.
        await loadCandidates()
        loadLocalSummary()
        setDetectionMessage('Recomputed subscriptions from local data. Review them below.')
        setTimeout(() => setDetectionMessage(null), 4000)
        return
      }

      // Calculate date range based on selected months
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - detectionMonths)

      const url = `${API_BASE}/api/subscriptions/detect`
      const requestBody = {
        userId: 'demo-user',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        minOccurrences: 2,
        amountVarianceTolerance: 0.05
      }

      console.log('Detecting subscriptions:', url, requestBody)

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Add mode and credentials for CORS
        mode: 'cors',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || 'Unknown error' }
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const detectedCount = data.candidates?.length || 0
      const totalTransactions = data.metadata?.totalTransactions || 0

      console.log('Detection result:', { detectedCount, totalTransactions, candidates: data.candidates })

      if (detectedCount > 0) {
        setDetectionMessage(`Successfully detected ${detectedCount} subscription candidate${detectedCount !== 1 ? 's' : ''}! Review them below.`)
        // Reload candidates to show the newly detected ones
        await loadCandidates()
        // Auto-dismiss success message after 5 seconds
        setTimeout(() => setDetectionMessage(null), 5000)
      } else {
        // Provide more helpful error message
        let message = 'No subscription patterns detected. '
        if (totalTransactions === 0) {
          message += 'No transactions found in the selected date range. Please check your date range and ensure you have expense transactions.'
        } else {
          message += `Found ${totalTransactions} transactions but no recurring patterns. Try: (1) Expanding the date range to include more months, (2) Ensuring transactions have merchant names, (3) Checking if subscriptions are already categorized.`
        }
        setDetectionMessage(message)
      }
    } catch (error: any) {
      console.error('Error detecting subscriptions:', error)
      let errorMsg = error.message || 'Failed to detect subscriptions.'
      
      // Provide helpful error messages
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMsg = `Cannot connect to backend API at ${API_BASE}. Make sure the backend server is running on port 3001.`
      }
      
      setDetectionMessage(`Error: ${errorMsg}`)
    } finally {
      setDetecting(false)
    }
  }

  if (loading) {
    return (
      <section className="view" data-view="subscriptions">
        <div className="page-head">
          <h1>Subscriptions</h1>
          <p className="muted">Loading...</p>
        </div>
      </section>
    )
  }

  const pendingCandidates = candidates.filter(c => c.status === 'pending')
  const confirmedCandidates = candidates.filter(c => c.status === 'confirmed')
  const rejectedCandidates = candidates.filter(c => c.status === 'rejected')

  return (
    <section className="view" data-view="subscriptions" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-head" style={{ width: '100%', maxWidth: '100%', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>Subscriptions</h1>
          <p className="muted">Review and manage your recurring subscriptions</p>
        </div>
        <button 
          className="btn btn-accent" 
          onClick={() => setShowAddForm(true)}
          style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Add Subscription
        </button>
      </div>

      {candidates.length === 0 ? (
        <section className="panel">
          <div className="panel-body">
            <p className="muted">
              No pending subscription candidates yet.
              {!USE_BACKEND_SUBSCRIPTIONS ? ' Import transactions (Connect / Import) and re-run detection to find recurring merchants.' : ' Run detection to find subscriptions from your transaction history.'}
            </p>
            {USE_BACKEND_SUBSCRIPTIONS && (
              <div className="small muted" style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <strong>API Endpoint:</strong> {API_BASE}
                <br />
                Make sure the backend server is running: <code>cd budgetsimple-api && npm run dev</code>
              </div>
            )}
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              {USE_BACKEND_SUBSCRIPTIONS && (
                <div className="row" style={{ gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                  <label className="label" style={{ margin: 0 }}>
                    Analyze last
                  </label>
                  <select
                    id="subscriptionRangeMonths"
                    className="select"
                    value={detectionMonths}
                    onChange={(e) => setDetectionMonths(parseInt(e.target.value))}
                    disabled={detecting}
                    style={{ width: 'auto' }}
                  >
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                    <option value={24}>24 months</option>
                  </select>
                  <label className="label" style={{ margin: 0 }}>
                    of transactions
                  </label>
                </div>
              )}
              <button 
                className="btn btn-accent" 
                onClick={handleDetect}
                disabled={detecting}
              >
                {detecting ? 'Detecting...' : (USE_BACKEND_SUBSCRIPTIONS ? 'Detect Subscriptions' : 'Detect from local data')}
              </button>
            </div>
            {detectionMessage && (
              <div 
                className={detectionMessage.startsWith('Error') ? 'small' : 'small muted'}
                style={{ 
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: detectionMessage.startsWith('Error') ? '#fee' : '#efe',
                  borderRadius: '4px',
                  color: detectionMessage.startsWith('Error') ? '#c33' : '#3c3'
                }}
              >
                {detectionMessage}
                <button
                  className="btn btn-quiet"
                  onClick={() => setDetectionMessage(null)}
                  style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '11px' }}
                >
                  Dismiss
                </button>
              </div>
            )}
            <div className="small muted" style={{ marginTop: '12px' }}>
              <p>Detection analyzes your transactions to find recurring patterns (same merchant, similar amount, regular intervals).</p>
              <p>Requires at least 2 occurrences with consistent amounts (±5% variance allowed).</p>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid" style={{ width: '100%', maxWidth: '100%' }}>
          <section className="panel" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <div className="panel-head" style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="panel-title">Pending Candidates</div>
                <div className="panel-sub">{pendingCandidates.length} pending · {confirmedCandidates.length} confirmed · {rejectedCandidates.length} rejected</div>
              </div>
              <button 
                className="btn btn-quiet" 
                onClick={handleDetect}
                disabled={detecting}
                title="Run detection again to find more subscriptions"
                style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {detecting ? 'Detecting...' : (USE_BACKEND_SUBSCRIPTIONS ? 'Detect Again' : 'Recompute')}
              </button>
            </div>
            <div className="panel-body">
              {detectionMessage && (
                <div 
                  className={detectionMessage.startsWith('Error') ? 'small' : 'small muted'}
                  style={{ 
                    marginBottom: '16px',
                    padding: '8px 12px',
                    backgroundColor: detectionMessage.startsWith('Error') ? '#fee' : '#efe',
                    borderRadius: '4px',
                    color: detectionMessage.startsWith('Error') ? '#c33' : '#3c3'
                  }}
                >
                  {detectionMessage}
                </div>
              )}
              {pendingCandidates.length === 0 ? (
                <p className="muted">No pending candidates. Check Confirmed/Rejected below.</p>
              ) : (
                <div className="table-wrap" style={{ overflowX: 'auto', width: '100%' }}>
                <table className="table" style={{ minWidth: '600px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '150px' }}>Merchant</th>
                      <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Amount</th>
                      <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Frequency</th>
                      <th style={{ minWidth: '90px', whiteSpace: 'nowrap' }}>Confidence</th>
                      <th style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>Occurrences</th>
                      <th style={{ minWidth: '200px', whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCandidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td>
                          <div style={{ fontWeight: '500', wordBreak: 'break-word' }}>{candidate.merchant}</div>
                          {candidate.detectionMethod && (
                            <div className="small muted" style={{ marginTop: '2px' }}>
                              {candidate.detectionMethod === 'category' && '✓ Category match'}
                              {candidate.detectionMethod === 'known_subscription' && '✓ Known service'}
                              {candidate.detectionMethod === 'recurrence' && '✓ Recurring pattern'}
                            </div>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatCurrency(candidate.estimatedMonthlyAmount)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{candidate.frequency}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatConfidence(candidate.confidenceScore)}</td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{candidate.occurrenceCount}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              className="btn btn-sm"
                              onClick={() => handleConfirm(candidate.id)}
                              title="Confirm this subscription"
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-sm btn-quiet"
                              onClick={() => setSelectedCandidate(candidate)}
                              title="Review details"
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              Review
                            </button>
                            <button
                              className="btn btn-sm btn-quiet"
                              onClick={() => handleReject(candidate.id)}
                              title="Reject this candidate"
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </section>

          {(confirmedCandidates.length > 0 || rejectedCandidates.length > 0) && (
            <section className="panel" style={{ width: '100%', maxWidth: '100%' }}>
              <div className="panel-head">
                <div>
                  <div className="panel-title">History</div>
                  <div className="panel-sub">Confirmed and rejected decisions (local-first)</div>
                </div>
              </div>
              <div className="panel-body">
                {confirmedCandidates.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="small muted" style={{ marginBottom: 6 }}>Confirmed</div>
                    <div className="table-wrap">
                      <table className="table">
                        <tbody>
                          {confirmedCandidates.map((c) => (
                            <tr key={c.id}>
                              <td>{c.merchant}</td>
                              <td>{formatCurrency(c.estimatedMonthlyAmount)}</td>
                              <td className="small muted">{c.frequency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {rejectedCandidates.length > 0 && (
                  <div>
                    <div className="small muted" style={{ marginBottom: 6 }}>Rejected</div>
                    <div className="table-wrap">
                      <table className="table">
                        <tbody>
                          {rejectedCandidates.map((c) => (
                            <tr key={c.id}>
                              <td>{c.merchant}</td>
                              <td>{formatCurrency(c.estimatedMonthlyAmount)}</td>
                              <td className="small muted">{c.frequency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {selectedCandidate && (
            <section className="panel" style={{ width: '100%', maxWidth: '100%' }}>
              <div className="panel-head" style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="panel-title">Subscription Details</div>
                  <div className="panel-sub">{selectedCandidate.merchant}</div>
                </div>
                <button 
                  className="btn btn-quiet" 
                  onClick={() => setSelectedCandidate(null)}
                  style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  Close
                </button>
              </div>
              <div className="panel-body">
                <SubscriptionDetail
                  candidate={selectedCandidate}
                  onUpdate={(updates) => handleUpdate(selectedCandidate.id, updates)}
                  onConfirm={() => handleConfirm(selectedCandidate.id)}
                  onReject={() => handleReject(selectedCandidate.id)}
                />
              </div>
            </section>
          )}
        </div>
      )}

      {showAddForm && (
        <AddSubscriptionForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false)
            loadCandidates()
          }}
        />
      )}
    </section>
  )
}

function SubscriptionDetail({
  candidate,
  onUpdate,
  onConfirm,
  onReject
}: {
  candidate: SubscriptionCandidate
  onUpdate: (updates: Partial<SubscriptionCandidate>) => void
  onConfirm: () => void
  onReject: () => void
}) {
  const [merchant, setMerchant] = useState(candidate.merchant)
  const [amount, setAmount] = useState(candidate.estimatedMonthlyAmount)
  const [frequency, setFrequency] = useState(candidate.frequency)

  const handleSave = () => {
    onUpdate({
      merchant,
      estimatedMonthlyAmount: amount,
      frequency
    })
  }

  return (
    <div>
      <div className="form">
        <div className="row">
          <label className="label">Merchant</label>
          <input
            className="input"
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
        </div>
        <div className="row">
          <label className="label">Monthly Amount</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
          />
        </div>
        <div className="row">
          <label className="label">Frequency</label>
          <select
            className="select"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
          >
            <option value="monthly">Monthly</option>
            <option value="bi-weekly">Bi-weekly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <div className="row">
          <div className="small muted">
            Confidence: {(candidate.confidenceScore * 100).toFixed(0)}% | 
            Occurrences: {candidate.occurrenceCount} | 
            First detected: {new Date(candidate.firstDetectedDate).toLocaleDateString()}
          </div>
        </div>
        <div className="row" style={{ gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-accent" onClick={handleSave}>
            Save & Confirm
          </button>
          <button className="btn" onClick={onConfirm}>
            Confirm as-is
          </button>
          <button className="btn btn-quiet" onClick={onReject}>
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

function AddSubscriptionForm({
  onClose,
  onSuccess
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'monthly' | 'bi-weekly' | 'quarterly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const USE_BACKEND_SUBSCRIPTIONS = process.env.NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS === 'true'
      if (!USE_BACKEND_SUBSCRIPTIONS) {
        await upsertLocalSubscriptionRecord({
          merchant,
          estimatedMonthlyAmount: parseFloat(amount),
          frequency: frequency as SubscriptionFrequency,
          status: 'confirmed',
          source: 'manual'
        })
        onSuccess()
        return
      }
      const response = await fetch(`${API_BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          merchant,
          estimatedMonthlyAmount: parseFloat(amount),
          frequency
        })
      })

      if (response.ok) {
        onSuccess()
      } else {
        alert('Error creating subscription')
      }
    } catch (error) {
      console.error('Error creating subscription:', error)
      alert('Error creating subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <section className="panel" style={{ maxWidth: '500px', width: '90%' }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Add Subscription</div>
            <div className="panel-sub">Create a subscription manually</div>
          </div>
          <button className="btn btn-quiet" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="panel-body">
          <form className="form" onSubmit={handleSubmit}>
            <div className="row">
              <label className="label">Merchant</label>
              <input
                className="input"
                type="text"
                required
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g., Netflix"
              />
            </div>
            <div className="row">
              <label className="label">Monthly Amount</label>
              <input
                className="input"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="row">
              <label className="label">Frequency</label>
              <select
                className="select"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
              >
                <option value="monthly">Monthly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className="row" style={{ gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-accent" type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Subscription'}
              </button>
              <button className="btn btn-quiet" type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

