import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DemoWorkspace } from '@ordervoice/contracts'
import { ConsoleWorkspace } from './console-workspace'

const initialWorkspace: DemoWorkspace = {
  conversationId: 'conversation-demo-001',
  activeSource: 'browser',
  sourceStates: { browser: 'demo', telephony: 'unavailable', replay: 'ready' },
  isDemo: true,
  step: 1,
  transcript: [
    {
      id: 'segment-1',
      conversationId: 'conversation-demo-001',
      kind: 'final',
      speaker: 'caller',
      text: 'Chị Lan lấy 12 thùng cà phê Arabica, thêm 3 pack Oat Milk 1L.',
      startedAtMs: 0,
      endedAtMs: 5100,
      confidence: 0.96,
      source: 'browser',
    },
  ],
  draft: {
    id: 'order-conversation-demo-001',
    conversationId: 'conversation-demo-001',
    customerId: 'CUS-LAN-ANH',
    customerName: 'Cửa hàng Lan Anh',
    status: 'ready_for_approval',
    lines: [{
      id: 'line-1',
      sku: 'CF-ARABICA-1KG',
      productLabel: 'Arabica Premium',
      quantity: 12,
      unit: 'thùng',
      resolution: 'resolved',
      evidence: [{ segmentId: 'segment-1', quote: '12 thùng cà phê Arabica', startMs: 0, endMs: 5100, confidence: 0.96 }],
    }],
    exceptions: [],
    approvedBy: null,
    approvedAt: null,
    externalReference: null,
  },
  reply: {
    id: 'reply-1',
    conversationId: 'conversation-demo-001',
    text: 'Dạ em đã ghi nhận 12 thùng Arabica Premium.',
    approvedForSpeech: true,
  },
}

afterEach(() => vi.unstubAllGlobals())

describe('human-in-the-loop console', () => {
  it('keeps ERP export disabled until a human approves the draft', async () => {
    const user = userEvent.setup()
    render(<ConsoleWorkspace initialWorkspace={initialWorkspace} />)

    expect(screen.getByRole('button', { name: 'Xuất ERP nháp' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Duyệt đơn nháp' }))
    expect(screen.getByRole('button', { name: 'Xuất ERP nháp' })).toBeEnabled()
  })

  it('speaks a reply only after the operator clicks the speech action', async () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak })
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = ''
      constructor(public text: string) {}
    })
    const user = userEvent.setup()
    render(<ConsoleWorkspace initialWorkspace={initialWorkspace} />)

    await user.click(screen.getByRole('button', { name: 'Nói phản hồi' }))

    expect(speak).toHaveBeenCalledOnce()
  })

  it('prepares an operator-selected Zalo file for an explicit replay', async () => {
    const user = userEvent.setup()
    render(<ConsoleWorkspace initialWorkspace={initialWorkspace} />)

    await user.click(screen.getByRole('tab', { name: /Zalo replay/i }))
    await user.upload(screen.getByLabelText('Tải tệp Zalo audio hoặc video'), new File(['audio'], 'zalo-call.webm', { type: 'audio/webm' }))

    expect(screen.getByTestId('zalo-replay-media')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Phát & chuyển transcript' })).toBeEnabled()
  })

  it('lets an operator resolve an ambiguous SKU before approval', async () => {
    const user = userEvent.setup()
    render(<ConsoleWorkspace initialWorkspace={initialWorkspace} />)

    await user.click(screen.getByRole('button', { name: 'Chạy demo ngoại lệ' }))
    expect(screen.getByRole('button', { name: 'Duyệt đơn nháp' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Sửa cà phê house' }))
    await user.selectOptions(screen.getByLabelText('SKU cho cà phê house'), 'CF-HOUSE-BLEND')
    await user.clear(screen.getByLabelText('Số lượng cho cà phê house'))
    await user.type(screen.getByLabelText('Số lượng cho cà phê house'), '4')
    await user.click(screen.getByRole('button', { name: 'Lưu chỉnh sửa' }))

    expect(screen.getByText('House Blend')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Duyệt đơn nháp' })).toBeEnabled()
  })
})
