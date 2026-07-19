// @vitest-environment node
import { describe, expect, it } from 'vitest'

import * as Sentry from '@sentry/nextjs'

import { reportIssue, scrubPii } from './observability'

/**
 * The real SDK, deliberately unmocked. `observability.test.ts` proves the
 * redaction function is correct; this proves it is actually wired into the path
 * an event takes on the way out. A `beforeSend` that is correct but never
 * installed would pass every other test in this suite and still ship passenger
 * phone numbers to a third party.
 */
const envelopes: unknown[] = []

Sentry.init({
  dsn: 'https://publickey@o0.ingest.sentry.io/1',
  enabled: true,
  sendDefaultPii: false,
  beforeSend: (event) => scrubPii(event),
  transport: () => ({
    send: async (envelope: unknown) => {
      envelopes.push(envelope)
      return {}
    },
    flush: async () => true,
  }),
})

describe('sentry wiring', () => {
  it('redacts the phone number before the envelope leaves the process', async () => {
    reportIssue('[alove] booking webhook delivery failed', {
      level: 'error',
      context: { note: 'operator phone 0912345678 unreachable', eventId: 'evt_01' },
    })

    await Sentry.flush(2000)

    expect(envelopes).not.toHaveLength(0)
    const serialized = JSON.stringify(envelopes)
    expect(serialized).toContain('evt_01')
    expect(serialized).toContain('[phone]')
    expect(serialized).not.toContain('0912345678')
  })
})
