import { listAuditRequest } from '@/lib/operations/operations-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(request: Request): Promise<Response> {
  return listAuditRequest(request)
}
