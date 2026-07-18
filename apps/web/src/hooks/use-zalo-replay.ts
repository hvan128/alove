'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TranscriptSegment } from '@ordervoice/contracts'
import { createMediaSocketUrl } from '@/lib/gateway'

export type ReplayState = 'idle' | 'ready' | 'connecting' | 'playing' | 'error'
export type ReplayMediaKind = 'audio' | 'video'

type ReplayResources = {
  context: AudioContext
  source: MediaElementAudioSourceNode
  worklet: AudioWorkletNode
  mute: GainNode
  socket?: WebSocket
}

type UseZaloReplayOptions = {
  conversationId: string
  gatewayUrl?: string
  onTranscript?: (segment: TranscriptSegment) => void
  onStatus?: (detail: string) => void
}

// VALSEA finalizes on its own endpointing schedule, not when playback ends —
// closing the socket the instant the media element fires `ended` can cut the
// session before a final transcript arrives for a clip with no trailing
// silence. Give it a grace window to finish before tearing the session down.
const END_OF_PLAYBACK_GRACE_MS = 2500

export function useZaloReplay({ conversationId, gatewayUrl, onTranscript, onStatus }: UseZaloReplayOptions) {
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const resources = useRef<ReplayResources | null>(null)
  const objectUrl = useRef<string | null>(null)
  const endGraceTimer = useRef<number | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [mediaKind, setMediaKind] = useState<ReplayMediaKind>('audio')
  const [mediaKey, setMediaKey] = useState(0)
  const [state, setState] = useState<ReplayState>('idle')
  const onTranscriptRef = useRef(onTranscript)
  const onStatusRef = useRef(onStatus)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])
  useEffect(() => {
    onStatusRef.current = onStatus
  }, [onStatus])

  const setMediaElement = useCallback((element: HTMLMediaElement | null) => {
    mediaRef.current = element
  }, [])

  const disconnect = useCallback(() => {
    if (endGraceTimer.current !== null) {
      window.clearTimeout(endGraceTimer.current)
      endGraceTimer.current = null
    }
    const current = resources.current
    if (!current) return
    current.worklet.port.postMessage({ type: 'stop' })
    current.source.disconnect()
    current.worklet.disconnect()
    current.mute.disconnect()
    if (current.socket?.readyState === WebSocket.OPEN) current.socket.send(JSON.stringify({ type: 'stop' }))
    current.socket?.close()
    void current.context.close()
    resources.current = null
  }, [])

  const stop = useCallback(() => {
    const media = mediaRef.current
    if (media) {
      media.pause()
      media.onended = null
    }
    disconnect()
    setState(url ? 'ready' : 'idle')
    setMediaKey((current) => current + 1)
  }, [disconnect, url])

  const selectFile = useCallback((file: File | null) => {
    mediaRef.current?.pause()
    disconnect()
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    if (!file) {
      objectUrl.current = null
      setUrl(null)
      setFileName(null)
      setState('idle')
      setMediaKey((current) => current + 1)
      return
    }
    const nextUrl = URL.createObjectURL(file)
    objectUrl.current = nextUrl
    setUrl(nextUrl)
    setFileName(file.name)
    setMediaKind(file.type.startsWith('video/') ? 'video' : 'audio')
    setState('ready')
    setMediaKey((current) => current + 1)
    onStatusRef.current?.(`Đã chọn Zalo replay: ${file.name}. Chỉ phát sau thao tác người.`)
  }, [disconnect])

  const start = useCallback(async () => {
    const media = mediaRef.current
    if (!media || !url) {
      setState('error')
      onStatusRef.current?.('Chọn audio hoặc video trước khi phát replay.')
      return
    }
    if (!window.AudioContext || !window.AudioWorkletNode) {
      setState('error')
      onStatusRef.current?.('Trình duyệt không hỗ trợ AudioWorklet cho Zalo replay.')
      return
    }

    disconnect()
    setState(gatewayUrl ? 'connecting' : 'playing')
    try {
      const context = new AudioContext()
      await context.audioWorklet.addModule('/worklets/pcm16-capture.js')
      const source = context.createMediaElementSource(media)
      const worklet = new AudioWorkletNode(context, 'pcm16-capture', { processorOptions: { targetSampleRate: 16000, frameSamples: 320 } })
      const mute = context.createGain()
      mute.gain.value = 0
      source.connect(worklet)
      worklet.connect(mute)
      mute.connect(context.destination)
      source.connect(context.destination)

      let socket: WebSocket | undefined
      const pendingFrames: ArrayBuffer[] = []
      if (gatewayUrl) {
        socket = new WebSocket(createMediaSocketUrl(gatewayUrl, conversationId, 'replay'))
        socket.binaryType = 'arraybuffer'
        socket.onopen = () => {
          socket?.send(JSON.stringify({ type: 'start', source: 'replay', trackId: 'zalo-replay' }))
          for (const frame of pendingFrames.splice(0)) socket?.send(frame)
          setState('playing')
          onStatusRef.current?.('Zalo replay đang gửi PCM16 16 kHz đến gateway.')
        }
        socket.onmessage = (event) => {
          if (typeof event.data !== 'string') return
          try {
            const payload = JSON.parse(event.data) as { type?: string; segment?: Omit<TranscriptSegment, 'id' | 'conversationId'>; detail?: string }
            if ((payload.type === 'transcript.partial' || payload.type === 'transcript.final') && payload.segment) {
              onTranscriptRef.current?.({ ...payload.segment, id: `${payload.type}-${Date.now()}`, conversationId })
            }
            if (payload.type === 'source.status' && payload.detail) onStatusRef.current?.(payload.detail)
          } catch {
            onStatusRef.current?.('Gateway gửi sự kiện replay không hợp lệ.')
          }
        }
        socket.onerror = () => {
          if (resources.current?.socket !== socket) return
          setState('error')
          onStatusRef.current?.('Không kết nối được gateway cho Zalo replay.')
        }
      } else {
        onStatusRef.current?.('Zalo replay đang phát cục bộ. Cấu hình NEXT_PUBLIC_GATEWAY_URL để transcript realtime.')
      }

      worklet.port.onmessage = (event: MessageEvent<{ type?: string; pcm?: ArrayBuffer }>) => {
        if (event.data.type !== 'pcm16' || !event.data.pcm || !socket) return
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data.pcm)
        } else if (pendingFrames.length < 250) {
          pendingFrames.push(event.data.pcm)
        }
      }
      media.onended = () => {
        if (!socket) {
          stop()
          return
        }
        onStatusRef.current?.('Đã phát hết audio, đang chờ lõi giọng nói chốt câu cuối…')
        endGraceTimer.current = window.setTimeout(() => {
          endGraceTimer.current = null
          stop()
        }, END_OF_PLAYBACK_GRACE_MS)
      }
      resources.current = { context, source, worklet, mute, ...(socket ? { socket } : {}) }
      await context.resume()
      await media.play()
    } catch {
      disconnect()
      setState('error')
      onStatusRef.current?.('Không thể phát hoặc xử lý tệp Zalo replay.')
    }
  }, [conversationId, disconnect, gatewayUrl, stop, url])

  useEffect(() => () => {
    disconnect()
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
  }, [disconnect])

  return { setMediaElement, url, fileName, mediaKind, mediaKey, state, selectFile, start, stop }
}
