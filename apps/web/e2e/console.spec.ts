import { expect, test } from '@playwright/test'

// /console chỉ có transport LiveKit. Khi backend media chưa cấu hình, UI phải
// fail closed và đưa lối thử lại; tuyệt đối không rơi về preset/Web Speech.

test('console hiện màn gọi với phiếu vé, không lỗi hydration', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat|server rendered text/iu.test(message.text())) hydrationErrors.push(message.text())
  })
  await page.goto('/console')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: 'Nhà xe Mai Anh' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu Web Call' })).toBeEnabled()
  await expect(page.getByText('Đang thu thập')).toBeVisible()
  await expect(page.getByLabel('Độ trễ lượt gần nhất')).toHaveCount(0)
  expect(hydrationErrors).toEqual([])
})

test('không fallback về demo khi LiveKit chưa cấu hình', async ({ page }) => {
  await page.route('**/api/livekit/token', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'livekit_not_configured' }) })
  })
  await page.goto('/console')
  await page.getByRole('button', { name: 'Bắt đầu Web Call' }).click()

  await expect(page.getByText('Đang kết nối tổng đài viên…')).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Dịch vụ cuộc gọi chưa được cấu hình' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yêu cầu mẫu' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Lời khách hàng' })).toHaveCount(0)
  await expect(page.getByLabel('Độ trễ lượt gần nhất')).toHaveCount(0)

  await page.getByRole('button', { name: 'Kết thúc' }).click()
  await expect(page.getByText('Cuộc gọi đã kết thúc')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gọi lại từ đầu' })).toBeVisible()
})
