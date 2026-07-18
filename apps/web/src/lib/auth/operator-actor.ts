import type { OperatorActor, OperatorRole } from '@ordervoice/contracts'

export function getOperatorActor(env: Record<string, string | undefined>): OperatorActor {
  if (env.OPERATOR_DEMO_MODE === 'true') {
    return { id: 'demo-admin', role: 'admin', demo: true }
  }
  throw new Error('OPERATOR_AUTH_UNCONFIGURED')
}

export function requireOperatorRole(actor: OperatorActor, roles: OperatorRole[]): void {
  if (!roles.includes(actor.role)) throw new Error('FORBIDDEN')
}
