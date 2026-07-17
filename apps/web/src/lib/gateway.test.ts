import { describe, expect, it } from 'vitest'
import { createMediaSocketUrl } from './gateway'

describe('media gateway URL', () => {
  it('converts HTTPS gateway origins to a source-scoped secure WebSocket URL', () => {
    expect(createMediaSocketUrl('https://gateway.example.com/', 'conversation 1', 'browser')).toBe('wss://gateway.example.com/ws/media/conversation%201?source=browser')
  })
})
