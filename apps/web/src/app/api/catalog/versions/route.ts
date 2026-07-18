import { createVersion, listVersions } from '@/lib/catalog/catalog-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  return listVersions(request)
}

export async function POST(request: Request): Promise<Response> {
  return createVersion(request)
}
