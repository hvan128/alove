'use client'

import type { BookingFieldKey } from '@ordervoice/contracts'
import { createBusDemoCatalog, getBookingConfirmationState } from '@ordervoice/core/bus-booking'
import { CheckCircleIcon } from '@phosphor-icons/react/dist/icons/CheckCircle'
import { CopyIcon } from '@phosphor-icons/react/dist/icons/Copy'
import { LightbulbIcon } from '@phosphor-icons/react/dist/icons/Lightbulb'
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/icons/PaperPlaneTilt'
import { SpeakerHighIcon } from '@phosphor-icons/react/dist/icons/SpeakerHigh'
import { WarningCircleIcon } from '@phosphor-icons/react/dist/icons/WarningCircle'
import { useState } from 'react'
import type { CallSessionState } from '@/lib/call/session-state'

const BUS_CATALOG = createBusDemoCatalog()

type Props = {
  state: CallSessionState
  onSpeakSuggestion: () => void
  onSendCustomReply: (text: string) => void
  onConfirm: () => void
}

export function AssistantRail({ state, onSpeakSuggestion, onSendCustomReply, onConfirm }: Props) {
  const [reply, setReply] = useState('')
  const [copied, setCopied] = useState(false)
  const gate = getBookingConfirmationState(state.booking)
  const catalog = BUS_CATALOG.filter((trip) => (
    (!state.booking.origin || trip.origin === state.booking.origin)
    && (!state.booking.destination || trip.destination === state.booking.destination)
  ))

  const copySuggestion = async () => {
    try {
      await navigator.clipboard.writeText(state.suggestion.text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <aside className="space-y-3" aria-label="Trợ lý nhân viên">
      <section className="rounded-[18px] border border-[color-mix(in_srgb,var(--action)_24%,var(--hairline))] bg-[var(--action-soft)] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--action)]">
          <LightbulbIcon size={17} weight="fill" aria-hidden /> Gợi ý trả lời
        </div>
        <p className="mt-3 text-[15px] font-medium leading-6 text-[var(--ink)]">{state.suggestion.text}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onSpeakSuggestion} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[var(--action)] px-3 text-sm font-medium text-white transition hover:bg-[var(--action-hover)]">
            <SpeakerHighIcon size={17} weight="fill" aria-hidden /> Nói câu này
          </button>
          <button type="button" onClick={copySuggestion} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[var(--hairline)] bg-white px-3 text-sm font-medium transition hover:bg-[var(--pearl)]">
            <CopyIcon size={17} aria-hidden /> {copied ? 'Đã chép' : 'Sao chép'}
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-[var(--muted)]">
          {state.mode === 'human' ? 'Chế độ Nhân viên: hệ thống không tự phát giọng.' : 'Chế độ Agent: câu mới có thể được trả lời và đọc tự động.'}
        </p>
      </section>

      <section className="rounded-[18px] border border-[var(--hairline)] bg-white p-4">
        <h2 className="text-sm font-semibold">Phản hồi tùy chỉnh</h2>
        <textarea
          aria-label="Phản hồi của nhân viên"
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={3}
          placeholder="Nhập câu nhân viên muốn nói..."
          className="mt-3 w-full resize-y rounded-[10px] border border-[var(--hairline)] px-3 py-2 text-sm leading-5"
        />
        <button
          type="button"
          disabled={!reply.trim()}
          onClick={() => {
            onSendCustomReply(reply.trim())
            setReply('')
          }}
          className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--hairline)] bg-white px-3 text-sm font-medium transition hover:bg-[var(--pearl)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <PaperPlaneTiltIcon size={17} weight="fill" aria-hidden /> Gửi và nói
        </button>
      </section>

      <section className="rounded-[18px] border border-[var(--hairline)] bg-white p-4">
        <h2 className="text-sm font-semibold">Thông tin còn thiếu</h2>
        {gate.missingFields.length === 0 ? (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--success)]"><CheckCircleIcon size={17} weight="fill" aria-hidden /> Đã đủ trường bắt buộc</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {gate.missingFields.map((field) => <span key={field} className="rounded-[7px] bg-[var(--pearl)] px-2 py-1 text-xs text-[var(--muted)]">{fieldLabel(field)}</span>)}
          </div>
        )}
        {state.booking.reviewItems.filter((item) => item.status === 'open').map((item) => (
          <div key={item.id} className="mt-3 flex gap-2 rounded-[10px] bg-[var(--warning-soft)] p-3 text-xs leading-5 text-[var(--warning)]">
            <WarningCircleIcon size={16} className="mt-0.5 shrink-0" weight="fill" aria-hidden />
            <span>{item.message}</span>
          </div>
        ))}
      </section>

      <section className="rounded-[18px] border border-[var(--hairline)] bg-white p-4">
        <h2 className="text-sm font-semibold">Chuyến phù hợp</h2>
        <div className="mt-3 space-y-2">
          {catalog.length === 0 ? <p className="text-xs leading-5 text-[var(--muted)]">Chưa có chuyến trong catalog demo cho hành trình này.</p> : catalog.slice(0, 2).map((trip) => (
            <div key={trip.id} className="rounded-[11px] border border-[var(--divider)] p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-semibold">{trip.departureTime}</span>
                <span className="text-xs font-medium text-[var(--action)]">{new Intl.NumberFormat('vi-VN').format(trip.priceVnd)} ₫</span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{trip.vehicleType} · còn {trip.availableSeats.length} ghế</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[18px] border border-[var(--hairline)] bg-white p-4">
        {state.booking.status === 'confirmed' ? (
          <div className="text-center">
            <CheckCircleIcon size={28} className="mx-auto text-[var(--success)]" weight="fill" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--success)]">Đã xác nhận</p>
            <p className="mt-1 font-mono text-base font-semibold">{state.booking.bookingCode}</p>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold">Xác nhận cuối</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Nhân viên là người duy nhất phát hành mã vé trong bản demo.</p>
            <button
              type="button"
              disabled={!gate.ready}
              onClick={onConfirm}
              className="mt-3 min-h-11 w-full rounded-[11px] bg-[var(--ink)] px-4 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-35"
            >
              Xác nhận đặt vé
            </button>
          </>
        )}
      </section>
    </aside>
  )
}

function fieldLabel(field: BookingFieldKey): string {
  const labels: Record<BookingFieldKey, string> = {
    origin: 'Điểm đi', destination: 'Điểm đến', travelDateLabel: 'Ngày đi', timeWindow: 'Giờ đi',
    passengerCount: 'Số khách', passengerName: 'Họ tên', phone: 'Số điện thoại', pickupPoint: 'Điểm đón',
    dropoffPoint: 'Điểm trả', selectedTrip: 'Chuyến xe', seats: 'Ghế', vehiclePreference: 'Loại xe',
    paymentMethod: 'Thanh toán', note: 'Ghi chú',
  }
  return labels[field]
}
