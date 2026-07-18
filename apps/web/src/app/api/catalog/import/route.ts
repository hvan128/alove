import { importCatalogCsv } from '@/lib/catalog/catalog-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  return importCatalogCsv(request)
}
