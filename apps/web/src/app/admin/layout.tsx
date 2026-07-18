import type { ReactNode } from 'react'
import { OperationsAccessUnavailable, OperationsShell } from '@/components/operations/operations-shell'
import { getOperatorActor, requireOperatorRole } from '@/lib/auth/operator-actor'

export default function AdminLayout({ children }: { children: ReactNode }) {
  let actor
  try {
    actor = getOperatorActor(process.env)
    requireOperatorRole(actor, ['admin', 'dispatcher'])
  } catch (error) {
    if (error instanceof Error && ['OPERATOR_AUTH_UNCONFIGURED', 'FORBIDDEN'].includes(error.message)) {
      actor = null
    } else {
      throw error
    }
  }
  if (!actor) return <OperationsAccessUnavailable />
  const mode = process.env.DATABASE_URL ? 'neon' : 'memory'
  return <OperationsShell actor={actor} mode={mode}>{children}</OperationsShell>
}
