'use client'

import type {
  BookingDraft,
  BookingFieldEvidence,
  BookingFieldKey,
  BusTrip,
} from '@ordervoice/contracts'
import { createBusDemoCatalog } from '@ordervoice/core/bus-booking'
import { CheckCircleIcon } from '@phosphor-icons/react/dist/icons/CheckCircle'
import { LockKeyIcon } from '@phosphor-icons/react/dist/icons/LockKey'
import { FieldEvidence } from '@/components/ui/field-evidence'

const BUS_CATALOG = createBusDemoCatalog()

type Props = {
  booking: BookingDraft
  onEdit: <K extends BookingFieldKey>(field: K, value: BookingDraft[K]) => void
}

export function BookingForm({ booking, onEdit }: Props) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-white" aria-labelledby="booking-form-title">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--divider)] px-4 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Phiếu đang lập</p>
          <h2 id="booking-form-title" className="mt-1 text-[17px] font-semibold tracking-[-0.025em]">Thông tin đặt xe</h2>
        </div>
        <span className="rounded-[8px] bg-[var(--pearl)] px-2 py-1 font-mono text-[11px] text-[var(--muted)]">{booking.id}</span>
      </header>

      <div className="space-y-6 p-4">
        <FieldGroup title="Hành trình">
          <div className="grid gap-3 sm:grid-cols-2">
            <BookingTextField booking={booking} field="origin" label="Điểm đi" value={booking.origin ?? ''} onCommit={(value) => onEdit('origin', value || null)} />
            <BookingTextField booking={booking} field="destination" label="Điểm đến" value={booking.destination ?? ''} onCommit={(value) => onEdit('destination', value || null)} />
            <BookingTextField booking={booking} field="travelDateLabel" label="Ngày đi" value={booking.travelDateLabel ?? ''} placeholder="VD: 24/07/2026" onCommit={(value) => onEdit('travelDateLabel', value || null)} />
            <BookingTextField booking={booking} field="timeWindow" label="Giờ đi" value={booking.timeWindow ?? ''} placeholder="VD: 22:00" onCommit={(value) => onEdit('timeWindow', value || null)} />
          </div>
        </FieldGroup>

        <FieldGroup title="Hành khách">
          <div className="grid gap-3 sm:grid-cols-2">
            <BookingNumberField booking={booking} onEdit={onEdit} />
            <BookingTextField booking={booking} field="passengerName" label="Họ tên hành khách" value={booking.passengerName ?? ''} onCommit={(value) => onEdit('passengerName', value || null)} />
            <BookingTextField booking={booking} field="phone" label="Số điện thoại" value={booking.phone ?? ''} inputMode="tel" onCommit={(value) => onEdit('phone', value || null)} />
            <BookingSelectField
              booking={booking}
              field="paymentMethod"
              label="Thanh toán"
              value={booking.paymentMethod ?? ''}
              options={['Chuyển khoản', 'Tiền mặt', 'MoMo', 'ZaloPay']}
              onCommit={(value) => onEdit('paymentMethod', value || null)}
            />
          </div>
        </FieldGroup>

        <FieldGroup title="Đón và trả khách">
          <div className="grid gap-3 sm:grid-cols-2">
            <BookingTextField booking={booking} field="pickupPoint" label="Điểm đón" value={booking.pickupPoint ?? ''} onCommit={(value) => onEdit('pickupPoint', value || null)} />
            <BookingTextField booking={booking} field="dropoffPoint" label="Điểm trả" value={booking.dropoffPoint ?? ''} onCommit={(value) => onEdit('dropoffPoint', value || null)} />
          </div>
        </FieldGroup>

        <FieldGroup title="Chuyến và ghế">
          <div className="grid gap-3 sm:grid-cols-2">
            <TripSelect booking={booking} catalog={BUS_CATALOG} onCommit={(trip) => onEdit('selectedTrip', trip)} />
            <BookingTextField booking={booking} field="seats" label="Ghế" value={booking.seats.join(', ')} placeholder="VD: A05, A06" onCommit={(value) => onEdit('seats', value.split(',').map((seat) => seat.trim().toUpperCase()).filter(Boolean))} />
            <BookingSelectField
              booking={booking}
              field="vehiclePreference"
              label="Loại xe mong muốn"
              value={booking.vehiclePreference ?? ''}
              options={['Giường nằm', 'Limousine', 'Ghế ngồi']}
              onCommit={(value) => onEdit('vehiclePreference', value || null)}
            />
            <div className="rounded-[12px] border border-[var(--divider)] bg-[var(--pearl)] p-3">
              <p className="text-xs font-medium text-[var(--muted)]">Tạm tính</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">{formatVnd(booking.totalFareVnd)}</p>
            </div>
          </div>
        </FieldGroup>

        <FieldGroup title="Ghi chú">
          <BookingTextArea booking={booking} onEdit={onEdit} />
        </FieldGroup>
      </div>
    </section>
  )
}

function BookingNumberField({ booking, onEdit }: Props) {
  const evidence = latestEvidence(booking, 'passengerCount')
  const confirmed = booking.confirmedFields.includes('passengerCount')
  return (
    <div data-testid="booking-field-passengerCount">
      <label className="block text-xs font-medium text-[var(--muted)]">
        Số khách
        <input
          aria-label="Số khách"
          type="number"
          min={1}
          max={6}
          value={booking.passengerCount ?? ''}
          onChange={(event) => onEdit('passengerCount', event.target.value ? Number(event.target.value) : null)}
          className="mt-1.5 min-h-10 w-full rounded-[10px] border border-[var(--hairline)] bg-white px-3 text-sm text-[var(--ink)]"
        />
      </label>
      <EvidenceStatus evidence={evidence} confirmed={confirmed} />
    </div>
  )
}

