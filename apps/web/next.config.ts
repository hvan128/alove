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
})

// `automaticVercelMonitors` and `disableLogger` are deliberately absent: both
// are webpack-only, and `next build` here runs Turbopack, so setting them would
// read as cron monitoring that does not exist. The drain route checks in
// explicitly instead.
