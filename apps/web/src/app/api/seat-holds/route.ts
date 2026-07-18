import { holdSeats } from '@/lib/inventory/inventory-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: Request): Promise<Response> {
  return holdSeats(request)
}
