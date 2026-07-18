'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MessagesSquare, PhoneCall, PhoneOff, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BookingSnapshot, CallMessage, CallStatus, SemanticAnnotation, TurnLatency } from '@/lib/call-contract'
import { cn } from '@/lib/cn'

type CallStageProps = {
  status: CallStatus
  elapsedSec: number
  messages: CallMessage[]
  semanticAnnotations: SemanticAnnotation[]
  turnLatency?: TurnLatency | null
  booking: BookingSnapshot
  agentSpeaking: boolean
  /** LiveKit worker is processing the turn — shown as "Đang xử lý…". */
  agentThinking?: boolean
  /** LiveKit worker is ready for the caller's next utterance. */
  agentListening?: boolean
  /** A validated agent state event has arrived for this room. */
  agentReady?: boolean
  onStart: () => void
  onEnd: () => void
  /** LiveKit connection and media controls. There is no local/demo fallback. */
  liveKitSlot?: ReactNode
}

/**
 * Sân khấu cuộc gọi kiểu voice-AI: nền tối immersive, orb ánh sáng thở khi chờ
 * và đập theo giọng agent, caption phụ đề lớn ở giữa với từ khóa phát sáng.
 */
export function CallStage({
  status,
  elapsedSec,
  messages,
  semanticAnnotations,
  turnLatency = null,
  booking,
  agentSpeaking,
  agentThinking = false,
  agentListening = false,
  agentReady = false,
  onStart,
  onEnd,
  liveKitSlot,
}: CallStageProps) {
  const connected = status === 'connected'
  const confirmed = booking.status === 'confirmed'
  const listening = connected && agentListening
  const conversation = messages.filter((message) => message.role === 'customer' || message.role === 'agent')
  const terms = highlightTerms(booking)
  const latestSemanticAnnotation = semanticAnnotations.at(-1)
  const [showTranscript, setShowTranscript] = useState(false)

  // Khung caption chỉ cao ~2 câu: luôn ghim câu mới nhất vào đáy khung, lịch sử
  // cuộn ngược lên trên (chạy mỗi render vì typewriter làm caption cao dần).
  const captionsRef = useRef<HTMLOListElement | null>(null)
  useEffect(() => {
    const el = captionsRef.current
    if (el) el.scrollTop = el.scrollHeight
  })

  return (
    <section
      aria-label="Cuộc gọi"
      className="relative flex min-h-[560px] flex-col overflow-hidden rounded-3xl bg-[oklch(0.16_0.025_278)] p-5 text-white shadow-[var(--shadow-panel)] sm:p-6"
    >
      {/* Quầng sáng nền */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-36 left-1/2 h-80 w-[560px] -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--violet)_45%,transparent)] opacity-35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-44 -right-24 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--action)_45%,transparent)] opacity-25 blur-3xl"
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-semibold">
            Nhà xe Mai Anh
            {agentSpeaking ? <SpeakBars /> : null}
          </h1>
          <p className="text-xs text-white/50" role="status">
            {!connected
              ? status === 'ended'
                ? 'Cuộc gọi đã kết thúc'
                : 'Chưa bắt đầu'
              : agentSpeaking
                ? 'Đang nói…'
                : agentThinking
                  ? 'Đang xử lý…'
                  : listening
                    ? 'Đang nghe bạn nói…'
                    : agentReady
                      ? 'Đã kết nối tổng đài'
                      : 'Đang kết nối tổng đài…'}
          </p>
          {turnLatency ? <TurnLatencySummary latency={turnLatency} /> : null}
        </div>
        <div className="flex items-center gap-3">
          {conversation.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowTranscript(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/80 transition hover:bg-white/12"
            >
              <MessagesSquare size={14} aria-hidden /> Hội thoại
            </button>
          ) : null}
          {status !== 'idle' ? (
            <span className="font-mono text-sm tabular-nums text-white/55" aria-label="Thời lượng cuộc gọi">
              {formatTimer(elapsedSec)}
            </span>
          ) : null}
          {connected ? (
            <Button variant="danger" onClick={onEnd}>
              <PhoneOff size={17} aria-hidden /> Kết thúc
            </Button>
          ) : status === 'ended' ? (
            <button
              type="button"
              onClick={onStart}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 text-sm font-medium text-white transition hover:bg-white/15 active:scale-[0.98]"
            >
              <RotateCcw size={16} aria-hidden /> Gọi lại từ đầu
            </button>
          ) : null}
        </div>
      </div>

      {/* Orb + caption phụ đề */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-8 py-8">
        <Orb speaking={agentSpeaking} listening={listening} connected={connected} />

        {conversation.length === 0 ? (
          <div className="flex flex-col items-center text-center">
            {connected ? (
              <p className="text-lg font-medium text-white/90">
                {agentReady ? 'Hãy nói tự nhiên — tổng đài viên đang nghe' : 'Đang kết nối tổng đài viên…'}
              </p>
            ) : (
              <Button onClick={onStart} className="px-6">
                <PhoneCall size={17} aria-hidden /> Bắt đầu Web Call
              </Button>
            )}
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/45">
              Agent thu thập tuyến, chuyến, hành khách rồi chốt vé — thông tin điền dần vào vé bên cạnh.
            </p>
          </div>
        ) : (
          <ol
            ref={captionsRef}
            className="flex max-h-52 w-full max-w-xl shrink-0 flex-col items-center gap-5 overflow-y-auto px-1 text-center [mask-image:linear-gradient(to_bottom,transparent,black_32px)]"
            aria-label="Hội thoại"
          >
            {conversation.map((message, index) => {
              const latest = index === conversation.length - 1
              return (
                <li key={message.id} className={cn('animate-caption-in shrink-0', !latest && 'opacity-45')}>
                  <p
                    className={cn(
                      'mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
                      message.role === 'customer' ? 'text-[oklch(0.75_0.12_264)]' : 'text-[oklch(0.8_0.14_150)]',
                    )}
                  >
                    {message.role === 'customer' ? 'Khách' : 'Nhà xe Mai Anh'}
                  </p>
                  <p
                    className={cn(
                      'leading-relaxed',
                      latest ? 'text-xl font-medium text-white sm:text-2xl' : 'text-sm text-white/70 sm:text-base',
                    )}
                  >
                    {renderHighlighted(message.text, terms)}
                  </p>
                </li>
              )
            })}
          </ol>
        )}

        {latestSemanticAnnotation ? (
          <SemanticEvidencePanel annotation={latestSemanticAnnotation} />
        ) : null}
      </div>

      {/* Dock kính mờ chỉ chứa transport LiveKit; không có text/preset/Web Speech fallback. */}
      <div
        className={cn(
          'relative z-10 border-t border-white/10 pt-4',
          !liveKitSlot && !confirmed && 'hidden',
        )}
      >
        {liveKitSlot ?? (confirmed ? (
          <p className="text-center text-sm text-white/60" role="status">
            Vé đã được giữ — mã vé và ghế nằm trên vé bên cạnh. Bấm Kết thúc để đóng cuộc gọi.
          </p>
        ) : null)}
      </div>

      {/* Toàn bộ hội thoại — overlay phủ trong sân khấu. */}
      {showTranscript ? (
        <div
          role="dialog"
          aria-label="Toàn bộ hội thoại"
          className="absolute inset-0 z-30 flex flex-col bg-[color-mix(in_srgb,oklch(0.13_0.02_278)_94%,transparent)] p-5 backdrop-blur-md sm:p-6"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <p className="font-semibold">
              Toàn bộ hội thoại <span className="ml-1 text-xs font-normal text-white/50">{conversation.length} câu</span>
            </p>
            <button
              type="button"
              aria-label="Đóng hội thoại"
              onClick={() => setShowTranscript(false)}
              className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/12"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <ol className="flex-1 space-y-4 overflow-y-auto py-4 text-left" aria-label="Danh sách câu thoại">
            {conversation.map((message) => (
              <li key={message.id}>
                <p
                  className={cn(
                    'mb-0.5 flex items-baseline gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]',
                    message.role === 'customer' ? 'text-[oklch(0.75_0.12_264)]' : 'text-[oklch(0.8_0.14_150)]',
                  )}
                >
                  {message.role === 'customer' ? 'Khách' : 'Tổng đài viên AI'}
                  <time className="font-normal normal-case tracking-normal text-white/40">
                    {new Date(message.createdAt).toLocaleTimeString('vi-VN')}
                  </time>
                </p>
                <p className="text-sm leading-6 text-white/90">{renderHighlighted(message.text, terms)}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}

function TurnLatencySummary({ latency }: { latency: TurnLatency }) {
  return (
    <div
      aria-label="Độ trễ lượt gần nhất"
      aria-live="polite"
      role="status"
      className="mt-2 w-fit rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] tabular-nums text-white/55"
    >
      <p className="font-medium text-white/75">
        Chặng lâu nhất {formatLatency(latency.slowestStageSeconds)}
      </p>
      <p className="mt-0.5">
        EOU {formatLatency(latency.endOfUtteranceSeconds)} · STT {formatLatency(latency.transcriptionSeconds)} · LLM {formatLatency(latency.llmTtftSeconds)} · TTS {formatLatency(latency.ttsTtfbSeconds)}
      </p>
    </div>
  )
}

function SemanticEvidencePanel({ annotation }: { annotation: SemanticAnnotation }) {
  return (
    <aside
      aria-label="Bằng chứng semantic VALSEA"
      className="w-full max-w-xl rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-left backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">VALSEA semantic</p>
        <time className="text-[10px] tabular-nums text-white/35" dateTime={annotation.timestamp}>
          {new Date(annotation.timestamp).toLocaleTimeString('vi-VN')}
        </time>
      </div>
      <p className="mt-1 text-xs leading-5 text-white/55">Nguồn: {annotation.sourceTranscript}</p>
      {annotation.correctedText ? (
        <p className="mt-1 text-sm leading-5 text-white/90">
          <span className="text-white/50">Hiệu chỉnh: </span>{annotation.correctedText}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {annotation.tags.length > 0 ? annotation.tags.map((tag, index) => (
          <span key={`${tag}-${index}`} className="rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[11px] text-white/75">
            {tag}
          </span>
        )) : (
          <span className="text-xs text-white/45">Không có semantic tag</span>
        )}
      </div>
      {annotation.annotations.length > 0 ? (
        <p className="mt-1 text-[11px] leading-4 text-white/45">Chú thích: {annotation.annotations.join(', ')}</p>
      ) : null}
    </aside>
  )
}

/** Orb kính 3D: thở khi chờ, đập nhanh khi agent nói, lan sóng khi mic nghe. */
function Orb({ speaking, listening, connected }: { speaking: boolean; listening: boolean; connected: boolean }) {
  return (
    <div
      className={cn(
        'relative size-28 sm:size-32',
        !connected && 'opacity-75',
      )}
      aria-hidden
    >
      {/* Trường sóng nền dùng chung nhịp với góc sáng của quả cầu. */}
      <div
        className={cn(
          'orb-wave-field absolute left-1/2 top-1/2',
          speaking && 'orb-wave-field-fast',
          listening && 'orb-wave-field-listening',
        )}
      >
        <span className="orb-wave orb-wave-near absolute inset-0 rounded-full" />
        <span className="orb-wave orb-wave-mid absolute inset-0 rounded-full" />
        <span className="orb-wave orb-wave-far absolute inset-0 rounded-full" />
      </div>
      <div className={cn('orb-body absolute inset-0', speaking ? 'animate-orb-speak' : 'animate-orb-breathe')}>
        {/* Quầng sáng rất mềm phía sau, tách quả cầu khỏi nền tối. */}
        <div
          className={cn(
            'absolute -inset-7 rounded-full bg-[radial-gradient(circle,rgba(89,187,255,0.3),rgba(96,37,211,0.16)_48%,transparent_72%)] blur-2xl transition-opacity duration-500',
            speaking ? 'opacity-100' : 'opacity-65',
          )}
        />
        <div className={cn('orb-glass absolute inset-0 overflow-hidden rounded-full', speaking && 'orb-glass-fast')}>
          <div className={cn('orb-chroma absolute -inset-[18%]', speaking && 'orb-chroma-fast')} />
          <div className="orb-depth absolute inset-0 rounded-full" />
          <div className="orb-rim absolute inset-0 rounded-full" />
          <div className="orb-specular absolute inset-0 rounded-full" />
          <div className="orb-glint absolute rounded-full" />
        </div>
        {listening ? <div className="animate-listen-ring absolute inset-0 rounded-full" /> : null}
      </div>
    </div>
  )
}

function formatTimer(seconds: number): string {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
  const rest = String(seconds % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}

function formatLatency(seconds: number): string {
  if (seconds === 0) return '—'
  return `${Math.round(seconds * 1000).toLocaleString('vi-VN')} ms`
}

/** Equalizer 3 thanh cạnh tên khi agent đang nói. */
function SpeakBars() {
  return (
    <span className="flex h-3.5 items-end gap-[3px] text-[oklch(0.8_0.14_150)]" aria-hidden>
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className="speak-bar w-[3px] rounded-full bg-current"
          style={{ height: '100%', animationDelay: `${bar * 0.15}s` }}
        />
      ))}
    </span>
  )
}

/** Giá trị booking đã chốt → danh sách từ khóa cần highlight trong caption. */
function highlightTerms(booking: BookingSnapshot): string[] {
  const raw: Array<string | null | undefined> = [
    booking.origin,
    booking.destination,
    booking.passengerName,
    booking.phone,
    booking.travelDateLabel,
    booking.selectedTrip?.departureTime,
    booking.bookingCode,
    booking.seats.length ? booking.seats.join(', ') : null,
    booking.passengerCount ? `${booking.passengerCount} vé` : null,
    booking.passengerCount ? `${booking.passengerCount} hành khách` : null,
  ]
  return [...new Set(raw.filter((term): term is string => Boolean(term && term.length >= 2)))]
}

function renderHighlighted(text: string, terms: string[]): ReactNode {
  if (terms.length === 0) return text
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'giu')
  const parts = text.split(pattern)
  if (parts.length === 1) return text
  return parts.map((part, index) =>
    terms.some((term) => term.toLocaleLowerCase('vi-VN') === part.toLocaleLowerCase('vi-VN')) ? (
      <mark
        key={index}
        className="rounded-md bg-[color-mix(in_srgb,var(--action)_45%,transparent)] px-1.5 py-0.5 font-semibold text-white shadow-[0_0_16px_color-mix(in_srgb,var(--action)_35%,transparent)]"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}
