'use strict'

function calculateMonthlyReturn (annualReturnPercent) {
  const annualReturn = Number(annualReturnPercent) / 100
  return Math.pow(1 + annualReturn, 1 / 12) - 1
}

function calculateProjection ({
  currentNetWorth = 0,
  months = 0,
  annualReturnPercent = 7,
  monthlyContribution = 0,
  startDate = new Date()
}) {
  const projection = []
  const totalMonths = Math.max(0, Math.floor(months))
  const monthlyReturn = calculateMonthlyReturn(annualReturnPercent)
  let projectedNW = Number(currentNetWorth)

  for (let i = 0; i < totalMonths; i++) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)
    projectedNW = projectedNW * (1 + monthlyReturn) + Number(monthlyContribution)
    projection.push({
      date: date.toISOString().split('T')[0],
      netWorth: projectedNW
    })
  }

  return { projection, monthlyReturnPercent: monthlyReturn * 100 }
}

function calculateMilestoneProgressFromInputs ({
  currentNetWorth = 0,
  targetValue = 0,
  targetDate = null,
  annualReturnPercent = 7,
  monthlyContribution = 0,
  projectionHorizonMonths = 360,
  startDate = new Date()
}) {
  const clampedTarget = Number(targetValue)
  const currentValue = Number(currentNetWorth)
  const remaining = Math.max(0, clampedTarget - currentValue)
  const progressPercent = clampedTarget > 0 ? Math.min(100, (currentValue / clampedTarget) * 100) : 0

  const monthlyReturn = calculateMonthlyReturn(annualReturnPercent)
  const horizon = Math.max(0, Math.floor(projectionHorizonMonths))

  let etaMonths = null
  if (progressPercent >= 100) {
    etaMonths = 0
  } else if (monthlyContribution > 0 || monthlyReturn > 0) {
    let months = 0
    let projectedNW = currentValue
    while (projectedNW < clampedTarget && months < horizon) {
      projectedNW = projectedNW * (1 + monthlyReturn) + Number(monthlyContribution)
      months++
    }
    etaMonths = projectedNW >= clampedTarget ? months : null
  }

  let etaDate = null
  if (etaMonths !== null) {
    const eta = new Date(startDate)
    eta.setMonth(eta.getMonth() + etaMonths)
    etaDate = eta.toISOString().split('T')[0]
  }

  let status = 'on_track'
  if (etaMonths === null) {
    status = 'behind'
  } else if (progressPercent >= 100) {
    status = 'ahead'
  } else if (targetDate) {
    const target = new Date(targetDate)
    const eta = new Date(etaDate)
    const diffMonths = (eta.getTime() - target.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (diffMonths < -1) status = 'ahead'
    else if (diffMonths > 1) status = 'behind'
    else status = 'on_track'
  }

  return {
    progressPercent,
    remaining,
    etaMonths,
    etaDate,
    status
  }
}

module.exports = {
  calculateProjection,
  calculateMonthlyReturn,
  calculateMilestoneProgressFromInputs
}
