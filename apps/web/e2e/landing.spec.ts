import { expect, test } from '@playwright/test'

test('trang chủ hiện nội dung nhà xe và ba lối vào dành cho ban tổ chức', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /AloVé.*Alo là có vé/u })).toBeVisible()
  const heroPreview = page.getByTestId('alove-hero-product-preview')
  await expect(heroPreview).toBeVisible()
  await expect(heroPreview.getByText('VALSEA semantic')).toHaveCount(0)
  await expect(heroPreview.getByText(/chuyến mô gần nhất hỉ/u)).toBeVisible()
  await expect(page.getByText('Alove đã hiểu', { exact: true })).toHaveCount(0)
  await expect(page.getByText(/chưa được xác minh/u)).toHaveCount(0)
  await expect(page.getByText('Hỗ trợ giọng vùng miền', { exact: true })).toBeVisible()
  await expect(page.getByText('Hiểu thanh điệu và chuyển đổi Việt–Anh', { exact: true })).toBeVisible()
  const callSample = page.getByRole('button', { name: 'Nghe thử cuộc gọi với AI' })
  await expect(callSample).toBeVisible()
  await expect(page.getByRole('link', { name: 'Xem Alove làm gì' })).toHaveCount(0)
  await expect(page.locator('audio[src="/audio/voice_booking.mp3"]')).toHaveCount(1)
  await callSample.click()
  const playingSample = page.getByRole('button', { name: 'Tạm dừng cuộc gọi mẫu với AI' })
  await expect(playingSample).toHaveAttribute('aria-pressed', 'true')
  await playingSample.click()
  await expect(page.getByRole('heading', { name: /Ba góc nhìn/u })).toBeVisible()
  await expect(page.getByRole('link', { name: /Mở Web Call/u })).toHaveAttribute('href', '/console')
  await expect(page.getByRole('link', { name: /Xem bằng chứng/u })).toHaveAttribute('href', '/evidence')
  await expect(page.getByRole('link', { name: /Mở màn vận hành/u })).toHaveAttribute('href', '/dashboard')
  await expect(page.getByText('Lịch đang mở bán')).toHaveCount(0)
})

test('trang những gì đã làm mở từ header landing', async ({ page }) => {
  await page.goto('/')
  const whatWeBuiltEntry = page.getByRole('link', { name: 'What we built' })

  await expect(whatWeBuiltEntry).toBeVisible()
  await expect(whatWeBuiltEntry).toHaveAttribute('href', '/what-we-built')
  await whatWeBuiltEntry.click()
  await expect(page).toHaveURL(/\/what-we-built$/)
  await expect(page.getByRole('heading', { name: 'What we built' })).toBeVisible()
  const whatWeBuilt = page.frameLocator('iframe[title="What we built — hồ sơ sản phẩm Alove"]')
  await expect(whatWeBuilt.getByRole('heading', { name: 'Một cuộc gọi. Một hành trình đặt vé hoàn chỉnh.' })).toBeVisible()
})

