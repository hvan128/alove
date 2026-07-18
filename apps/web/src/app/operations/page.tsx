import { OperationsDashboard } from '@/components/operations/operations-dashboard'
import { createOperationsRepository } from '@/lib/operations/operations-repository'

export const dynamic = 'force-dynamic'

export default async function OperationsPage() {
  const snapshot = await createOperationsRepository().getDashboard(new Date().toISOString())
  return <OperationsDashboard snapshot={snapshot} />
}
