'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { BookingDraft, BusDemoWorkspace, CallMessage, CallMessageChannel, CallRole } from '@ordervoice/contracts'
import { advanceBookingAgent, createInitialBooking } from '@ordervoice/core/bus-booking'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { speakVietnamese, stopVietnameseSpeech } from '@/lib/device-speech'
import { cn } from '@/lib/cn'
import { CallStage } from './call-stage'
import { TicketCard } from './ticket-card'
import { VehicleSeatVisual } from './vehicle-seat-visual'
import { LiveKitCall, type LiveKitAgentState } from './livekit-call'

// Set NEXT_PUBLIC_LIVEKIT_URL to make LiveKit the transport. Unset (public
// zero-key demo) → the in-browser Web Speech path below stays the default.
const LIVEKIT_ENABLED = Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL)

// Bản ghi tạm của STT tới liên tiếp trong khoảng này được coi là cùng một lượt
// nói. Rộng hơn nhịp sửa chữ của STT, hẹp hơn khoảng nghỉ giữa hai lượt thật.
const SAME_UTTERANCE_MS = 4000

/** Điều khiển từ bên ngoài (CallOverlay): bắt đầu/kết thúc cuộc gọi sau khi morph xong. */
export type BusCallControls = { start: () => void; end: () => void }

type BusCallWorkspaceProps = {
  initialWorkspace: BusDemoWorkspace
  /** 'page' (mặc định, /console) giữ khung full-page; 'overlay' bỏ khung để nằm trong modal. */
  variant?: 'page' | 'overlay'
  /** Overlay gọi start() qua ref này sau khi animation mở xong — không auto-start trong mount. */
  controlRef?: MutableRefObject<BusCallControls | null>
  /** Báo cuộc gọi đã kết thúc (khách bấm Kết thúc hoặc agent cúp) để overlay đóng lại. */
  onEnded?: () => void
}

export function BusCallWorkspace({ initialWorkspace, variant = 'page', controlRef, onEnded }: BusCallWorkspaceProps) {
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
    onEnded?.()
  }

  // Gán mỗi render để start/end luôn thấy state mới nhất — không dùng deps.
  useEffect(() => {
    if (!controlRef) return
    controlRef.current = { start: startCall, end: endCall }
    return () => {
      controlRef.current = null
    }
  })

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
      // Streaming STT emits a transcript that both grows AND gets revised:
      // "tới Thành phố" → "tới TP." → "tới Thành phố Hồ" → "tới TP.HC". Those are
      // not prefixes of one another, so prefix matching alone left one utterance
      // scattered across five bubbles. The agent still commits a single turn (its
      // own end-of-turn detection does that), so anything the same speaker says
      // within a few seconds belongs to the same bubble.
      if (index === -1) {
        const last = current.messages.length - 1
        const previous = current.messages[last]
        const withinSameUtterance =
          previous
          && previous.role === role
          && previous.channel === 'voice'
          && Date.now() - new Date(previous.createdAt).getTime() < SAME_UTTERANCE_MS
        if (withinSameUtterance) index = last
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
    <div
      className={
        variant === 'overlay'
          ? 'flex h-full min-h-0 w-full flex-col overflow-y-auto p-4 sm:p-5'
          : 'mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-4 py-5 sm:px-6 lg:py-7'
      }
    >
      {/* Hai cột cao theo nội dung của chính nó. Từng ép chúng bằng nhau, nhưng
          khung cuộc gọi cao gấp rưỡi phiếu vé nên chỉ tổ độn một mảng trống
          giữa phiếu. */}
      <main className="grid flex-1 content-start items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(520px,1fr)_auto]">
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
        <div
          className={cn(
            'grid h-full min-w-0 gap-5 transition-[grid-template-columns] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]',
            workspace.booking.selectedTrip && workspace.booking.status !== 'confirmed'
              ? 'grid-cols-1 xl:grid-cols-[minmax(420px,480px)_380px]'
              : 'grid-cols-1 xl:grid-cols-[0px_380px]',
          )}
        >
          <div
            className={cn(
              'min-w-0 overflow-hidden transition-[opacity,transform] duration-500 ease-out',
              workspace.booking.selectedTrip && workspace.booking.status !== 'confirmed'
                ? 'opacity-100 translate-x-0'
                : 'pointer-events-none -translate-x-5 opacity-0',
            )}
          >
            <VehicleSeatVisual booking={workspace.booking} />
          </div>
          <TicketCard booking={workspace.booking} />
        </div>
      </main>
    </div>
  )
}
