import { operatorRoleSchema, type OperatorActor, type OperatorRole } from '@ordervoice/contracts'

// Identity seam. This module consumes an already-authenticated actor and never
// authenticates one itself — choosing a staff identity provider is an explicit
// non-goal of the approved operations design. Three sources, in priority order:
//
//   1. OPERATOR_DEMO_MODE  — deterministic local/demo actor, opt-in only.
//   2. x-operator-id/-role — set by the upstream IdP or gateway, never by a browser.
//   3. OPERATOR_STAFF_DIRECTORY — authoritative role map when configured.
//
// Default closed: no configured source means no operator surface at all.
export function getOperatorActor(
  env: Record<string, string | undefined>,
  headers?: Headers,
): OperatorActor {
  if (env.OPERATOR_DEMO_MODE === 'true') {
    const role = parseRole(env.OPERATOR_DEMO_ROLE ?? 'admin')
    return { id: `demo-${role}`, role, demo: true }
  }

  const id = headers?.get('x-operator-id')?.trim()
  if (!id) throw new Error('OPERATOR_AUTH_UNCONFIGURED')

  const directory = parseStaffDirectory(env.OPERATOR_STAFF_DIRECTORY)
  if (directory) {
    // A configured directory outranks the header role, so a compromised or
    // stale header cannot escalate an identity beyond what the operator granted.
    const role = directory.get(id)
    if (!role) throw new Error('OPERATOR_UNKNOWN_IDENTITY')
    return { id, role, demo: false }
  }

  const headerRole = headers?.get('x-operator-role')?.trim()
  if (!headerRole) throw new Error('OPERATOR_AUTH_UNCONFIGURED')
  return { id, role: parseRole(headerRole), demo: false }
}

export function requireOperatorRole(actor: OperatorActor, roles: OperatorRole[]): void {
  if (!roles.includes(actor.role)) throw new Error('FORBIDDEN')
}

function parseRole(value: string): OperatorRole {
  const parsed = operatorRoleSchema.safeParse(value)
  if (!parsed.success) throw new Error('OPERATOR_ROLE_INVALID')
  return parsed.data
}

function parseStaffDirectory(value: string | undefined): Map<string, OperatorRole> | null {
  const raw = value?.trim()
  if (!raw) return null
  const directory = new Map<string, OperatorRole>()
  for (const entry of raw.split(',')) {
    const [id, role] = entry.split(':').map((part) => part.trim())
    if (!id || !role) continue
    directory.set(id, parseRole(role))
  }
  return directory.size > 0 ? directory : null
}
