import * as Sentry from '@sentry/nextjs'

import { scrubPii } from '@/lib/observability'

/**
 * Every route currently pins `runtime = 'nodejs'`, so this config exists for
 * the first piece of middleware someone adds — without it that code would
 * report nowhere and the gap would be invisible.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: (event) => scrubPii(event),
  beforeSendTransaction: (event) => scrubPii(event),
})
