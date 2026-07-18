import { expect, test } from '@playwright/test'

test('Alove exposes a two-sided Web Call with human and agent modes', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat|server rendered text/iu.test(message.text())) hydrationErrors.push(message.text())
  })
  await page.addInitScript(() => {
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: class BrowserSpeechRecognition {},
    })
  })
  await page.goto('/console')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: 'Nhà xe Mai Anh' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof window.webkitSpeechRecognition)).toBe('function')
  await expect(page.getByText('Phía khách hàng')).toBeVisible()
  await expect(page.getByText('Nhân viên chăm sóc')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nhân viên' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agent tự động' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu Web Call' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Open issues overlay' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Recoverable Error' })).toHaveCount(0)
  expect(hydrationErrors).toEqual([])
})

test('auto agent books two seats and confirms once', async ({ page }) => {
  await page.goto('/console')
  await page.getByRole('button', { name: 'Agent tự động' }).click()
  await page.getByRole('button', { name: 'Bắt đầu Web Call' }).click()

  await page.getByRole('button', { name: 'Gửi yêu cầu mẫu' }).click()
  await expect(page.getByTestId('message-agent').filter({ hasText: /chuyến giường nằm 34 chỗ 22:00/i })).toBeVisible()

  await page.getByRole('button', { name: 'Chọn chuyến 22:00' }).click()
  await page.getByRole('button', { name: 'Gửi thông tin hành khách' }).click()
  await expect(page.getByText('Chờ xác nhận')).toBeVisible()

  await page.getByRole('button', { name: 'Xác nhận đặt vé' }).click()
  await expect(page.getByText('Đã giữ vé')).toBeVisible()
  await expect(page.getByText('A05, A06', { exact: true })).toBeVisible()
  await expect(page.getByText(/^VD-240718-\d{4}$/u)).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Xác nhận đặt vé' })).toBeDisabled()
})

test('human staff replies without an automatic agent and confirms manually', async ({ page }) => {
  await page.goto('/console')
  await page.getByRole('button', { name: 'Nhân viên' }).click()
  await page.getByRole('button', { name: 'Bắt đầu Web Call' }).click()
  await page.getByRole('button', { name: 'Gửi yêu cầu mẫu' }).click()

  await expect(page.getByTestId('message-agent')).toHaveCount(0)
  await page.getByLabel('Phản hồi của nhân viên').fill('Dạ em kiểm tra chuyến phù hợp ngay ạ.')
  await page.getByRole('button', { name: 'Gửi & nói' }).click()
  await expect(page.getByTestId('message-staff').filter({ hasText: 'Dạ em kiểm tra chuyến phù hợp ngay ạ.' })).toBeVisible()

  await page.getByRole('button', { name: 'Chọn chuyến 22:00' }).click()
  await page.getByRole('button', { name: 'Gửi thông tin hành khách' }).click()
  await expect(page.getByRole('button', { name: 'Xác nhận thủ công' })).toBeEnabled()
  await page.getByRole('button', { name: 'Xác nhận thủ công' }).click()

  await expect(page.getByText('Đã giữ vé')).toBeVisible()
  await expect(page.getByText(/^VD-240718-\d{4}$/u)).toHaveCount(1)
  await expect(page.getByTestId('message-agent')).toHaveCount(0)
})
