import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NewsletterSignup } from './newsletter-signup'

describe('NewsletterSignup', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('gửi email tới API và hiện xác nhận thành công', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ subscribed: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    render(<NewsletterSignup />)

    fireEvent.change(screen.getByLabelText('Email nhận cập nhật từ Alove'), { target: { value: 'khach@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))

    await expect(screen.findByText(/Đã đăng ký\. Alove sẽ chỉ gửi/u)).resolves.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/newsletter', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'khach@example.com' }),
    }))
  })

  it('hiện lỗi thật khi API không lưu được đăng ký', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'service_unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })))
    render(<NewsletterSignup />)

    fireEvent.change(screen.getByLabelText('Email nhận cập nhật từ Alove'), { target: { value: 'khach@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))

    await waitFor(() => expect(screen.getByText(/Chưa thể lưu đăng ký/u)).toBeInTheDocument())
  })
})
