import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
}

export default withSentryConfig(nextConfig, {
  // Spread rather than assign: `exactOptionalPropertyTypes` rejects an explicit
  // `undefined` here, and an unset org/project is the normal local case.
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  // Without an auth token there is nothing to upload to, and asking anyway
  // turns every local and preview build into a wall of warnings.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  silent: !process.env.CI,
  // Registers the vercel.json cron as a Sentry monitor, which catches the one
  // failure the drain route cannot report on its own: not running at all.
  automaticVercelMonitors: true,
  disableLogger: true,
})
