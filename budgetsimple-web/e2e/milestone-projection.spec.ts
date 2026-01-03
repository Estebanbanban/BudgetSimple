import { test, expect } from '@playwright/test'

const projectionEndpoint = '**/api/projections/milestones'

test.describe('Milestone projection surfaces', () => {
  test('shows empty states when no milestones exist', async ({ page }) => {
    await page.route(projectionEndpoint, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ timeline: [], milestones: [], nextMilestone: null })
      })
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('next-milestone-empty')).toBeVisible()
    await expect(page.getByTestId('milestone-timeline-empty')).toBeVisible()
  })

  test('renders projection data with timeline and next milestone details', async ({ page }) => {
    await page.route(projectionEndpoint, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          timeline: [
            { date: '2024-01-01', actual: 12000, projected: 12000 },
            { date: '2024-06-01', projected: 18000 },
            { date: '2025-01-01', projected: 26000 }
          ],
          milestones: [
            {
              id: 'm1',
              label: 'Emergency fund',
              targetValue: 30000,
              targetDate: '2025-01-01',
              currentValue: 18000,
              progressPercent: 60,
              etaDate: '2025-02-01',
              status: 'on_track',
              statusMessage: 'Contribute $800/mo to stay on track'
            }
          ],
          nextMilestone: {
            id: 'm1',
            label: 'Emergency fund',
            targetValue: 30000,
            targetDate: '2025-01-01',
            currentValue: 18000,
            progressPercent: 60,
            etaDate: '2025-02-01',
            status: 'on_track',
            statusMessage: 'Contribute $800/mo to stay on track'
          }
        })
      })
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('next-milestone-widget')).toContainText('Emergency fund')
    await expect(page.getByTestId('next-milestone-widget')).toContainText('On track')
    await expect(page.getByTestId('next-milestone-widget')).toContainText('60.0%')
    await expect(page.getByTestId('milestone-timeline')).toBeVisible()
  })

  test('surfaces projection error state', async ({ page }) => {
    await page.route(projectionEndpoint, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'server error' })
      })
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('next-milestone-error')).toBeVisible()
    await expect(page.getByTestId('milestone-timeline')).toContainText('Unable to load projection data')
  })
})
