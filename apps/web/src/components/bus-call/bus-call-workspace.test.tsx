import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialBusDemoWorkspace } from '@/lib/bus-demo'
import { BusCallWorkspace } from './bus-call-workspace'

function renderWorkspace() {
  return render(<BusCallWorkspace initialWorkspace={createInitialBusDemoWorkspace()} />)
}

afterEach(() => vi.unstubAllGlobals())

async function startCall(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Bắt đầu Web Call' }))
}

// The local text/preset dock is CSS-hidden (the stage is voice-first; LiveKit
// owns the dock in production), so drive presets with fireEvent — it skips
// the visibility check while still exercising the real handlers.
function sendPreset(label: string) {
  fireEvent.click(screen.getByText(label))
}

function ticket() {
  return within(screen.getByRole('region', { name: 'Vé xe' }))
}

describe('minimal voice-first web call console', () => {
  it('replies automatically and fills the ticket from the first request', async () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak })
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = ''
      constructor(public text: string) {}
    })
    const user = userEvent.setup()
    renderWorkspace()
    expect(speak).not.toHaveBeenCalled()
    await startCall(user)
    expect(speak).not.toHaveBeenCalled()
    sendPreset('Yêu cầu mẫu')

    // Highlight <mark> splits caption text nodes, so match on the list's
    // combined text content instead of a single node.
    expect(screen.getByRole('list', { name: 'Hội thoại' })).toHaveTextContent(/đề xuất chuyến giường nằm 34 chỗ 22:00/i)
    expect(ticket().getByText('2 hành khách')).toBeVisible()
    expect(ticket().getByText('Sài Gòn')).toBeVisible()
    expect(ticket().getByText('Đà Lạt')).toBeVisible()
    expect(speak).toHaveBeenCalledOnce()
  })

  it('opens the full conversation from the captions', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await startCall(user)
    sendPreset('Yêu cầu mẫu')
    sendPreset('Chọn chuyến 22:00')

    expect(screen.getByText('Tôi chọn chuyến 22 giờ.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Hội thoại' }))
    const dialog = screen.getByRole('dialog', { name: 'Toàn bộ hội thoại' })
    expect(dialog).toHaveTextContent(/Tôi muốn đi từ/)
    expect(dialog).toHaveTextContent(/Tôi chọn chuyến 22 giờ\./)

    await user.click(screen.getByRole('button', { name: 'Đóng hội thoại' }))
    expect(screen.queryByRole('dialog', { name: 'Toàn bộ hội thoại' })).toBeNull()
  })

  it('confirms a complete booking with code and seats on the ticket', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await startCall(user)
    sendPreset('Yêu cầu mẫu')
    sendPreset('Chọn chuyến 22:00')
    sendPreset('Thông tin hành khách')

    expect(ticket().getByText('Nguyễn Minh Anh')).toBeVisible()
    expect(ticket().getByText('0909123456')).toBeVisible()

    sendPreset('Xác nhận đặt vé')

    expect(ticket().getByText(/^VD-240718-\d{4}$/u)).toBeVisible()
    expect(ticket().getByText(/Ghế A05, A06/)).toBeVisible()
    // Preset dock is replaced by the done state once the ticket is held.
    expect(screen.queryByRole('button', { name: 'Yêu cầu mẫu' })).toBeNull()
  })

  it('restarts a fresh call after ending', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await startCall(user)
    sendPreset('Yêu cầu mẫu')
    await user.click(screen.getByRole('button', { name: 'Kết thúc' }))

    await user.click(screen.getByRole('button', { name: 'Gọi lại từ đầu' }))

    expect(screen.getByRole('button', { name: 'Kết thúc' })).toBeVisible()
    expect(screen.queryByText(/đề xuất chuyến giường nằm/)).toBeNull()
    expect(ticket().queryByText('Sài Gòn')).toBeNull()
  })
})
