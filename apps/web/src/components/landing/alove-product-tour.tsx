'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { Mic, Pause, PhoneOff, Play } from 'lucide-react'

import { CallStage } from '@/components/bus-call/call-stage'
import { TicketCard } from '@/components/bus-call/ticket-card'
import { TicketResult } from '@/components/bus-call/ticket-result'
import { TicketSheet } from '@/components/bus-call/ticket-sheet'
import { VehicleSeatVisual } from '@/components/bus-call/vehicle-seat-visual'
import type { BookingSnapshot, CallMessage } from '@/lib/call-contract'

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
  agentThinking?: boolean
  agentListening?: boolean
  agentSpeaking?: boolean
}

function ProductCallControls({ thinking = false }: { thinking?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white/90"
        >
          <Mic className="size-4" aria-hidden /> Tắt mic
        </button>
        <button
          type="button"
          disabled={thinking}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white/90 disabled:opacity-40"
        >
          Tôi nói xong
        </button>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--danger)_55%,transparent)] bg-[color-mix(in_srgb,var(--danger)_22%,transparent)] px-4 text-sm font-medium text-white"
        >
          <PhoneOff className="size-4" aria-hidden /> Kết thúc
        </button>
      </div>
    </div>
  )
}

function TourCallStage({ state }: { state: TourState }) {
  return (
    <CallStage
      status="connected"
      elapsedSec={18}
      messages={state.messages}
      semanticAnnotations={[]}
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
 * Bản desktop dùng đúng ba khối của BusCallWorkspace. Canvas được thu theo cùng
 * tỉ lệ để toàn bộ bố cục xl của sản phẩm lọt vào khung landing mà không phải
 * dựng lại phiên bản marketing riêng.
 */
function DesktopProductPreview({ state, showVehicle }: { state: TourState; showVehicle: boolean }) {
  return (
    <div className="hidden h-[520px] overflow-hidden p-4 lg:block">
      <div className="w-[147.0588%] origin-top-left scale-[0.68]">
        <div
          className={showVehicle
            ? 'grid items-start gap-5 grid-cols-[minmax(520px,1fr)_minmax(420px,480px)_380px]'
            : 'grid items-start gap-5 grid-cols-[minmax(520px,1fr)_380px]'}
        >
          <TourCallStage state={state} />
          {showVehicle ? <VehicleSeatVisual booking={state.booking} /> : null}
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

function StageFrame({ stageIndex, trip, reducedMotion }: {
  stageIndex: number
  trip: AloveTourTrip
  reducedMotion: boolean
}) {
  const states = createTourStates(trip)
  const resultHeight = stageIndex === 3
    ? 'min-h-[1100px] sm:min-h-[940px] lg:min-h-[760px]'
    : 'min-h-[660px] lg:min-h-0 lg:h-[520px]'

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--canvas)] shadow-[var(--shadow-panel)]">
      <div className={`relative ${resultHeight}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stageIndex}
            className="w-full"
            initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            {...(reducedMotion ? {} : { exit: { opacity: 0, y: -8, scale: 0.992 } })}
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: EASE }}
          >
            {stageIndex === 0 ? <ProductWorkspaceStage state={states.listening} /> : null}
            {stageIndex === 1 ? <ProductWorkspaceStage state={states.searching} /> : null}
            {stageIndex === 2 ? <ProductWorkspaceStage state={states.confirming} showVehicle /> : null}
            {stageIndex === 3 ? (
              <div className="px-3 sm:px-5">
                <TicketResult booking={states.confirmed.booking} onNewCall={NOOP} onClose={NOOP} />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export function AloveProductTour({ trip = fallbackTrip }: { trip?: AloveTourTrip }) {
  const reducedMotion = Boolean(useReducedMotion())
  const [stageIndex, setStageIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
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

  const isPlaying = visible && !paused && !hovered && !reducedMotion

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
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={frameRef}
        className="mx-auto w-full max-w-5xl"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <p className="sr-only">
          Bốn trạng thái thật trong sản phẩm Alove: cuộc gọi đang nghe, tổng đài đang tìm chuyến,
          ghế được giữ để khách xác nhận, rồi màn vé có mã QR sau khi hoàn tất.
        </p>
        <div inert aria-hidden="true" data-testid="alove-product-tour-stage">
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
          <p className="mt-3 text-center text-[11px] leading-5 text-[var(--muted)]">
            Đây là chính giao diện Web Call của Alove; lịch, chỗ và mã vé được hệ thống nhà xe xác nhận khi gọi thật.
          </p>
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

  const customerRequest = message(
    'customer-request',
    'customer',
    `Cho mình chuyến từ ${trip.origin} đi ${trip.destination} gần nhất, hai người.`,
    0,
  )
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
      agentListening: true,
    },
    searching: {
      booking: emptyBooking,
      messages: [customerRequest],
      agentThinking: true,
    },
    confirming: {
      booking: proposedBooking,
      messages: [customerRequest, heldReply, passengerDetails, confirmationPrompt, confirmation],
      agentListening: true,
    },
    confirmed: {
      booking: confirmedBooking,
      messages: [customerRequest, heldReply, passengerDetails, confirmationPrompt, confirmation],
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
