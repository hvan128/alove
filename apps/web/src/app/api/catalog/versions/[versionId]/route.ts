import { getVersion, saveVersion, type CatalogRouteContext } from '@/lib/catalog/catalog-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: CatalogRouteContext): Promise<Response> {
  return getVersion(request, context)
}

export async function PUT(request: Request, context: CatalogRouteContext): Promise<Response> {
  return saveVersion(request, context)
}
