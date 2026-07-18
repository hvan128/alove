import type { RoomEvent } from '@ordervoice/contracts'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoCallChannel } from '@/lib/call/demo-channel'
import { StaffWorkspace } from './staff-workspace'

const localStatus = {
  transport: 'local' as const,
  livekit: false,
  valsea: false,
  voiceAgent: false,
  persistence: false,
  operatorDemo: false,
  localFallback: true as const,
}

function renderStaff(sessionCode: string) {
  const channel = new DemoCallChannel(sessionCode, { forceMemory: true, storage: null })
  render(
    <StaffWorkspace
      sessionCode={sessionCode}
      integrationStatus={localStatus}
      transportFactory={(code) => new DemoCallChannel(code, { forceMemory: true, storage: null })}
    />,
  )
  return channel
}

function publishFinal(channel: DemoCallChannel, sessionCode: string, text: string, options: {
  eventId?: string
  translations?: { vi?: string; en?: string }
} = {}) {
  const event: RoomEvent = {
    version: 1,
    eventId: options.eventId ?? `event-${sessionCode}-001`,
    sessionCode,
    occurredAt: '2026-07-18T04:00:00.000Z',
    type: 'transcript.final',
    message: {
      id: `message-${options.eventId ?? `${sessionCode}-001`}`,
      role: 'caller',
      text,
      language: 'vi',
      translations: options.translations ?? {},
      confidence: 0.97,
      startedAtMs: 0,
      endedAtMs: 1_200,
      channel: 'voice',
    },
  }
  act(() => channel.publish(event))
}

afterEach(() => vi.unstubAllGlobals())

