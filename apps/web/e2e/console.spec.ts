import { expect, test } from '@playwright/test'

test('VéĐi exposes a two-sided Web Call with human and agent modes', async ({ page }) => {
  await page.goto('/console')

  await expect(page.getByRole('heading', { name: 'VéĐi Web Call' })).toBeVisible()
  await expect(page.getByText('Phía khách hàng')).toBeVisible()
  await expect(page.getByText('Nhân viên chăm sóc')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nhân viên' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agent tự động' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu Web Call' })).toBeEnabled()
})
