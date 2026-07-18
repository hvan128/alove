import { timingSafeEqual } from 'node:crypto'

/**
 * Shared guard for the endpoints the voice agent calls. These are the only write
 * path into real inventory, so they never run without the shared secret.
 */
export type AgentAuthFailure = { response: Response }

export function isAgentWebhookConfigured(): boolean {
  const secret = process.env.AGENT_WEBHOOK_SECRET
  return Boolean(secret && Buffer.byteLength(secret) >= 32)
}

export function requireAgent(req: Request): AgentAuthFailure | null {
  const secret = process.env.AGENT_WEBHOOK_SECRET
  if (!isAgentWebhookConfigured() || !secret) {
    return { response: Response.json({ error: 'agent_secret_not_configured' }, { status: 503 }) }
  }
  const candidate = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  const candidateBytes = Buffer.from(candidate)
  const expectedBytes = Buffer.from(expected)
  if (
    candidateBytes.length !== expectedBytes.length
    || !timingSafeEqual(candidateBytes, expectedBytes)
  ) {
    return { response: Response.json({ error: 'unauthorized' }, { status: 401 }) }
  }
  return null
}
