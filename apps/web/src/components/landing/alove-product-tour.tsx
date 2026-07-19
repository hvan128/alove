'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { Check, CheckCircle2, Clock3, MapPin, Pause, Play, Search, Sparkles } from 'lucide-react'

import { CallControlDock } from '@/components/bus-call/call-control-dock'
import { CallStage } from '@/components/bus-call/call-stage'
import { TicketCard } from '@/components/bus-call/ticket-card'
import { TicketResult } from '@/components/bus-call/ticket-result'
import { TicketSheet } from '@/components/bus-call/ticket-sheet'
import { VehicleSeatVisual } from '@/components/bus-call/vehicle-seat-visual'
import type { BookingSnapshot, CallMessage, SemanticAnnotation } from '@/lib/call-contract'

const STAGE_DURATION_MS = 4800
const EASE = [0.22, 1, 0.36, 1] as const
const TOUR_CONVERSATION_ID = 'landing-product-tour'
const NOOP = () => undefined

const stages = [
  { label: 'Nói nhu cầu' },
  { label: 'Alove tìm chuyến' },
  { label: 'Giữ ghế & xác nhận' },
  { label: 'Nhận vé & mã QR' },
] as const

export type AloveTourTrip = {
  id: string
  origin: string
  destination: string
  travelDateLabel: string
  departure: string
  arrival: string
  priceVnd: number
  seatsAvailable: number
  seatNoun: string
  vehicleType: string
  pickupPoint: string
  dropoffPoint: string
}

const fallbackTrip: AloveTourTrip = {
  id: 'tour-trip-hanoi-vinh',
  origin: 'Hà Nội',
  destination: 'Vinh',
  travelDateLabel: '20/07',
  departure: '20:00',
  arrival: '01:30',
  priceVnd: 350_000,
  seatsAvailable: 12,
  seatNoun: 'giường',
  vehicleType: 'Giường nằm 34 chỗ',
  pickupPoint: 'Bến xe Nước Ngầm',
  dropoffPoint: 'Bến xe Bắc Vinh',
}

type TourState = {
  booking: BookingSnapshot
  messages: CallMessage[]
  semanticAnnotations: SemanticAnnotation[]
  agentThinking?: boolean
  agentListening?: boolean
  agentSpeaking?: boolean
}

type UtteranceKind = 'code-switch' | 'dialect'

type UtteranceToken = {
  text: string
  kind?: UtteranceKind
  /** Dạng chuẩn hoá, hiện ở chú giải ngay dưới câu nói. */
  gloss?: string
}

/**
 * Câu mẫu cố ý trộn tiếng Anh lẫn từ Trung Bộ vì đó đúng là hai thứ landing đang
 * hứa. Danh sách token là nguồn duy nhất: transcript phẳng cho CallStage được
 * ghép lại từ đây nên bản tô sáng và bản chữ trơn không thể lệch nhau.
 */
function spokenTokens(trip: AloveTourTrip): UtteranceToken[] {
  return [
    { text: 'Cho mình ' },
    { text: 'book', kind: 'code-switch', gloss: 'đặt' },
    { text: ` hai vé từ ${trip.origin} ` },
    { text: 'vô', kind: 'dialect', gloss: 'vào' },
    { text: ` ${trip.destination}, chuyến ` },
    { text: 'mô', kind: 'dialect', gloss: 'nào' },
    { text: ' gần nhất ' },
    { text: 'hỉ', kind: 'dialect', gloss: 'nhé' },
    { text: ', thanh toán ' },
    { text: 'online', kind: 'code-switch', gloss: 'trực tuyến' },
    { text: ' luôn.' },
  ]
}

function tokensToText(tokens: UtteranceToken[]): string {
  return tokens.map((token) => token.text).join('')
}

const UTTERANCE_STYLE: Record<UtteranceKind, string> = {
  'code-switch': 'border-cyan-300/45 bg-cyan-400/15 text-cyan-100',
  dialect: 'border-amber-300/45 bg-amber-400/15 text-amber-100',
}

const UTTERANCE_LEGEND: { kind: UtteranceKind; label: string }[] = [
  { kind: 'code-switch', label: 'Code-switch Việt–Anh' },
  { kind: 'dialect', label: 'Giọng vùng miền' },
]

