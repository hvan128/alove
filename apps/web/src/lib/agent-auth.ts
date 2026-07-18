/**
 * Shared guard for the endpoints the voice agent calls. These are the only write
 * path into real inventory, so they never run without the shared secret.
 */
export type AgentAuthFailure = { response: Response }

export function requireAgent(req: Request): AgentAuthFailure | null {
  const secret = process.env.AGENT_WEBHOOK_SECRET
  if (!secret) {
    return { response: Response.json({ error: 'agent_secret_not_configured' }, { status: 503 }) }
  }
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return { response: Response.json({ error: 'unauthorized' }, { status: 401 }) }
  }
  return null
}
