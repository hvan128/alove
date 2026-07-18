'use client'

import type { CatalogVersion } from '@ordervoice/contracts'
import { ArmchairIcon, SteeringWheelIcon, XIcon } from '@phosphor-icons/react'

type TemplateSeat = CatalogVersion['vehicleTemplates'][number]['seats'][number]

export function SeatCell({
  floor,
  row,
  column,
  seat,
  selected,
  onSelect,
}: {
  floor: number
  row: number
  column: number
  seat: TemplateSeat | undefined
  selected: boolean
  onSelect: () => void
}) {
  const status = seat ? seatLabel(seat) : 'trống'
  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={selected}
      aria-label={`Tầng ${floor} hàng ${row + 1} cột ${column + 1}: ${status}`}
      onClick={onSelect}
      className={`grid min-h-11 min-w-11 place-items-center rounded-xl border text-[11px] font-semibold transition-colors ${selected ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]' : seatClass(seat)}`}
    >
      {seat ? <CellContent seat={seat} /> : <span aria-hidden>+</span>}
    </button>
  )
}

function CellContent({ seat }: { seat: TemplateSeat }) {
  if (seat.kind === 'aisle') return <span aria-hidden>⋯</span>
  if (seat.kind === 'driver') return <SteeringWheelIcon size={17} aria-hidden />
  if (seat.kind === 'blocked') return <XIcon size={16} aria-hidden />
  return <span className="flex flex-col items-center gap-0.5"><ArmchairIcon size={15} aria-hidden /><span>{seat.code}</span></span>
}

function seatLabel(seat: TemplateSeat): string {
  const kind = seat.kind === 'seat' ? 'ghế' : seat.kind === 'double-bed' ? 'giường đôi' : seat.kind === 'aisle' ? 'lối đi' : seat.kind === 'driver' ? 'tài xế' : 'khóa'
  return `${seat.code} · ${kind}`
}

function seatClass(seat?: TemplateSeat): string {
  if (!seat) return 'border-dashed border-[var(--hairline)] bg-[var(--pearl)] text-[var(--subtle)] hover:border-[var(--action)]'
  if (seat.kind === 'blocked') return 'border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]'
  if (seat.kind === 'aisle') return 'border-dashed border-[var(--divider)] bg-transparent text-[var(--subtle)]'
  if (seat.kind === 'driver') return 'border-[var(--hairline)] bg-[var(--warning-soft)] text-[var(--warning)]'
  return 'border-[var(--action)]/20 bg-[var(--action-soft)] text-[var(--action)]'
}
