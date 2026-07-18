import { z } from 'zod'

import { createVerifiedBooking } from '@/lib/booking-verification'
import {
  isBookingVerificationConfigured,
  trustedVerificationIp,
  verificationRateKey,
} from '@/lib/booking-verification-security'
import { vietnamesePhoneSchema } from '@/lib/call-contract'
import { findBookingSnapshotForVerification } from '@/lib/db/booking-store'
import { isDbConfigured } from '@/lib/db/client'
import { consumePublicRateLimit } from '@/lib/db/rate-limit-store'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 2 * 1_024
const BodySchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^MA-\d{6}-\d{4,10}$/u),
  phone: vietnamesePhoneSchema,
})

type JsonReadResult = { ok: true; value: unknown } | { ok: false; tooLarge: boolean }

async function readJson(req: Request): Promise<JsonReadResult> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return { ok: false, tooLarge: true }
  }
  if (!req.body) return { ok: true, value: {} }

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        return { ok: false, tooLarge: true }
      }
      chunks.push(value)
    }
    const body = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }
    return {
      ok: true,
      value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) as unknown,
    }
  } catch {
    return { ok: false, tooLarge: false }
  } finally {
    reader.releaseLock()
  }
}

function json(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  headers.set('Cache-Control', 'no-store, max-age=0')
  headers.set('Referrer-Policy', 'no-referrer')
  return Response.json(body, { ...init, headers })
}

export async function POST(req: Request): Promise<Response> {
  if (!isDbConfigured() || !isBookingVerificationConfigured()) {
    return json({ error: 'verification_not_configured' }, { status: 503 })
  }

  let ipRate: Awaited<ReturnType<typeof consumePublicRateLimit>>
  try {
    ipRate = await consumePublicRateLimit(
      verificationRateKey('ip', trustedVerificationIp(req)),
      { limit: 30, windowMs: 10 * 60 * 1_000 },
    )
  } catch {
    return json({ error: 'verification_unavailable' }, { status: 503 })
  }
  if (!ipRate.allowed) {
    return json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(ipRate.retryAfterSeconds) } },
    )
  }
  if (!req.headers.get('content-type')?.toLocaleLowerCase('en-US').startsWith('application/json')) {
    return json({ error: 'unsupported_media_type' }, { status: 415 })
  }

  const body = await readJson(req)
  if (!body.ok) {
    return json(
      { error: body.tooLarge ? 'payload_too_large' : 'invalid_request' },
      { status: body.tooLarge ? 413 : 400 },
    )
  }
  const parsed = BodySchema.safeParse(body.value)
  if (!parsed.success) return json({ error: 'invalid_request' }, { status: 400 })

  const factorBuckets = [
    { kind: 'code' as const, value: parsed.data.code, limit: 10 },
    { kind: 'phone' as const, value: parsed.data.phone, limit: 10 },
    { kind: 'pair' as const, value: `${parsed.data.code}\0${parsed.data.phone}`, limit: 5 },
  ]
  for (const bucket of factorBuckets) {
    let factorRate: Awaited<ReturnType<typeof consumePublicRateLimit>>
    try {
      factorRate = await consumePublicRateLimit(
        verificationRateKey(bucket.kind, bucket.value),
        { limit: bucket.limit, windowMs: 10 * 60 * 1_000 },
      )
    } catch {
      return json({ error: 'verification_unavailable' }, { status: 503 })
    }
    if (!factorRate.allowed) {
      return json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(factorRate.retryAfterSeconds) } },
      )
    }
  }

  try {
    const snapshot = await findBookingSnapshotForVerification(parsed.data)
    if (!snapshot) {
      // Code không tồn tại và phone không khớp dùng cùng response để không lộ vé.
      return json({ verified: false, error: 'not_found' }, { status: 404 })
    }
    return json({ verified: true, booking: createVerifiedBooking(snapshot) })
  } catch {
    return json({ error: 'verification_unavailable' }, { status: 503 })
  }
}
