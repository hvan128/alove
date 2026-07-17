'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Source, TranscriptSegment } from '@ordervoice/contracts'
import { createMediaSocketUrl } from '@/lib/gateway'

export type AudioCaptureState = 'idle' | 'requesting' | 'connecting' | 'live' | 'denied' | 'error'

type UseNormalizedAudioCaptureOptions = {
  conversationId: string
  source: Source
  gatewayUrl?: string
  onTranscript?: (segment: TranscriptSegment) => void
  onStatus?: (detail: string) => void
}

type CaptureResources = {
  stream: MediaStream
  context: AudioContext
  source: MediaStreamAudioSourceNode
  worklet: AudioWorkletNode
  mute: GainNode
  socket?: WebSocket
}

export function useNormalizedAudioCapture({ conversationId, source, gatewayUrl, onTranscript, onStatus }: UseNormalizedAudioCaptureOptions) {
  const [state, setState] = useState<AudioCaptureState>('idle')
  const resources = useRef<CaptureResources | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  const onStatusRef = useRef(onStatus)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    onStatusRef.current = onStatus
  }, [onStatus])

  const stop = useCallback(() => {
    const current = resources.current
    if (!current) {
      setState('idle')
      return
    }
    current.worklet.port.postMessage({ type: 'stop' })
    current.source.disconnect()
    current.worklet.disconnect()
    current.mute.disconnect()
    current.stream.getTracks().forEach((track) => track.stop())
    if (current.socket?.readyState === WebSocket.OPEN) {
      current.socket.send(JSON.stringify({ type: 'stop' }))
    }
    current.socket?.close()
    void current.context.close()
    resources.current = null
    setState('idle')
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode) {
      setState('denied')
      onStatusRef.current?.('Trình duyệt không hỗ trợ AudioWorklet hoặc microphone.')
      return
    }

    stop()
    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      const context = new AudioContext()
      await context.audioWorklet.addModule('/worklets/pcm16-capture.js')
      const sourceNode = context.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(context, 'pcm16-capture', { processorOptions: { targetSampleRate: 16000, frameSamples: 320 } })
      const mute = context.createGain()
      mute.gain.value = 0
      sourceNode.connect(worklet)
      worklet.connect(mute)
      mute.connect(context.destination)

      let socket: WebSocket | undefined
      if (gatewayUrl) {
        setState('connecting')
        socket = new WebSocket(createMediaSocketUrl(gatewayUrl, conversationId, source))
        socket.binaryType = 'arraybuffer'
        socket.onopen = () => {
          socket?.send(JSON.stringify({ type: 'start', source, trackId: 'browser-mic' }))
          setState('live')
          onStatusRef.current?.('PCM16 16 kHz đang gửi đến gateway.')
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
            onStatusRef.current?.('Gateway gửi một sự kiện không hợp lệ.')
          }
        }
        socket.onerror = () => {
          setState('error')
          onStatusRef.current?.('Không kết nối được gateway audio.')
        }
      } else {
        setState('live')
        onStatusRef.current?.('Mic đang mở cục bộ. Cấu hình NEXT_PUBLIC_GATEWAY_URL để stream ASR.')
      }

      worklet.port.onmessage = (event: MessageEvent<{ type?: string; pcm?: ArrayBuffer }>) => {
        if (event.data.type !== 'pcm16' || !event.data.pcm || socket?.readyState !== WebSocket.OPEN) return
        socket.send(event.data.pcm)
      }
      resources.current = { stream, context, source: sourceNode, worklet, mute, ...(socket ? { socket } : {}) }
    } catch {
      setState('denied')
      onStatusRef.current?.('Không có quyền microphone hoặc không thể khởi tạo audio.')
    }
  }, [conversationId, gatewayUrl, source, stop])

  useEffect(() => stop, [stop])

  return { state, start, stop }
}
