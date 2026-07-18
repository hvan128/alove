import { expect, test } from '@playwright/test'

test('operator publishes catalog and staff consumes seat hold', async ({ page, context }) => {
  test.setTimeout(60_000)
  await page.goto('/operations')
  await expect(page.getByRole('heading', { name: /chào buổi sáng/iu })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nhận cuộc gọi DEMO42' })).toBeVisible()

  await page.goto('/admin/catalog')
  const validateResponse = page.waitForResponse((response) => response.url().endsWith('/api/catalog/versions/demo-catalog-v1/validate') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Validate' }).click()
  expect((await validateResponse).ok()).toBe(true)
  await expect(page.getByText('Validated', { exact: true }).first()).toBeVisible()
  const publishResponse = page.waitForResponse((response) => response.url().endsWith('/api/catalog/versions/demo-catalog-v1/publish') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Publish' }).click()
  await page.getByRole('button', { name: 'Xác nhận publish' }).click()
  expect((await publishResponse).ok()).toBe(true)
  await expect(page.getByText('Published', { exact: true }).first()).toBeVisible()

  const staff = await context.newPage()
  const caller = await context.newPage()
  await Promise.all([
    staff.goto('/staff?session=OPS42'),
    caller.goto('/call?session=OPS42'),
  ])
  await caller.getByRole('button', { name: 'Bắt đầu cuộc gọi' }).click()
  await caller.getByRole('button', { name: 'Gửi câu mẫu hành trình' }).click()
  await caller.getByRole('button', { name: 'Gửi câu mẫu hành khách' }).click()
  await expect(staff.getByLabel('Số khách')).toHaveValue('2')
  await staff.getByRole('button', { name: 'Ghế A05 · Còn trống' }).click()
  await staff.getByRole('button', { name: 'Ghế A06 · Còn trống' }).click()
  await expect(staff.getByText(/giữ đến/iu)).toBeVisible()
  const confirm = staff.getByRole('button', { name: 'Xác nhận đặt vé' })
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(staff.getByText('Đã xác nhận', { exact: true })).toBeVisible()
})

test('operator layouts stay contained and the vehicle grid works by keyboard', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/operations')
    await expect(page.getByRole('heading', { name: /chào buổi sáng/iu })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole('link', { name: 'Tổng quan' })).toBeVisible()
  }

  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/admin/vehicles')
  const firstCell = page.getByRole('gridcell').first()
  await firstCell.focus()
  await firstCell.press('Enter')
  await expect(page.getByLabel('Mã ghế')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
