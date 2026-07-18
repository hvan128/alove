'use client'

import type { CatalogDraft, CatalogVersion } from '@ordervoice/contracts'
import { FloppyDiskIcon, SeatIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { SeatCell } from './seat-cell'

type Template = CatalogVersion['vehicleTemplates'][number]
type TemplateSeat = Template['seats'][number]
type SeatKind = TemplateSeat['kind']

const kinds: Array<{ value: SeatKind; label: string }> = [
  { value: 'seat', label: 'Ghế' },
  { value: 'double-bed', label: 'Giường đôi' },
  { value: 'aisle', label: 'Lối đi' },
  { value: 'driver', label: 'Tài xế' },
  { value: 'blocked', label: 'Khóa' },
]

export function VehicleTemplateEditor({
  template,
  catalog,
  onSave,
}: {
  template: Template
  catalog?: CatalogVersion
  onSave?: (template: Template) => void | Promise<void>
}) {
  const [seats, setSeats] = useState(() => structuredClone(template.seats))
  const [catalogState, setCatalogState] = useState(catalog)
  const [floor, setFloor] = useState(1)
  const [selected, setSelected] = useState<{ row: number; column: number } | null>(null)
  const [code, setCode] = useState('')
  const [kind, setKind] = useState<SeatKind>('seat')
  const [seatClassId, setSeatClassId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const rowCount = Math.max(8, ...seats.map((seat) => seat.row + 1))
  const columnCount = Math.max(4, ...seats.map((seat) => seat.column + 1))
  const capacity = seats.filter((seat) => seat.kind === 'seat' || seat.kind === 'double-bed').length
  const seatClasses = catalogState?.seatClasses ?? []
  const cells = useMemo(() => Array.from({ length: rowCount * columnCount }, (_, index) => ({
    row: Math.floor(index / columnCount),
    column: index % columnCount,
  })), [columnCount, rowCount])

  function selectCell(row: number, column: number) {
    const existing = seats.find((seat) => seat.floor === floor && seat.row === row && seat.column === column)
    setSelected({ row, column })
    setCode(existing?.code ?? '')
    setKind(existing?.kind ?? 'seat')
    setSeatClassId(existing?.seatClassId ?? seatClasses[0]?.id ?? '')
    setError(null)
  }

  function placeSeat() {
    if (!selected) return
    const normalized = code.trim().toUpperCase()
    if (!normalized) {
      setError('Mỗi ô phải có mã trước khi đặt.')
      return
    }
    const duplicate = seats.find((seat) => seat.code === normalized && !(seat.floor === floor && seat.row === selected.row && seat.column === selected.column))
    if (duplicate) {
      setError(`Mã ghế ${normalized} bị trùng`)
      return
    }
    const sellable = kind === 'seat' || kind === 'double-bed'
    if (sellable && seatClasses.length > 0 && !seatClassId) {
      setError('Ghế bán được phải chọn loại ghế.')
      return
    }
    const next: TemplateSeat = {
      code: normalized,
      floor,
      row: selected.row,
      column: selected.column,
      kind,
      // Only sellable cells carry a commercial class; aisle/driver/blocked stay null.
      seatClassId: sellable ? (seatClassId || null) : null,
    }
    setSeats((current) => [...current.filter((seat) => !(seat.floor === floor && seat.row === selected.row && seat.column === selected.column)), next])
    setSelected(null)
    setCode('')
    setError(null)
    setMessage(null)
  }

  function removeCell() {
    if (!selected) return
    setSeats((current) => current.filter((seat) => !(seat.floor === floor && seat.row === selected.row && seat.column === selected.column)))
    setSelected(null)
    setCode('')
    setError(null)
  }

  async function saveTemplate() {
    const validationError = validateSeats(seats, template.floors)
    if (validationError) {
      setError(validationError)
      return
    }
    const next = { ...template, seats: structuredClone(seats) }
    setBusy(true)
    setMessage(null)
    try {
      if (onSave) {
        await onSave(next)
      } else if (catalogState) {
        const updatedCatalog = {
          ...catalogState,
          vehicleTemplates: catalogState.vehicleTemplates.map((item) => item.id === next.id ? next : item),
        }
        const response = await fetch(`/api/catalog/versions/${catalogState.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedRevision: catalogState.revision, catalog: toDraft(updatedCatalog) }),
        })
        const body = await response.json() as { version?: CatalogVersion; error?: string }
        if (!response.ok || !body.version) throw new Error(response.status === 409 ? 'Catalog đã đổi; tải lại diff.' : body.error ?? 'Không thể lưu mẫu xe.')
        setCatalogState(body.version)
      }
      setMessage('Đã lưu mẫu xe.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu mẫu xe.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-[var(--action)]">Thiết kế phương tiện</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">{template.name}</h1>
          <p className="mt-3 text-[var(--muted)]">{template.floors} tầng · <strong className="font-semibold text-[var(--ink)]">{capacity} chỗ phục vụ</strong></p>
        </div>
        <button type="button" onClick={() => void saveTemplate()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--ink)] px-5 text-sm font-medium text-[var(--on-ink)] disabled:opacity-40"><FloppyDiskIcon size={17} aria-hidden />{busy ? 'Đang lưu…' : 'Lưu mẫu xe'}</button>
      </header>

      {error ? <p role="alert" className="mt-5 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p role="status" className="mt-5 rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">{message}</p> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)] sm:p-6">
          <div className="flex gap-2" role="tablist" aria-label="Tầng xe">
            {Array.from({ length: template.floors }, (_, index) => index + 1).map((number) => <button key={number} type="button" role="tab" aria-selected={floor === number} onClick={() => { setFloor(number); setSelected(null) }} className={`min-h-11 rounded-full px-4 text-sm font-medium ${floor === number ? 'bg-[var(--ink)] text-[var(--on-ink)]' : 'bg-[var(--pearl)] text-[var(--muted)]'}`}>Tầng {number}</button>)}
          </div>
          <div className="mt-6 overflow-x-auto pb-2">
            <div role="grid" aria-label={`Sơ đồ ghế tầng ${floor}`} className="mx-auto grid w-fit gap-2 rounded-[32px] border-2 border-[var(--hairline)] bg-[var(--pearl)] p-4" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(44px, 52px))` }}>
              {cells.map((cell) => <SeatCell key={`${cell.row}-${cell.column}`} floor={floor} row={cell.row} column={cell.column} seat={seats.find((seat) => seat.floor === floor && seat.row === cell.row && seat.column === cell.column)} selected={selected?.row === cell.row && selected.column === cell.column} onSelect={() => selectCell(cell.row, cell.column)} />)}
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)]">
          <div className="flex items-center gap-2"><SeatIcon size={19} aria-hidden /><h2 className="font-semibold">Thuộc tính ô</h2></div>
          {selected ? (
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-medium text-[var(--muted)]">Mã ghế<input aria-label="Mã ghế" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="mt-1 min-h-11 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-[var(--ink)]" /></label>
              <label className="block text-xs font-medium text-[var(--muted)]">Loại ô<select value={kind} onChange={(event) => setKind(event.target.value as SeatKind)} className="mt-1 min-h-11 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-[var(--ink)]">{kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              {(kind === 'seat' || kind === 'double-bed') && seatClasses.length > 0 ? (
                <label className="block text-xs font-medium text-[var(--muted)]">Loại ghế
                  <select
                    aria-label="Loại ghế"
                    value={seatClassId}
                    onChange={(event) => setSeatClassId(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-[var(--ink)]"
                  >
                    <option value="">— Chọn loại ghế —</option>
                    {seatClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (×{(item.priceMultiplierBps / 10_000).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button type="button" onClick={placeSeat} className="min-h-11 w-full rounded-full bg-[var(--action)] px-4 text-sm font-medium text-[var(--on-action)]">Đặt ghế</button>
              <button type="button" onClick={removeCell} className="min-h-11 w-full rounded-full px-4 text-sm font-medium text-[var(--danger)]">Xóa ô</button>
            </div>
          ) : <p className="mt-5 text-sm leading-6 text-[var(--muted)]">Chọn một ô trong sơ đồ bằng chuột hoặc bàn phím để đặt loại và mã.</p>}
          <div className="mt-6 border-t border-[var(--divider)] pt-5">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted)]">Bảng chú giải</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">{kinds.map((item) => <li key={item.value}>{item.label}</li>)}</ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function validateSeats(seats: TemplateSeat[], floors: number): string | null {
  const codes = new Set<string>()
  const coordinates = new Set<string>()
  for (const seat of seats) {
    if (!seat.code.trim()) return 'Mỗi ô phải có mã trước khi lưu.'
    if (codes.has(seat.code)) return `Mã ghế ${seat.code} bị trùng`
    codes.add(seat.code)
    const coordinate = `${seat.floor}:${seat.row}:${seat.column}`
    if (coordinates.has(coordinate)) return 'Có nhiều ô trùng cùng vị trí.'
    coordinates.add(coordinate)
    if (seat.floor < 1 || seat.floor > floors) return `Ghế ${seat.code} nằm ngoài số tầng của mẫu xe.`
  }
  return null
}

function toDraft(version: CatalogVersion): CatalogDraft {
  const { publishedAt: _publishedAt, publishedBy: _publishedBy, ...body } = structuredClone(version)
  return { ...body, status: body.status === 'validated' ? 'validated' : 'draft' }
}
