import { expect, test } from '@playwright/test'

// /console là màn gọi một phía (CallStage + TicketCard) từ khi dựng lại màn
// hình cuộc gọi. Ở chế độ zero-key (không LiveKit) khách chỉ quan sát — dock
// câu mẫu/ô nhập ẩn theo chủ đích, nên e2e chỉ smoke luồng bắt đầu/kết thúc;
// luồng đặt vé xác định đã có unit test ở packages/core và bus-call-workspace.

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
  expect(hydrationErrors).toEqual([])
})

test('bắt đầu rồi kết thúc Web Call, không lộ dock nhập liệu ở zero-key', async ({ page }) => {
  await page.goto('/console')
  await page.getByRole('button', { name: 'Bắt đầu Web Call' }).click()

  await expect(page.getByText('Hãy nói tự nhiên — tổng đài viên đang nghe')).toBeVisible()
  // Dock câu mẫu/ô nhập ẩn theo chủ đích khi không có LiveKit.
  await expect(page.getByRole('button', { name: 'Yêu cầu mẫu' })).toBeHidden()

  await page.getByRole('button', { name: 'Kết thúc' }).click()
  await expect(page.getByText('Cuộc gọi đã kết thúc')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gọi lại từ đầu' })).toBeVisible()
})
