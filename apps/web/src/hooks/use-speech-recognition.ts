'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type SpeechRecognitionState = 'unsupported' | 'idle' | 'listening' | 'error'

type RecognitionResultLike = ArrayLike<{ transcript: string }> & { isFinal: boolean }
type RecognitionEventLike = { resultIndex: number; results: ArrayLike<RecognitionResultLike> }
type RecognitionErrorLike = { error: string }

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: RecognitionErrorLike) => void) | null
  onresult: ((event: RecognitionEventLike) => void) | null
  start(): void
  stop(): void
  abort(): void
}

type RecognitionConstructor = new () => RecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
}

type UseSpeechRecognitionOptions = {
  onFinal: (text: string) => void
}

export function useSpeechRecognition({ onFinal }: UseSpeechRecognitionOptions) {
  const [state, setState] = useState<SpeechRecognitionState>(() => getRecognitionConstructor() ? 'idle' : 'unsupported')
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<RecognitionLike | null>(null)
  const onFinalRef = useRef(onFinal)

  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])

  useEffect(() => () => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
  }, [])

  const start = useCallback(() => {
    const Constructor = getRecognitionConstructor()
    if (!Constructor) {
      setState('unsupported')
      return
    }
    if (recognitionRef.current) return

    const recognition = new Constructor()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onstart = () => setState('listening')
    recognition.onerror = () => {
      setState('error')
      setInterimText('')
      recognitionRef.current = null
    }
    recognition.onend = () => {
      setState((current) => current === 'error' ? 'error' : 'idle')
      setInterimText('')
      recognitionRef.current = null
    }
    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result?.[0]?.transcript?.trim() ?? ''
        if (!text) continue
        if (result?.isFinal) final = `${final} ${text}`.trim()
        else interim = `${interim} ${text}`.trim()
      }
      setInterimText(interim)
      if (final) onFinalRef.current(final)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { state, interimText, start, stop }
}

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

