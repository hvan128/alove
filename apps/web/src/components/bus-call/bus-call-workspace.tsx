'use client'

import { useEffect, useRef, useState } from 'react'
import type { BookingDraft, BusDemoWorkspace, CallMessage, CallMessageChannel, CallRole } from '@ordervoice/contracts'
import { advanceBookingAgent, createInitialBooking } from '@ordervoice/core/bus-booking'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { speakVietnamese, stopVietnameseSpeech } from '@/lib/device-speech'
import { CallStage } from './call-stage'
import { TicketCard } from './ticket-card'
import { ticketViewFromDraft } from './ticket-view'
import { LiveKitCall, type LiveKitAgentState } from './livekit-call'

// Set NEXT_PUBLIC_LIVEKIT_URL to make LiveKit the transport. Unset (public
// zero-key demo) → the in-browser Web Speech path below stays the default.
const LIVEKIT_ENABLED = Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL)

export function BusCallWorkspace({ initialWorkspace }: { initialWorkspace: BusDemoWorkspace }) {
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [customerText, setCustomerText] = useState('')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [liveAgentState, setLiveAgentState] = useState<LiveKitAgentState>('idle')
  const sequence = useRef(0)

  // LiveKit transport: the agent worker owns STT, booking and TTS. Declared
  // before the handlers below because they all read it to stay inert while the
  // worker holds the call.
  const liveKitActive = LIVEKIT_ENABLED && workspace.callStatus === 'connected'

  useEffect(() => {
    if (workspace.callStatus !== 'connected' || !workspace.startedAt) return
    const startedAt = new Date(workspace.startedAt).getTime()
    const update = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [workspace.callStatus, workspace.startedAt])

  const createMessage = (role: CallRole, text: string, channel: CallMessageChannel): CallMessage => {
    sequence.current += 1
    return {
      id: `${role}-${String(sequence.current).padStart(3, '0')}`,
      conversationId: workspace.conversationId,
      role,
      text,
      createdAt: new Date().toISOString(),
      channel,
      final: true,
    }
  }

  const startCall = () => {
    const now = new Date().toISOString()
    // Every call needs its OWN conversation id. The room is booking-<id>, and a
    // participant token dispatches the agent once per room — reusing one id meant
    // the second call rejoined a spent room and no agent ever came back, so the
    // line just stayed silent. A fresh id also stops every call collapsing onto
    // one `calls` row and inheriting the previous booking. Generated on click
    // (not at render) so server and client markup still match.
    const conversationId = `alove-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    sequence.current = 0
    setAgentSpeaking(false)
    setLiveAgentState('idle')
    setCustomerText('')
    setWorkspace({
      ...workspace,
      conversationId,
      callStatus: 'connected',
      startedAt: now,
      endedAt: null,
      messages: [],
      booking: createInitialBooking(conversationId),
    })
  }

  const endCall = () => {
    stopVietnameseSpeech()
    setAgentSpeaking(false)
    setLiveAgentState('idle')
    setWorkspace((current) => {
      if (current.callStatus === 'ended') return current
      return { ...current, callStatus: 'ended', endedAt: new Date().toISOString() }
    })
  }

  const submitCustomer = (text: string, channel: CallMessageChannel = 'preset') => {
    // With LiveKit carrying the call, the agent worker owns the booking against
    // real inventory. Running the in-browser demo engine as well produced two
    // agents on one line: its device-voice replies leaked out of the speakers,
    // the mic picked them up, and the worker answered its own echo.
    if (liveKitActive) return
    if (workspace.callStatus !== 'connected' || workspace.booking.status === 'confirmed') return
    const customer = createMessage('customer', text, channel)
    const turn = advanceBookingAgent(workspace.booking, customer)
    const messages = [...workspace.messages, customer, createMessage('agent', turn.reply, 'text')]
    speakReply(turn.reply)
    setWorkspace({ ...workspace, messages, booking: turn.draft })
  }

  const recognition = useSpeechRecognition({
    onFinal: (text) => {
      setCustomerText(text)
      submitCustomer(text, 'voice')
    },
  })

  // A browser mic left running from before the call would keep transcribing —
  // including the agent's own voice coming out of the speakers — and feed it
  // straight back into the demo engine. Shut it down once LiveKit takes over.
  useEffect(() => {
    if (liveKitActive) recognition.stop()
  }, [liveKitActive, recognition])

  const upsertLiveTranscript = (segmentId: string, role: 'customer' | 'agent', text: string) => {
    if (!text.trim()) return
    setWorkspace((current) => {
      const id = `lk-${segmentId}`
      let index = current.messages.findIndex((message) => message.id === id)
      // Streaming STT (VALSEA especially) emits a growing transcript — "Tôi",
      // "Tôi đi", "Tôi đi từ Sài Gòn" — and not every provider reuses a segment
      // id across those updates. Collapse by prefix so one utterance stays one
      // bubble no matter how the ids behave.
      if (index === -1) {
        const last = current.messages.length - 1
        const previous = current.messages[last]
        if (
          previous
          && previous.role === role
          && previous.channel === 'voice'
          && (text.startsWith(previous.text) || previous.text.startsWith(text))
        ) {
          index = last
        }
      }
      const message: CallMessage = {
        id,
        conversationId: current.conversationId,
        role,
        text,
        createdAt: index >= 0 ? current.messages[index]!.createdAt : new Date().toISOString(),
        channel: 'voice',
        final: true,
      }
      if (index >= 0) {
        const messages = [...current.messages]
        messages[index] = message
        return { ...current, messages }
      }
      return { ...current, messages: [...current.messages, message] }
    })
  }

  const applyLiveBooking = (booking: BookingDraft) => {
    setWorkspace((current) => ({ ...current, booking }))
  }

  function speakReply(text: string) {
    // The agent's voice already arrives through the LiveKit room; speaking again
    // with the device voice is what put a second, different-sounding agent on the
    // call and fed the microphone.
    if (liveKitActive) return
    const result = speakVietnamese(text, { onEnd: () => setAgentSpeaking(false) })
    setAgentSpeaking(result === 'speaking')
  }

  const stopSpeech = () => {
    stopVietnameseSpeech()
    setAgentSpeaking(false)
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:py-7">
      <main className="grid flex-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <CallStage
          status={workspace.callStatus}
          elapsedSec={elapsedSec}
          messages={workspace.messages}
          booking={workspace.booking}
          agentSpeaking={agentSpeaking || liveAgentState === 'speaking'}
          agentThinking={liveAgentState === 'thinking'}
          value={customerText}
          onValueChange={setCustomerText}
          onSubmit={submitCustomer}
          onStart={startCall}
          onEnd={endCall}
          onStopSpeech={stopSpeech}
          recognitionState={recognition.state}
          interimText={recognition.interimText}
          onStartMic={recognition.start}
          onStopMic={recognition.stop}
          liveKitSlot={
            liveKitActive ? (
              <LiveKitCall
                conversationId={workspace.conversationId}
                onTranscript={upsertLiveTranscript}
                onBooking={applyLiveBooking}
                onAgentState={setLiveAgentState}
                onEnded={endCall}
              />
            ) : undefined
          }
        />
        <TicketCard view={ticketViewFromDraft(workspace.booking)} />
      </main>
    </div>
  )
}
