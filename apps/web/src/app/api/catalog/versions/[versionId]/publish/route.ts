import { publishVersion, type CatalogRouteContext } from '@/lib/catalog/catalog-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: CatalogRouteContext): Promise<Response> {
  return publishVersion(request, context)
}
