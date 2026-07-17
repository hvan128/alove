'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

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
  const supported = useSyncExternalStore(subscribeToRecognitionAvailability, hasRecognitionSupport, () => false)
  const [activeState, setActiveState] = useState<Exclude<SpeechRecognitionState, 'unsupported'>>('idle')
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
      setActiveState('idle')
      return
    }
    if (recognitionRef.current) return

    const recognition = new Constructor()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onstart = () => setActiveState('listening')
    recognition.onerror = () => {
      setActiveState('error')
      setInterimText('')
      recognitionRef.current = null
    }
    recognition.onend = () => {
      setActiveState((current) => current === 'error' ? 'error' : 'idle')
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

  const state: SpeechRecognitionState = supported ? activeState : 'unsupported'
  return { state, interimText, start, stop }
}

function subscribeToRecognitionAvailability(): () => void {
  return () => undefined
}

function hasRecognitionSupport(): boolean {
  return Boolean(getRecognitionConstructor())
}

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}
