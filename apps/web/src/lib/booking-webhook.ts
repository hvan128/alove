import { createHmac } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'
import { z } from 'zod'

import { vietnamesePhoneSchema } from './call-contract'
import { reportIssue } from './observability'
import {
  claimBookingWebhookAttempt,
  getBookingWebhookState,
  reconcileStaleBookingWebhookAttempts,
  recordBookingWebhookDelivered,
  recordBookingWebhookFailed,
} from './db/webhook-outbox-store'

const webhookBookingSchema = z.object({
  conversationId: z.string().min(1).max(120),
  tripId: z.string().min(1).max(160),
  bookingCode: z.string().regex(/^MA-\d{6}-\d{4,10}$/u),
  passengerName: z.string().min(1).max(120),
  phone: vietnamesePhoneSchema,
  seats: z.array(z.string().min(1).max(40)).min(1).max(20),
  totalFareVnd: z.number().int().positive(),
  departureLabel: z.string().min(1).max(80),
  pickupPoint: z.string().min(1).max(240),
}).strict()

export const bookingWebhookEventSchema = z.object({
  schemaVersion: z.literal('1.0'),
  type: z.literal('booking.confirmed'),
  eventId: z.string().regex(/^booking\.confirmed\.v1:MA-\d{6}-\d{4,10}$/u),
  booking: webhookBookingSchema,
}).strict()

export type BookingWebhookInput = z.input<typeof webhookBookingSchema>
export type BookingWebhookEvent = z.infer<typeof bookingWebhookEventSchema>
export type BookingWebhookDelivery = {
  status: 'disabled' | 'delivered' | 'failed' | 'misconfigured' | 'pending'
  attempts: number
}

type ResolveHost = (hostname: string) => Promise<Array<{ address: string; family: number }>>
type PinnedAddress = { address: string; family: number }
type DeliveryOptions = {
  fetchImpl?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
  timeoutMs?: number
  now?: () => number
  random?: () => number
  resolveHost?: ResolveHost
}

type EnabledConfig = { status: 'enabled'; url: URL; secret: string; localDevelopment: boolean }
type WebhookConfig = { status: 'disabled' } | { status: 'misconfigured' } | EnabledConfig

class PrivateDestinationError extends Error {
  constructor() {
    super('Webhook destination is not public.')
    this.name = 'PrivateDestinationError'
  }
}

export function bookingWebhookConfigurationStatus(): WebhookConfig['status'] {
  return webhookConfig().status
}

export function createBookingWebhookEvent(input: BookingWebhookInput): BookingWebhookEvent {
  const booking = webhookBookingSchema.parse(input)
  return bookingWebhookEventSchema.parse({
    schemaVersion: '1.0',
    type: 'booking.confirmed',
    eventId: `booking.confirmed.v1:${booking.bookingCode}`,
    booking,
  })
}

function webhookConfig(): WebhookConfig {
  const rawUrl = process.env.BOOKING_WEBHOOK_URL?.trim()
  const secret = process.env.BOOKING_WEBHOOK_SECRET?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()
  const allowedHosts = new Set(
    (process.env.BOOKING_WEBHOOK_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((value) => value.trim().toLocaleLowerCase('en-US'))
      .filter(Boolean),
  )
  if (!rawUrl && !secret && allowedHosts.size === 0) return { status: 'disabled' }
  if (
    !rawUrl
    || !secret
    || Buffer.byteLength(secret) < 32
    || !cronSecret
    || Buffer.byteLength(cronSecret) < 32
  ) return { status: 'misconfigured' }

  try {
    const url = new URL(rawUrl)
    const localDevelopment = process.env.NODE_ENV !== 'production'
      && url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    const productionUrlValid = url.protocol === 'https:'
      && (!url.port || url.port === '443')
      && allowedHosts.has(url.hostname.toLocaleLowerCase('en-US'))
    if (
      (!productionUrlValid && !localDevelopment)
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return { status: 'misconfigured' }
    }
    return { status: 'enabled', url, secret, localDevelopment }
  } catch {
    return { status: 'misconfigured' }
  }
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b, c] = parts as [number, number, number, number]
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && (c === 0 || c === 2))
    || (a === 192 && b === 88 && c === 99)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224
}

