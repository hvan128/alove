import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { VerifyBooking } from './verify-booking'

const verifiedBooking = {
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
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('VerifyBooking', () => {
  const codeInput = () => screen.getByRole('textbox', { name: /^Mã vé/u })
  const phoneInput = () => screen.getByRole('textbox', { name: /^Số điện thoại đặt vé/u })

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('normalizes the prefilled code and reveals no booking detail before phone verification', () => {
    render(<VerifyBooking initialCode="  ma-260720-0001  " />)

    expect(codeInput()).toHaveValue('MA-260720-0001')
    expect(screen.queryByRole('region', { name: 'Thông tin vé đã xác minh' })).not.toBeInTheDocument()
    expect(screen.queryByText('Hà Nội → Vinh')).not.toBeInTheDocument()
    expect(screen.queryByText('300.000 đ')).not.toBeInTheDocument()
  })

  it('validates both possession factors locally before any request', async () => {
    const user = userEvent.setup()
    render(<VerifyBooking />)

    await user.click(screen.getByRole('button', { name: 'Xác minh vé' }))

    expect(screen.getByText('Nhập mã vé.')).toBeVisible()
    expect(screen.getByText('Nhập số điện thoại Việt Nam hợp lệ.')).toBeVisible()
    expect(codeInput()).toHaveAttribute('aria-invalid', 'true')
    expect(phoneInput()).toHaveAttribute('aria-invalid', 'true')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submits normalized credentials and renders a successful non-PII response', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(response({
      verified: true,
      booking: verifiedBooking,
    }))
    render(<VerifyBooking initialCode="ma-260720-0001" />)

    await user.type(phoneInput(), '0909123456')
    await user.click(screen.getByRole('button', { name: 'Xác minh vé' }))

    const result = await screen.findByRole('region', { name: 'Thông tin vé đã xác minh' })
    expect(within(result).getByText('Đã xác minh')).toBeVisible()
    expect(within(result).getByRole('heading', { name: 'Hà Nội → Vinh' })).toBeVisible()
    expect(within(result).getByText('300.000 đ')).toBeVisible()
    expect(within(result).getByText('Giường')).toBeVisible()
    expect(within(result).queryByText('Nguyễn An')).not.toBeInTheDocument()
    expect(within(result).queryByText('0909123456')).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/booking/verify', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ code: 'MA-260720-0001', phone: '0909123456' }),
    }))
  })

  it('fails closed when a success response contains PII fields', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(response({
      verified: true,
      booking: {
        ...verifiedBooking,
        passengerName: 'Nguyễn An',
        phone: '0909123456',
      },
    }))
    render(<VerifyBooking initialCode="MA-260720-0001" />)

    await user.type(phoneInput(), '0909123456')
    await user.click(screen.getByRole('button', { name: 'Xác minh vé' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối để xác minh. Kiểm tra mạng rồi thử lại.')
    expect(screen.queryByRole('region', { name: 'Thông tin vé đã xác minh' })).not.toBeInTheDocument()
    expect(screen.queryByText('Nguyễn An')).not.toBeInTheDocument()
  })

  it.each([
    [404, 'Không thể xác minh vé với thông tin này.'],
    [429, 'Bạn đã thử quá nhiều lần.'],
    [503, 'Hệ thống xác minh tạm thời chưa sẵn sàng.'],
  ])('renders the safe error copy for HTTP %s', async (status, expectedMessage) => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(response({ error: 'private-server-reason' }, status))
    render(<VerifyBooking initialCode="MA-260720-0001" />)

    await user.type(phoneInput(), '0909123456')
    await user.click(screen.getByRole('button', { name: 'Xác minh vé' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(expectedMessage)
    expect(screen.queryByText('private-server-reason')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Thông tin vé đã xác minh' })).not.toBeInTheDocument()
  })

  it('clears stale success and error output as either credential changes', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ verified: true, booking: verifiedBooking }))
      .mockResolvedValueOnce(response({ verified: false, error: 'not_found' }, 404))
    render(<VerifyBooking initialCode="MA-260720-0001" />)
    const code = codeInput()
    const phone = phoneInput()

    await user.type(phone, '0909123456')
    await user.click(screen.getByRole('button', { name: 'Xác minh vé' }))
    expect(await screen.findByRole('region', { name: 'Thông tin vé đã xác minh' })).toBeVisible()

    await user.type(code, 'X')
    expect(screen.queryByRole('region', { name: 'Thông tin vé đã xác minh' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Xác minh vé' }))
    expect(await screen.findByRole('alert')).toBeVisible()
    await user.type(phone, '7')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
