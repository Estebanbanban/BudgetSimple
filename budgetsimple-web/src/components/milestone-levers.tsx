'use client'

import { useState } from 'react'
import { 
  calculateRequiredContribution,
  calculateSensitivity,
  type ProjectionInputs
} from '@/lib/milestone-projection'
import { formatCurrency } from '@/lib/milestones-local'
import { showContributionModal, showDateModal } from '@/lib/plan-assumptions-modal'

interface MilestoneLeversProps {
  currentNetWorth: number
  monthlyContribution: number
  annualReturn: number
  milestone: {
    id: string
    label: string
    target_value: number
    target_date?: string
  }
  onContributionChange?: (amount: number) => void
  onDateChange?: (date: string) => void
}

export default function MilestoneLevers({
  currentNetWorth,
  monthlyContribution,
  annualReturn,
  milestone,
  onContributionChange,
  onDateChange
}: MilestoneLeversProps) {
  const [activeTab, setActiveTab] = useState<'target' | 'optimize'>('target')

  const requiredContribution = milestone.target_date
    ? calculateRequiredContribution(
        currentNetWorth,
        milestone.target_value,
        milestone.target_date,
        annualReturn
      )
    : null

  const gap = requiredContribution && monthlyContribution
    ? Math.max(0, requiredContribution - monthlyContribution)
    : null

  const inputs: ProjectionInputs = {
    currentNetWorth,
    monthlyContribution,
    annualReturn,
    monthsToProject: 120
  }

  const targetValue = milestone.target_value > 0 ? milestone.target_value : 1
  const sensitivityPlus100 = calculateSensitivity(inputs, targetValue, 100)
  const sensitivityMinus100 = calculateSensitivity(inputs, targetValue, -100)
  const sensitivityReturnPlus1 = calculateSensitivity(
    { ...inputs, annualReturn: annualReturn + 0.01 },
    targetValue,
    0
  )

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      height: 'fit-content'
    }}>
      <div style={{ fontSize: '16px', fontWeight: '600' }}>What should I change?</div>
      
      {/* Segmented Control Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '4px',
        padding: '4px',
        background: '#f1f5f9',
        borderRadius: '8px'
      }}>
        <button
          onClick={() => setActiveTab('target')}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'target' ? 'white' : 'transparent',
            color: activeTab === 'target' ? '#1f2933' : '#64748b',
            boxShadow: activeTab === 'target' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
            transition: 'all 0.2s',
            textDecoration: 'none'
          }}
        >
          Hit target date
        </button>
        <button
          onClick={() => setActiveTab('optimize')}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'optimize' ? 'white' : 'transparent',
            color: activeTab === 'optimize' ? '#1f2933' : '#64748b',
            boxShadow: activeTab === 'optimize' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
            transition: 'all 0.2s',
            textDecoration: 'none'
          }}
        >
          Optimize faster
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '200px' }}>
        {activeTab === 'target' && milestone.target_date ? (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>
                Required
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2933', marginBottom: '12px' }}>
                {requiredContribution ? formatCurrency(requiredContribution) : '--'}/mo
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>
                Current
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2933', marginBottom: '8px' }}>
                {formatCurrency(monthlyContribution)}/mo
              </div>
              {gap && gap > 0 && (
                <div style={{ 
                  padding: '8px 12px',
                  background: '#fef2f2',
                  borderRadius: '6px',
                  marginTop: '8px',
                  border: '1px solid #fecaca'
                }}>
                  <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
                    Gap: +{formatCurrency(gap)}/mo
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn"
                onClick={() => {
                  showContributionModal(monthlyContribution, (amount) => {
                    if (onContributionChange) {
                      onContributionChange(amount)
                    }
                  })
                }}
                style={{ 
                  flex: '1 1 auto', 
                  minWidth: '120px',
                  textDecoration: 'none'
                }}
              >
                Set contribution
              </button>
              <button
                className="btn btn-quiet"
                onClick={() => {
                  showDateModal(milestone.target_date || '', (date) => {
                    if (onDateChange) {
                      onDateChange(date)
                    }
                  })
                }}
                style={{ 
                  flex: '1 1 auto', 
                  minWidth: '120px',
                  textDecoration: 'none'
                }}
              >
                Move date
              </button>
            </div>
          </div>
        ) : activeTab === 'target' ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            Set a target date on this milestone to see required contribution.
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#1f2933' }}>
              Sensitivity Analysis
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
              See how small changes impact your timeline
            </div>
            
            {sensitivityPlus100 && sensitivityPlus100.monthsEarlier > 0 ? (
              <div style={{ 
                padding: '12px',
                background: '#f0fdf4',
                borderRadius: '6px',
                marginBottom: '10px',
                border: '1px solid #a7f3d0'
              }}>
                <div style={{ fontSize: '13px', color: '#059669', fontWeight: '600', marginBottom: '4px' }}>
                  +$100/mo contribution
                </div>
                <div style={{ fontSize: '14px', color: '#047857', fontWeight: '700', marginBottom: '2px' }}>
                  → {sensitivityPlus100.monthsEarlier} months earlier
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Save ~{formatCurrency(100 * sensitivityPlus100.monthsEarlier)} over the period
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '10px',
                background: '#f9fafb',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '11px',
                color: '#64748b'
              }}>
                +$100/mo → No significant change
              </div>
            )}

            {sensitivityMinus100 && sensitivityMinus100.monthsEarlier < 0 ? (
              <div style={{ 
                padding: '12px',
                background: '#fef2f2',
                borderRadius: '6px',
                marginBottom: '10px',
                border: '1px solid #fecaca'
              }}>
                <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: '600', marginBottom: '4px' }}>
                  -$100/mo contribution
                </div>
                <div style={{ fontSize: '14px', color: '#b91c1c', fontWeight: '700', marginBottom: '2px' }}>
                  → {Math.abs(sensitivityMinus100.monthsEarlier)} months later
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Delays milestone by ~{Math.abs(sensitivityMinus100.monthsEarlier)} months
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '10px',
                background: '#f9fafb',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '11px',
                color: '#64748b'
              }}>
                -$100/mo → No significant change
              </div>
            )}

            {sensitivityReturnPlus1 && sensitivityReturnPlus1.monthsEarlier !== 0 ? (
              <div style={{ 
                padding: '12px',
                background: '#eff6ff',
                borderRadius: '6px',
                marginBottom: '10px',
                border: '1px solid #bfdbfe'
              }}>
                <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: '600', marginBottom: '4px' }}>
                  +1% annual return
                </div>
                <div style={{ fontSize: '14px', color: '#1d4ed8', fontWeight: '700', marginBottom: '2px' }}>
                  → {Math.abs(sensitivityReturnPlus1.monthsEarlier)} months {sensitivityReturnPlus1.monthsEarlier > 0 ? 'earlier' : 'later'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Better investment returns accelerate growth
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '10px',
                background: '#f9fafb',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '11px',
                color: '#64748b'
              }}>
                +1% return → No significant change
              </div>
            )}

            {/* Additional insights */}
            <div style={{ 
              marginTop: '16px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Quick wins
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
                • Cut $100/mo expenses = same effect as +$100/mo contribution<br/>
                • One-time $5,000 boost ≈ -{Math.round((sensitivityPlus100?.monthsEarlier || 0) * 50 / 100)} months<br/>
                • Consistency matters: steady contributions beat volatile ones
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
