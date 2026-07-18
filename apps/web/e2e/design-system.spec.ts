import { expect, test } from '@playwright/test'

test('design system and health route are available', async ({ page, request }) => {
  await page.goto('/design-system')
  await expect(page.getByRole('heading', { name: 'VéĐi design system' })).toBeVisible()
  await expect(page.getByText('Apple-like rõ ràng và đáng tin', { exact: false })).toBeVisible()

  const health = await request.get('/api/health')
  expect(health.status()).toBe(200)
  await expect(health.json()).resolves.toEqual({ status: 'ok' })
})
