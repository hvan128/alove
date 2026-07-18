import { expect, test } from '@playwright/test'

test('trang chủ hiện nội dung nhà xe và vùng lịch chạy thật', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /AloVé.*Alo là có vé đi/u })).toBeVisible()
  const heroPreview = page.getByTestId('alove-hero-product-preview')
  await expect(heroPreview).toBeVisible()
  await expect(heroPreview.getByText('VALSEA semantic')).toHaveCount(0)
  await expect(heroPreview.getByText(/chuyến mô gần nhất hỉ/u)).toBeVisible()
  await expect(page.getByText('Alove đã hiểu', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Giọng vùng miền: chưa được xác minh', { exact: true })).toBeVisible()
  await expect(page.getByText(/Hiểu giọng vùng miền/u)).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Bảng lịch chạy' })).toBeVisible()
})

test('product tour cho phép xem trực tiếp từng bước đặt vé', async ({ page }) => {
  await page.goto('/')
  const productTour = page.getByTestId('alove-product-tour-stage')
  await productTour.scrollIntoViewIfNeeded()
  const autoplayProgress = page.getByRole('button', { name: 'Bước 1: Nói nhu cầu' }).locator('span').last()
  await expect(autoplayProgress).toBeVisible()
  const progressBeforeHover = await autoplayProgress.evaluate((node) => Number.parseFloat((node as HTMLElement).style.width))
  await productTour.hover()
  await expect.poll(
    () => autoplayProgress.evaluate((node) => Number.parseFloat((node as HTMLElement).style.width)),
    { timeout: 1_500 },
  ).toBeGreaterThan(progressBeforeHover + 4)

  await page.getByRole('button', { name: 'Bước 1: Nói nhu cầu' }).click()
  await expect(productTour.getByText('VALSEA semantic')).toHaveCount(0)
  const tourHeight = (await productTour.boundingBox())?.height

  await page.getByRole('button', { name: 'Bước 2: Alove tìm chuyến' }).click()
  await expect(productTour.getByText('Đang xử lý…').first()).toBeVisible()
  await expect(productTour.getByText('VALSEA semantic').first()).toBeVisible()
  await expect(productTour.getByText('Hiệu chỉnh:', { exact: false }).first()).toBeVisible()
  await expect(productTour.getByText(/chuyến mô gần nhất hỉ/u).first()).toBeVisible()
  await expect(productTour.getByText('quantity', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Bước 4: Nhận vé & mã QR' }).click()
  await expect(productTour.getByText('Vé của bạn', { exact: true }).first()).toBeVisible()
  await expect(productTour.getByText('Mã lên xe', { exact: true }).first()).toBeVisible()
  expect((await productTour.boundingBox())?.height).toBe(tourHeight)
})

test('CTA gọi đưa người dùng vào màn Web Call', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Gọi để đặt xe' }).first().click()
  await expect(page).toHaveURL(/\/console$/)
  await expect(page.getByRole('link', { name: 'Web Call' })).toBeVisible()
})

test.describe('trên điện thoại', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('product tour không đổi chiều cao khi mở vé và mã QR', async ({ page }) => {
    await page.goto('/')
    const productTour = page.getByTestId('alove-product-tour-stage')
    await page.getByRole('button', { name: 'Bước 1: Nói nhu cầu' }).click()
    const tourHeight = (await productTour.boundingBox())?.height

    await page.getByRole('button', { name: 'Bước 4: Nhận vé & mã QR' }).click()
    await expect(productTour.getByText('Vé của bạn', { exact: true })).toBeVisible()
    expect((await productTour.boundingBox())?.height).toBe(tourHeight)
    await expect(page.getByRole('button', { name: 'Phát phần minh hoạ' })).toBeVisible()

    const ticketViewport = productTour.getByRole('region', { name: 'Màn vé và mã QR' })
    await ticketViewport.hover()
    await page.mouse.wheel(0, 500)
    await expect.poll(() => ticketViewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
    await expect(ticketViewport.getByRole('button', { name: 'Lưu vé về máy' })).toBeDisabled()
  })

  test('gọi từ thanh sticky mở màn Web Call', async ({ page }) => {
    await page.goto('/')
    // Thanh gọi xuất hiện sau hero để không che nội dung quan trọng ở màn đầu.
    await page.getByRole('heading', { name: 'Đơn giản đến mức chỉ cần nói' }).scrollIntoViewIfNeeded()
    await page.getByRole('link', { name: 'Gọi để đặt xe' }).last().click()
    await expect(page).toHaveURL(/\/console$/)
    await expect(page.getByRole('link', { name: 'Web Call' })).toBeVisible()
  })
})
