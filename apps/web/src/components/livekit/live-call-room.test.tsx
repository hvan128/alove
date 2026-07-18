import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LiveKitEventTransport } from '@/lib/call/livekit-adapter'
import { LiveCallRoom } from './live-call-room'

const mocks = vi.hoisted(() => ({
  fetchAccess: vi.fn(),
}))

vi.mock('@/lib/call/livekit-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/call/livekit-adapter')>()
  return { ...actual, fetchLiveKitAccessDetails: mocks.fetchAccess }
})

vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({ children, token }: { children: React.ReactNode; token: string }) => (
    <div data-testid="livekit-room" data-token={token}>{children}</div>
  ),
  RoomAudioRenderer: () => null,
  useDataChannel: () => ({ send: vi.fn(async () => undefined) }),
}))

describe('LiveCallRoom reconnect lifecycle', () => {
  it('clears a stale token error before a new connection attempt', async () => {
    const transport = new LiveKitEventTransport('LIVE42')
    const onConnectionChange = vi.fn()
    mocks.fetchAccess.mockRejectedValueOnce(new Error('Temporary token failure'))

    const view = render(
      <LiveCallRoom
        sessionCode="LIVE42"
        role="caller"
        displayName="Khách"
        connect
        microphone
        transport={transport}
        onConnectionChange={onConnectionChange}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporary token failure')

    view.rerender(
      <LiveCallRoom
        sessionCode="LIVE42"
        role="caller"
        displayName="Khách"
        connect={false}
        microphone={false}
        transport={transport}
        onConnectionChange={onConnectionChange}
      />,
    )
    mocks.fetchAccess.mockResolvedValueOnce({
      serverUrl: 'wss://vedi.livekit.cloud',
      participantToken: 'fresh-token',
      roomName: 'vedi-live42',
      identity: 'caller-LIVE42',
      sessionCode: 'LIVE42',
    })
    view.rerender(
      <LiveCallRoom
        sessionCode="LIVE42"
        role="caller"
        displayName="Khách"
        connect
        microphone
        transport={transport}
        onConnectionChange={onConnectionChange}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('livekit-room')).toHaveAttribute('data-token', 'fresh-token'))
    transport.close()
  })
})
