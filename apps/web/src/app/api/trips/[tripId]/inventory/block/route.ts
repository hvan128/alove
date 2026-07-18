import { blockTripSeats, type TripContext } from '@/lib/inventory/inventory-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: Request, context: TripContext): Promise<Response> {
  return blockTripSeats(request, context)
}
