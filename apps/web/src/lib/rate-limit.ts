/**
 * Fixed-window counter, held in process memory.
 *
 * Deliberately small: the ticket lookup is guarded by a 4-digit secret, so an
 * unthrottled attacker needs only ~10k requests to open any ticket whose code
 * they guessed. Even a leaky limiter turns that into hours instead of seconds.
 *
 * Known limit: on serverless each instance keeps its own map, so the real budget
 * is roughly `limit × instances`. That is a weaker guarantee than it looks, and
 * the honest fix if this ever faces real traffic is a shared store (Upstash,
 * Vercel KV). Documented here rather than left for someone to discover.
 */

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

// Unbounded growth would be a slow leak on a long-lived instance.
const MAX_TRACKED_KEYS = 10_000

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number }

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const existing = windows.get(key)

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) sweepExpired(now)
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  existing.count += 1
  if (existing.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

function sweepExpired(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key)
  }
}

/**
 * Best-effort client address. Behind Vercel the left-most x-forwarded-for entry
 * is the real client; a direct request has no header at all, and everything
 * unattributable shares one bucket rather than escaping the limit entirely.
 */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  return first || req.headers.get('x-real-ip') || 'unknown'
}

export function resetRateLimitForTests(): void {
  windows.clear()
}
