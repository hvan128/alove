import type { NormalizedAudioFrame } from '@ordervoice/contracts'
import { decodeMuLaw, resamplePcm16 } from '@ordervoice/core'
import twilio from 'twilio'

export type TwilioMediaEvent = {
  event: 'media'
  streamSid: string
  media: {
    track: 'inbound' | 'outbound'
    chunk: string
    timestamp: string
    payload: string
  }
}

export function parseTwilioMedia(event: TwilioMediaEvent, conversationId: string): NormalizedAudioFrame {
  const encoded = Buffer.from(event.media.payload, 'base64')
  const pcm8k = decodeMuLaw(encoded)
  const chunk = Number(event.media.chunk)
  const timestamp = Number(event.media.timestamp)

  return {
    sessionId: conversationId,
    source: 'telephony',
    trackId: `${event.streamSid}:${event.media.track}`,
    speaker: event.media.track === 'outbound' ? 'agent' : 'caller',
    sequence: Number.isInteger(chunk) && chunk >= 0 ? chunk : 0,
    capturedAtMs: Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : 0,
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_s16le',
    pcm: resamplePcm16(pcm8k, 8000, 16000),
  }
}

export function createTwilioStreamTwiml(streamUrl: string, conversationId: string): string {
  const safeUrl = escapeXml(streamUrl)
  const safeConversationId = escapeXml(conversationId)
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${safeUrl}"><Parameter name="conversationId" value="${safeConversationId}" /></Stream></Connect></Response>`
}

export function isValidTwilioWebhook({
  authToken,
  signature,
  url,
  params,
}: {
  authToken: string | undefined
  signature: string | undefined
  url: string
  params: Record<string, string>
}): boolean {
  if (!authToken || !signature) return false
  return twilio.validateRequest(authToken, signature, url, params)
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/gu, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;',
    }
    return entities[character] ?? character
  })
}
