import { expect, test } from '@playwright/test'

test('operator can run the final-only demo, approve, export and access speech control', async ({ page }) => {
  await page.goto('/console')
  await expect(page.getByRole('heading', { name: 'Một cuộc gọi. Một đơn nháp có bằng chứng.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xuất ERP nháp' })).toBeDisabled()

  await page.getByRole('button', { name: 'Chạy demo đơn hàng' }).click()
  await expect(page.getByText('Arabica Premium')).toBeVisible()
  await expect(page.getByText('Tạm thời')).toBeVisible()
  await expect(page.getByText('Đã chốt')).toBeVisible()

  await page.getByRole('button', { name: 'Duyệt đơn nháp' }).click()
  await expect(page.getByRole('button', { name: 'Xuất ERP nháp' })).toBeEnabled()
  await page.getByRole('button', { name: 'Xuất ERP nháp' }).click()
  await expect(page.getByText('ERP-DRAFT-0001')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nói phản hồi' })).toBeVisible()
})

test('Zalo replay waits for an operator click before playing a selected file', async ({ page }) => {
  await page.goto('/console')
  await page.getByRole('tab', { name: /Zalo replay/i }).click()
  await page.getByLabel('Tải tệp Zalo audio hoặc video').setInputFiles({
    name: 'zalo-call.wav',
    mimeType: 'audio/wav',
    buffer: silentWav(3),
  })

  const media = page.getByTestId('zalo-replay-media')
  await expect(media).toBeVisible()
  await expect(media).toHaveJSProperty('paused', true)
  await page.getByRole('button', { name: 'Phát & chuyển transcript' }).click()
  await expect(page.getByRole('button', { name: 'Dừng replay' })).toBeVisible()
  await expect(page.getByText(/Zalo replay đang phát cục bộ/i)).toBeVisible()
})

test('operator must resolve an ambiguous SKU before approving a draft', async ({ page }) => {
  await page.goto('/console')
  await page.getByRole('button', { name: 'Chạy demo ngoại lệ' }).click()
  await expect(page.getByText('SKU_AMBIGUOUS')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Duyệt đơn nháp' })).toBeDisabled()
  await page.getByRole('button', { name: 'Sửa cà phê house' }).click()
  await page.getByLabel('SKU cho cà phê house').selectOption('CF-HOUSE-BLEND')
  await page.getByLabel('Số lượng cho cà phê house').fill('4')
  await page.getByRole('button', { name: 'Lưu chỉnh sửa' }).click()

  await expect(page.getByText('House Blend')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Duyệt đơn nháp' })).toBeEnabled()
})

function silentWav(seconds: number): Buffer {
  const sampleRate = 16000
  const bytesPerSample = 2
  const dataLength = sampleRate * bytesPerSample * seconds
  const wav = Buffer.alloc(44 + dataLength)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + dataLength, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(sampleRate * bytesPerSample, 28)
  wav.writeUInt16LE(bytesPerSample, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(dataLength, 40)
  return wav
}
