import { roomEventSchema } from '@ordervoice/contracts'
import {
  createSessionRepository,
  normalizeSessionCode,
} from '@/lib/db/session-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ sessionCode: string }> }

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const sessionCode = normalizeSessionCode((await context.params).sessionCode)
    const repository = createSessionRepository()
    return Response.json({
      mode: repository.mode,
      durable: repository.mode === 'neon',
      sessionCode,
      events: await repository.list(sessionCode),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return invalidRequest(error)
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const sessionCode = normalizeSessionCode((await context.params).sessionCode)
    const parsed = roomEventSchema.parse(await request.json())
    if (parsed.sessionCode !== sessionCode) {
      return Response.json({
        error: 'SESSION_MISMATCH',
        message: 'Sự kiện không thuộc phiên trong URL.',
      }, { status: 409 })
    }
    const repository = createSessionRepository()
    const result = await repository.append(parsed)
    return Response.json({
      mode: repository.mode,
      durable: repository.mode === 'neon',
      ...result,
    }, { status: result.duplicate ? 200 : 201 })
  } catch (error) {
    return invalidRequest(error)
  }
}

function invalidRequest(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Yêu cầu lưu phiên không hợp lệ.'
  return Response.json({ error: 'INVALID_SESSION_EVENT', message }, { status: 400 })
}
