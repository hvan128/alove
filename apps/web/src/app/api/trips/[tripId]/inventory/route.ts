import { getTripInventory, type TripContext } from '@/lib/inventory/inventory-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(request: Request, context: TripContext): Promise<Response> {
  return getTripInventory(request, context)
}