function HighlightedUtterance({ tokens }: { tokens: UtteranceToken[] }) {
  return (
    <>
      {tokens.map((token, index) => (token.kind ? (
        <mark key={index} className={`rounded-md border px-1 py-0.5 ${UTTERANCE_STYLE[token.kind]}`}>
          {token.text}
        </mark>
      ) : (
        <span key={index}>{token.text}</span>
      )))}
    </>
  )
}

function UtteranceLegend({ tokens }: { tokens: UtteranceToken[] }) {
  return (
    <dl className="mt-3 grid gap-2">
      {UTTERANCE_LEGEND.map(({ kind, label }) => {
        const hits = tokens.filter((token) => token.kind === kind)
        if (hits.length === 0) return null
        return (
          <div key={kind} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4">
            <dt className={`rounded border px-1.5 py-0.5 font-semibold ${UTTERANCE_STYLE[kind]}`}>{label}</dt>
            {hits.map((hit, index) => (
              <dd key={index} className="text-white/50">
                <strong className="font-semibold text-white/85">{hit.text}</strong>
                {hit.gloss ? ` → ${hit.gloss}` : null}
              </dd>
            ))}
          </div>
        )
      })}
    </dl>
  )
}

function ProductCallControls({ thinking = false }: { thinking?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <CallControlDock
        connected
        microphoneEnabled
        busy={thinking}
        onToggleMicrophone={NOOP}
        onEndTurn={NOOP}
        onEndCall={NOOP}
      />
    </div>
  )
}

function TourCallStage({ state }: { state: TourState }) {
  return (
    <CallStage
      status="connected"
      elapsedSec={18}
      messages={state.messages}
      semanticAnnotations={state.semanticAnnotations}
      booking={state.booking}
      agentSpeaking={Boolean(state.agentSpeaking)}
      agentThinking={Boolean(state.agentThinking)}
      agentListening={Boolean(state.agentListening)}
      agentReady
      onStart={NOOP}
      onEnd={NOOP}
      liveKitSlot={<ProductCallControls thinking={Boolean(state.agentThinking)} />}
    />
  )
}

/**
 * Khi chưa có chuyến, giữ nguyên lưới lg hai cột của BusCallWorkspace để chữ
 * semantic đọc được ở kích thước thật. Khi sơ đồ ghế xuất hiện, thu toàn bộ
 * bố cục xl ba cột theo cùng một tỉ lệ để vừa khung landing.
 */
function DesktopProductPreview({ state, showVehicle }: { state: TourState; showVehicle: boolean }) {
  if (!showVehicle) {
    return (
      <div className="hidden overflow-hidden p-4 lg:block">
        <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
          <TourCallStage state={state} />
          <TicketCard booking={state.booking} />
        </div>
      </div>
    )
  }

  return (
    <div className="hidden p-4 lg:block">
      {/* zoom thu bố cục ba cột theo cả layout, nên khung cha tự cao đúng bằng nội dung đã thu. */}
      <div style={{ zoom: 0.68 }}>
        <div className="grid grid-cols-[minmax(520px,1fr)_minmax(420px,480px)_380px] items-start gap-5">
          <TourCallStage state={state} />
          <VehicleSeatVisual booking={state.booking} />
          <TicketCard booking={state.booking} />
        </div>
      </div>
    </div>
  )
}

/** Trên mobile, sản phẩm thật thu phiếu thành TicketSheet ở đáy cuộc gọi. */
function MobileProductPreview({ state }: { state: TourState }) {
  return (
    <div className="p-3 lg:hidden">
      <TourCallStage state={state} />
      <TicketSheet booking={state.booking} />
    </div>
  )
}

function ProductWorkspaceStage({ state, showVehicle = false }: { state: TourState; showVehicle?: boolean }) {
  return (
    <>
      <DesktopProductPreview state={state} showVehicle={showVehicle} />
      <MobileProductPreview state={state} />
    </>
  )
}

