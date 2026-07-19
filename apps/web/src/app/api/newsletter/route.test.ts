import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetDbForTests } from '@/lib/db/client'
import { resetRateLimitsForTests } from '@/lib/rate-limit'
import { POST } from './route'

function request(body: unknown, ip = '203.0.113.8') {
  return new Request('http://localhost/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/newsletter', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', '')
    resetDbForTests()
    resetRateLimitsForTests()
  })

  afterEach(() => vi.unstubAllEnvs())

  it('từ chối email không hợp lệ trước khi chạm database', async () => {
    const response = await POST(request({ email: 'khong-phai-email' }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid_email' })
  })

  it('báo unavailable thay vì giả vờ đăng ký khi database chưa cấu hình', async () => {
    const response = await POST(request({ email: 'khach@example.com' }))
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'service_unavailable' })
  })

  it('giới hạn số lần gửi từ cùng một địa chỉ mạng', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await POST(request({ email: `khach${attempt}@example.com` }))).status).toBe(503)
    }
    const response = await POST(request({ email: 'khach5@example.com' }))
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
  })
})
