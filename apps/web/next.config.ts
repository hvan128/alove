import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@ordervoice/contracts', '@ordervoice/db'],
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
