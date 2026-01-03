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
  onReturnChange?: (return: number) => void
}

export default function MilestoneGraph({
  currentNetWorth,
  monthlyContribution,
  annualReturn,
  onReturnChange
}: MilestoneGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [curves, setCurves] = useState<ProjectionCurve[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; data: any } | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    loadMilestones()
  }, [])

  useEffect(() => {
    if (currentNetWorth !== null && monthlyContribution !== null) {
      calculateCurves()
    }
  }, [currentNetWorth, monthlyContribution, annualReturn])

  const loadMilestones = async () => {
    try {
      const ms = await getMilestones()
      setMilestones(ms)
    } catch (error) {
      console.error('Error loading milestones:', error)
    }
  }

  const calculateCurves = () => {
    const inputs: ProjectionInputs = {
      currentNetWorth,
      monthlyContribution,
      annualReturn,
      monthsToProject: 120 // 10 years
    }

    const projectionCurves = generateProjectionCurves(inputs)
    setCurves(projectionCurves)
    drawGraph(projectionCurves)
  }

  const drawGraph = (projectionCurves: ProjectionCurve[]) => {
    if (!svgRef.current || projectionCurves.length === 0) return

    const svg = svgRef.current
    const width = svg.clientWidth || 800
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

    // Vertical grid lines (months)
    for (let i = 0; i <= 10; i++) {
      const month = (maxMonth / 10) * i
      const x = xScale(month)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', x.toString())
      line.setAttribute('x2', x.toString())
      line.setAttribute('y1', padding.top.toString())
      line.setAttribute('y2', (height - padding.bottom).toString())
      line.setAttribute('stroke', '#e5e7eb')
      line.setAttribute('stroke-width', '1')
      gridGroup.appendChild(line)
    }

    svg.appendChild(gridGroup)

    // Draw curves
    projectionCurves.forEach((curve, idx) => {
      const pathGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      
      // Create path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const pathData = curve.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.month)} ${yScale(p.netWorth)}`)
        .join(' ')
      path.setAttribute('d', pathData)
      path.setAttribute('stroke', curve.color)
      path.setAttribute('stroke-width', idx === 0 ? '3' : '2')
      path.setAttribute('fill', 'none')
      path.setAttribute('opacity', idx === 0 ? '1' : '0.6')
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

    // Draw milestone markers
    milestones.forEach(milestone => {
      const eta = calculateETA({
        currentNetWorth,
        monthlyContribution,
        annualReturn,
        monthsToProject: 120
      }, milestone.target_value)

      if (eta) {
        const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        const x = xScale(eta.month)
        const y = yScale(milestone.target_value)

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
        text.textContent = milestone.label
        markerGroup.appendChild(text)

        svg.appendChild(markerGroup)
      }
    })

    // Draw "Today" line
    const todayLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    todayLine.setAttribute('x1', padding.left.toString())
    todayLine.setAttribute('x2', padding.left.toString())
    todayLine.setAttribute('y1', padding.top.toString())
    todayLine.setAttribute('y2', (height - padding.bottom).toString())
    todayLine.setAttribute('stroke', '#dc2626')
    todayLine.setAttribute('stroke-width', '2')
    todayLine.setAttribute('stroke-dasharray', '2,2')
    svg.appendChild(todayLine)

    // Axis labels
    const xAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    xAxisLabel.setAttribute('x', (width / 2).toString())
    xAxisLabel.setAttribute('y', (height - 10).toString())
    xAxisLabel.setAttribute('font-size', '12')
    xAxisLabel.setAttribute('fill', '#6b7280')
    xAxisLabel.setAttribute('text-anchor', 'middle')
    xAxisLabel.textContent = 'Months from now'
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

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Net Worth Projection</div>
          <div className="panel-sub">With compounding and contributions</div>
        </div>
        <div className="panel-actions">
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={showBreakdown}
              onChange={(e) => setShowBreakdown(e.target.checked)}
            />
            <span>Show breakdown</span>
          </label>
        </div>
      </div>
      <div className="panel-body">
        <div style={{ position: 'relative', width: '100%', overflow: 'auto' }}>
          <svg 
            ref={svgRef}
            style={{ width: '100%', minHeight: '400px', display: 'block' }}
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
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
          {curves.map(curve => (
            <div key={curve.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '12px',
                height: '3px',
                background: curve.color,
                borderRadius: '2px'
              }} />
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{curve.label}</span>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
          Projection uses monthly compounding: NW(t+1) = NW(t) × (1+r) + C
        </div>
      </div>
    </div>
  )
}

