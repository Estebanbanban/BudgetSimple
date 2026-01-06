'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  generateProjectionCurves, 
  type ProjectionInputs,
  type ProjectionCurve
} from '@/lib/milestone-projection'
import { formatCurrency } from '@/lib/milestones-local'

interface NetWorthTrajectoryProps {
  currentNetWorth: number
  monthlyContribution: number
  annualReturn: number
}

export default function NetWorthTrajectory({
  currentNetWorth,
  monthlyContribution,
  annualReturn
}: NetWorthTrajectoryProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [curves, setCurves] = useState<ProjectionCurve[]>([])

  useEffect(() => {
    if (typeof currentNetWorth === 'number' && typeof monthlyContribution === 'number') {
      calculateCurves()
    }
  }, [currentNetWorth, monthlyContribution, annualReturn])

  useEffect(() => {
    if (curves.length > 0) {
      drawGraph(curves)
    }
  }, [curves])

  const calculateCurves = () => {
    const effectiveNetWorth = typeof currentNetWorth === 'number' ? currentNetWorth : 0
    const effectiveContribution = typeof monthlyContribution === 'number' ? monthlyContribution : 0
    
    const inputs: ProjectionInputs = {
      currentNetWorth: effectiveNetWorth,
      monthlyContribution: effectiveContribution,
      annualReturn,
      monthsToProject: 60 // 5 years for dashboard
    }

    const projectionCurves = generateProjectionCurves(inputs)
    setCurves(projectionCurves)
  }

  const drawGraph = (projectionCurves: ProjectionCurve[]) => {
    if (!svgRef.current || projectionCurves.length === 0 || (currentNetWorth === 0 && monthlyContribution === 0)) return

    const svg = svgRef.current
    const container = svg.parentElement
    const width = container?.clientWidth || svg.clientWidth || 800
    const height = 200
    const padding = { top: 10, right: 20, bottom: 30, left: 50 }

    svg.setAttribute('width', width.toString())
    svg.setAttribute('height', height.toString())
    svg.innerHTML = ''

    const maxNetWorth = Math.max(...projectionCurves.flatMap(c => c.points.map(p => p.netWorth)), currentNetWorth)
    const maxMonth = Math.max(...projectionCurves[0].points.map(p => p.month))

    const xScale = (month: number) => 
      padding.left + (month / maxMonth) * (width - padding.left - padding.right)
    const yScale = (value: number) => 
      height - padding.bottom - (value / maxNetWorth) * (height - padding.top - padding.bottom)

    // Draw base curve only (for dashboard preview)
    const baseCurve = projectionCurves.find(c => c.label === 'Base') || projectionCurves[0]
    if (baseCurve) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const pathData = baseCurve.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.month)} ${yScale(p.netWorth)}`)
        .join(' ')
      path.setAttribute('d', pathData)
      path.setAttribute('stroke', '#2563eb')
      path.setAttribute('stroke-width', '2')
      path.setAttribute('fill', 'none')
      svg.appendChild(path)
    }

    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const value = (maxNetWorth / 4) * i
      const y = yScale(value)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', (padding.left - 10).toString())
      text.setAttribute('y', (y + 4).toString())
      text.setAttribute('font-size', '10')
      text.setAttribute('fill', '#6b7280')
      text.setAttribute('text-anchor', 'end')
      text.textContent = formatCurrency(value)
      svg.appendChild(text)
    }

    // X-axis labels (years)
    for (let i = 0; i <= 5; i++) {
      const month = (maxMonth / 5) * i
      const x = xScale(month)
      const startDate = new Date()
      const tickDate = new Date(startDate.getFullYear(), startDate.getMonth() + month, 1)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', x.toString())
      text.setAttribute('y', (height - 10).toString())
      text.setAttribute('font-size', '10')
      text.setAttribute('fill', '#6b7280')
      text.setAttribute('text-anchor', 'middle')
      text.textContent = tickDate.getFullYear().toString()
      svg.appendChild(text)
    }
  }

  if (currentNetWorth === 0 && monthlyContribution === 0) {
    return null // Empty state handled by parent
  }

  return (
    <div style={{ width: '100%', height: '200px' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

