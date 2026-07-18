import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // @ordervoice/providers ships raw TS with Node-ESM ".js" specifiers; Turbopack
  // only resolves those once the package is transpiled here.
  transpilePackages: ['@ordervoice/contracts', '@ordervoice/providers'],
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
