import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

export function isBookingVerificationConfigured(): boolean {
  const secret = process.env.BOOKING_VERIFICATION_SECRET
  return Boolean(secret && Buffer.byteLength(secret) >= 32)
}

export function verificationRateKey(kind: 'ip' | 'code' | 'phone' | 'pair', value: string): string {
  const secret = process.env.BOOKING_VERIFICATION_SECRET
  if (!isBookingVerificationConfigured() || !secret) {
    throw new Error('Booking verification secret is not configured.')
  }
  return createHmac('sha256', secret)
    .update(`alove:booking-verification:${kind}:v1:${value}`)
    .digest('hex')
}

export function trustedVerificationIp(req: Request): string {
  const header = process.env.VERCEL
    ? req.headers.get('x-vercel-forwarded-for')
    : req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip')
  const candidate = header?.split(',')[0]?.trim() ?? ''
  return candidate.length <= 64 && isIP(candidate) !== 0 ? candidate : 'unknown'
}
