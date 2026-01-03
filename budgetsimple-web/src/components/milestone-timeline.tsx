'use client'

import { useMemo } from 'react'
import { formatDate } from '@/lib/milestones-local'
import { useMilestoneProjection } from '@/lib/use-milestone-projection'

function buildPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return ''
  return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
}

export default function MilestoneTimeline() {
  const { data, loading, error, reload } = useMilestoneProjection()

  const chartGeometry = useMemo(() => {
    if (!data?.timeline?.length) return null

    const timeline = data.timeline
    const milestoneTargets = data.milestones.map((m) => m.targetValue)
    const values = timeline.flatMap((point) => [point.projected ?? 0, point.actual ?? 0])
    const maxValue = Math.max(...values, ...(milestoneTargets.length ? milestoneTargets : [0]), 1)

    const dates = timeline.map((p) => new Date(p.date).getTime())
    const minDate = Math.min(...dates)
    const maxDate = Math.max(...dates)
    const dateSpan = Math.max(maxDate - minDate, 1)

    const toX = (date: string) => {
      const offset = new Date(date).getTime() - minDate
      return 8 + (offset / dateSpan) * 84
    }

    const toY = (value: number) => {
      const clamped = Math.max(0, value)
      return 90 - (clamped / maxValue) * 75
    }

    const projectedPoints = timeline.map((point) => ({
      x: toX(point.date),
      y: toY(point.projected ?? point.actual ?? 0)
    }))

    const actualPoints = timeline
      .filter((point) => point.actual !== undefined)
      .map((point) => ({
        x: toX(point.date),
        y: toY(point.actual as number)
      }))

    const milestoneMarkers = data.milestones
      .filter((m) => m.targetDate)
      .map((m) => ({
        x: toX(m.targetDate as string),
        y: toY(m.targetValue),
        label: m.label
      }))

    const startLabel = formatDate(timeline[0].date) || timeline[0].date
    const endLabel = formatDate(timeline[timeline.length - 1].date) || timeline[timeline.length - 1].date

    return {
      projectedPath: buildPath(projectedPoints),
      actualPath: buildPath(actualPoints),
      milestoneMarkers,
      yMax: maxValue,
      rangeLabel: `${startLabel} → ${endLabel}`
    }
  }, [data])

  if (loading) {
    return (
      <div className="chart-empty" data-testid="milestone-timeline">
        Loading projection...
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-empty" data-testid="milestone-timeline">
        <div className="text-warning">Unable to load projection data.</div>
        <button className="btn btn-quiet" type="button" onClick={reload}>
          Retry
        </button>
      </div>
    )
  }

  if (!chartGeometry) {
    return (
      <div className="chart-empty" data-testid="milestone-timeline-empty">
        Add milestones to see the projection timeline.
      </div>
    )
  }

  return (
    <div className="chart-wrap" data-testid="milestone-timeline">
      <svg viewBox="0 0 100 100" role="img" aria-label="Milestone projection timeline" style={{ width: '100%', height: '260px' }}>
        <defs>
          <linearGradient id="projectionGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7ab6ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e6f1ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="6" y="10" width="88" height="80" fill="#f8f9fb" rx="4" />

        {chartGeometry.projectedPath && (
          <>
            <path d={`${chartGeometry.projectedPath} V90 H8 Z`} fill="url(#projectionGradient)" opacity="0.5" />
            <path
              d={chartGeometry.projectedPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}

        {chartGeometry.actualPath && (
          <path
            d={chartGeometry.actualPath}
            fill="none"
            stroke="#111827"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="4 2"
          />
        )}

        {chartGeometry.milestoneMarkers.map((marker) => (
          <g key={`${marker.label}-${marker.x}`}>
            <circle cx={marker.x} cy={marker.y} r={2.5} fill="#f59e0b" />
            <text x={marker.x} y={marker.y - 4} textAnchor="middle" fontSize="2.8" className="muted">
              {marker.label}
            </text>
          </g>
        ))}

        <text x="8" y="97" fontSize="3" className="muted">
          {chartGeometry.rangeLabel}
        </text>
      </svg>
      <div className="panel-note" style={{ marginTop: '0.5rem' }}>
        Projection curve shows expected progress; milestone markers highlight your targets.
      </div>
    </div>
  )
}
