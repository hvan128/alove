import type { ReactNode } from 'react'
import { OperationsAccessUnavailable, OperationsShell } from '@/components/operations/operations-shell'
import { getOperatorActor } from '@/lib/auth/operator-actor'

export default function OperationsLayout({ children }: { children: ReactNode }) {
  let actor
  try {
    actor = getOperatorActor(process.env)
  } catch (error) {
    if (error instanceof Error && error.message === 'OPERATOR_AUTH_UNCONFIGURED') {
      actor = null
    } else {
      throw error
    }
  }
  if (!actor) return <OperationsAccessUnavailable />
  const mode = process.env.DATABASE_URL ? 'neon' : 'memory'
  return <OperationsShell actor={actor} mode={mode}>{children}</OperationsShell>
}