function BookingTextArea({ booking, onEdit }: Props) {
  return (
    <div data-testid="booking-field-note">
      <label className="block text-xs font-medium text-[var(--muted)]">
        Nội dung cần lưu ý
        <textarea
          key={booking.note ?? 'empty-note'}
          aria-label="Nội dung cần lưu ý"
          defaultValue={booking.note ?? ''}
          onBlur={(event) => {
            const next = event.currentTarget.value.trim()
            if (next !== (booking.note ?? '')) onEdit('note', next || null)
          }}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-[10px] border border-[var(--hairline)] bg-white px-3 py-2 text-sm leading-5 text-[var(--ink)]"
        />
      </label>
      <EvidenceStatus evidence={latestEvidence(booking, 'note')} confirmed={booking.confirmedFields.includes('note')} />
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[13px] font-semibold tracking-[-0.01em] text-[var(--ink)]">{title}</legend>
      {children}
    </fieldset>
  )
}

type TextFieldProps = {
  booking: BookingDraft
  field: BookingFieldKey
  label: string
  value: string
  placeholder?: string
  inputMode?: 'text' | 'tel' | 'numeric'
  onCommit: (value: string) => void
}

function BookingTextField({ booking, field, label, value, placeholder, inputMode = 'text', onCommit }: TextFieldProps) {
  return (
    <div data-testid={`booking-field-${field}`} className="animate-field-confirm">
      <label className="block text-xs font-medium text-[var(--muted)]">
        {label}
        <input
          key={`${field}-${value}`}
          aria-label={label}
          defaultValue={value}
          placeholder={placeholder}
          inputMode={inputMode}
          onBlur={(event) => {
            const normalized = event.currentTarget.value.trim()
            if (normalized !== value) onCommit(normalized)
          }}
          className="mt-1.5 min-h-10 w-full rounded-[10px] border border-[var(--hairline)] bg-white px-3 text-sm text-[var(--ink)] placeholder:text-[var(--subtle)]"
        />
      </label>
      <EvidenceStatus evidence={latestEvidence(booking, field)} confirmed={booking.confirmedFields.includes(field)} />
    </div>
  )
}

function BookingSelectField({
  booking,
  field,
  label,
  value,
  options,
  onCommit,
}: {
  booking: BookingDraft
  field: BookingFieldKey
  label: string
  value: string
  options: string[]
  onCommit: (value: string) => void
}) {
  return (
    <div data-testid={`booking-field-${field}`}>
      <label className="block text-xs font-medium text-[var(--muted)]">
        {label}
        <select aria-label={label} value={value} onChange={(event) => onCommit(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-[10px] border border-[var(--hairline)] bg-white px-3 text-sm text-[var(--ink)]">
          <option value="">Chưa chọn</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <EvidenceStatus evidence={latestEvidence(booking, field)} confirmed={booking.confirmedFields.includes(field)} />
    </div>
  )
}

function TripSelect({ booking, catalog, onCommit }: { booking: BookingDraft; catalog: BusTrip[]; onCommit: (trip: BusTrip | null) => void }) {
  return (
    <div data-testid="booking-field-selectedTrip">
      <label className="block text-xs font-medium text-[var(--muted)]">
        Chuyến xe
        <select
          aria-label="Chuyến xe"
          value={booking.selectedTrip?.id ?? ''}
          onChange={(event) => onCommit(catalog.find((trip) => trip.id === event.target.value) ?? null)}
          className="mt-1.5 min-h-10 w-full rounded-[10px] border border-[var(--hairline)] bg-white px-3 text-sm text-[var(--ink)]"
        >
          <option value="">Chưa chọn chuyến</option>
          {catalog.map((trip) => <option key={trip.id} value={trip.id}>{trip.departureTime} · {trip.origin} đến {trip.destination}</option>)}
        </select>
      </label>
      <EvidenceStatus evidence={latestEvidence(booking, 'selectedTrip')} confirmed={booking.confirmedFields.includes('selectedTrip')} />
    </div>
  )
}

function EvidenceStatus({ evidence, confirmed }: { evidence?: BookingFieldEvidence; confirmed: boolean }) {
  if (confirmed) {
    return <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--action)]"><LockKeyIcon size={12} weight="fill" aria-hidden /> Nhân viên đã khóa</p>
  }
  if (!evidence) return <p className="mt-1.5 text-[11px] text-[var(--subtle)]">Chưa có dữ liệu</p>
  return (
    <div className="mt-1.5">
      <FieldEvidence quote={evidence.quote} confidence={evidence.confidence} compact />
      <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--muted)]"><CheckCircleIcon size={11} className="text-[var(--success)]" weight="fill" aria-hidden /> {evidence.source === 'catalog' ? 'Từ lịch chuyến' : 'Từ lời người gọi'}</p>
    </div>
  )
}

function latestEvidence(booking: BookingDraft, field: BookingFieldKey): BookingFieldEvidence | undefined {
  return booking.fieldEvidence[field]?.at(-1)
}

function formatVnd(value: number | null): string {
  return value === null ? 'Chưa tính' : `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}
