import * as Sentry from '@sentry/nextjs'

import { scrubPii } from '@/lib/observability'

/**
 * Errors only. Tracing and Session Replay are deliberately left off: the
 * booking flow runs on cheap phones over mobile data, and neither answers a
 * question the call audit trail cannot already answer.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: (event) => scrubPii(event),
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
