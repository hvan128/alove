import { checkDashboardRequest } from '@/lib/dashboard-auth'
import { listRecentCalls } from '@/lib/db/dashboard-store'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  if (!checkDashboardRequest(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const callList = await listRecentCalls()
  if (callList === null) {
    return Response.json({ configured: false, calls: [] })
  }
  return Response.json({ configured: true, calls: callList })
}
