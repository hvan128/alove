import { expect, test } from '@playwright/test'

test('trang chủ hiện nội dung nhà xe và vùng lịch chạy thật', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /AloVé.*Alo là có vé đi/u })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Bảng lịch chạy' })).toBeVisible()
})

test('product tour cho phép xem trực tiếp từng bước đặt vé', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bước 2: Alove tìm chuyến' }).click()
  await expect(page.getByTestId('alove-product-tour-stage').getByText('Đang xử lý…').first()).toBeVisible()

  await page.getByRole('button', { name: 'Bước 4: Nhận vé & mã QR' }).click()
  await expect(page.getByTestId('alove-product-tour-stage').getByText('Vé của bạn', { exact: true }).first()).toBeVisible()
})

test('CTA mở LiveKit overlay và fail closed khi dịch vụ chưa cấu hình', async ({ page }) => {
  await page.route('**/api/livekit/token', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'livekit_not_configured' }) })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Gọi để đặt xe' }).first().click()

  const dialog = page.getByRole('dialog', { name: 'Cuộc gọi đặt vé nhà xe Mai Anh' })
  await expect(dialog).toBeVisible()

  await expect(dialog.getByRole('alert')).toContainText('Dịch vụ cuộc gọi chưa được cấu hình')
  await expect(dialog.getByRole('button', { name: 'Thử lại' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Kết thúc' }).first()).toBeVisible()

  await dialog.getByRole('button', { name: 'Kết thúc' }).first().click()
  await expect(dialog).toBeHidden()
  // Đóng xong quay lại trang chủ nguyên trạng, CTA vẫn ở đó.
  await expect(page.getByRole('button', { name: 'Gọi để đặt xe' }).first()).toBeVisible()
})

test.describe('trên điện thoại', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('gọi từ thanh sticky và xem vé bằng thanh peek', async ({ page }) => {
    await page.route('**/api/livekit/token', async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'livekit_not_configured' }) })
    })
    await page.goto('/')
    // Thanh gọi xuất hiện sau hero để không che nội dung quan trọng ở màn đầu.
    await page.getByRole('heading', { name: 'Đơn giản đến mức chỉ cần nói' }).scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: 'Gọi để đặt xe' }).last().click()

    const dialog = page.getByRole('dialog', { name: 'Cuộc gọi đặt vé nhà xe Mai Anh' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('alert')).toContainText('Dịch vụ cuộc gọi chưa được cấu hình')

    // Phiếu vé thu lại thành thanh peek, chạm mới mở — không đè caption.
    const peek = dialog.getByRole('button', { name: /Xem vé/ })
    await expect(peek).toBeVisible()
    await expect(dialog.getByRole('region', { name: 'Vé xe' })).toBeHidden()

    await peek.click()
    await expect(dialog.getByRole('region', { name: 'Vé xe' })).toBeVisible()
  })
})
