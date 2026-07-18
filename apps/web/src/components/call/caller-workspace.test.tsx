import type { RoomEvent } from '@ordervoice/contracts'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoCallChannel } from '@/lib/call/demo-channel'
import { CallerWorkspace } from './caller-workspace'

const localStatus = {
  transport: 'local' as const,
  livekit: false,
  valsea: false,
  voiceAgent: false,
  persistence: false,
  localFallback: true as const,
}

function renderCaller(sessionCode: string) {
  const external = new DemoCallChannel(sessionCode, { forceMemory: true, storage: null })
  render(
    <CallerWorkspace
      sessionCode={sessionCode}
      integrationStatus={localStatus}
      transportFactory={(code) => new DemoCallChannel(code, { forceMemory: true, storage: null })}
    />,
  )
  return external
}

afterEach(() => vi.unstubAllGlobals())

describe('mobile caller workspace', () => {
  it('starts with explicit consent and clearly labels the zero-key fallback', async () => {
    const user = userEvent.setup()
    const channel = renderCaller('CALL41')

    expect(screen.getByRole('heading', { name: 'Gọi đặt vé' })).toBeVisible()
    expect(screen.getByText('CALL41')).toBeVisible()
    expect(screen.getByText('Mô phỏng cục bộ')).toBeVisible()
    expect(screen.getByText('Chưa dùng VALSEA')).toBeVisible()
    expect(screen.getByText(/cùng trình duyệt/iu)).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Thông tin đặt xe' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bắt đầu cuộc gọi' }))
    expect(screen.getByText('Đang trong cuộc gọi')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Gửi câu mẫu hành trình' })).toBeEnabled()
    channel.close()
  })

  it('sends sample and typed final requests through the shared event channel', async () => {
    const user = userEvent.setup()
    const channel = renderCaller('CALL42')
    const received: RoomEvent[] = []
    channel.subscribe((event) => received.push(event))
    await user.click(screen.getByRole('button', { name: 'Bắt đầu cuộc gọi' }))

    await user.click(screen.getByRole('button', { name: 'Gửi câu mẫu hành trình' }))
    await user.type(screen.getByLabelText('Nội dung muốn nói'), 'Tôi muốn đón ở Hàng Xanh.')
    await user.click(screen.getByRole('button', { name: 'Gửi nội dung' }))

    expect(screen.getByText('Đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ.')).toBeVisible()
    expect(received.filter((event) => event.type === 'transcript.final')).toHaveLength(2)
    channel.close()
  })

  it('plays a new staff or agent answer after the user has joined', async () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak })
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = ''
      constructor(public text: string) {}
    })
    const user = userEvent.setup()
    const channel = renderCaller('CALL43')
    await user.click(screen.getByRole('button', { name: 'Bắt đầu cuộc gọi' }))

    act(() => channel.publish({
      version: 1,
      eventId: 'agent-answer-001',
      sessionCode: 'CALL43',
      occurredAt: '2026-07-18T04:00:00.000Z',
      type: 'transcript.final',
      message: {
        id: 'message-agent-001',
        role: 'agent',
        text: 'Anh cho em xin ngày đi và số lượng vé ạ.',
        language: 'vi',
        translations: {},
        confidence: 1,
        startedAtMs: 0,
        endedAtMs: 0,
        channel: 'text',
      },
    }))

    expect(screen.getByText('Anh cho em xin ngày đi và số lượng vé ạ.')).toBeVisible()
    expect(speak).toHaveBeenCalledOnce()
    channel.close()
  })

  it('keeps text and sample controls available when browser speech is unsupported', async () => {
    const user = userEvent.setup()
    const channel = renderCaller('CALL44')
    await user.click(screen.getByRole('button', { name: 'Bắt đầu cuộc gọi' }))

    expect(screen.getByText(/trình duyệt không hỗ trợ nhận giọng/iu)).toBeVisible()
    expect(screen.getByLabelText('Nội dung muốn nói')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Gửi câu mẫu hành trình' })).toBeEnabled()
    channel.close()
  })

  it('publishes one partial event for one browser interim result', async () => {
    let recognition: FakeRecognition | null = null
    class BrowserRecognition extends FakeRecognition {
      constructor() {
        super()
        recognition = this
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', BrowserRecognition)
    const user = userEvent.setup()
    const channel = renderCaller('CALL45')
    const received: RoomEvent[] = []
    channel.subscribe((event) => received.push(event))

    await user.click(screen.getByRole('button', { name: 'Bắt đầu cuộc gọi' }))
    await user.click(screen.getByRole('button', { name: 'Bật microphone' }))
    act(() => recognition?.emitInterim('Tôi muốn đi Đà Lạt'))

    await waitFor(() => {
      expect(received.filter((event) => event.type === 'transcript.partial')).toHaveLength(1)
    })
    await act(async () => Promise.resolve())
    expect(received.filter((event) => event.type === 'transcript.partial')).toHaveLength(1)
    channel.close()
  })

  it('hangs up locally when the staff ends the shared call', async () => {
    const user = userEvent.setup()
    const channel = renderCaller('CALL46')
    await user.click(screen.getByRole('button', { name: 'Bắt đầu cuộc gọi' }))

    act(() => channel.publish({
      version: 1,
      eventId: 'staff-end-001',
      sessionCode: 'CALL46',
      occurredAt: '2026-07-18T04:00:00.000Z',
      type: 'staff.end_call',
      reason: 'ended_by_staff',
    }))

    expect(await screen.findByRole('button', { name: 'Bắt đầu cuộc gọi' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Bật microphone' })).not.toBeInTheDocument()
    channel.close()
  })
})

class FakeRecognition {
  lang = ''
  continuous = false
  interimResults = false
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onresult: ((event: {
    resultIndex: number
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
  }) => void) | null = null

  start() {
    this.onstart?.()
  }

  stop() {
    this.onend?.()
  }

  abort() {}

  emitInterim(text: string) {
    const result = Object.assign([{ transcript: text }], { isFinal: false })
    this.onresult?.({ resultIndex: 0, results: [result] })
  }
}
