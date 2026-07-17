'use client'

import { ArrowLeftIcon } from '@phosphor-icons/react/dist/icons/ArrowLeft'
import { BusIcon } from '@phosphor-icons/react/dist/icons/Bus'
import { ChatTextIcon } from '@phosphor-icons/react/dist/icons/ChatText'
import { MicrophoneIcon } from '@phosphor-icons/react/dist/icons/Microphone'
import { MicrophoneSlashIcon } from '@phosphor-icons/react/dist/icons/MicrophoneSlash'
import { PhoneDisconnectIcon } from '@phosphor-icons/react/dist/icons/PhoneDisconnect'
import { PhoneIcon } from '@phosphor-icons/react/dist/icons/Phone'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCallSession } from '@/hooks/use-call-session'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import type { CallEventTransport } from '@/lib/call/demo-channel'
import { LiveKitEventTransport } from '@/lib/call/livekit-adapter'
import type { PublicIntegrationStatus } from '@/lib/livekit/server'
import { speakVietnamese } from '@/lib/device-speech'
import type { LiveKitConnectionPhase } from '@/components/livekit/live-call-room'

const LiveCallRoom = dynamic(
  () => import('@/components/livekit/live-call-room').then((module) => module.LiveCallRoom),
  { ssr: false },
)

const SAMPLE_UTTERANCES = [
  { label: 'Gửi câu mẫu hành trình', text: 'Đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ.' },
  { label: 'Gửi câu mẫu hành khách', text: 'Tôi tên Nguyễn Minh Anh, số 0909 123 456, đón ở Ngã tư Hàng Xanh, trả tại Chợ Đà Lạt.' },
  { label: 'Gửi câu mẫu sửa lại', text: 'Không, đổi điểm đón sang Bến xe Miền Đông mới.' },
] as const

type Props = {
  sessionCode: string
  integrationStatus: PublicIntegrationStatus
  transportFactory?: (sessionCode: string) => CallEventTransport
}

