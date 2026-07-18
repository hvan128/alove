type RateLimitOptions = { limit: number; windowMs: number }
type Bucket = { count: number; resetsAt: number }

const buckets = new Map<string, Bucket>()

export function requestIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

export function consumeRateLimit(
  key: string,
  options: RateLimitOptions,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const existing = buckets.get(key)
  const bucket = !existing || existing.resetsAt <= now
    ? { count: 0, resetsAt: now + options.windowMs }
    : existing
  bucket.count += 1
  buckets.set(key, bucket)

  return {
    allowed: bucket.count <= options.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000)),
  }
}

export function resetRateLimitsForTests(): void {
  buckets.clear()
}
