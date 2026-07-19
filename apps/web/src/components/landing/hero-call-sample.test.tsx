import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HeroCallSample } from './hero-call-sample'

describe('HeroCallSample', () => {
  it('phát và tạm dừng cuộc gọi mẫu ngay trong hero', async () => {
    const { container } = render(<HeroCallSample />)
    const audio = container.querySelector('audio')
    expect(audio).toHaveAttribute('src', '/audio/voice_booking.mp3')

    const play = vi.spyOn(audio!, 'play').mockResolvedValue()
    const pause = vi.spyOn(audio!, 'pause').mockImplementation(() => {})

    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử cuộc gọi với AI' }))
    await waitFor(() => expect(play).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Tạm dừng cuộc gọi mẫu với AI' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng cuộc gọi mẫu với AI' }))
    expect(pause).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Tiếp tục nghe cuộc gọi với AI' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('hiện hướng khôi phục khi trình duyệt không phát được audio', async () => {
    const { container } = render(<HeroCallSample />)
    vi.spyOn(container.querySelector('audio')!, 'play').mockRejectedValue(new Error('blocked'))

    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử cuộc gọi với AI' }))

    expect(await screen.findByRole('button', { name: 'Thử phát lại cuộc gọi với AI' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Không thể phát audio. Bấm thử phát lại.')
  })
})