test('checklist không lộ trên landing nhưng vẫn hoạt động qua URL trực tiếp', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a[href="/checklist"]')).toHaveCount(0)

  await page.goto('/checklist')
  await expect(page).toHaveURL(/\/checklist$/)
  await expect(page.getByRole('heading', { name: 'Bản đồ tiêu chí & bằng chứng' })).toBeVisible()

  const checklist = page.frameLocator('iframe[title="Bản đồ tiêu chí và bằng chứng VALSEA"]')
  await expect(
    checklist.getByRole('heading', { name: 'Alove đã chứng minh gì trước rubric VALSEA?' }),
  ).toBeVisible()
  await expect(checklist.locator('tbody tr')).toHaveCount(36)
  const evidenceEntry = checklist.getByRole('link', { name: /Mở màn bằng chứng/u })
  await expect(evidenceEntry).toBeVisible()
  await expect(evidenceEntry).toHaveAttribute('href', '/evidence')
  await expect(evidenceEntry).toHaveAttribute('target', '_top')
  await evidenceEntry.click()
  await expect(page).toHaveURL(/\/evidence$/)
  await expect(page.getByRole('heading', { name: 'Bằng chứng nhận dạng giọng nói' })).toBeVisible()
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

test('lối vào chấm thi nằm riêng ở footer và không trỏ thẳng vào dashboard nhà xe', async ({ page }) => {
  await page.goto('/')
  const organizerEntry = page.getByRole('link', { name: 'Khu vực ban tổ chức & giám khảo' })

  await expect(organizerEntry).toBeVisible()
  await expect(organizerEntry).toHaveAttribute('href', '/ban-to-chuc')
  await organizerEntry.click()
  await expect(page).toHaveURL(/\/ban-to-chuc$/)
  await expect(page.getByRole('heading', { name: /Một lối vào riêng cho ban tổ chức và giám khảo/u })).toBeVisible()
  await expect(page.getByRole('link', { name: /Mở màn vận hành/u })).toHaveAttribute('href', '/dashboard')
})

test('footer đầy đủ và mọi mục nội bộ đều trỏ tới một trang thật', async ({ page }) => {
  await page.goto('/')
  const footer = page.locator('footer')
  const links = [
    ['/tinh-nang', 'Tính năng'],
    ['/cach-hoat-dong', 'Cách hoạt động'],
    ['/danh-cho-nha-xe', 'Dành cho nhà xe'],
    ['/ho-tro', 'Trung tâm hỗ trợ'],
    ['/faq', 'Câu hỏi thường gặp'],
    ['/verify', 'Xác minh vé'],
    ['/bao-mat', 'Chính sách bảo mật'],
    ['/dieu-khoan', 'Điều khoản sử dụng'],
  ] as const

  for (const [href, name] of links) {
    await expect(footer.getByRole('link', { name })).toHaveAttribute('href', href)
  }

  await footer.getByRole('link', { name: 'Tính năng' }).click()
  await expect(page).toHaveURL(/\/tinh-nang$/)
  await expect(page.getByRole('heading', { name: 'Một cuộc gọi, từ nhu cầu đến mã vé' })).toBeVisible()
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

    // Khung không cuộn bên trong, nên mọi bước phải nằm lọt: đo ngay trên thẻ
    // overflow-hidden để bắt được phần bị cắt của bất kỳ bước nào.
    const card = productTour.locator('> div')
    for (const step of ['Bước 1: Nói nhu cầu', 'Bước 2: Alove tìm chuyến', 'Bước 3: Giữ ghế & xác nhận', 'Bước 4: Nhận vé & mã QR']) {
      await page.getByRole('button', { name: step }).click()
      await expect.poll(
        () => card.evaluate((node) => node.scrollHeight - node.clientHeight),
        { message: `${step} bị cắt trong khung` },
      ).toBe(0)
    }

    const ticketViewport = productTour.getByRole('region', { name: 'Màn vé và mã QR' })
    await expect(ticketViewport.getByRole('button', { name: 'Lưu vé PNG' })).toBeDisabled()
  })

  test('gọi từ thanh sticky mở màn Web Call', async ({ page }) => {
    await page.goto('/')
    // Thanh gọi xuất hiện sau hero để không che nội dung quan trọng ở màn đầu.
    await page.getByRole('heading', { name: 'Đơn giản đến mức chỉ cần nói' }).scrollIntoViewIfNeeded()
    await page.getByRole('link', { name: 'Gọi để đặt xe' }).last().click()
    await expect(page).toHaveURL(/\/console$/)
    await expect(page.getByRole('link', { name: 'Web Call' })).toBeVisible()
  })

  test('header chỉ hiển thị lối vào what we built', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'What we built' })).toBeVisible()
    await expect(page.locator('a[href="/checklist"]')).toHaveCount(0)
  })
})
