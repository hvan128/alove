import { OperationsDashboard } from '@/components/operations/operations-dashboard'
import { getOperatorActor } from '@/lib/auth/operator-actor'
import { createOperationsRepository } from '@/lib/operations/operations-repository'

export const dynamic = 'force-dynamic'

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.q) ? params.q[0] : params.q
  const query = raw?.trim() ?? ''
  // The layout already fails closed when operator auth is unconfigured, so an
  // actor is guaranteed here; the role decides which controls the page renders.
  const actor = getOperatorActor(process.env)
  const snapshot = await createOperationsRepository().getDashboard(
    new Date().toISOString(),
    query ? { query } : undefined,
  )
  return <OperationsDashboard snapshot={snapshot} role={actor.role} query={query} />
}
