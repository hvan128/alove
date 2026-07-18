import { expect, test } from '@playwright/test'

const verifiedResponse = {
  verified: true,
  booking: {
    schemaVersion: '1.0',
    status: 'confirmed',
    bookingCode: 'MA-260720-0001',
    origin: 'Hà Nội',
    destination: 'Vinh',
    travelDateLabel: '20/07/2026',
    departureTime: '20:00',
    vehicleType: 'Limousine',
    seatNoun: 'giường',
    pickupPoint: 'Bến xe Nước Ngầm',
    dropoffPoint: 'Bến xe Vinh',
    seats: ['A1'],
    passengerCount: 1,
    totalFareVnd: 300_000,
  },
}

test('xác minh vé chỉ hiện chi tiết sau khi cả mã và điện thoại khớp', async ({ page }) => {
  let submitted: unknown
  await page.route('**/api/booking/verify', async (route) => {
    submitted = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifiedResponse) })
  })
  await page.goto('/verify?code=ma-260720-0001')

  await expect(page.getByRole('textbox', { name: 'Mã vé' })).toHaveValue('MA-260720-0001')
  await expect(page.getByRole('region', { name: 'Thông tin vé đã xác minh' })).toHaveCount(0)
  await expect(page.getByText('Hà Nội → Vinh')).toHaveCount(0)
  await expect(page.getByText('300.000 đ')).toHaveCount(0)

  await page.getByRole('textbox', { name: 'Số điện thoại đặt vé' }).fill('0909123456')
  await page.getByRole('button', { name: 'Xác minh vé' }).click()

  const result = page.getByRole('region', { name: 'Thông tin vé đã xác minh' })
  await expect(result).toBeVisible()
  await expect(result.getByRole('heading', { name: 'Hà Nội → Vinh' })).toBeVisible()
  await expect(result.getByText('Giường')).toBeVisible()
  await expect(result.getByText('300.000 đ')).toBeVisible()
  expect(submitted).toEqual({ code: 'MA-260720-0001', phone: '0909123456' })
})

test('xác minh vé hiển thị lỗi chung mà không rò chi tiết đặt vé', async ({ page }) => {
  await page.route('**/api/booking/verify', (route) => route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ verified: false, error: 'not_found' }),
  }))
  await page.goto('/verify?code=MA-UNKNOWN')
  await page.getByRole('textbox', { name: 'Số điện thoại đặt vé' }).fill('0909123456')
  await page.getByRole('button', { name: 'Xác minh vé' }).click()

  await expect(page.getByRole('alert').filter({ hasText: 'Không thể xác minh vé với thông tin này' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Thông tin vé đã xác minh' })).toHaveCount(0)
  await expect(page.getByText('not_found')).toHaveCount(0)
})

test.describe('xác minh vé trên điện thoại', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('form và kết quả xác minh không tràn ngang', async ({ page }) => {
    await page.route('**/api/booking/verify', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(verifiedResponse),
    }))
    await page.goto('/verify?code=MA-260720-0001')
    await page.getByRole('textbox', { name: 'Số điện thoại đặt vé' }).fill('0909123456')
    await page.getByRole('button', { name: 'Xác minh vé' }).click()

    await expect(page.getByRole('region', { name: 'Thông tin vé đã xác minh' })).toBeVisible()
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth)
  })
})
