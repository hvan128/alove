'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Search, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/input'
import { verifiedBookingSchema, type VerifiedBooking } from '@/lib/booking-verification'
import { vietnamesePhoneSchema } from '@/lib/call-contract'

type FormErrors = { code?: string; phone?: string }
type RequestState = 'idle' | 'loading' | 'error' | 'success'

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ'
}

function sentenceCase(value: string): string {
  return value.charAt(0).toLocaleUpperCase('vi-VN') + value.slice(1)
}

export function VerifyBooking({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode.trim().toLocaleUpperCase('vi-VN'))
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [requestState, setRequestState] = useState<RequestState>('idle')
  const [requestError, setRequestError] = useState('')
  const [booking, setBooking] = useState<VerifiedBooking | null>(null)
  const errorRef = useRef<HTMLDivElement | null>(null)
  const resultRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    if (requestState === 'error') errorRef.current?.focus()
    if (requestState === 'success') resultRef.current?.focus()
  }, [requestState])

  const clearStaleResult = () => {
    if (requestState === 'success' || requestState === 'error') {
      setRequestState('idle')
      setRequestError('')
      setBooking(null)
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const normalizedCode = code.trim().toLocaleUpperCase('vi-VN')
    if (!normalizedCode) nextErrors.code = 'Nhập mã vé.'
    if (!vietnamesePhoneSchema.safeParse(phone).success) {
      nextErrors.phone = 'Nhập số điện thoại Việt Nam hợp lệ.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setCode(normalizedCode)
    setRequestState('loading')
    setRequestError('')
    setBooking(null)
    try {
      const response = await fetch('/api/booking/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode, phone }),
      })
      const body = await response.json().catch(() => null) as unknown
      if (!response.ok) {
        const message = response.status === 429
          ? 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.'
          : response.status === 503
            ? 'Hệ thống xác minh tạm thời chưa sẵn sàng. Vui lòng thử lại sau.'
            : 'Không thể xác minh vé với thông tin này. Kiểm tra mã vé và số điện thoại rồi thử lại.'
        setRequestError(message)
        setRequestState('error')
        return
      }

      const result = typeof body === 'object' && body !== null && 'booking' in body
        ? verifiedBookingSchema.safeParse(body.booking)
        : null
      if (!result?.success) throw new Error('Invalid verification response')
      setBooking(result.data)
      setRequestState('success')
    } catch {
      setRequestError('Không thể kết nối để xác minh. Kiểm tra mạng rồi thử lại.')
      setRequestState('error')
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mx-auto max-w-xl text-center">
        <ShieldCheck className="mx-auto text-[var(--action)]" size={38} aria-hidden />
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">Xác minh vé Alove</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
          Nhập mã vé và số điện thoại đã dùng khi đặt để xem thông tin chuyến.
        </p>
      </header>

      <form
        className="mx-auto mt-8 max-w-xl rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-sm sm:p-6"
        aria-busy={requestState === 'loading'}
        onSubmit={(event) => void submit(event)}
      >
        <div className="grid gap-5">
          <TextInput
            label="Mã vé"
            value={code}
            error={errors.code ?? ''}
            disabled={requestState === 'loading'}
            autoComplete="off"
            onChange={(event) => {
              setCode(event.target.value)
              setErrors(({ code: _code, ...current }) => current)
              clearStaleResult()
            }}
          />
          <TextInput
            label="Số điện thoại đặt vé"
            value={phone}
            error={errors.phone ?? ''}
            hint="Số điện thoại chỉ được dùng để đối chiếu vé này."
            disabled={requestState === 'loading'}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            onChange={(event) => {
              setPhone(event.target.value)
              setErrors(({ phone: _phone, ...current }) => current)
              clearStaleResult()
            }}
          />
          <div className="[&>span]:w-full [&_button]:w-full">
            <Button type="submit" disabled={requestState === 'loading'}>
              <Search size={17} aria-hidden />
              {requestState === 'loading' ? 'Đang xác minh…' : 'Xác minh vé'}
            </Button>
          </div>
          {requestState === 'error' ? (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface))] px-4 py-3 text-sm leading-6 text-[var(--danger)] outline-none"
            >
              {requestError}
            </div>
          ) : null}
        </div>
      </form>

      {booking ? (
        <section className="mx-auto mt-7 max-w-2xl rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-sm motion-safe:animate-[fade-in_180ms_cubic-bezier(0.16,1,0.3,1)] sm:p-7" aria-label="Thông tin vé đã xác minh">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={18} aria-hidden /> Đã xác minh
          </div>
          <h2 ref={resultRef} tabIndex={-1} className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] outline-none">
            {booking.origin} → {booking.destination}
          </h2>
          <p className="mt-2 font-mono text-sm font-semibold tracking-[0.08em] text-[var(--action)]">{booking.bookingCode}</p>

          <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--muted)]">Ngày và giờ đi</dt><dd className="mt-1 font-medium text-[var(--ink)]">{booking.travelDateLabel} · {booking.departureTime}</dd></div>
            <div><dt className="text-[var(--muted)]">{sentenceCase(booking.seatNoun)}</dt><dd className="mt-1 font-medium text-[var(--ink)]">{booking.seats.join(', ')}</dd></div>
            <div><dt className="text-[var(--muted)]">Loại xe</dt><dd className="mt-1 font-medium text-[var(--ink)]">{booking.vehicleType}</dd></div>
            <div><dt className="text-[var(--muted)]">Số hành khách</dt><dd className="mt-1 font-medium text-[var(--ink)]">{booking.passengerCount}</dd></div>
            <div><dt className="text-[var(--muted)]">Điểm đón</dt><dd className="mt-1 font-medium text-[var(--ink)]">{booking.pickupPoint}</dd></div>
            <div><dt className="text-[var(--muted)]">Điểm trả</dt><dd className="mt-1 font-medium text-[var(--ink)]">{booking.dropoffPoint}</dd></div>
            <div><dt className="text-[var(--muted)]">Tổng tiền</dt><dd className="mt-1 font-semibold text-[var(--ink)]">{formatVnd(booking.totalFareVnd)}</dd></div>
          </dl>

          <div className="mt-6">
            <Button variant="quiet" onClick={() => {
              setPhone('')
              setBooking(null)
              setRequestState('idle')
            }}>Xác minh vé khác</Button>
          </div>
          <span className="sr-only" aria-live="polite">Đã xác minh vé.</span>
        </section>
      ) : null}
    </main>
  )
}
