'use client'

import { useCallback, useRef, useState } from 'react'

export type RecordingState = 'idle' | 'recording' | 'stopped' | 'denied'

// Wraps MediaRecorder so a live mic take can be treated exactly like an
// uploaded file afterwards — same Blob, same downstream pipeline, same
// baseline comparison — instead of needing a second live-streaming path.
export function useRecordedAudio() {
  const [state, setState] = useState<RecordingState>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('denied')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.start()
      recorderRef.current = recorder
      setState('recording')
    } catch {
      setState('denied')
    }
  }, [])

  const stop = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        setState('stopped')
        resolve(new File([blob], `ghi-am-${Date.now()}.webm`, { type: blob.type }))
      }
      recorder.stop()
    })
  }, [])

  return { state, start, stop }
}
