'use client'

import { useCallback, useEffect, useReducer, useRef, useState, type MutableRefObject } from 'react'

import {
  createEmptyBooking,
  createInitialCallWorkspace,
  type BookingSnapshot,
  type CallWorkspace,
  type SemanticAnnotation,
} from '@/lib/call-contract'
import { cn } from '@/lib/cn'
import { CallStage } from './call-stage'
import { TicketCard } from './ticket-card'
import { TicketResult } from './ticket-result'
import { TicketBoundary } from './ticket-boundary'
import { TicketSheet } from './ticket-sheet'
import { VehicleSeatVisual } from './vehicle-seat-visual'
import {
  LiveKitCall,
  type LiveKitAgentState,
  type LiveKitSession,
  type LiveTranscriptUpdate,
} from './livekit-call'

const PENDING_CALL_ID = 'pending-call'

export type BusCallControls = { start: () => void; end: () => void }

type BusCallWorkspaceProps = {
  /** 'page' (mặc định, /console) giữ khung full-page; 'overlay' bỏ khung để nằm trong modal. */
  variant?: 'page' | 'overlay'
  /** Overlay gọi start() qua ref này sau khi animation mở xong — không auto-start trong mount. */
  controlRef?: MutableRefObject<BusCallControls | null>
  /** Báo cuộc gọi đã kết thúc để overlay đóng lại. */
  onEnded?: () => void
}

export type CallWorkspaceAction =
  | { type: 'call.start'; startedAt: string }
  | { type: 'session.ready'; conversationId: string }
  | ({ type: 'transcript.upsert'; createdAt: string } & LiveTranscriptUpdate)
  | { type: 'booking.update'; booking: BookingSnapshot }
  | { type: 'semantic.annotation'; callId: string; annotation: SemanticAnnotation }
  | { type: 'call.end'; callId: string | null; endedAt: string }

export function callWorkspaceReducer(state: CallWorkspace, action: CallWorkspaceAction): CallWorkspace {
  if (action.type === 'call.start') {
    return {
      ...createInitialCallWorkspace(),
      callStatus: 'connected',
      startedAt: action.startedAt,
    }
  }

  if (action.type === 'session.ready') {
    if (state.callStatus !== 'connected') return state
    if (state.conversationId !== PENDING_CALL_ID && state.conversationId !== action.conversationId) return state
    if (state.conversationId === action.conversationId) return state
    return {
      ...state,
      conversationId: action.conversationId,
      booking: createEmptyBooking(action.conversationId),
      messages: [],
      semanticAnnotations: [],
    }
  }

  if (action.type === 'transcript.upsert') {
    if (state.callStatus !== 'connected' || action.callId !== state.conversationId) return state
    const text = action.text.trim()
    if (!text) return state
    const id = `lk-${action.role}-${action.segmentId}`
    const index = state.messages.findIndex((message) => message.id === id)
    if (index >= 0) {
      const current = state.messages[index]!
      if (current.text === text && current.final === action.final && current.role === action.role) return state
      const messages = [...state.messages]
      messages[index] = { ...current, role: action.role, text, final: action.final }
      return { ...state, messages }
    }
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          id,
          conversationId: action.callId,
          role: action.role,
          text,
          createdAt: action.createdAt,
          channel: 'voice',
          final: action.final,
        },
      ],
    }
  }

  if (action.type === 'booking.update') {
    if (
      state.callStatus !== 'connected'
      || action.booking.conversationId !== state.conversationId
    ) return state
    if (JSON.stringify(state.booking) === JSON.stringify(action.booking)) return state
    return { ...state, booking: action.booking }
  }

  if (action.type === 'semantic.annotation') {
    if (state.callStatus !== 'connected' || action.callId !== state.conversationId) return state
    return {
      ...state,
      semanticAnnotations: [...state.semanticAnnotations, action.annotation],
    }
  }

  if (state.callStatus === 'ended') return state
  if (action.callId && action.callId !== state.conversationId) return state
  return { ...state, callStatus: 'ended', endedAt: action.endedAt }
}

