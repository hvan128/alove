import { transcribeWithOpenAiBaseline } from '@ordervoice/providers'

export const runtime = 'nodejs'

// Generic-ASR comparison for the /engine test screen — not part of the booking
// write path, no secret/auth boundary needed, only ever reads an uploaded clip
// back out as text.
export async function POST(req: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'openai_not_configured' }, { status: 503 })
  }

  const form = await req.formData().catch(() => null)
  const audio = form?.get('audio')
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: 'audio file is required' }, { status: 400 })
  }

  try {
    const text = await transcribeWithOpenAiBaseline(audio)
    return Response.json({ text })
  } catch (error) {
    return Response.json({ error: messageFrom(error) }, { status: 502 })
  }
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'baseline transcription failed'
}
