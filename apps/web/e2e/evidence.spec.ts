import { expect, test } from '@playwright/test'

test('evidence hiển thị artifact tổng hợp và kết quả engine đã xác thực', async ({ page }) => {
  await page.goto('/evidence')

  await expect(page.getByRole('heading', { name: 'Bằng chứng nhận dạng giọng nói', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bằng chứng' })).toHaveAttribute('href', '/evidence')
  await expect(page.getByText('Đánh giá hoàn tất', { exact: true })).toBeVisible()
  await expect(page.getByTestId('evidence-fixture')).toHaveCount(3)
  await expect(page.getByText('Tổng hợp · Không PII', { exact: true })).toHaveCount(3)
  await expect(page.locator('audio[controls]')).toHaveCount(3)
  await expect(page.getByRole('table')).toHaveCount(3)
  await expect(page.getByRole('rowheader', { name: /VALSEA/u })).toHaveCount(3)
  await expect(page.getByRole('rowheader', { name: /Whisper/u })).toHaveCount(3)
  await expect(page.getByTestId('diff-valsea')).toHaveCount(3)
  await expect(page.getByTestId('diff-whisper')).toHaveCount(3)
  await expect(page.getByText('không chứng minh giọng vùng miền', { exact: true })).toBeVisible()

  // Đây là evidence đọc từ artifact, không phải một upload/proxy provider.
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /tải lên|chạy đánh giá|transcribe/iu })).toHaveCount(0)
})
