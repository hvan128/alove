import { operatorRoleSchema, type OperatorActor } from '@ordervoice/contracts'
import { z, ZodError } from 'zod'
import { getOperatorActor } from '../auth/operator-actor'
import { requirePermission } from '../auth/operator-permissions'
import { normalizeSessionCode } from '../livekit/server'
import { createOwnershipRepository, type AuditQuery, type OwnershipRepository } from './ownership-repository'

export type OperationsHttpDependencies = {
  getActor: () => OperatorActor
  getRepository: () => OwnershipRepository
  now: () => string
}

export type SessionContext = { params: Promise<{ sessionCode: string }> }

const defaultDependencies: OperationsHttpDependencies = {
  getActor: () => getOperatorActor(process.env),
  getRepository: () => createOwnershipRepository(),
  now: () => new Date().toISOString(),
}

const reasonBodySchema = z.object({ reason: z.string() }).strict()
const reassignBodySchema = z.object({
  toId: z.string().min(1),
  toRole: operatorRoleSchema,
  reason: z.string(),
}).strict()

const MAX_AUDIT_LIMIT = 100

export async function acceptCallRequest(
  _request: Request,
  context: SessionContext,
  dependencies: OperationsHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requirePermission(actor, 'call.accept')
    const sessionCode = normalizeSessionCode((await context.params).sessionCode)
    return json(await dependencies.getRepository().accept(sessionCode, actor, dependencies.now()))
  })
}

export async function delegateCallRequest(
  _request: Request,
  context: SessionContext,
  dependencies: OperationsHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requirePermission(actor, 'call.delegate')
    const sessionCode = normalizeSessionCode((await context.params).sessionCode)
    return json(await dependencies.getRepository().delegate(sessionCode, actor, dependencies.now()))
  })
}

export async function takeoverCallRequest(
  request: Request,
  context: SessionContext,
  dependencies: OperationsHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requirePermission(actor, 'call.takeover')
    const sessionCode = normalizeSessionCode((await context.params).sessionCode)
    const { reason } = reasonBodySchema.parse(await request.json())
    return json(await dependencies.getRepository().takeover(sessionCode, actor, dependencies.now(), reason))
  })
}

export async function releaseCallRequest(
  _request: Request,
  context: SessionContext,
  dependencies: OperationsHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requirePermission(actor, 'call.release')
    const sessionCode = normalizeSessionCode((await context.params).sessionCode)
    return json(await dependencies.getRepository().release(sessionCode, actor, dependencies.now()))
  })
}

export async function reassignCallRequest(
  request: Request,
  context: SessionContext,
  dependencies: OperationsHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requirePermission(actor, 'call.reassign')
    const sessionCode = normalizeSessionCode((await context.params).sessionCode)
    const body = reassignBodySchema.parse(await request.json())
    return json(await dependencies.getRepository().reassign(
      sessionCode,
      actor,
      { id: body.toId, role: body.toRole, demo: actor.demo },
      dependencies.now(),
      body.reason,
    ))
  })
}

export async function listAuditRequest(
  request: Request,
  dependencies: OperationsHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requirePermission(actor, 'audit.view')
    const url = new URL(request.url)
    const session = url.searchParams.get('session')
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
    const query: AuditQuery = {}
    if (session) query.sessionCode = normalizeSessionCode(session)
    if (Number.isFinite(limit)) query.limit = Math.min(Math.max(limit, 1), MAX_AUDIT_LIMIT)
    const events = await dependencies.getRepository().listAudit(query)
    return json({ mode: dependencies.getRepository().mode, events })
  })
}

export function operationsError(error: unknown): Response {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return json({ error: 'INVALID_OPERATIONS_REQUEST' }, 400)
  }
  const code = error instanceof Error ? error.message : 'OPERATIONS_REQUEST_FAILED'
  const status = code === 'FORBIDDEN'
    ? 403
    : code === 'CALL_ALREADY_OWNED'
      ? 409
      // A missing reason is a well-formed request the policy refuses, not a
      // parse failure — 422 keeps it distinct from a malformed body.
      : code === 'TAKEOVER_REASON_REQUIRED' || code === 'REASSIGN_REASON_REQUIRED'
        ? 422
        : code === 'CALL_NOT_OWNED' || code === 'AGENT_NOT_DELEGATED' || code === 'AGENT_ALREADY_DELEGATED'
          ? 409
          : code === 'OPERATOR_AUTH_UNCONFIGURED'
            ? 503
            : 400
  return json({ error: code }, status)
}

async function handle(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action()
  } catch (error) {
    return operationsError(error)
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
