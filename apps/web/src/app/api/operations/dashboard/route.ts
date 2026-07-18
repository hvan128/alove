import type { OperatorActor } from '@ordervoice/contracts'
import { getOperatorActor, requireOperatorRole } from '@/lib/auth/operator-actor'
import { createOperationsRepository, type OperationsRepository } from '@/lib/operations/operations-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DashboardDependencies = {
  getActor: () => OperatorActor
  getRepository: () => OperationsRepository
  now: () => string
}

const defaultDependencies: DashboardDependencies = {
  getActor: () => getOperatorActor(process.env),
  getRepository: () => createOperationsRepository(),
  now: () => new Date().toISOString(),
}

export async function getOperationsDashboard(
  dependencies: DashboardDependencies = defaultDependencies,
  query?: string,
): Promise<Response> {
  try {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care', 'read-only'])
    const snapshot = await dependencies.getRepository().getDashboard(
      dependencies.now(),
      query ? { query } : undefined,
    )
    return Response.json(snapshot, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'OPERATIONS_DASHBOARD_FAILED'
    const status = code === 'FORBIDDEN' ? 403 : code === 'OPERATOR_AUTH_UNCONFIGURED' ? 503 : 500
    return Response.json({ error: code }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}

export function GET(request: Request): Promise<Response> {
  return getOperationsDashboard(defaultDependencies, new URL(request.url).searchParams.get('q') ?? undefined)
}
