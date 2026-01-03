'use client'

import { useState } from 'react'
import { 
  calculateRequiredContribution,
  calculateSensitivity,
  type ProjectionInputs
} from '@/lib/milestone-projection'
import { formatCurrency } from '@/lib/milestones-local'

interface MilestoneLeversProps {
  currentNetWorth: number
  monthlyContribution: number
  annualReturn: number
  milestone: {
    id: string
    label: string
    targetValue: number
    targetDate?: string
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
  const [contributionOverride, setContributionOverride] = useState<number | null>(null)

  const requiredContribution = milestone.target_date
    ? calculateRequiredContribution(
        currentNetWorth,
        milestone.targetValue,
        milestone.targetDate!,
        annualReturn
      )
    : null

  const gap = requiredContribution && monthlyContribution
    ? Math.max(0, requiredContribution - monthlyContribution)
    : null

  const inputs: ProjectionInputs = {
    currentNetWorth,
    monthlyContribution: contributionOverride || monthlyContribution,
    annualReturn,
    monthsToProject: 120
  }

  const sensitivityPlus100 = calculateSensitivity(inputs, milestone.targetValue, 100)
  const sensitivityMinus100 = calculateSensitivity(inputs, milestone.targetValue, -100)
  const sensitivityReturnPlus1 = calculateSensitivity(
    { ...inputs, annualReturn: annualReturn + 0.01 },
    milestone.targetValue,
    0
  )

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">What should I change?</div>
      </div>
      <div className="panel-body">
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            className="btn btn-quiet"
            onClick={() => setActiveTab('target')}
            style={{
              borderBottom: activeTab === 'target' ? '2px solid #3b82f6' : 'none',
              borderRadius: '0',
              paddingBottom: '8px'
            }}
          >
            Hit target date
          </button>
          <button
            className="btn btn-quiet"
            onClick={() => setActiveTab('optimize')}
            style={{
              borderBottom: activeTab === 'optimize' ? '2px solid #3b82f6' : 'none',
              borderRadius: '0',
              paddingBottom: '8px'
            }}
          >
            Optimize faster
          </button>
        </div>

        {activeTab === 'target' && milestone.target_date ? (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Required contribution to hit {milestone.targetDate}
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2933', marginBottom: '8px' }}>
                {requiredContribution ? formatCurrency(requiredContribution) : '--'}/mo
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Your current contribution estimate
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2933', marginBottom: '8px' }}>
                {formatCurrency(monthlyContribution)}/mo
              </div>
              {gap && gap > 0 && (
                <div style={{ 
                  padding: '8px 12px',
                  background: '#fef2f2',
                  borderRadius: '6px',
                  marginTop: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
                    Gap: +{formatCurrency(gap)}/mo needed
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn"
                onClick={() => {
                  const amount = prompt('Enter monthly contribution override:', monthlyContribution.toString())
                  if (amount && onContributionChange) {
                    onContributionChange(parseFloat(amount))
                    setContributionOverride(parseFloat(amount))
                  }
                }}
              >
                Set contribution override
              </button>
              <button
                className="btn btn-quiet"
                onClick={() => {
                  const date = prompt('Enter new target date (YYYY-MM-DD):', milestone.targetDate || '')
                  if (date && onDateChange) {
                    onDateChange(date)
                  }
                }}
              >
                Move target date
              </button>
            </div>
          </div>
        ) : activeTab === 'target' ? (
          <div className="small muted">
            Set a target date on this milestone to see required contribution.
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
                Sensitivity Analysis
              </div>
              
              {sensitivityPlus100.monthsEarlier > 0 && (
                <div style={{ 
                  padding: '10px',
                  background: '#f0fdf4',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
                    +$100/mo contribution
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    → Milestone comes {sensitivityPlus100.monthsEarlier} months earlier
                  </div>
                </div>
              )}

              {sensitivityMinus100.monthsEarlier < 0 && (
                <div style={{ 
                  padding: '10px',
                  background: '#fef2f2',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
                    -$100/mo contribution
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    → Milestone comes {Math.abs(sensitivityMinus100.monthsEarlier)} months later
                  </div>
                </div>
              )}

              {sensitivityReturnPlus1.monthsEarlier !== 0 && (
                <div style={{ 
                  padding: '10px',
                  background: '#eff6ff',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>
                    +1% annual return
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    → ETA shifts by {Math.abs(sensitivityReturnPlus1.monthsEarlier)} months
                  </div>
                </div>
              )}

              <div style={{ 
                marginTop: '12px',
                padding: '10px',
                background: '#f9fafb',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#6b7280'
              }}>
                💡 Tip: Cutting expenses by $100/mo has the same effect as increasing contributions by $100/mo.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

