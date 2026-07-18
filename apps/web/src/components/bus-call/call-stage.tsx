'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { BookingDraft, CallMessage, CallMessageChannel, CallStatus } from '@ordervoice/contracts'
import { MessagesSquare, Mic, PhoneCall, PhoneOff, RotateCcw, Send, VolumeX, X } from 'lucide-react'
import type { SpeechRecognitionState } from '@/hooks/use-speech-recognition'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const PRESETS = [
  { label: 'Yêu cầu mẫu', text: 'Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, 2 vé.' },
  { label: 'Chọn chuyến 22:00', text: 'Tôi chọn chuyến 22 giờ.' },
  { label: 'Thông tin hành khách', text: 'Tôi là Nguyễn Minh Anh, số điện thoại 0909123456.' },
  { label: 'Xác nhận đặt vé', text: 'Tôi xác nhận đặt vé.' },
] as const

type CallStageProps = {
  status: CallStatus
  elapsedSec: number
  messages: CallMessage[]
  booking: BookingDraft
  agentSpeaking: boolean
  /** LiveKit worker is processing the turn — shown as "Đang xử lý…". */
  agentThinking?: boolean
  value: string
  onValueChange: (value: string) => void
  onSubmit: (text: string, channel: CallMessageChannel) => void
  onStart: () => void
  onEnd: () => void
  onStopSpeech: () => void
  /** Chạm vào tên nhà xe: đổi giọng đọc. Không có dấu hiệu nào trên giao diện. */
  onBrandTap?: () => void
  recognitionState: SpeechRecognitionState
  interimText: string
  onStartMic: () => void
  onStopMic: () => void
  /** LiveKit controls replace the local dock when the agent worker owns the call. */
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
  booking,
  agentSpeaking,
  agentThinking = false,
  value,
  onValueChange,
  onSubmit,
  onStart,
  onEnd,
  onStopSpeech,
  recognitionState,
  interimText,
  onStartMic,
  onStopMic,
  liveKitSlot,
  onBrandTap,
}: CallStageProps) {
  const connected = status === 'connected'
  const confirmed = booking.status === 'confirmed'
  const listening = recognitionState === 'listening'
  const conversation = messages.filter((message) => message.role === 'customer' || message.role === 'agent')
  const terms = highlightTerms(booking)
  const [showTranscript, setShowTranscript] = useState(false)

  // Khung caption chỉ cao ~2 câu: luôn ghim câu mới nhất vào đáy khung, lịch sử
  // cuộn ngược lên trên (chạy mỗi render vì typewriter làm caption cao dần).
  const captionsRef = useRef<HTMLOListElement | null>(null)
  useEffect(() => {
    const el = captionsRef.current
    if (el) el.scrollTop = el.scrollHeight
  })

  const submitText = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed, 'text')
    onValueChange('')
  }

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
            {/* Công tắc đổi giọng ẩn. Cố ý không có con trỏ, tooltip hay trạng
                thái hiển thị — chỉ người biết mới bấm được. */}
            <span onClick={onBrandTap} className="select-none">Nhà xe Mai Anh</span>
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
                    : 'Đang nghe'}
          </p>
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
          {agentSpeaking ? (
            <button
              type="button"
              onClick={onStopSpeech}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/80 transition hover:bg-white/12"
            >
              <VolumeX size={14} aria-hidden /> Dừng giọng
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

        {conversation.length === 0 && !interimText ? (
          <div className="flex flex-col items-center text-center">
            {connected ? (
              <p className="text-lg font-medium text-white/90">Hãy nói, nhập nội dung hoặc chọn câu mẫu</p>
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
                    {/* Transcript kênh voice đã tự hiện dần theo lời nói thật —
                        typewriter chỉ dành cho câu xuất hiện nguyên khối. */}
                    {latest && message.channel !== 'voice' ? (
                      <TypewriterCaption text={message.text} terms={terms} />
                    ) : (
                      renderHighlighted(message.text, terms)
                    )}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
        {interimText ? (
          <p className="text-lg italic leading-relaxed text-white/55" aria-live="polite">
            {interimText}…
          </p>
        ) : null}
      </div>

      {/* Dock kính mờ — LiveKit thay thế toàn bộ khi agent worker cầm cuộc gọi. */}
      <div
        className={cn(
          'relative z-10 border-t border-white/10 pt-4',
          !liveKitSlot && !confirmed && 'hidden',
        )}
      >
        {liveKitSlot ? (
          liveKitSlot
        ) : confirmed ? (
          <p className="text-center text-sm text-white/60" role="status">
            Vé đã được giữ — mã vé và ghế nằm trên vé bên cạnh. Bấm Kết thúc để đóng cuộc gọi.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={!connected}
                  onClick={() => onSubmit(preset.text, 'preset')}
                  className="min-h-9 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/85 transition hover:border-[color-mix(in_srgb,var(--action)_60%,white)] hover:bg-[color-mix(in_srgb,var(--action)_35%,transparent)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                submitText()
              }}
            >
              <input
                aria-label="Lời khách hàng"
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                disabled={!connected}
                placeholder="Nhập yêu cầu đặt vé…"
                className="min-h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-white/8 px-4 text-sm text-white outline-none backdrop-blur transition placeholder:text-white/40 focus:border-[color-mix(in_srgb,var(--action)_70%,white)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--action)_35%,transparent)] disabled:opacity-40"
              />
              <Button type="submit" aria-label="Gửi lời khách" disabled={!connected || !value.trim()}>
                <Send size={17} aria-hidden />
              </Button>
              <button
                type="button"
                aria-label={listening ? 'Dừng mic' : 'Bật mic'}
                disabled={!connected || recognitionState === 'unsupported'}
                onClick={listening ? onStopMic : onStartMic}
                title={recognitionState === 'unsupported' ? 'Trình duyệt không hỗ trợ SpeechRecognition' : undefined}
                className={cn(
                  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
                  listening
                    ? 'border-transparent bg-[var(--action)] text-white shadow-[0_0_24px_color-mix(in_srgb,var(--action)_55%,transparent)]'
                    : 'border-white/15 bg-white/8 text-white/85 hover:bg-white/15',
                )}
              >
                <Mic size={18} strokeWidth={listening ? 2.6 : 2} aria-hidden />
              </button>
            </form>
            <p className="mt-2 text-center text-xs leading-5 text-white/40" role="status">
              {recognitionState === 'unsupported'
                ? 'Mic STT không có trên trình duyệt này. Câu mẫu và nhập text vẫn hoạt động.'
                : listening
                  ? 'Đang nghe tiếng Việt…'
                  : recognitionState === 'error'
                    ? 'Không thể mở mic. Kiểm tra quyền trình duyệt hoặc dùng câu mẫu.'
                    : 'Mic tiếng Việt là tùy chọn. Câu mẫu luôn sẵn sàng.'}
            </p>
          </>
        )}
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

/**
 * Máy đánh chữ cho caption mới nhất: gõ dần từng cụm ký tự, xong mới áp
 * highlight. Khi text bị sửa lại (STT thêm dấu, đổi từ) thì giữ vị trí gõ theo
 * phần đầu chung — không bao giờ quay về gõ lại từ đầu. Tắt trong test và khi
 * prefers-reduced-motion.
 */
function TypewriterCaption({ text, terms }: { text: string; terms: string[] }) {
  const animate = typewriterEnabled()
  const [visibleChars, setVisibleChars] = useState(() => (animate ? 0 : text.length))
  const previousText = useRef(text)

  useEffect(() => {
    if (!animate) {
      setVisibleChars(text.length)
      return
    }
    if (!text.startsWith(previousText.current)) {
      const prefix = commonPrefixLength(text, previousText.current)
      setVisibleChars((current) => Math.min(current, prefix))
    }
    previousText.current = text
    const timer = window.setInterval(() => {
      setVisibleChars((current) => {
        if (current >= text.length) {
          window.clearInterval(timer)
          return current
        }
        return current + 2
      })
    }, 22)
    return () => window.clearInterval(timer)
  }, [text, animate])

  if (visibleChars >= text.length) return <>{renderHighlighted(text, terms)}</>
  return (
    <>
      {text.slice(0, visibleChars)}
      <span className="tw-caret" aria-hidden />
    </>
  )
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length)
  let index = 0
  while (index < max && a[index] === b[index]) index += 1
  return index
}

function typewriterEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') return false
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Orb ánh sáng: thở khi chờ, đập nhanh khi agent nói, lan sóng khi mic nghe. */
function Orb({ speaking, listening, connected }: { speaking: boolean; listening: boolean; connected: boolean }) {
  return (
    <div
      className={cn(
        'relative size-28 sm:size-32',
        !connected && 'opacity-75',
        speaking ? 'animate-orb-speak' : 'animate-orb-breathe',
      )}
      aria-hidden
    >
      {/* Quầng sáng lan — ánh cyan điện */}
      <div
        className={cn(
          'absolute -inset-8 rounded-full bg-[radial-gradient(circle,oklch(0.8_0.15_200_/_0.65),transparent_70%)] blur-2xl transition-opacity duration-500',
          speaking ? 'opacity-100' : 'opacity-55',
        )}
      />
      {/* Thân lỏng: neon cyan → electric blue → magenta xoay + biến dạng bo góc */}
      <div
        className={cn(
          'absolute inset-0 bg-[conic-gradient(from_220deg,oklch(0.87_0.17_195),oklch(0.6_0.26_262),oklch(0.62_0.29_320),oklch(0.5_0.25_285),oklch(0.87_0.17_195))] blur-[1px] shadow-[0_0_80px_oklch(0.75_0.18_210_/_0.6)]',
          speaking ? 'orb-liquid-fast' : 'orb-liquid',
        )}
      />
      {/* Lớp giao thoa chạy ngược chiều — vệt aqua và magenta lướt qua nhau */}
      <div
        className={cn(
          'absolute inset-[8%] bg-[conic-gradient(from_40deg,transparent_15%,oklch(0.9_0.14_190)_40%,transparent_58%,oklch(0.72_0.26_330)_80%,transparent)] opacity-90 mix-blend-screen blur-[2px]',
          speaking ? 'orb-liquid-alt-fast' : 'orb-liquid-alt',
        )}
      />
      {/* Lõi sáng mềm */}
      <div
        className={cn(
          'absolute inset-[22%] rounded-full bg-[radial-gradient(circle_at_36%_32%,white,oklch(0.85_0.15_200)_45%,transparent_78%)] opacity-85 mix-blend-screen blur-sm',
          speaking ? 'orb-liquid-alt-fast' : 'orb-liquid-alt',
        )}
      />
      {listening ? <div className="animate-listen-ring absolute inset-0 rounded-full" /> : null}
    </div>
  )
}

function formatTimer(seconds: number): string {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
  const rest = String(seconds % 60).padStart(2, '0')
  return `${minutes}:${rest}`
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
function highlightTerms(booking: BookingDraft): string[] {
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