export function BusCallWorkspace({ variant = 'page', controlRef, onEnded }: BusCallWorkspaceProps) {
  const [workspace, dispatch] = useReducer(callWorkspaceReducer, undefined, createInitialCallWorkspace)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [liveAgentState, setLiveAgentState] = useState<LiveKitAgentState>('idle')
  const [view, setView] = useState<'call' | 'ticket'>('call')
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const attemptRef = useRef(0)
  const activeCallIdRef = useRef(PENDING_CALL_ID)
  const bookingStatusRef = useRef<BookingSnapshot['status']>('collecting')
  const endedRef = useRef(false)

  useEffect(() => {
    if (workspace.callStatus !== 'connected' || !workspace.startedAt) return
    const startedAt = new Date(workspace.startedAt).getTime()
    const update = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [workspace.callStatus, workspace.startedAt])

  const startCall = useCallback(() => {
    attemptRef.current += 1
    activeCallIdRef.current = PENDING_CALL_ID
    bookingStatusRef.current = 'collecting'
    endedRef.current = false
    setElapsedSec(0)
    setLiveAgentState('idle')
    setView('call')
    dispatch({ type: 'call.start', startedAt: new Date().toISOString() })
    setSessionAttempt(attemptRef.current)
  }, [])

  const finishCall = useCallback((callId: string | null = null) => {
    if (callId && callId !== activeCallIdRef.current) return
    if (endedRef.current) return
    endedRef.current = true
    setLiveAgentState('idle')
    dispatch({ type: 'call.end', callId, endedAt: new Date().toISOString() })
    if (bookingStatusRef.current === 'confirmed') {
      setView('ticket')
    } else {
      onEnded?.()
    }
  }, [onEnded])

  useEffect(() => {
    if (!controlRef) return
    controlRef.current = { start: startCall, end: () => finishCall() }
    return () => {
      controlRef.current = null
    }
  }, [controlRef, finishCall, startCall])

  const handleSessionStarted = useCallback((session: LiveKitSession) => {
    if (session.attemptId !== attemptRef.current || endedRef.current) return
    activeCallIdRef.current = session.conversationId
    bookingStatusRef.current = 'collecting'
    dispatch({ type: 'session.ready', conversationId: session.conversationId })
  }, [])

  const handleTranscript = useCallback((update: LiveTranscriptUpdate) => {
    if (update.callId !== activeCallIdRef.current || endedRef.current) return
    dispatch({ ...update, type: 'transcript.upsert', createdAt: new Date().toISOString() })
  }, [])

  const handleBooking = useCallback((booking: BookingSnapshot) => {
    if (booking.conversationId !== activeCallIdRef.current || endedRef.current) return
    bookingStatusRef.current = booking.status
    dispatch({ type: 'booking.update', booking })
  }, [])

  const handleSemanticAnnotation = useCallback((callId: string, annotation: SemanticAnnotation) => {
    if (callId !== activeCallIdRef.current || endedRef.current) return
    dispatch({ type: 'semantic.annotation', callId, annotation })
  }, [])

  const handleAgentState = useCallback((callId: string, state: LiveKitAgentState) => {
    if (callId !== activeCallIdRef.current || endedRef.current) return
    setLiveAgentState(state)
  }, [])

  return (
    <div
      className={
        variant === 'overlay'
          ? 'flex h-full min-h-0 w-full flex-col overflow-y-auto p-4 sm:p-5'
          : 'mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-4 py-5 sm:px-6 lg:py-7'
      }
    >
      {view === 'ticket' ? (
        <TicketBoundary
          booking={workspace.booking}
          onClose={() => (onEnded ? onEnded() : setView('call'))}
        >
          <TicketResult
            booking={workspace.booking}
            onNewCall={startCall}
            onClose={() => (onEnded ? onEnded() : setView('call'))}
          />
        </TicketBoundary>
      ) : (
        <main className="grid flex-1 content-start items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(520px,1fr)_auto]">
          <CallStage
            status={workspace.callStatus}
            elapsedSec={elapsedSec}
            messages={workspace.messages}
            semanticAnnotations={workspace.semanticAnnotations}
            booking={workspace.booking}
            agentSpeaking={liveAgentState === 'speaking'}
            agentThinking={liveAgentState === 'thinking'}
            agentListening={liveAgentState === 'listening'}
            agentReady={liveAgentState !== 'idle'}
            onStart={startCall}
            onEnd={() => finishCall()}
            liveKitSlot={
              workspace.callStatus === 'connected' ? (
                <LiveKitCall
                  key={sessionAttempt}
                  attemptId={sessionAttempt}
                  onSessionStarted={handleSessionStarted}
                  onTranscript={handleTranscript}
                  onBooking={handleBooking}
                  onSemanticAnnotation={handleSemanticAnnotation}
                  onAgentState={handleAgentState}
                  onRetry={startCall}
                  onEnded={(callId) => finishCall(callId)}
                />
              ) : undefined
            }
          />
          <TicketSheet booking={workspace.booking} />
          <div
            className={cn(
              'hidden h-full min-w-0 gap-5 transition-[grid-template-columns] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid',
              workspace.booking.selectedTrip && workspace.booking.status !== 'confirmed'
                ? 'grid-cols-1 xl:grid-cols-[minmax(420px,480px)_380px]'
                : 'grid-cols-1 xl:grid-cols-[0px_380px]',
            )}
          >
            <div
              className={cn(
                'min-w-0 overflow-hidden transition-[opacity,transform] duration-500 ease-out',
                workspace.booking.selectedTrip && workspace.booking.status !== 'confirmed'
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none -translate-x-5 opacity-0',
              )}
            >
              <VehicleSeatVisual booking={workspace.booking} />
            </div>
            <TicketCard booking={workspace.booking} />
          </div>
        </main>
      )}
    </div>
  )
}
