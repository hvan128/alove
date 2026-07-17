import { createLiveKitToken, LiveKitConfigurationError } from '@/lib/livekit/server'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as Record<string, unknown>
    if (
      typeof body.sessionCode !== 'string'
      || (body.role !== 'caller' && body.role !== 'staff')
      || typeof body.displayName !== 'string'
    ) {
      return Response.json({
        error: 'INVALID_REQUEST',
        message: 'Cần mã phiên, vai trò và tên hiển thị hợp lệ.',
      }, { status: 400 })
    }

    const details = await createLiveKitToken({
      sessionCode: body.sessionCode,
      role: body.role,
      displayName: body.displayName,
    })
    return Response.json(details, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof LiveKitConfigurationError) {
      return Response.json({ error: error.code, message: error.message }, { status: 503 })
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'INVALID_JSON', message: 'Nội dung JSON không hợp lệ.' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Không thể tạo quyền tham gia cuộc gọi.'
    return Response.json({ error: 'TOKEN_FAILED', message }, { status: 400 })
  }
}
