import * as Sentry from '@sentry/nextjs'

/**
 * Severity here describes what an on-call person should do, not how alarming
 * the log line looks. `warning` means a retry can still save the booking;
 * `error` means a ticket has already been lost and someone must call the
 * operator by hand.
 */
export type IssueLevel = 'warning' | 'error'

/** Only non-identifying values belong here — see `scrubPii` for the reason. */
export type IssueContext = Record<string, string | number | boolean | null | undefined>

/**
 * Passenger phone numbers reach this codebase as plain strings and can end up
 * inside a driver's error message (`invalid input ... "0912345678"`). Sentry
 * retains what it receives, so redaction happens before the payload leaves the
 * process rather than through a project-side data-scrubbing rule that nobody
 * would notice had been switched off.
 */
export function scrubPii<T>(value: T, depth = 0): T {
  if (typeof value === 'string') {
    return value.replace(/(?:\+?84|0)\d{8,10}\b/g, '[phone]') as T
  }
  // A Sentry event is a foreign object graph that may be cyclic. Bailing out
  // below the SDK's own normalisation depth keeps `beforeSend` from recursing
  // forever, and anything deeper than this is already truncated by the time it
  // would be sent.
  if (depth >= 8) return value
  if (Array.isArray(value)) {
    return value.map((item) => scrubPii(item, depth + 1)) as T
  }
  if (value && typeof value === 'object') {
    const scrubbed: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) scrubbed[key] = scrubPii(item, depth + 1)
    return scrubbed as T
  }
  return value
}

/**
 * Reports a failure the product has already absorbed — the request returned a
 * success the caller can act on, but an operator still needs to know. These
 * paths used to `console.warn` into Vercel's ephemeral runtime logs, where a
 * night of undelivered tickets looked exactly like a quiet night.
 *
 * Console output is kept so local development and `vercel logs` stay readable
 * without a DSN configured.
 */
export function reportIssue(
  message: string,
  options: { level?: IssueLevel; cause?: unknown; context?: IssueContext } = {},
): void {
  const { level = 'error', cause, context } = options
  const scrubbed = context ? scrubPii(context) : undefined

  if (level === 'error') console.error(message, scrubbed ?? '')
  else console.warn(message, scrubbed ?? '')

  Sentry.withScope((scope) => {
    scope.setLevel(level)
    if (scrubbed) scope.setContext('alove', scrubbed)
    // A thrown value carries a stack worth keeping; a bare message does not,
    // so it is grouped by text instead of by a synthesised stack.
    if (cause instanceof Error) Sentry.captureException(cause)
    else Sentry.captureMessage(message)
  })
}
