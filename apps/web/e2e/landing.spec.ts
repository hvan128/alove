import { expect, test } from '@playwright/test'

test('trang chủ hiện nội dung nhà xe và lịch chạy từ catalog', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Alo là có vé.' })).toBeVisible()
  // Giá đọc từ createBusDemoCatalog — landing phải khớp con số agent tư vấn.
  await expect(page.getByText('320.000 ₫').first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Bảng lịch chạy' })).toBeVisible()
})

test('CTA Gọi để đặt xe mở overlay cuộc gọi, tự bắt đầu rồi đóng được', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Gọi để đặt xe' }).first().click()

  const dialog = page.getByRole('dialog', { name: 'Cuộc gọi đặt vé nhà xe Mai Anh' })
  await expect(dialog).toBeVisible()

  // Auto-start sau khi morph xong (fallback 800ms): zero-key vào thẳng trạng
  // thái connected nên nút Kết thúc phải xuất hiện mà không cần bấm gì thêm.
  await expect(dialog.getByRole('button', { name: 'Kết thúc' })).toBeVisible({ timeout: 5000 })

  await dialog.getByRole('button', { name: 'Kết thúc' }).click()
  await expect(dialog).toBeHidden()
  // Đóng xong quay lại trang chủ nguyên trạng, CTA vẫn ở đó.
  await expect(page.getByRole('button', { name: 'Gọi để đặt xe' }).first()).toBeVisible()
})

test.describe('trên điện thoại', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('gọi từ thanh sticky và xem vé bằng thanh peek', async ({ page }) => {
    await page.goto('/')
    // Thanh gọi thường trực đáy màn — lối vào chính khi quét QR bằng điện thoại.
    await page.getByRole('button', { name: 'Gọi để đặt xe' }).last().click()

    const dialog = page.getByRole('dialog', { name: 'Cuộc gọi đặt vé nhà xe Mai Anh' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Kết thúc' })).toBeVisible({ timeout: 5000 })

    // Phiếu vé thu lại thành thanh peek, chạm mới mở — không đè caption.
    const peek = dialog.getByRole('button', { name: /Xem vé/ })
    await expect(peek).toBeVisible()
    await expect(dialog.getByRole('region', { name: 'Vé xe' })).toBeHidden()

    await peek.click()
    await expect(dialog.getByRole('region', { name: 'Vé xe' })).toBeVisible()
  })
})
