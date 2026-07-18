import { expect, test, type Page } from '@playwright/test'

function capturePageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

test('legacy console redirects to the staff-first workspace', async ({ page }) => {
  const errors = capturePageErrors(page)
  await page.goto('/console')

  await expect(page).toHaveURL(/\/staff$/u)
  await expect(page.getByRole('heading', { name: 'Bàn hỗ trợ đặt vé' })).toBeVisible()
  await expect(page.getByText('Mô phỏng cục bộ')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nhân viên', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('link', { name: 'Mở trang người gọi' })).toBeVisible()
  expect(errors).toEqual([])
})

test('caller finals fill the staff booking and staff confirms explicitly', async ({ context }) => {
  const staff = await context.newPage()
  const caller = await context.newPage()
  const staffErrors = capturePageErrors(staff)
  const callerErrors = capturePageErrors(caller)

  await Promise.all([
    staff.goto('/staff?session=E2E42'),
    caller.goto('/call?session=E2E42'),
  ])
  await caller.getByRole('button', { name: 'Bắt đầu cuộc gọi' }).click()
  await expect(staff.getByText('Người gọi đang trong phiên')).toBeVisible()

  await caller.getByRole('button', { name: 'Gửi câu mẫu hành trình' }).click()
  await expect(staff.getByLabel('Điểm đi')).toHaveValue('Sài Gòn')
  await expect(staff.getByLabel('Điểm đến')).toHaveValue('Đà Lạt')
  await expect(staff.getByLabel('Ngày đi')).toHaveValue('24/07/2026')
  await expect(staff.getByLabel('Giờ đi')).toHaveValue('22:00')
  await expect(staff.getByLabel('Số khách')).toHaveValue('2')

  await caller.getByRole('button', { name: 'Gửi câu mẫu hành khách' }).click()
  await expect(staff.getByLabel('Họ tên')).toHaveValue('Nguyễn Minh Anh')
  await expect(staff.getByLabel('Số điện thoại')).toHaveValue('0909123456')
  await expect(staff.getByLabel('Điểm đón')).toHaveValue('Ngã tư Hàng Xanh')
  await expect(staff.getByLabel('Điểm trả')).toHaveValue('Chợ Đà Lạt')

  const confirm = staff.getByRole('button', { name: 'Xác nhận đặt vé' })
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(staff.getByText(/^VD-240718-\d{4}$/u)).toBeVisible()
  await expect(staff.getByText('Đã xác nhận', { exact: true })).toBeVisible()
  expect(staffErrors).toEqual([])
  expect(callerErrors).toEqual([])
})

test('Auto replies once and returning to Human suppresses new automatic speech', async ({ context }) => {
  const staff = await context.newPage()
  const caller = await context.newPage()
  await Promise.all([
    staff.goto('/staff?session=AUTO42'),
    caller.goto('/call?session=AUTO42'),
  ])
  await caller.getByRole('button', { name: 'Bắt đầu cuộc gọi' }).click()
  await staff.getByRole('button', { name: 'Agent tự động' }).click()
  await caller.getByRole('button', { name: 'Gửi câu mẫu hành trình' }).click()

  await expect(staff.getByTestId('message-agent')).toHaveCount(1)
  await expect(caller.getByText(/họ tên.*số điện thoại/iu)).toBeVisible()

  await staff.getByRole('button', { name: 'Nhân viên', exact: true }).click()
  await caller.getByRole('button', { name: 'Gửi câu mẫu sửa lại' }).click()
  await expect(staff.getByTestId('message-agent')).toHaveCount(1)
  await expect(staff.getByLabel('Điểm đón')).toHaveValue('Bến xe Miền Đông mới')
})
