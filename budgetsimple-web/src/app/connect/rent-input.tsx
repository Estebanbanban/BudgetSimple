'use client'

import { useState } from 'react'

interface RentPeriod {
  id: string
  amount: number
  startDate: string
  endDate?: string
  payDay: number
}

export default function RentInput({ onSave }: { onSave: (periods: RentPeriod[]) => Promise<void> }) {
  const [periods, setPeriods] = useState<RentPeriod[]>([{
    id: `period-${Date.now()}`,
    amount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: undefined,
    payDay: 1
  }])

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1]
    const nextStart = lastPeriod?.endDate 
      ? new Date(new Date(lastPeriod.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    
    setPeriods([...periods, {
      id: `period-${Date.now()}-${Math.random()}`,
      amount: lastPeriod?.amount || 0,
      startDate: nextStart,
      endDate: undefined,
      payDay: lastPeriod?.payDay || 1
    }])
  }

  const removePeriod = (id: string) => {
    if (periods.length > 1) {
      setPeriods(periods.filter(p => p.id !== id))
    }
  }

  const updatePeriod = (id: string, field: keyof RentPeriod, value: any) => {
    setPeriods(periods.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const handleSave = async () => {
    if (periods.length === 0 || periods.some(p => !p.amount || !p.startDate)) {
      alert('Please fill in all required fields for at least one period.')
      return
    }
    await onSave(periods)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {periods.map((period, index) => (
        <div key={period.id} style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          background: '#fafafa'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <strong style={{ fontSize: '14px' }}>Period {index + 1}</strong>
            {periods.length > 1 && (
              <button
                onClick={() => removePeriod(period.id)}
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Remove
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label className="label">Monthly Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={period.amount}
                onChange={(e) => updatePeriod(period.id, 'amount', parseFloat(e.target.value) || 0)}
                className="input"
                placeholder="e.g., 1175"
                required
              />
            </div>
            <div>
              <label className="label">Pay Day (1-28)</label>
              <input
                type="number"
                min="1"
                max="28"
                value={period.payDay}
                onChange={(e) => updatePeriod(period.id, 'payDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
                className="input"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={period.startDate}
                onChange={(e) => updatePeriod(period.id, 'startDate', e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">End Date (optional)</label>
              <input
                type="date"
                value={period.endDate || ''}
                onChange={(e) => updatePeriod(period.id, 'endDate', e.target.value || undefined)}
                className="input"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addPeriod}
        className="btn btn-quiet"
        style={{ width: '100%', textDecoration: 'none' }}
      >
        + Add Another Period
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="btn"
        style={{ textDecoration: 'none' }}
      >
        Save Rent Periods
      </button>
    </div>
  )
}

