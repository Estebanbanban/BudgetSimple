'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  generateProjectionCurves, 
  calculateETA,
  type ProjectionInputs,
  type ProjectionCurve,
  type MilestoneMarker
} from '@/lib/milestone-projection'
import { getMilestones, type Milestone } from '@/lib/milestones-local'
import { formatCurrency, formatDate } from '@/lib/milestones-local'

interface MilestoneGraphProps {
  currentNetWorth: number
  monthlyContribution: number
  annualReturn: number
  onReturnChange?: (returnRate: number) => void
  milestone?: {
    target_value: number
    target_date?: string
  }
}

export default function MilestoneGraph({
  currentNetWorth,
  monthlyContribution,
  annualReturn,
  onReturnChange,
  milestone
}: MilestoneGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [curves, setCurves] = useState<ProjectionCurve[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; data: any } | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [projectionYears, setProjectionYears] = useState<number>(10)
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set(['Base', 'Conservative', 'Aggressive']))

  useEffect(() => {
    loadMilestones()
  }, [])

  useEffect(() => {
    if (typeof currentNetWorth === 'number' && typeof monthlyContribution === 'number') {
      calculateCurves()
    }
  }, [currentNetWorth, monthlyContribution, annualReturn, milestones, projectionYears, milestone]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Redraw graph when window resizes or scenarios change
    const handleResize = () => {
      if (curves.length > 0) {
        // Calculate months to project for markers
        let monthsToProjectForMarkers = projectionYears * 12
        if (projectionYears === 0 && milestone?.target_date) {
          const startDate = new Date()
          const endDate = new Date(milestone.target_date)
          monthsToProjectForMarkers = Math.max(120, Math.ceil(
            (endDate.getFullYear() - startDate.getFullYear()) * 12 +
            (endDate.getMonth() - startDate.getMonth()) + 12
          ))
        }
        drawGraph(curves, monthsToProjectForMarkers, projectionYears)
      }
    }
    window.addEventListener('resize', handleResize)
    // Redraw when scenarios change
    if (curves.length > 0) {
      let monthsToProjectForMarkers = projectionYears * 12
      if (projectionYears === 0 && milestone?.target_date) {
        const startDate = new Date()
        const endDate = new Date(milestone.target_date)
        monthsToProjectForMarkers = Math.max(120, Math.ceil(
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth()) + 12
        ))
      }
      drawGraph(curves, monthsToProjectForMarkers, projectionYears)
    }
    return () => window.removeEventListener('resize', handleResize)
  }, [curves, selectedScenarios, showBreakdown, projectionYears, milestone]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMilestones = async () => {
    try {
      const ms = await getMilestones()
      setMilestones(ms)
    } catch (error) {
      console.error('Error loading milestones:', error)
    }
  }

  const calculateCurves = () => {
    // Ensure we have valid numbers
    const effectiveNetWorth = typeof currentNetWorth === 'number' ? currentNetWorth : 0
    const effectiveContribution = typeof monthlyContribution === 'number' ? monthlyContribution : 0
    
    // Calculate months to project
    let monthsToProject = projectionYears * 12
    if (projectionYears === 0 && milestone?.target_date) {
      // "Until target" mode - project until target date
      const startDate = new Date()
      const endDate = new Date(milestone.target_date)
      monthsToProject = Math.max(120, Math.ceil(
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth()) + 12 // Add buffer
      ))
    }
    
    const inputs: ProjectionInputs = {
      currentNetWorth: effectiveNetWorth,
      monthlyContribution: effectiveContribution,
      annualReturn,
      monthsToProject
    }

    const projectionCurves = generateProjectionCurves(inputs)
    setCurves(projectionCurves)
    if (effectiveNetWorth > 0 || effectiveContribution > 0) {
      drawGraph(projectionCurves, monthsToProject, projectionYears)
    }
  }

  const drawGraph = (projectionCurves: ProjectionCurve[], monthsToProjectForMarkers?: number, projectionYearsForLabel?: number) => {
    if (!svgRef.current || projectionCurves.length === 0 || (currentNetWorth === 0 && monthlyContribution === 0)) return

    const svg = svgRef.current
    const container = svg.parentElement
    const width = container?.clientWidth || svg.clientWidth || 800
    const height = 400
    const padding = { top: 20, right: 40, bottom: 40, left: 60 }

    svg.setAttribute('width', width.toString())
    svg.setAttribute('height', height.toString())

    // Clear previous content
    svg.innerHTML = ''

    // Calculate scales
    const maxNetWorth = Math.max(
      ...projectionCurves.flatMap(c => c.points.map(p => p.netWorth)),
      ...milestones.map(m => m.target_value)
    )
    const maxMonth = Math.max(...projectionCurves[0].points.map(p => p.month))

    const xScale = (month: number) => 
      padding.left + (month / maxMonth) * (width - padding.left - padding.right)
    const yScale = (value: number) => 
      height - padding.bottom - (value / maxNetWorth) * (height - padding.top - padding.bottom)

    // Draw grid lines
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    gridGroup.setAttribute('class', 'grid')
    
    // Horizontal grid lines (net worth)
    for (let i = 0; i <= 5; i++) {
      const value = (maxNetWorth / 5) * i
      const y = yScale(value)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', padding.left.toString())
      line.setAttribute('x2', (width - padding.right).toString())
      line.setAttribute('y1', y.toString())
      line.setAttribute('y2', y.toString())
      line.setAttribute('stroke', '#e5e7eb')
      line.setAttribute('stroke-width', '1')
      gridGroup.appendChild(line)

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', (padding.left - 10).toString())
      text.setAttribute('y', (y + 4).toString())
      text.setAttribute('font-size', '11')
      text.setAttribute('fill', '#6b7280')
      text.setAttribute('text-anchor', 'end')
      text.textContent = formatCurrency(value)
      gridGroup.appendChild(text)
    }

    // Vertical grid lines (months) with year/month labels
    const monthsPerTick = Math.max(1, Math.floor(maxMonth / 10))
    const tickInterval = monthsPerTick < 12 ? monthsPerTick : 12 // Show monthly for <1 year, yearly for longer
    
    for (let i = 0; i <= Math.ceil(maxMonth / tickInterval); i++) {
      const month = i * tickInterval
      if (month > maxMonth) break
      
      const x = xScale(month)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', x.toString())
      line.setAttribute('x2', x.toString())
      line.setAttribute('y1', padding.top.toString())
      line.setAttribute('y2', (height - padding.bottom).toString())
      line.setAttribute('stroke', '#e5e7eb')
      line.setAttribute('stroke-width', '1')
      gridGroup.appendChild(line)

      // Add month/year label
      const startDate = new Date()
      const tickDate = new Date(startDate.getFullYear(), startDate.getMonth() + month, 1)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', x.toString())
      text.setAttribute('y', (height - padding.bottom + 20).toString())
      text.setAttribute('font-size', '11')
      text.setAttribute('fill', '#6b7280')
      text.setAttribute('text-anchor', 'middle')
      
      if (tickInterval >= 12) {
        // Show year
        text.textContent = tickDate.getFullYear().toString()
      } else {
        // Show month/year
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        text.textContent = `${monthNames[tickDate.getMonth()]} ${tickDate.getFullYear()}`
      }
      gridGroup.appendChild(text)
    }

    svg.appendChild(gridGroup)

    // Draw curves (only selected scenarios)
    projectionCurves
      .filter(curve => selectedScenarios.has(curve.label))
      .forEach((curve, idx) => {
      const pathGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      
      // Create path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const pathData = curve.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.month)} ${yScale(p.netWorth)}`)
        .join(' ')
      path.setAttribute('d', pathData)
      path.setAttribute('stroke', curve.color)
      path.setAttribute('stroke-width', curve.label === 'Base' ? '3' : '2')
      path.setAttribute('fill', 'none')
      path.setAttribute('opacity', curve.label === 'Base' ? '1' : '0.6')
      pathGroup.appendChild(path)

      // Add hover areas
      curve.points.forEach((point, i) => {
        if (i % 6 === 0) { // Every 6 months for performance
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          const x = xScale(point.month)
          const y = yScale(point.netWorth)
          circle.setAttribute('cx', x.toString())
          circle.setAttribute('cy', y.toString())
          circle.setAttribute('r', '4')
          circle.setAttribute('fill', curve.color)
          circle.setAttribute('opacity', '0')
          circle.setAttribute('style', 'cursor: pointer')
          circle.addEventListener('mouseenter', () => {
            setHoverPoint({ x, y, data: { ...point, label: curve.label } })
          })
          circle.addEventListener('mouseleave', () => {
            setHoverPoint(null)
          })
          pathGroup.appendChild(circle)
        }
      })

      svg.appendChild(pathGroup)
    })

    // Draw milestone markers (use base scenario)
    const monthsForMarkers = monthsToProjectForMarkers || 120
    milestones.forEach(milestoneItem => {
      const eta = calculateETA({
        currentNetWorth,
        monthlyContribution,
        annualReturn,
        monthsToProject: monthsForMarkers
      }, milestoneItem.target_value)

      if (eta) {
        const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        const x = xScale(eta.month)
        const y = yScale(milestoneItem.target_value)

        // Horizontal line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', padding.left.toString())
        line.setAttribute('x2', x.toString())
        line.setAttribute('y1', y.toString())
        line.setAttribute('y2', y.toString())
        line.setAttribute('stroke', '#f59e0b')
        line.setAttribute('stroke-width', '2')
        line.setAttribute('stroke-dasharray', '4,4')
        markerGroup.appendChild(line)

        // Marker dot
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', x.toString())
        circle.setAttribute('cy', y.toString())
        circle.setAttribute('r', '6')
        circle.setAttribute('fill', '#f59e0b')
        markerGroup.appendChild(circle)

        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', (x + 10).toString())
        text.setAttribute('y', (y - 5).toString())
        text.setAttribute('font-size', '11')
        text.setAttribute('fill', '#92400e')
        text.setAttribute('font-weight', '600')
        text.textContent = milestoneItem.label
        markerGroup.appendChild(text)

        svg.appendChild(markerGroup)
      }
    })

    // Draw "Today" line (subtle gray)
    const todayLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    todayLine.setAttribute('x1', padding.left.toString())
    todayLine.setAttribute('x2', padding.left.toString())
    todayLine.setAttribute('y1', padding.top.toString())
    todayLine.setAttribute('y2', (height - padding.bottom).toString())
    todayLine.setAttribute('stroke', '#cbd5e1') // subtle gray
    todayLine.setAttribute('stroke-width', '1')
    todayLine.setAttribute('stroke-dasharray', '3,3')
    svg.appendChild(todayLine)

    // Label "Today"
    const todayLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    todayLabel.setAttribute('x', (padding.left + 4).toString())
    todayLabel.setAttribute('y', (padding.top + 14).toString())
    todayLabel.setAttribute('font-size', '10')
    todayLabel.setAttribute('fill', '#94a3b8')
    todayLabel.setAttribute('font-weight', '500')
    todayLabel.textContent = 'Today'
    svg.appendChild(todayLabel)

    // Axis labels
    const xAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    xAxisLabel.setAttribute('x', (width / 2).toString())
    xAxisLabel.setAttribute('y', (height - 10).toString())
    xAxisLabel.setAttribute('font-size', '12')
    xAxisLabel.setAttribute('fill', '#6b7280')
    xAxisLabel.setAttribute('text-anchor', 'middle')
    xAxisLabel.textContent = (projectionYearsForLabel || 10) <= 2 ? 'Months from now' : 'Years from now'
    svg.appendChild(xAxisLabel)

    const yAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    yAxisLabel.setAttribute('x', '20')
    yAxisLabel.setAttribute('y', (height / 2).toString())
    yAxisLabel.setAttribute('font-size', '12')
    yAxisLabel.setAttribute('fill', '#6b7280')
    yAxisLabel.setAttribute('text-anchor', 'middle')
    yAxisLabel.setAttribute('transform', `rotate(-90, 20, ${height / 2})`)
    yAxisLabel.textContent = 'Net Worth'
    svg.appendChild(yAxisLabel)
  }

  const hasData = currentNetWorth > 0 || monthlyContribution > 0

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Net Worth Projection</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Based on monthly compounding + contributions</div>
        </div>
        {/* Controls */}
        {hasData && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Scenario Presets */}
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              padding: '4px', 
              background: '#f1f5f9', 
              borderRadius: '6px',
              fontSize: '11px'
            }}>
              {['Conservative', 'Base', 'Aggressive'].map(label => (
                <button
                  key={label}
                  onClick={() => {
                    const newSet = new Set(selectedScenarios)
                    if (newSet.has(label)) {
                      newSet.delete(label)
                      // Don't allow deselecting all
                      if (newSet.size === 0) return
                    } else {
                      newSet.add(label)
                    }
                    setSelectedScenarios(newSet)
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: selectedScenarios.has(label) ? 'white' : 'transparent',
                    color: selectedScenarios.has(label) ? '#1f2933' : '#64748b',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: selectedScenarios.has(label) ? '500' : '400',
                    boxShadow: selectedScenarios.has(label) ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Time Range */}
            <select
              value={projectionYears === 0 ? 'target' : projectionYears.toString()}
              onChange={(e) => {
                if (e.target.value === 'target') {
                  setProjectionYears(0)
                } else {
                  setProjectionYears(parseInt(e.target.value))
                }
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: 'white',
                fontSize: '11px',
                color: '#1f2933',
                cursor: 'pointer'
              }}
            >
              <option value="2">2y</option>
              <option value="5">5y</option>
              <option value="10">10y</option>
              {milestone?.target_date && <option value="target">Until target</option>}
            </select>
            {/* Breakdown Toggle */}
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: showBreakdown ? '#eff6ff' : 'white',
                fontSize: '11px',
                color: '#1f2933',
                cursor: 'pointer'
              }}
              title="Show breakdown"
            >
              Breakdown
            </button>
          </div>
        )}
      </div>
      
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '320px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hasData ? 'transparent' : '#f8fafc',
        borderRadius: '8px',
        border: hasData ? 'none' : '1px dashed #cbd5e1'
      }}>
        {!hasData ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              Set starting net worth + contribution to see projection.
            </div>
          </div>
        ) : (
          <>
            <svg 
              ref={svgRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
              viewBox="0 0 800 400"
              preserveAspectRatio="xMidYMid meet"
            />
            {/* Hover tooltip */}
            {hoverPoint && (
              <div style={{
                position: 'absolute',
                left: hoverPoint.x + 10,
                top: hoverPoint.y - 10,
                background: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
                zIndex: 10,
                pointerEvents: 'none'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{hoverPoint.data.label}</div>
                <div>Date: {formatDate(hoverPoint.data.date)}</div>
                <div>Net Worth: {formatCurrency(hoverPoint.data.netWorth)}</div>
                {showBreakdown && (
                  <>
                    <div>Contributions: {formatCurrency(hoverPoint.data.contributions)}</div>
                    <div>Growth: {formatCurrency(hoverPoint.data.growth)}</div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      {hasData && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {curves
            .filter(curve => selectedScenarios.has(curve.label))
            .map(curve => (
            <div key={curve.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '12px',
                height: '3px',
                background: curve.color,
                borderRadius: '2px'
              }} />
              <span style={{ fontSize: '12px', color: '#64748b' }}>{curve.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tiny Footnote */}
      {hasData && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '10px', 
          color: '#94a3b8', 
          fontStyle: 'italic',
          lineHeight: '1.4'
        }}>
          Projection uses monthly compounding: NW(t+1) = NW(t) × (1+r) + C
        </div>
      )}
    </div>
  )
}

