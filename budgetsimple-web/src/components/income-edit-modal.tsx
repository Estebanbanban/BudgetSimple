'use client'

import { useState, useEffect } from 'react'

interface Income {
  id: string
  dateISO: string
  source: string
  amount: number
  currency?: string
}

interface IncomeEditModalProps {
  income: Income | null
  onSave: (income: Partial<Income>) => Promise<void>
  onClose: () => void
}

export default function IncomeEditModal({ income, onSave, onClose }: IncomeEditModalProps) {
  const [formData, setFormData] = useState({
    dateISO: '',
    source: '',
    amount: '',
    currency: 'USD'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (income) {
      setFormData({
        dateISO: income.dateISO || '',
        source: income.source || '',
        amount: income.amount?.toString() || '',
        currency: income.currency || 'USD'
      })
    }
  }, [income])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!income) return

    setSaving(true)
    try {
      await onSave({
        dateISO: formData.dateISO,
        source: formData.source,
        amount: parseFloat(formData.amount),
        currency: formData.currency
      })
      onClose()
    } catch (error) {
      console.error('Error saving income:', error)
      alert('Failed to save income. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!income) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        className="panel"
        style={{
          width: '90%',
          maxWidth: '500px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <div className="panel-title">Edit Income</div>
          <button className="btn btn-quiet" onClick={onClose}>Close</button>
        </div>
        <div className="panel-body">
          <form onSubmit={handleSubmit} className="form">
            <div className="row">
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={formData.dateISO}
                onChange={(e) => setFormData({ ...formData, dateISO: e.target.value })}
                required
              />
            </div>
            <div className="row">
              <label className="label">Source</label>
              <input
                className="input"
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g., Salary, Freelance, Investment"
                required
              />
            </div>
            <div className="row">
              <label className="label">Amount</label>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  style={{ flex: 1 }}
                />
                <select
                  className="select"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  style={{ width: '120px' }}
                >
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="AUD">AUD</option>
                  <option value="CHF">CHF</option>
                  <option value="CNY">CNY</option>
                  <option value="INR">INR</option>
                  <option value="MXN">MXN</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
            </div>
            <div className="row" style={{ marginTop: '16px' }}>
              <button 
                className="btn btn-accent" 
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                className="btn btn-quiet" 
                type="button"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

