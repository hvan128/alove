import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { bookingSnapshotSchema, createEmptyBooking } from '@/lib/call-contract'
import { TicketResult } from './ticket-result'

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

vi.mock('html-to-image', () => ({ toPng: vi.fn() }))
vi.mock('react-qr-code', () => ({
  default: ({ value, ...props }: { value: string; 'aria-label'?: string }) => (
    <div data-testid="verification-qr" data-value={value} aria-label={props['aria-label']} />
  ),
}))

function confirmedBooking() {
  return bookingSnapshotSchema.parse({
    ...createEmptyBooking('call-ticket'),
    status: 'confirmed',
    origin: 'Hà Nội',
    destination: 'Vinh',
    travelDateLabel: '20/07/2026',
    passengerCount: 1,
    selectedTrip: {
      id: 'trip-1',
      origin: 'Hà Nội',
      destination: 'Vinh',
      departureTime: '20:00',
      arrivalTime: '01:30',
      vehicleType: 'Limousine',
      priceVnd: 300_000,
      pickupPoint: 'Bến xe Nước Ngầm',
      dropoffPoint: 'Bến xe Vinh',
      seatNoun: 'ghế',
    },
    seats: ['A1'],
    passengerName: 'Nguyễn An',
    phone: '0909123456',
    totalFareVnd: 300_000,
    bookingCode: 'MA-260720-0001',
  })
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Blob read failed')))
    reader.readAsText(blob)
  })
}

describe('TicketResult machine-readable outputs', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:booking-json'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL,
    })
  })

  it('encodes an absolute public /verify URL containing only the booking code', async () => {
    render(<TicketResult
      booking={confirmedBooking()}
      onNewCall={vi.fn()}
      onClose={vi.fn()}
    />)

    const qr = await screen.findByTestId('verification-qr')
    const value = qr.getAttribute('data-value')
    expect(value).toBe(new URL('/verify?code=MA-260720-0001', window.location.origin).toString())
    expect(value).not.toContain('0909123456')
    expect(value).not.toContain('Nguy%E1%BB%85n')
  })

  it('downloads versioned JSON that directly satisfies bookingSnapshotSchema', async () => {
    const user = userEvent.setup()
    render(<TicketResult
      booking={confirmedBooking()}
      onNewCall={vi.fn()}
      onClose={vi.fn()}
    />)

    await user.click(screen.getByRole('button', { name: 'Tải dữ liệu JSON' }))
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1))
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob
    const decoded: unknown = JSON.parse(await readBlobText(blob))
    const exported = bookingSnapshotSchema.parse(decoded)

    expect(exported.schemaVersion).toBe('1.0')
    expect(exported.bookingCode).toBe('MA-260720-0001')
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:booking-json'))
  })

  it('uses the explicit PNG save label in the landing preview', () => {
    render(<TicketResult
      booking={confirmedBooking()}
      onNewCall={vi.fn()}
      onClose={vi.fn()}
      interactive={false}
    />)

    expect(screen.getByRole('button', { name: 'Lưu vé PNG' })).toBeDisabled()
  })
})
