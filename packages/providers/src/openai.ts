import OpenAI from 'openai'
import { orderPatchSchema, type OrderPatch, type TranscriptSegment } from '@ordervoice/contracts'

let client: OpenAI | undefined

export function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for the explicit development fallback')
  }

  client ??= new OpenAI({ apiKey })
  return client
}

export async function proposeOpenAiOrderPatch(segment: TranscriptSegment): Promise<OrderPatch> {
  const response = await getOpenAiClient().responses.create({
    model: process.env.OPENAI_EXTRACTION_MODEL ?? 'gpt-4o-mini',
    input: `Extract only an order patch from this final Vietnamese sales utterance. Preserve Vietnamese spelling. Return JSON with sourceSegmentId, optional customerName, optional notes, and lines. Every line needs id, productLabel, sku|null, quantity|null, unit|null, resolution, and evidence with the original quote. Never invent price, stock, customer ID, or evidence.\n\nsegmentId=${segment.id}\ntext=${segment.text}`,
    text: { format: { type: 'json_object' } },
  })

  return orderPatchSchema.parse(JSON.parse(response.output_text))
}

export async function synthesizeOpenAiSpeech(text: string): Promise<Uint8Array> {
  const response = await getOpenAiClient().audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts',
    voice: 'alloy',
    input: text,
  })

  return new Uint8Array(await response.arrayBuffer())
}

// Generic global ASR baseline for side-by-side comparison against the
// accent/code-switch-aware engine — Whisper by default, unprompted (no
// Vietnamese hint), so the comparison shows what a generic engine does on
// its own rather than one already tuned toward Vietnamese.
export async function transcribeWithOpenAiBaseline(audio: File): Promise<string> {
  const response = await getOpenAiClient().audio.transcriptions.create({
    file: audio,
    model: process.env.OPENAI_TRANSCRIBE_MODEL ?? 'whisper-1',
  })

  return response.text
}
