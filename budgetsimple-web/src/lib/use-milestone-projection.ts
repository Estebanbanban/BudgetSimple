import { useCallback, useEffect, useState } from 'react'

export type MilestoneStatus = 'ahead' | 'on_track' | 'behind'

export interface ProjectionPoint {
  date: string
  actual?: number
  projected?: number
}

export interface ProjectionMilestone {
  id: string
  label: string
  targetValue: number
  targetDate?: string
  currentValue: number
  progressPercent: number
  etaDate?: string
  status: MilestoneStatus
  statusMessage: string
}

export interface ProjectionResponse {
  timeline: ProjectionPoint[]
  milestones: ProjectionMilestone[]
  nextMilestone?: ProjectionMilestone | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
const PROJECTION_PATH = '/api/projections/milestones'

export function useMilestoneProjection() {
  const [data, setData] = useState<ProjectionResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjection = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}${PROJECTION_PATH}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const json = (await response.json()) as ProjectionResponse
      setData({
        timeline: json.timeline || [],
        milestones: json.milestones || [],
        nextMilestone: json.nextMilestone ?? null
      })
    } catch (err) {
      console.error('Error loading milestone projection:', err)
      setError('Unable to load projection data.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjection()
  }, [loadProjection])

  return {
    data,
    loading,
    error,
    reload: loadProjection
  }
}
