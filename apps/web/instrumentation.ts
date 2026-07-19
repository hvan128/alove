import * as Sentry from '@sentry/nextjs'

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}

/**
 * Next only surfaces server-side render and route-handler errors through this
 * hook. Without it the `digest` shown to the caller has no counterpart anywhere
 * an operator can search.
 */
export const onRequestError = Sentry.captureRequestError
