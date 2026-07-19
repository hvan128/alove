import { describe, expect, it, vi, afterEach } from 'vitest'

import { reportIssue, scrubPii } from './observability'

const captureException = vi.hoisted(() => vi.fn())
const captureMessage = vi.hoisted(() => vi.fn())
const setLevel = vi.hoisted(() => vi.fn())
const setContext = vi.hoisted(() => vi.fn())

vi.mock('@sentry/nextjs', () => ({
  captureException,
  captureMessage,
  withScope: (run: (scope: { setLevel: unknown; setContext: unknown }) => void) =>
    run({ setLevel, setContext }),
}))

afterEach(() => vi.clearAllMocks())

describe('scrubPii', () => {
  it('redacts Vietnamese phone numbers wherever they appear in a payload', () => {
    const event = {
      message: 'invalid phone "0912345678" for booking',
      extra: { list: ['+84912345678', 'MA-240101-1234'] },
    }

    expect(scrubPii(event)).toEqual({
      message: 'invalid phone "[phone]" for booking',
      extra: { list: ['[phone]', 'MA-240101-1234'] },
    })
  })

  it('leaves booking codes, seat counts and prices intact', () => {
    // Over-redacting would strip the only fields that make a report actionable.
    const context = { eventId: 'evt_01', attempts: 3, totalVnd: 250000, ok: false }

    expect(scrubPii(context)).toEqual(context)
  })

  it('survives null and undefined without throwing', () => {
    expect(scrubPii({ a: null, b: undefined })).toEqual({ a: null, b: undefined })
  })
})

describe('reportIssue', () => {
  it('captures the thrown value when one is supplied so the stack is kept', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cause = new Error('neon timeout')

    reportIssue('[alove] booking webhook deferred', { cause, context: { eventId: 'evt_01' } })

    expect(captureException).toHaveBeenCalledWith(cause)
    expect(captureMessage).not.toHaveBeenCalled()
    expect(setLevel).toHaveBeenCalledWith('error')
    expect(setContext).toHaveBeenCalledWith('alove', { eventId: 'evt_01' })
    consoleError.mockRestore()
  })

  it('falls back to a message when there is no thrown value to attach', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    reportIssue('[alove] outbox has abandoned events', { level: 'warning', context: { abandoned: 2 } })

    expect(captureMessage).toHaveBeenCalledWith('[alove] outbox has abandoned events')
    expect(captureException).not.toHaveBeenCalled()
    expect(setLevel).toHaveBeenCalledWith('warning')
    consoleWarn.mockRestore()
  })

  it('scrubs context before it reaches Sentry', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    reportIssue('[alove] delivery failed', { context: { note: 'called 0912345678' } })

    expect(setContext).toHaveBeenCalledWith('alove', { note: 'called [phone]' })
    consoleError.mockRestore()
  })
})
