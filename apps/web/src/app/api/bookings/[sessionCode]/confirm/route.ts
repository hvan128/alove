import { confirmHeldBooking, type BookingContext } from '@/lib/inventory/inventory-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: Request, context: BookingContext): Promise<Response> {
  return confirmHeldBooking(request, context)
}
