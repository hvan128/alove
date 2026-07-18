import { getSyncStatus, triggerSync } from '@/lib/catalog/catalog-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  return getSyncStatus(request)
}

export async function POST(request: Request): Promise<Response> {
  return triggerSync(request)
}
