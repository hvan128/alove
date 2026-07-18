import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// Pilot-grade gate: one shared key in DASHBOARD_ACCESS_KEY, presented either as
// an httpOnly cookie (browser, set by the login form) or the x-dashboard-key
// header (curl/polling). Default closed — no env means no dashboard. This is
// NOT a full auth system; replace before any multi-tenant rollout.
export const DASHBOARD_COOKIE = 'vedi-dashboard-key'

export function dashboardAccessKey(): string | null {
  const key = process.env.DASHBOARD_ACCESS_KEY
  return key && key.length >= 8 ? key : null
}

export async function hasDashboardCookie(): Promise<boolean> {
  const key = dashboardAccessKey()
  if (!key) return false
  const store = await cookies()
  return store.get(DASHBOARD_COOKIE)?.value === key
}

export function checkDashboardRequest(req: Request): boolean {
  const key = dashboardAccessKey()
  if (!key) return false
  if (req.headers.get('x-dashboard-key') === key) return true
  const cookieHeader = req.headers.get('cookie') ?? ''
  return cookieHeader
    .split(';')
    .some((part) => {
      const [name, ...rest] = part.trim().split('=')
      return name === DASHBOARD_COOKIE && decodeURIComponent(rest.join('=')) === key
    })
}
