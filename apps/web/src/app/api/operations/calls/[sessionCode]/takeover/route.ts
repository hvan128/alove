import { takeoverCallRequest, type SessionContext } from '@/lib/operations/operations-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: Request, context: SessionContext): Promise<Response> {
  return takeoverCallRequest(request, context)
}
