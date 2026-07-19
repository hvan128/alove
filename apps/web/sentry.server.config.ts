import * as Sentry from '@sentry/nextjs'

import { scrubPii } from '@/lib/observability'

/**
 * Absent DSN means every capture becomes a no-op, so local development and
 * preview deploys stay silent without needing a separate switch.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? 'development',
  // Vercel exposes the deployment SHA, which is what makes a stack trace in the
  // dashboard resolvable back to a commit.
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  // Cookies, headers and IP addresses would carry the caller's identity into a
  // third party; this product has no error-triage need that outweighs that.
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: (event) => scrubPii(event),
  beforeSendTransaction: (event) => scrubPii(event),
})
