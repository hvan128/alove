import { render, screen, within } from '@testing-library/react'
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

describe('two-sided bus ticket Web Call', () => {
  it('keeps human mode free of automatic replies', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await startCall(user)
    await user.click(screen.getByRole('button', { name: 'Nhân viên' }))
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu mẫu' }))

    expect(screen.getByText('Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, 2 vé.')).toBeVisible()
    expect(screen.queryAllByTestId('message-agent')).toHaveLength(0)
  })

  it('lets automatic mode advance the booking and reply', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Agent tự động' }))
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu mẫu' }))

    const agentMessage = screen.getByTestId('message-agent')
    expect(within(agentMessage).getByText(/đề xuất chuyến giường nằm 34 chỗ 22:00/i)).toBeVisible()
    expect(screen.getByText('2 hành khách')).toBeVisible()
    expect(speak).toHaveBeenCalledOnce()
  })

  it('preserves transcript and booking when staff takes over', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await startCall(user)
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu mẫu' }))
    await user.click(screen.getByRole('button', { name: 'Nhân viên' }))

    expect(screen.getByText('Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, 2 vé.')).toBeVisible()
    expect(screen.getByText('SG-DL-2200')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Nhân viên' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('confirms one complete automatic booking', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await startCall(user)

    expect(screen.getByRole('button', { name: 'Xác nhận thủ công' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu mẫu' }))
    await user.click(screen.getByRole('button', { name: 'Chọn chuyến 22:00' }))
    await user.click(screen.getByRole('button', { name: 'Gửi thông tin hành khách' }))
    expect(screen.getByRole('button', { name: 'Xác nhận thủ công' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Xác nhận đặt vé' }))

    expect(screen.getByText(/^VD-240718-\d{4}$/u)).toBeVisible()
    expect(screen.getByText('A05, A06')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Xác nhận thủ công' })).toBeDisabled()
  })

  it('lets staff send a manual response', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await startCall(user)
    await user.click(screen.getByRole('button', { name: 'Nhân viên' }))
    await user.type(screen.getByLabelText('Phản hồi của nhân viên'), 'Dạ em kiểm tra chuyến phù hợp ngay ạ.')
    await user.click(screen.getByRole('button', { name: 'Gửi & nói' }))

    expect(screen.getAllByText('Dạ em kiểm tra chuyến phù hợp ngay ạ.')).toHaveLength(2)
  })
})