export function CallerWorkspace({ sessionCode, integrationStatus, transportFactory }: Props) {
  const [joined, setJoined] = useState(false)
  const [microphone, setMicrophone] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [phase, setPhase] = useState<LiveKitConnectionPhase | 'idle'>('idle')
  const heardMessage = useRef<string | null>(null)
  const liveTransport = useMemo(
    () => integrationStatus.livekit ? new LiveKitEventTransport(sessionCode) : null,
    [integrationStatus.livekit, sessionCode],
  )
  const effectiveFactory = useMemo(() => {
    if (transportFactory) return transportFactory
    if (liveTransport) return () => liveTransport
    return undefined
  }, [liveTransport, transportFactory])
  const session = useCallSession({
    sessionCode,
    role: 'caller',
    transport: integrationStatus.livekit ? 'livekit' : 'local',
    persistence: integrationStatus.persistence,
    ...(effectiveFactory ? { transportFactory: effectiveFactory } : {}),
  })
  const recognition = useSpeechRecognition({
    onFinal: (text) => session.sendCallerText(text, 'voice'),
  })

  useEffect(() => {
    if (joined && recognition.interimText) session.sendPartial(recognition.interimText)
  }, [joined, recognition.interimText, session])

  useEffect(() => {
    if (!joined) return
    const incoming = [...session.state.messages].reverse().find((message) => message.role === 'staff' || message.role === 'agent')
    if (!incoming || heardMessage.current === incoming.id) return
    heardMessage.current = incoming.id
    speakVietnamese(incoming.text)
  }, [joined, session.state.messages])

  const handleLiveKitPhase = useCallback((next: LiveKitConnectionPhase, detail?: string) => {
    setPhase(next)
    if (next === 'connected') session.setCallerPresence(true)
    if (next === 'disconnected' || next === 'error') session.setCallerPresence(false)
    if (detail && next === 'error') {
      session.receiveEvent({
        version: 1,
        eventId: `caller-livekit-error-${Date.now()}`,
        sessionCode,
        occurredAt: new Date().toISOString(),
        type: 'agent.error',
        code: 'LIVEKIT_CLIENT_ERROR',
        message: detail,
        recoverable: true,
      })
    }
  }, [session, sessionCode])

  const startCall = () => {
    const incoming = [...session.state.messages].reverse().find((message) => message.role === 'staff' || message.role === 'agent')
    heardMessage.current = incoming?.id ?? null
    setJoined(true)
    setMicrophone(integrationStatus.livekit)
    if (!integrationStatus.livekit) session.setCallerPresence(true)
  }

  const hangUp = () => {
    recognition.stop()
    session.setCallerPresence(false)
    setMicrophone(false)
    setJoined(false)
    setPhase('disconnected')
  }

  const toggleMicrophone = () => {
    if (integrationStatus.livekit) {
      setMicrophone((current) => !current)
      return
    }
    if (recognition.state === 'listening') recognition.stop()
    else recognition.start()
  }

  const latestIncoming = [...session.state.messages].reverse().find((message) => message.role === 'staff' || message.role === 'agent')
  const latestCaller = [...session.state.messages].reverse().find((message) => message.role === 'caller')

  return (
    <div className="min-h-[100dvh] bg-[var(--canvas)] px-4 py-5 text-[var(--ink)] sm:py-8">
      <main className="mx-auto max-w-[480px]">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="grid h-10 w-10 place-items-center rounded-[11px] border border-[var(--hairline)] bg-white" aria-label="Về trang chủ">
            <ArrowLeftIcon size={18} aria-hidden />
          </Link>
          <div className="text-center">
            <p className="text-xs font-medium text-[var(--muted)]">Phiên gọi</p>
            <p className="mt-0.5 font-mono text-sm font-semibold">{sessionCode}</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-[var(--ink)] text-white"><BusIcon size={19} weight="fill" aria-hidden /></span>
        </header>

        <section className="mt-5 overflow-hidden rounded-[24px] border border-[var(--hairline)] bg-white">
          <div className="px-5 pb-6 pt-7 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--action-soft)] text-[var(--action)]">
              {joined ? <PhoneIcon size={34} weight="fill" aria-hidden /> : <ChatTextIcon size={34} weight="duotone" aria-hidden />}
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em]">Gọi đặt vé</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{joined ? 'Đang trong cuộc gọi' : 'Sẵn sàng gọi nhà xe VéĐi'}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
              <span className="rounded-[8px] bg-[var(--pearl)] px-2 py-1 font-medium">{integrationStatus.livekit ? livePhaseLabel(phase) : 'Mô phỏng cục bộ'}</span>
              <span className="rounded-[8px] bg-[var(--warning-soft)] px-2 py-1 font-medium text-[var(--warning)]">{integrationStatus.valsea ? 'VALSEA sẵn sàng' : 'Chưa dùng VALSEA'}</span>
            </div>
          </div>

          {!joined ? (
            <div className="border-t border-[var(--divider)] p-5">
              <button type="button" onClick={startCall} className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--action)] px-5 text-base font-semibold text-white transition hover:bg-[var(--action-hover)]">
                <PhoneIcon size={20} weight="fill" aria-hidden /> Bắt đầu cuộc gọi
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-[var(--muted)]">Bấm để đồng ý kết nối và cấp quyền microphone khi có LiveKit.</p>
            </div>
          ) : (
            <div className="border-t border-[var(--divider)] p-5">
              <div className="flex justify-center gap-4">
                <button type="button" onClick={toggleMicrophone} className="grid h-14 w-14 place-items-center rounded-full border border-[var(--hairline)] bg-white" aria-label={microphone || recognition.state === 'listening' ? 'Tắt microphone' : 'Bật microphone'}>
                  {microphone || recognition.state === 'listening' ? <MicrophoneIcon size={22} weight="fill" aria-hidden /> : <MicrophoneSlashIcon size={22} aria-hidden />}
                </button>
                <button type="button" onClick={hangUp} className="grid h-14 w-14 place-items-center rounded-full bg-[var(--danger)] text-white" aria-label="Kết thúc cuộc gọi">
                  <PhoneDisconnectIcon size={23} weight="fill" aria-hidden />
                </button>
              </div>
              {!integrationStatus.livekit ? (
                <p className="mt-4 text-center text-xs leading-5 text-[var(--muted)]">
                  {recognition.state === 'unsupported'
                    ? 'Trình duyệt không hỗ trợ nhận giọng. Dùng câu mẫu hoặc nội dung text bên dưới.'
                    : recognition.state === 'listening'
                      ? 'Đang nghe bằng nhận dạng của trình duyệt, không phải VALSEA.'
                      : 'Bấm mic để thử nhận dạng của trình duyệt.'}
                </p>
              ) : null}
            </div>
          )}
        </section>

        {joined ? (
          <>
            <section className="mt-4 rounded-[18px] border border-[var(--hairline)] bg-white p-4" aria-label="Nội dung cuộc gọi">
              <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">Phản hồi gần nhất</p>
              <p className="mt-2 min-h-12 text-[15px] leading-6">{latestIncoming?.text ?? 'Nhân viên đang chờ yêu cầu của bạn.'}</p>
              {latestCaller ? <p className="mt-3 border-t border-[var(--divider)] pt-3 text-xs leading-5 text-[var(--muted)]">Bạn vừa nói: {latestCaller.text}</p> : null}
              {recognition.interimText ? <p className="mt-2 text-xs italic text-[var(--action)]">Đang nghe: {recognition.interimText}</p> : null}
            </section>

            <section className="mt-4 rounded-[18px] border border-[var(--hairline)] bg-white p-4">
              <h2 className="text-sm font-semibold">Câu mẫu để demo</h2>
              <div className="mt-3 grid gap-2">
                {SAMPLE_UTTERANCES.map((sample) => (
                  <button key={sample.label} type="button" onClick={() => session.sendCallerText(sample.text, 'preset')} className="min-h-11 rounded-[11px] border border-[var(--hairline)] bg-white px-3 text-left text-sm transition hover:bg-[var(--pearl)]" aria-label={sample.label}>
                    {sample.text}
                  </button>
                ))}
              </div>
            </section>

            <form
              className="mt-4 rounded-[18px] border border-[var(--hairline)] bg-white p-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!typedText.trim()) return
                session.sendCallerText(typedText, 'text')
                setTypedText('')
              }}
            >
              <label className="block text-sm font-semibold">
                Nội dung muốn nói
                <textarea aria-label="Nội dung muốn nói" value={typedText} onChange={(event) => setTypedText(event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-[11px] border border-[var(--hairline)] px-3 py-2 text-sm font-normal leading-5" placeholder="VD: Tôi muốn đổi điểm đón..." />
              </label>
              <button type="submit" disabled={!typedText.trim()} className="mt-2 min-h-11 w-full rounded-[11px] bg-[var(--ink)] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-35">Gửi nội dung</button>
            </form>
          </>
        ) : null}

        {!integrationStatus.livekit ? <p className="mt-5 text-center text-[11px] leading-5 text-[var(--muted)]">Mô phỏng chỉ hoạt động giữa các tab cùng trình duyệt. Không có audio truyền qua mạng.</p> : null}
      </main>

      {integrationStatus.livekit && liveTransport ? (
        <LiveCallRoom
          sessionCode={sessionCode}
          role="caller"
          displayName="Khách gọi thử"
          connect={joined}
          microphone={microphone}
          transport={liveTransport}
          onConnectionChange={handleLiveKitPhase}
        />
      ) : null}
    </div>
  )
}

function livePhaseLabel(phase: LiveKitConnectionPhase | 'idle'): string {
  const labels: Record<LiveKitConnectionPhase | 'idle', string> = {
    idle: 'LiveKit sẵn sàng', requesting: 'Đang cấp quyền', connecting: 'Đang kết nối',
    connected: 'LiveKit đã kết nối', disconnected: 'Đã ngắt kết nối', error: 'Lỗi LiveKit',
  }
  return labels[phase]
}
