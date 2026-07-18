'use client'

import type { OperatorRole, SeatHold, TripSeat } from '@ordervoice/contracts'
import { ClockIcon, LockKeyIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

type Props = {
  seats: TripSeat[]
  passengerCount: number
  selected: string[]
  hold: SeatHold | null
  actorRole?: OperatorRole | undefined
  now?: string
  onHold: (seatCodes: string[]) => void | SeatHold | Promise<void | SeatHold>
  onRenew?: () => void | SeatHold | Promise<void | SeatHold>
  onRelease?: (reason: string) => void | Promise<void>
  onBlock?: ((seatCode: string, blocked: boolean) => void | Promise<void>) | undefined
}

export function SeatPicker({
  seats,
  passengerCount,
  selected,
  hold,
  actorRole,
  now,
  onHold,
  onRenew,
  onRelease,
  onBlock,
}: Props) {
  const [selection, setSelection] = useState(() => selected)
  const [effectiveHold, setEffectiveHold] = useState<SeatHold | null>(() => hold)
  const [clock, setClock] = useState(() => now ? Date.parse(now) : Date.now())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canBlock = actorRole === 'admin' || actorRole === 'dispatcher'
  const remainingSeconds = effectiveHold ? Math.max(0, Math.ceil((Date.parse(effectiveHold.expiresAt) - clock) / 1000)) : 0
  const expired = Boolean(effectiveHold && (effectiveHold.status !== 'active' || remainingSeconds === 0))
  const canRenew = Boolean(effectiveHold && !expired && clock < Date.parse(effectiveHold.maxExpiresAt) && onRenew)

  useEffect(() => {
    if (now || !effectiveHold || expired) return
    const timer = window.setInterval(() => setClock(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [effectiveHold, expired, now])

  async function toggleSeat(seat: TripSeat) {
    if (seat.state !== 'available' && !selection.includes(seat.seatCode)) return
    const next = selection.includes(seat.seatCode)
      ? selection.filter((code) => code !== seat.seatCode)
      : selection.length < passengerCount
        ? [...selection, seat.seatCode]
        : selection
    setSelection(next)
    setError(null)
    if (next.length !== passengerCount || sameCodes(next, selection)) return
    setBusy(true)
    try {
      const nextHold = await onHold(next)
      if (nextHold) setEffectiveHold(nextHold)
    } catch (holdError) {
      setError(holdError instanceof Error ? holdError.message : 'Không thể giữ ghế đã chọn.')
    } finally {
      setBusy(false)
    }
  }

  async function renew() {
    if (!onRenew) return
    setBusy(true)
    try {
      const renewed = await onRenew()
      if (renewed) setEffectiveHold(renewed)
      setClock(now ? Date.parse(now) : Date.now())
    } catch (renewError) {
      setError(renewError instanceof Error ? renewError.message : 'Không thể gia hạn giữ ghế.')
    } finally {
      setBusy(false)
    }
  }

  async function selectAgain() {
    setBusy(true)
    try {
      await onRelease?.('expired_reselect')
      setSelection([])
      setEffectiveHold(null)
      setError(null)
    } finally {
      setBusy(false)
    }
  }

  async function block(seat: TripSeat) {
    if (!onBlock) return
    setBusy(true)
    try {
      await onBlock(seat.seatCode, seat.state !== 'blocked')
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : 'Không thể đổi trạng thái ghế.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="seat-picker-title" className="rounded-[14px] border border-[var(--hairline)] bg-[var(--pearl)] p-4 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="seat-picker-title" className="text-sm font-semibold">Sơ đồ ghế nhân viên</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">Chọn đủ {passengerCount} ghế để tạo giữ chỗ.</p>
        </div>
        <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted)]">{selection.length}/{passengerCount} đã chọn</span>
      </div>

      <div aria-label="Chú giải trạng thái ghế" className="mt-4 flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
        <Legend className="bg-[var(--action-soft)]" label="Còn trống" />
        <Legend className="bg-[var(--warning-soft)]" label="Đang giữ" />
        <Legend className="bg-[var(--divider)]" label="Đã bán" />
        <Legend className="bg-[var(--danger-soft)]" label="Khóa" />
      </div>

      <div role="grid" aria-label="Ghế của chuyến" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {seats.map((seat) => {
          const isSelected = selection.includes(seat.seatCode)
          const disabled = busy || (seat.state !== 'available' && !isSelected)
          return (
            <div key={seat.seatCode} className="space-y-1">
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`Ghế ${seat.seatCode} · ${stateLabel(seat.state)}`}
                disabled={disabled}
                onClick={() => void toggleSeat(seat)}
                className={`min-h-11 w-full rounded-xl border px-2 text-xs font-semibold disabled:cursor-not-allowed ${seatClass(seat.state, isSelected)}`}
              >
                {seat.seatCode}<span className="sr-only"> · {stateLabel(seat.state)}</span>
              </button>
              {canBlock && onBlock && (seat.state === 'available' || seat.state === 'blocked') ? (
                <button type="button" disabled={busy} aria-label={`${seat.state === 'blocked' ? 'Mở khóa' : 'Khóa'} ghế ${seat.seatCode}`} onClick={() => void block(seat)} className="min-h-11 w-full rounded-xl text-[10px] font-medium text-[var(--muted)] hover:bg-[var(--surface)]">
                  <LockKeyIcon size={13} className="mx-auto" aria-hidden />
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {effectiveHold && !expired ? (
        <div role={remainingSeconds <= 60 ? 'alert' : 'status'} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">
          <span className="inline-flex items-center gap-2"><ClockIcon size={16} aria-hidden />Giữ đến {formatTime(effectiveHold.expiresAt)} · còn {formatRemaining(remainingSeconds)}</span>
          {canRenew ? <button type="button" disabled={busy} onClick={() => void renew()} className="min-h-11 rounded-full px-3 font-semibold">Gia hạn 10 phút</button> : null}
        </div>
      ) : null}
      {expired ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
          <span>Giữ ghế đã hết hạn. Không thể xác nhận vé.</span>
          <button type="button" disabled={busy} onClick={() => void selectAgain()} className="min-h-11 rounded-full px-3 font-semibold">Chọn lại</button>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-xs text-[var(--danger)]">{error}</p> : null}
    </section>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${className}`} aria-hidden />{label}</span>
}

function stateLabel(state: TripSeat['state']): string {
  return state === 'available' ? 'Còn trống' : state === 'held' ? 'Đang giữ' : state === 'booked' ? 'Đã bán' : 'Khóa'
}

function seatClass(state: TripSeat['state'], selected: boolean): string {
  if (selected) return 'border-[var(--action)] bg-[var(--action)] text-[var(--on-action)]'
  if (state === 'available') return 'border-[var(--action)]/20 bg-[var(--action-soft)] text-[var(--action)]'
  if (state === 'held') return 'border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]'
  if (state === 'booked') return 'border-[var(--hairline)] bg-[var(--divider)] text-[var(--muted)]'
  return 'border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]'
}

function sameCodes(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((code, index) => code === right[index])
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
}

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}
