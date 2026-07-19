import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createEmptyBooking, type CallMessage } from '@/lib/call-contract'
import { CallStage } from './call-stage'

function renderStage(text: string) {
  const messages: CallMessage[] = [{
    id: 'customer-1',
    conversationId: 'call-1',
    role: 'customer',
    text,
    createdAt: '2026-07-19T00:47:45.000Z',
    channel: 'voice',
    final: true,
  }]

  return render(
    <CallStage
      status="connected"
      elapsedSec={18}
      messages={messages}
      semanticAnnotations={[]}
      booking={createEmptyBooking('call-1')}
      agentSpeaking={false}
      onStart={vi.fn()}
      onEnd={vi.fn()}
    />,
  )
}

describe('CallStage language highlights', () => {
  it('highlights code-switch and regional wording in the hero caption with a text legend', () => {
    renderStage('Cho mình book hai vé từ Hà Nội vô Vinh, check chuyến mô gần nhất hỉ.')

    const conversation = screen.getByRole('list', { name: 'Hội thoại' })
    const codeSwitchMarks = within(conversation).getAllByTitle('Code-switch')
    expect(codeSwitchMarks.map((node) => node.textContent)).toEqual(['book', 'check'])
    expect(within(conversation).getAllByTitle('Tiếng vùng miền').map((node) => node.textContent))
      .toEqual(['vô', 'mô', 'hỉ'])

    const legend = within(conversation).getByLabelText('Chú giải ngôn ngữ')
    expect(legend).toHaveTextContent('EN · Code-switch')
    expect(legend).toHaveTextContent('Tiếng vùng miền')
  })

  it('does not mistake a regional fragment inside a standard Vietnamese word', () => {
    renderStage('Cho mình đặt một vé từ Hà Nội đi Vinh.')

    expect(screen.queryByTitle('Tiếng vùng miền')).toBeNull()
    expect(screen.queryByLabelText('Chú giải ngôn ngữ')).toBeNull()
  })
})
