import { expect, test } from '@playwright/test'

test('operator publishes catalog and staff consumes seat hold', async ({ page, context }) => {
  test.setTimeout(60_000)
  await page.goto('/operations')
  await expect(page.getByRole('heading', { name: /chào buổi sáng/iu })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nhận cuộc gọi DEMO42' })).toBeVisible()

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

test('dispatcher claims a call, delegates the Agent and takes authority back with a reason', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/operations')

  // Claiming is a server-confirmed command, not a link, so two dispatchers
  // cannot both believe they own the same session.
  const accept = page.waitForResponse((response) =>
    response.url().includes('/api/operations/calls/LIVE18/accept') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Nhận cuộc gọi LIVE18' }).click()
  expect((await accept).ok()).toBe(true)

  await page.goto('/operations')
  const call = page.getByRole('listitem', { name: /LIVE18/u })
  await expect(call.getByText(/demo-admin/u)).toBeVisible()
  await expect(call.getByText('Nhân viên trả lời')).toBeVisible()

  const delegate = page.waitForResponse((response) =>
    response.url().includes('/api/operations/calls/LIVE18/delegate') && response.request().method() === 'POST')
  await call.getByRole('button', { name: 'Trao quyền Agent cho LIVE18' }).click()
  expect((await delegate).ok()).toBe(true)

  await page.goto('/operations')
  const delegated = page.getByRole('listitem', { name: /LIVE18/u })
  await expect(delegated.getByText('Agent tự động')).toBeVisible()

  await delegated.getByLabel('Lý do thu quyền LIVE18').fill('Agent hiểu sai điểm đón')
  const takeover = page.waitForResponse((response) =>
    response.url().includes('/api/operations/calls/LIVE18/takeover') && response.request().method() === 'POST')
  await delegated.getByRole('button', { name: 'Thu quyền về nhân viên cho LIVE18' }).click()
  expect((await takeover).ok()).toBe(true)

  await page.goto('/operations')
  await expect(page.getByRole('listitem', { name: /LIVE18/u }).getByText(/Agent hiểu sai điểm đón/u)).toBeVisible()

  // The audit trail is the cross-session record F-12 asks the dashboard to show.
  const trail = page.getByRole('region', { name: /nhật ký/iu })
  await expect(trail.getByText('Thu quyền về nhân viên')).toBeVisible()
  await expect(trail.getByText(/Lý do: Agent hiểu sai điểm đón/u)).toBeVisible()
})

// Uses CALL28 rather than a session the search test relies on: the demo
// ownership store is process-wide, so an accept here persists for later tests.
test('a claimed call leaves the queue so nobody accepts it twice', async ({ page }) => {
  await page.goto('/operations')
  const queue = page.getByRole('region', { name: /hàng chờ/iu })
  await expect(queue.getByText('CALL28')).toBeVisible()

  const accept = page.waitForResponse((response) =>
    response.url().includes('/api/operations/calls/CALL28/accept') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Nhận cuộc gọi CALL28' }).click()
  expect((await accept).ok()).toBe(true)

  await page.goto('/operations')
  await expect(page.getByRole('region', { name: /hàng chờ/iu }).getByText('CALL28')).toHaveCount(0)
})

test('search narrows the queue and keeps the shift metrics intact', async ({ page }) => {
  await page.goto('/operations')
  await page.getByRole('searchbox', { name: /tìm/iu }).fill('nha trang')
  await page.getByRole('button', { name: 'Tìm', exact: true }).click()

  await expect(page).toHaveURL(/q=nha\+trang/u)
  const queue = page.getByRole('region', { name: /hàng chờ/iu })
  await expect(queue.getByText('TRIP91')).toBeVisible()
  await expect(queue.getByText('DEMO42')).toHaveCount(0)
})
