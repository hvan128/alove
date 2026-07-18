import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// Pilot-grade gate: one shared key in DASHBOARD_ACCESS_KEY, presented either as
// an httpOnly cookie (browser, set by the login form) or the x-dashboard-key
// header (curl/polling). Default closed — no env means no dashboard. This is
// NOT a full auth system; replace before any multi-tenant rollout.
export const DASHBOARD_COOKIE = 'alove-dashboard-key'

export function dashboardAccessKey(): string | null {
  const key = process.env.DASHBOARD_ACCESS_KEY
  return key && key.length >= 8 ? key : null
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
  return keyMatches(store.get(DASHBOARD_COOKIE)?.value)
}

export function checkDashboardRequest(req: Request): boolean {
  if (keyMatches(req.headers.get('x-dashboard-key'))) return true
  const cookieHeader = req.headers.get('cookie') ?? ''
  return cookieHeader.split(';').some((part) => {
    const [name, ...rest] = part.trim().split('=')
    return name === DASHBOARD_COOKIE && keyMatches(decodeURIComponent(rest.join('=')))
  })
}