function SearchingProductPreview({ trip, reducedMotion }: { trip: AloveTourTrip; reducedMotion: boolean }) {
  const tokens = spokenTokens(trip)
  const options = [
    {
      departure: trip.departure,
      arrival: trip.arrival,
      priceVnd: trip.priceVnd,
      vehicleType: trip.vehicleType,
      seats: trip.seatsAvailable,
      recommended: true,
    },
    {
      departure: '06:00',
      arrival: '11:20',
      priceVnd: 350_000,
      vehicleType: 'Giường nằm 34 chỗ',
      seats: 7,
      recommended: false,
    },
    {
      departure: '13:00',
      arrival: '18:10',
      priceVnd: 520_000,
      vehicleType: 'Cabin 22 phòng',
      seats: 4,
      recommended: false,
    },
  ]

  return (
    <div className="h-full p-3 sm:p-5 lg:p-6">
      <div className="grid min-h-full gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <section className="relative flex flex-col overflow-hidden rounded-2xl bg-[#0f172a] p-4 text-white sm:p-6">
          <div className="absolute -right-16 -top-20 size-56 rounded-full bg-blue-500/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200">
                <Search size={14} aria-hidden /> Đang xử lý…
              </span>
              <span className="font-mono text-[11px] text-white/35">00:02.4</span>
            </div>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35 lg:mt-6">Câu nói vừa nhận</p>
            <blockquote className="mt-2 text-base font-medium leading-8 text-white sm:text-lg sm:leading-9">
              “<HighlightedUtterance tokens={tokens} />”
            </blockquote>
            <UtteranceLegend tokens={tokens} />

            <div className="mt-4 rounded-xl border border-white/10 bg-white/6 p-3 sm:mt-6 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <Sparkles size={14} aria-hidden /> VALSEA semantic
              </div>
              <p className="mt-3 text-[11px] text-white/40">Hiệu chỉnh:</p>
              <p className="mt-1 text-sm leading-6 text-white/85">
                “Đặt <strong className="text-white">2 vé</strong> từ {trip.origin} đi {trip.destination}, chuyến gần nhất, thanh toán trực tuyến.”
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ['quantity', '2'],
                  ['location', trip.destination],
                  ['code-switch', 'book, online'],
                  ['dialect', 'Trung Bộ'],
                ].map(([key, value], index) => (
                  <motion.span
                    key={key}
                    initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reducedMotion ? 0 : 0.18 + index * 0.1, duration: 0.25 }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/8 px-2.5 py-1.5 font-mono text-[10px] text-white/65"
                  >
                    <span className="text-blue-300">{key}</span>
                    <span>=</span>
                    <strong className="font-semibold text-white">{value}</strong>
                  </motion.span>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 text-xs sm:mt-5">
              <div className="flex items-center gap-2 text-emerald-300"><CheckCircle2 size={15} aria-hidden /> Đã hiểu nhu cầu</div>
              <div className="flex items-center gap-2 text-blue-200">
                <motion.span
                  className="size-3.5 rounded-full border-2 border-blue-300 border-t-transparent"
                  {...(reducedMotion
                    ? {}
                    : {
                        animate: { rotate: 360 },
                        transition: { duration: 0.9, repeat: Infinity, ease: 'linear' },
                      })}
                />
                Đang đối chiếu lịch và chỗ trống
              </div>
            </div>

            <div className="mt-8 hidden rounded-xl border border-white/10 bg-white/5 p-4 lg:mt-auto lg:block">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-white/80">Truy vấn song song</p>
                <span className="font-mono text-[10px] text-blue-300">3 nguồn</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.span
                  className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  initial={reducedMotion ? false : { width: '18%' }}
                  animate={{ width: '86%' }}
                  transition={{ duration: reducedMotion ? 0 : 1.4, ease: EASE }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] text-white/45">
                {['Lịch chạy', 'Kho ghế', 'Giá bán'].map((source, index) => (
                  <div key={source}>
                    <span className={`mx-auto mb-1.5 block size-2 rounded-full ${index === 1 ? 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]' : 'bg-emerald-400'}`} />
                    {source}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-[var(--hairline)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex flex-col gap-3 border-b border-[var(--divider)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--action)]">Kết quả từ hệ thống nhà xe</p>
              <h3 className="mt-1 text-xl font-bold tracking-[-0.035em] text-slate-950">{trip.origin} → {trip.destination}</h3>
            </div>
            <span className="inline-flex self-start items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" /> 3 chuyến phù hợp
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {options.map((option, index) => (
              <motion.article
                key={`${option.departure}-${index}`}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reducedMotion ? 0 : 0.16 + index * 0.12, duration: 0.3, ease: EASE }}
                className={`relative rounded-xl border p-4 ${option.recommended ? 'border-blue-400 bg-blue-50/70 sm:col-span-2' : 'border-slate-200 bg-white'}`}
              >
                {option.recommended ? (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
                    <Check size={11} aria-hidden /> Gần nhất
                  </span>
                ) : null}
                <div className="flex items-end gap-2">
                  <p className="font-mono text-2xl font-bold text-slate-950">{option.departure}</p>
                  <p className="pb-1 text-xs text-slate-400">→ {option.arrival}</p>
                </div>
                <p className="mt-2 text-xs text-slate-500">{option.vehicleType}</p>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-200 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={13} aria-hidden /> còn {option.seats} {trip.seatNoun}</span>
                  <span className="text-sm font-bold text-blue-700">{formatVnd(option.priceVnd)}</span>
                </div>
              </motion.article>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600">
            <MapPin size={15} className="mt-0.5 shrink-0 text-blue-600" aria-hidden />
            Ưu tiên chuyến {trip.departure}, còn đủ 2 {trip.seatNoun} và đón tại {trip.pickupPoint}.
          </div>

          {/* Trên mobile bỏ khối xếp hạng như panel trái đã làm với "Truy vấn song song": khung hẹp ưu tiên câu nói và ba lựa chọn chuyến. */}
          <div className="mt-8 hidden border-t border-[var(--divider)] pt-5 lg:mt-auto lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Alove xếp hạng theo</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['01', 'Khởi hành gần nhất'],
                ['02', 'Còn đủ chỗ'],
                ['03', 'Đúng điểm đón'],
              ].map(([number, label]) => (
                <div key={number} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="font-mono text-[10px] font-bold text-blue-600">{number}</span>
                  <p className="mt-1 text-[11px] font-medium leading-4 text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * Khung cuộn nằm ngoài, `inert` nằm trong: bản minh hoạ vẫn không bắt focus và
 * không vào cây a11y, nhưng chạm vào vẫn cuộn được nên nội dung tràn ở màn hẹp
 * chỉ là phải cuộn thêm, không biến mất. `min-h-full` canh giữa khi nội dung
 * ngắn mà vẫn với tới được đỉnh khi nội dung dài.
 */
function StagePane({ children, stretch = false }: { children: React.ReactNode; stretch?: boolean }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div inert aria-hidden="true" className={`flex min-h-full ${stretch ? 'items-stretch' : 'items-center'}`}>
        <div className="w-full">{children}</div>
      </div>
    </div>
  )
}

function StageFrame({ stageIndex, trip, reducedMotion }: {
  stageIndex: number
  trip: AloveTourTrip
  reducedMotion: boolean
}) {
  const states = createTourStates(trip)

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--canvas)] shadow-[var(--shadow-panel)]">
      {/* Khung cố định theo bước cao nhất ở mỗi breakpoint: pane có inert nên phần
          tràn ra ngoài không thể cuộn tới được, cắt là mất hẳn nội dung. */}
      <div className="relative h-[1360px] lg:h-[820px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stageIndex}
            className="h-full w-full"
            initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            {...(reducedMotion ? {} : { exit: { opacity: 0, y: -8, scale: 0.992 } })}
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: EASE }}
          >
            {stageIndex === 0 ? (
              <StagePane>
                <ProductWorkspaceStage state={states.listening} />
              </StagePane>
            ) : null}
            {stageIndex === 1 ? (
              <StagePane stretch>
                <SearchingProductPreview trip={trip} reducedMotion={reducedMotion} />
              </StagePane>
            ) : null}
            {stageIndex === 2 ? (
              <StagePane>
                <ProductWorkspaceStage state={states.confirming} showVehicle />
              </StagePane>
            ) : null}
            {stageIndex === 3 ? (
              <div
                data-testid="alove-product-tour-scroll"
                role="region"
                aria-label="Màn vé và mã QR"
                tabIndex={0}
                className="flex h-full overflow-y-auto overscroll-contain px-3 pb-24 sm:px-5 sm:pb-0"
              >
                <TicketResult
                  booking={states.confirmed.booking}
                  onNewCall={NOOP}
                  onClose={NOOP}
                  interactive={false}
                />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Hero dùng thẳng sân khấu cuộc gọi của sản phẩm, không dựng một dashboard marketing riêng. */
export function AloveHeroProductPreview({ trip = fallbackTrip }: { trip?: AloveTourTrip }) {
  const state: TourState = {
    ...createTourStates(trip).searching,
    semanticAnnotations: [],
  }

  return (
    <div className="relative mx-auto w-full" data-testid="alove-hero-product-preview">
      <p className="sr-only">Giao diện Web Call thật của Alove đang xử lý câu nói đặt vé.</p>
      <div inert aria-hidden="true">
        <TourCallStage state={state} />
      </div>
    </div>
  )
}

export function AloveProductTour({ trip = fallbackTrip }: { trip?: AloveTourTrip }) {
  const reducedMotion = Boolean(useReducedMotion())
  const [stageIndex, setStageIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = frameRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), {
      rootMargin: '-80px 0px',
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const isPlaying = visible && !paused && !reducedMotion

  useEffect(() => {
    if (!isPlaying) return
    const startedAt = performance.now() - progressRef.current * STAGE_DURATION_MS
    let frame = 0

    const tick = (now: number) => {
      const nextProgress = Math.min(1, (now - startedAt) / STAGE_DURATION_MS)
      progressRef.current = nextProgress
      setProgress(nextProgress)
      if (nextProgress >= 1) {
        progressRef.current = 0
        setProgress(0)
        setStageIndex((current) => (current + 1) % stages.length)
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, stageIndex])

  const selectStage = (index: number) => {
    progressRef.current = 0
    setProgress(0)
    setStageIndex(index)
    setPaused(true)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={frameRef}
        className="mx-auto w-full max-w-5xl"
      >
        <p className="sr-only">
          Bốn trạng thái thật trong sản phẩm Alove: cuộc gọi đang nghe, tổng đài đang tìm chuyến,
          ghế được giữ để khách xác nhận, rồi màn vé có mã QR sau khi hoàn tất.
        </p>
        <div data-testid="alove-product-tour-stage">
          <StageFrame stageIndex={stageIndex} trip={trip} reducedMotion={reducedMotion} />
        </div>

        <div className="mx-auto mt-4 w-full max-w-3xl px-1">
          <div className="mb-2 flex items-center justify-between text-xs">
            <p className="font-medium text-[var(--action)]">
              <span className="font-mono text-[var(--muted)]">{String(stageIndex + 1).padStart(2, '0')} / 04</span>
              <span className="mx-2 text-slate-300">·</span>
              {stages[stageIndex]?.label}
            </p>
            <button
              type="button"
              onClick={() => setPaused((current) => !current)}
              disabled={reducedMotion}
              aria-label={reducedMotion ? 'Chuyển động đã tắt theo cài đặt thiết bị' : paused ? 'Phát phần minh hoạ' : 'Tạm dừng phần minh hoạ'}
              className="grid size-10 place-items-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {paused || reducedMotion ? <Play size={14} className="ml-0.5" aria-hidden /> : <Pause size={14} aria-hidden />}
            </button>
          </div>
          <div className="flex gap-2">
            {stages.map((stage, index) => (
              <button
                key={stage.label}
                type="button"
                onClick={() => selectStage(index)}
                aria-label={`Bước ${index + 1}: ${stage.label}`}
                aria-current={index === stageIndex ? 'step' : undefined}
                className="group relative h-3 flex-1 overflow-hidden rounded-full bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {index < stageIndex ? <span className="absolute inset-0 bg-slate-400" /> : null}
                {index === stageIndex ? (
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--action)]"
                    style={{ width: `${Math.max(reducedMotion ? 1 : progress, 0.03) * 100}%` }}
                  />
                ) : null}
              </button>
            ))}
          </div>
        
        </div>
      </div>
    </MotionConfig>
  )
}

function createTourStates(trip: AloveTourTrip): {
  listening: TourState
  searching: TourState
  confirming: TourState
  confirmed: TourState
} {
  const emptyBooking: BookingSnapshot = {
    id: 'booking-MA2607180001',
    conversationId: TOUR_CONVERSATION_ID,
    status: 'collecting',
    origin: null,
    destination: null,
    travelDateLabel: null,
    passengerCount: null,
    selectedTrip: null,
    seats: [],
    passengerName: null,
    phone: null,
    totalFareVnd: null,
    bookingCode: null,
  }

  const proposedBooking: BookingSnapshot = {
    ...emptyBooking,
    status: 'trip_proposed',
    origin: trip.origin,
    destination: trip.destination,
    travelDateLabel: trip.travelDateLabel,
    passengerCount: 2,
    selectedTrip: {
      id: trip.id,
      origin: trip.origin,
      destination: trip.destination,
      departureTime: trip.departure,
      arrivalTime: trip.arrival === '—' ? null : trip.arrival,
      vehicleType: trip.vehicleType,
      priceVnd: trip.priceVnd,
      pickupPoint: trip.pickupPoint,
      dropoffPoint: trip.dropoffPoint,
      seatNoun: trip.seatNoun,
    },
    seats: ['A1', 'A2'],
    totalFareVnd: trip.priceVnd * 2,
  }

  const confirmedBooking: BookingSnapshot = {
    ...proposedBooking,
    status: 'confirmed',
    passengerName: 'Nguyễn Minh Anh',
    phone: '0909123456',
    bookingCode: 'MA-260718-0001',
  }

  const sourceTranscript = tokensToText(spokenTokens(trip))
  const correctedRequest = `Cho mình đặt hai vé từ ${trip.origin} đi ${trip.destination}, chuyến gần nhất, thanh toán trực tuyến nhé.`
  const customerRequest = message(
    'customer-request',
    'customer',
    sourceTranscript,
    0,
  )
  const requestAnnotation: SemanticAnnotation = {
    timestamp: new Date(Date.UTC(2026, 6, 18, 8, 0, 1)).toISOString(),
    sourceTranscript,
    correctedText: correctedRequest,
    tags: ['quantity', 'location', 'code-switch', 'dialect'],
    annotations: ['hai vé', trip.destination, 'book → đặt', 'online → trực tuyến', 'vô/mô/hỉ → Trung Bộ'],
  }
  const heldReply = message(
    'agent-held',
    'agent',
    `Dạ em giữ được ${trip.seatNoun} A1, A2, tổng ${formatVnd(trip.priceVnd * 2)}. Anh chị cho em xin họ tên và số điện thoại nhé.`,
    1,
  )
  const passengerDetails = message(
    'customer-details',
    'customer',
    'Nguyễn Minh Anh, số điện thoại 0909 123 456.',
    2,
  )
  const confirmationPrompt = message(
    'agent-confirmation',
    'agent',
    `Em xin xác nhận 2 vé chuyến ${trip.departure}, đón tại ${trip.pickupPoint}, tổng ${formatVnd(trip.priceVnd * 2)}.`,
    3,
  )
  const confirmation = message('customer-confirmation', 'customer', 'Đúng rồi, đặt giúp mình.', 4)

  return {
    listening: {
      booking: emptyBooking,
      messages: [customerRequest],
      semanticAnnotations: [],
      agentListening: true,
    },
    searching: {
      booking: emptyBooking,
      messages: [customerRequest],
      semanticAnnotations: [requestAnnotation],
      agentThinking: true,
    },
    confirming: {
      booking: proposedBooking,
      messages: [customerRequest, heldReply, passengerDetails, confirmationPrompt, confirmation],
      semanticAnnotations: [requestAnnotation],
      agentListening: true,
    },
    confirmed: {
      booking: confirmedBooking,
      messages: [customerRequest, heldReply, passengerDetails, confirmationPrompt, confirmation],
      semanticAnnotations: [requestAnnotation],
    },
  }
}

function message(id: string, role: 'customer' | 'agent', text: string, seconds: number): CallMessage {
  return {
    id,
    conversationId: TOUR_CONVERSATION_ID,
    role,
    text,
    createdAt: new Date(Date.UTC(2026, 6, 18, 8, 0, seconds)).toISOString(),
    channel: 'voice',
    final: true,
  }
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}