describe('staff live booking cockpit', () => {
  it('shows an honest local simulation state, session link, and human mode', () => {
    const channel = renderStaff('STAFF1')

    expect(screen.getByRole('heading', { name: 'Bàn hỗ trợ đặt vé' })).toBeVisible()
    expect(screen.getByText('STAFF1')).toBeVisible()
    expect(screen.getByText('Mô phỏng cục bộ')).toBeVisible()
    expect(screen.getByText('Chưa dùng VALSEA')).toBeVisible()
    expect(screen.getByText('Agent chưa cấu hình')).toBeVisible()
    expect(screen.getByText('Mô phỏng chỉ đồng bộ giữa các tab cùng trình duyệt. Hai thiết bị cần LiveKit.')).not.toHaveClass('fixed')
    expect(screen.getByRole('button', { name: 'Nhân viên' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: /mở trang người gọi/iu })).toHaveAttribute('href', '/call?session=STAFF1')
    channel.close()
  })

  it('renders partial text without filling fields, then commits final evidence and suggestion', () => {
    const channel = renderStaff('STAFF2')
    act(() => channel.publish({
      version: 1,
      eventId: 'partial-STAFF2',
      sessionCode: 'STAFF2',
      occurredAt: '2026-07-18T04:00:00.000Z',
      type: 'transcript.partial',
      message: {
        id: 'message-live-STAFF2',
        role: 'caller',
        text: 'Tôi cần hai vé đi từ Sài Gòn',
        language: 'vi',
        translations: {},
        confidence: null,
        startedAtMs: 0,
        endedAtMs: 400,
        channel: 'voice',
      },
    }))

    expect(screen.getByText('Tôi cần hai vé đi từ Sài Gòn')).toBeVisible()
    expect(screen.getByText('Đang nhận')).toBeVisible()
    expect(screen.getByLabelText('Điểm đi')).toHaveValue('')

    publishFinal(channel, 'STAFF2', 'Đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ.')

    expect(screen.queryByText('Đang nhận')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Điểm đi')).toHaveValue('Sài Gòn')
    expect(screen.getByLabelText('Điểm đến')).toHaveValue('Đà Lạt')
    expect(screen.getByLabelText('Số khách')).toHaveValue(2)
    expect(screen.getByText('“từ Sài Gòn”')).toBeVisible()
    expect(screen.getByText(/họ tên.*số điện thoại/iu)).toBeVisible()
    channel.close()
  })

  it('switches transcript display language while preserving original field evidence', async () => {
    const user = userEvent.setup()
    const channel = renderStaff('STAFF3')
    publishFinal(channel, 'STAFF3', 'Tôi đi từ Sài Gòn đến Đà Lạt.', {
      translations: { en: 'I am travelling from Saigon to Da Lat.' },
    })

    await user.selectOptions(screen.getByLabelText('Ngôn ngữ transcript'), 'en')

    expect(screen.getByText('I am travelling from Saigon to Da Lat.')).toBeVisible()
    expect(screen.getByText('“từ Sài Gòn”')).toBeVisible()
    channel.close()
  })

  it('never answers in Human mode and creates one local Agent answer in Auto mode', async () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak })
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = ''
      constructor(public text: string) {}
    })
    const user = userEvent.setup()
    const channel = renderStaff('STAFF4')

    publishFinal(channel, 'STAFF4', 'Tôi muốn đi Đà Lạt.', { eventId: 'human-001' })
    expect(speak).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Agent tự động' }))
    publishFinal(channel, 'STAFF4', 'Tôi đi từ Sài Gòn và cần 2 vé ngày 24/07.', { eventId: 'auto-001' })

    expect(speak).not.toHaveBeenCalled()
    expect(screen.getByTestId('message-agent')).toBeVisible()
    channel.close()
  })

  it('lets staff edit and lock a field before later caller repetition', async () => {
    const user = userEvent.setup()
    const channel = renderStaff('STAFF5')
    publishFinal(channel, 'STAFF5', 'Tôi đi từ Sài Gòn đến Đà Lạt.', { eventId: 'first-001' })

    const origin = screen.getByLabelText('Điểm đi')
    await user.clear(origin)
    await user.type(origin, 'Biên Hòa')
    await user.tab()
    publishFinal(channel, 'STAFF5', 'Tôi đi từ Sài Gòn đến Đà Lạt.', { eventId: 'repeat-001' })

    expect(screen.getByLabelText('Điểm đi')).toHaveValue('Biên Hòa')
    const field = screen.getByTestId('booking-field-origin')
    expect(within(field).getByText('Nhân viên đã khóa')).toBeVisible()
    channel.close()
  })

  it('opens the confirmation gate only after every required field is complete', async () => {
    const user = userEvent.setup()
    const channel = renderStaff('STAFF6')
    const confirm = screen.getByRole('button', { name: 'Xác nhận đặt vé' })
    expect(confirm).toBeDisabled()

    publishFinal(
      channel,
      'STAFF6',
      'Tôi tên Nguyễn Minh Anh, số 0909 123 456, đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ, đón ở Ngã tư Hàng Xanh, trả tại Chợ Đà Lạt.',
    )
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    expect(screen.getByText(/^VD-240718-\d{4}$/u)).toBeVisible()
    expect(screen.getByText('Đã xác nhận')).toBeVisible()
    channel.close()
  })

  it('requires an active seat hold before durable confirmation', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/api/trips/SG-DL-2200/inventory')) {
        return Response.json({
          revision: 0,
          seats: [
            { tripId: 'SG-DL-2200', seatCode: 'A05', state: 'available', revision: 0, activeHoldId: null, bookingId: null },
            { tripId: 'SG-DL-2200', seatCode: 'A06', state: 'available', revision: 0, activeHoldId: null, bookingId: null },
          ],
        })
      }
      if (url === '/api/seat-holds' && init?.method === 'POST') {
        return Response.json({ hold: {
          id: 'hold-durable', sessionCode: 'STAFF7', bookingDraftId: 'booking-STAFF7', tripId: 'SG-DL-2200',
          seatCodes: ['A05', 'A06'], actorId: 'staff-1', status: 'active',
          createdAt: '2026-07-18T10:00:00.000Z', expiresAt: '2026-07-18T23:00:00.000Z', maxExpiresAt: '2026-07-18T23:30:00.000Z', releasedAt: null, consumedAt: null,
        } }, { status: 201 })
      }
      if (init?.method === 'GET' || !init?.method) return Response.json({ events: [] })
      return Response.json({ ok: true })
    })
    vi.stubGlobal('fetch', fetchMock)
    const channel = new DemoCallChannel('STAFF7', { forceMemory: true, storage: null })
    render(<StaffWorkspace sessionCode="STAFF7" integrationStatus={{ ...localStatus, persistence: true }} transportFactory={(code) => new DemoCallChannel(code, { forceMemory: true, storage: null })} />)

    publishFinal(channel, 'STAFF7', 'Tôi tên Nguyễn Minh Anh, số 0909 123 456, đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ, đón ở Ngã tư Hàng Xanh, trả tại Chợ Đà Lạt.')
    const confirm = screen.getByRole('button', { name: 'Xác nhận đặt vé' })
    expect(confirm).toBeDisabled()

    await user.click(await screen.findByRole('button', { name: 'Ghế A05 · Còn trống' }))
    await user.click(screen.getByRole('button', { name: 'Ghế A06 · Còn trống' }))

    await waitFor(() => expect(confirm).toBeEnabled())
    expect(screen.getByText(/giữ đến/iu)).toBeVisible()
    channel.close()
  })
})
