import { checkDashboardRequest } from '@/lib/dashboard-auth'
import { getCallDetail } from '@/lib/db/dashboard-store'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ callId: string }> },
): Promise<Response> {
  if (!checkDashboardRequest(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { callId } = await params
  const detail = await getCallDetail(callId)
  if (!detail) {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }
  return Response.json(detail)
}
