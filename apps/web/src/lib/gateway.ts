import type { Source } from '@ordervoice/contracts'

export function createMediaSocketUrl(gatewayUrl: string, conversationId: string, source: Source): string {
  const url = new URL(gatewayUrl)
  if (url.protocol === 'https:') {
    url.protocol = 'wss:'
  } else if (url.protocol === 'http:') {
    url.protocol = 'ws:'
  }
  url.pathname = `${url.pathname.replace(/\/$/u, '')}/ws/media/${encodeURIComponent(conversationId)}`
  url.search = new URLSearchParams({ source }).toString()
  return url.toString()
}
