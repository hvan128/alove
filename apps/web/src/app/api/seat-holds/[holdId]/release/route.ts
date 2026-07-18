import { releaseHold, type HoldContext } from '@/lib/inventory/inventory-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: Request, context: HoldContext): Promise<Response> {
  return releaseHold(request, context)
}
