import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// Pilot-grade gate: one shared key in DASHBOARD_ACCESS_KEY, presented either as
// an httpOnly cookie (browser, set by the login form) or the x-dashboard-key
// header (curl/polling). Default closed — no env means no dashboard. This is
// NOT a full auth system; replace before any multi-tenant rollout.
export const DASHBOARD_COOKIE = 'alove-dashboard-session'
const DASHBOARD_SESSION_SECONDS = 12 * 60 * 60

export function dashboardAccessKey(): string | null {
  const key = process.env.DASHBOARD_ACCESS_KEY
  return key && key.length >= 32 ? key : null
}

export function keyMatches(candidate: string | null | undefined): boolean {
  const key = dashboardAccessKey()
  if (!key || !candidate) return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(key)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function hasDashboardCookie(): Promise<boolean> {
  const store = await cookies()
  return verifyDashboardSession(store.get(DASHBOARD_COOKIE)?.value)
}

function dashboardSessionSignature(expiresAt: string): string | null {
  const key = dashboardAccessKey()
  if (!key) return null
  return createHmac('sha256', key).update(`alove-dashboard-session:v1:${expiresAt}`).digest('base64url')
}

export function createDashboardSession(now = Date.now()): string {
  const expiresAt = String(Math.floor(now / 1000) + DASHBOARD_SESSION_SECONDS)
  const signature = dashboardSessionSignature(expiresAt)
  if (!signature) throw new Error('DASHBOARD_ACCESS_KEY is not configured')
  return `${expiresAt}.${signature}`
}

export function verifyDashboardSession(value: string | null | undefined, now = Date.now()): boolean {
  if (!value) return false
  const [expiresAt, provided, extra] = value.split('.')
  if (!expiresAt || !provided || extra || !/^\d+$/u.test(expiresAt)) return false
  if (Number(expiresAt) <= Math.floor(now / 1000)) return false
  const expected = dashboardSessionSignature(expiresAt)
  if (!expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function checkDashboardRequest(req: Request): boolean {
  if (keyMatches(req.headers.get('x-dashboard-key'))) return true
  const cookieHeader = req.headers.get('cookie') ?? ''
  return cookieHeader.split(';').some((part) => {
    const [name, ...rest] = part.trim().split('=')
    if (name !== DASHBOARD_COOKIE) return false
    try {
      return verifyDashboardSession(decodeURIComponent(rest.join('=')))
    } catch {
      return false
    }
  })
}
