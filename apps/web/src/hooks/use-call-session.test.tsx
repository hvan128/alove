import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DemoCallChannel } from '@/lib/call/demo-channel'
import { useCallSession } from './use-call-session'

function Harness({ role }: { role: 'caller' | 'staff' }) {
  const session = useCallSession({
    sessionCode: 'DEMO42',
    role,
    transportFactory: (code) => new DemoCallChannel(code, { forceMemory: true }),
  })

  return (
    <section aria-label={role}>
      <output>{session.state.booking.destination ?? 'Chưa có điểm đến'}</output>
      <output>{session.state.messages.length} tin nhắn</output>
      {role === 'caller' ? (
        <button type="button" onClick={() => session.sendCallerText('Đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ.')}>
          Gửi yêu cầu
        </button>
      ) : null}
    </section>
  )
}

describe('useCallSession local transport', () => {
  it('delivers one validated final event between caller and staff instances', async () => {
    const user = userEvent.setup()
    render(<><Harness role="staff" /><Harness role="caller" /></>)

    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))

    expect(await screen.findAllByText('Đà Lạt')).toHaveLength(2)
    expect(screen.getAllByText('1 tin nhắn')).toHaveLength(2)
  })

  it('replays persisted validated history to a later subscriber', async () => {
    const channel = new DemoCallChannel('HIST42', { forceMemory: true })
    channel.publish({
      version: 1,
      eventId: 'history-001',
      sessionCode: 'HIST42',
      occurredAt: '2026-07-18T04:00:00.000Z',
      type: 'transcript.final',
      message: {
        id: 'history-message-001',
        role: 'caller',
        text: 'Tôi đi từ Sài Gòn đến Đà Lạt.',
        language: 'vi',
        translations: {},
        confidence: 0.95,
        startedAtMs: 0,
        endedAtMs: 900,
        channel: 'text',
      },
    })

    function HistoryHarness() {
      const session = useCallSession({
        sessionCode: 'HIST42',
        role: 'staff',
        transportFactory: (code) => new DemoCallChannel(code, { forceMemory: true }),
      })
      return <output>{session.state.booking.destination ?? 'Đang tải'}</output>
    }

    render(<HistoryHarness />)
    expect(await screen.findByText('Đà Lạt')).toBeInTheDocument()
    channel.close()
  })
})