export function isPrivateWebhookAddress(address: string): boolean {
  const normalized = address.toLocaleLowerCase('en-US').split('%')[0] ?? ''
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized)
  if (isIP(normalized) !== 6) return true
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/u)?.[1]
  if (mapped) return isPrivateIpv4(mapped)
  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/u)
  if (mappedHex?.[1] && mappedHex[2]) {
    const high = Number.parseInt(mappedHex[1], 16)
    const low = Number.parseInt(mappedHex[2], 16)
    return isPrivateIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`)
  }
  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || /^fe[89ab]/u.test(normalized)
    || normalized.startsWith('2001:db8:')
    || normalized.startsWith('ff')
}

async function resolvePublicDestination(config: EnabledConfig, resolveHost: ResolveHost): Promise<PinnedAddress> {
  if (config.localDevelopment) {
    return { address: config.url.hostname === 'localhost' ? '127.0.0.1' : config.url.hostname, family: 4 }
  }
  if (config.url.hostname.endsWith('.local') || config.url.hostname === 'localhost') {
    throw new PrivateDestinationError()
  }
  const addresses = isIP(config.url.hostname)
    ? [{ address: config.url.hostname, family: isIP(config.url.hostname) }]
    : await resolveHost(config.url.hostname)
  // Pin only a validated public IPv4 address. IPv6-only destinations fail
  // closed, avoiding partial range classification and a second DNS lookup.
  const ipv4 = addresses.filter(({ address, family }) => family === 4 && isIP(address) === 4)
  if (ipv4.length === 0 || ipv4.some(({ address }) => isPrivateWebhookAddress(address))) {
    throw new PrivateDestinationError()
  }
  return ipv4[0]!
}

export function signBookingWebhook(body: string, timestamp: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function retryDelay(attempt: number, random: () => number): number {
  const base = attempt <= 1 ? 0 : 1_000 * (2 ** (attempt - 2))
  return Math.min(3_000, base + Math.floor(random() * 250))
}

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const rejectTimeout = () => reject(new Error('delivery_timeout'))
    if (signal.aborted) rejectTimeout()
    else signal.addEventListener('abort', rejectTimeout, { once: true })
  })
}

function postToPinnedDestination(input: {
  config: EnabledConfig
  destination: PinnedAddress
  body: string
  headers: Record<string, string>
  signal: AbortSignal
}): Promise<{ ok: boolean; status: number }> {
  const { config, destination, body, headers, signal } = input
  const request = config.url.protocol === 'https:' ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const req = request({
      protocol: config.url.protocol,
      hostname: destination.address,
      family: destination.family,
      port: config.url.port || (config.url.protocol === 'https:' ? 443 : 80),
      path: config.url.pathname,
      method: 'POST',
      signal,
      ...(config.url.protocol === 'https:' ? { servername: config.url.hostname } : {}),
      headers: {
        ...headers,
        Host: config.url.host,
        'Content-Length': String(Buffer.byteLength(body)),
      },
    }, (response) => {
      const status = response.statusCode ?? 0
      response.destroy()
      resolve({ ok: status >= 200 && status < 300, status })
    })
    req.once('error', reject)
    req.end(body)
  })
}

export async function deliverBookingWebhook(
  eventId: string | null,
  options: DeliveryOptions = {},
): Promise<BookingWebhookDelivery> {
  const config = webhookConfig()
  if (config.status === 'disabled') return { status: 'disabled', attempts: 0 }
  if (config.status === 'misconfigured' || !eventId) {
    console.warn('[alove] booking webhook skipped', { reason: 'misconfigured' })
    return { status: 'misconfigured', attempts: 0 }
  }

  const fetchImpl = options.fetchImpl
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)))
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 2_500, 100), 5_000)
  const now = options.now ?? Date.now
  const random = options.random ?? Math.random
  const resolveHost = options.resolveHost ?? (async (hostname) => lookup(hostname, { all: true, verbatim: true }))

  await reconcileStaleBookingWebhookAttempts(eventId)
  const initialState = await getBookingWebhookState(eventId)
  if (initialState?.status === 'delivered') return { status: 'delivered', attempts: initialState.attempts }

  for (let localAttempt = 1; localAttempt <= 3; localAttempt += 1) {
    const delay = retryDelay(localAttempt, random)
    if (delay > 0) await sleep(delay)
    const claimed = await claimBookingWebhookAttempt(eventId)
    if (!claimed) {
      const state = await getBookingWebhookState(eventId)
      if (state?.status === 'delivered') return { status: 'delivered', attempts: state.attempts }
      return {
        status: state?.status === 'delivering' || state?.status === 'pending' ? 'pending' : 'failed',
        attempts: state?.attempts ?? 0,
      }
    }

    const parsed = bookingWebhookEventSchema.safeParse(claimed.payload)
    if (!parsed.success || parsed.data.eventId !== eventId) {
      await recordBookingWebhookFailed(eventId, 'invalid_payload')
      return { status: 'failed', attempts: claimed.attempts }
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    let retryable = true
    try {
      let destination: PinnedAddress
      try {
        // The attempt deadline starts before DNS. A slow resolver must not hold
        // the authoritative confirmation response open indefinitely.
        destination = await Promise.race([
          resolvePublicDestination(config, resolveHost),
          rejectOnAbort(controller.signal),
        ])
      } catch (error) {
        if (error instanceof PrivateDestinationError) {
          await recordBookingWebhookFailed(eventId, 'destination_rejected')
          return { status: 'failed', attempts: claimed.attempts }
        }
        await recordBookingWebhookFailed(eventId, 'dns_error')
        continue
      }

      const body = JSON.stringify(parsed.data)
      const timestamp = String(Math.floor(now() / 1_000))
      const headers = {
        'Content-Type': 'application/json',
        'Idempotency-Key': parsed.data.eventId,
        'X-Alove-Event': parsed.data.type,
        'X-Alove-Timestamp': timestamp,
        'X-Alove-Signature': signBookingWebhook(body, timestamp, config.secret),
      }
      const response = fetchImpl
        ? await fetchImpl(config.url, {
            method: 'POST',
            redirect: 'error',
            signal: controller.signal,
            headers,
            body,
          })
        : await postToPinnedDestination({
            config,
            destination,
            body,
            headers,
            signal: controller.signal,
          })
      if (response instanceof Response) void response.body?.cancel()
      if (response.ok) {
        await recordBookingWebhookDelivered(eventId)
        return { status: 'delivered', attempts: claimed.attempts }
      }
      retryable = shouldRetry(response.status)
      await recordBookingWebhookFailed(eventId, retryable ? 'transient_http' : 'permanent_http')
    } catch {
      await recordBookingWebhookFailed(eventId, 'network_error')
    } finally {
      clearTimeout(timeout)
    }
    if (!retryable) return { status: 'failed', attempts: claimed.attempts }
  }

  const finalState = await getBookingWebhookState(eventId)
  // Terminal: the retry budget is gone, so nothing will deliver this ticket to
  // the operator on its own. That is a paid seat the bus does not know about.
  reportIssue('[alove] booking webhook delivery failed', {
    level: 'error',
    context: {
      eventId,
      attempts: finalState?.attempts ?? 0,
      reason: 'retry_budget_exhausted',
    },
  })
  return { status: 'failed', attempts: finalState?.attempts ?? 0 }
}
