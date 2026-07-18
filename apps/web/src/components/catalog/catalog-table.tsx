import type { CatalogVersion, RouteStop } from '@ordervoice/contracts'
import { deriveTemplateCapacity } from '@ordervoice/core'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { CatalogTab } from './types'

type Catalog = CatalogVersion
type Props = {
  catalog: Catalog
  tab: CatalogTab
  readOnly: boolean
  onChange: (catalog: Catalog) => void
}

export function CatalogTable({ catalog, tab, readOnly, onChange }: Props) {
  /** Replaces one row of a collection, keeping the rest of the catalog intact. */
  function replace<K extends 'branches' | 'routes' | 'seatClasses' | 'vehicles' | 'fares' | 'schedules' | 'trips'>(
    collection: K,
    index: number,
    next: Catalog[K][number],
  ): void {
    onChange({
      ...catalog,
      [collection]: catalog[collection].map((item, itemIndex) => (itemIndex === index ? next : item)),
    })
  }

  if (tab === 'locations') {
    return (
      <EditableRows empty="Chưa có chi nhánh.">
        {catalog.branches.map((branch, index) => (
          <Row key={branch.id} title={branch.id}>
            <Editor
              label="Tên chi nhánh"
              value={branch.name}
              readOnly={readOnly}
              onChange={(name) => replace('branches', index, { ...branch, name })}
            />
            <p className="text-xs text-[var(--muted)]">
              {catalog.stops.filter((stop) => stop.branchId === branch.id).length} điểm đón/trả
            </p>
          </Row>
        ))}
      </EditableRows>
    )
  }

  if (tab === 'routes') {
    return (
      <EditableRows empty="Chưa có tuyến.">
        {catalog.routes.map((route, index) => (
          <Row key={route.id} title={route.id}>
            <div className="grid gap-3 md:grid-cols-2">
              <Editor label="Điểm đi" value={route.origin} readOnly={readOnly} onChange={(origin) => replace('routes', index, { ...route, origin })} />
              <Editor label="Điểm đến" value={route.destination} readOnly={readOnly} onChange={(destination) => replace('routes', index, { ...route, destination })} />
            </div>
            <Editor
              label="Điểm đón/trả — mã:vai trò:phút (ngăn bằng |)"
              value={formatRouteStops(route.stops)}
              readOnly={readOnly}
              onChange={(value) => replace('routes', index, { ...route, stops: parseRouteStops(value) })}
            />
            <p className="text-xs text-[var(--muted)]">
              {countRole(route.stops, 'pickup')} điểm đón · {countRole(route.stops, 'dropoff')} điểm trả
            </p>
          </Row>
        ))}
      </EditableRows>
    )
  }

  if (tab === 'seatClasses') {
    return (
      <EditableRows empty="Chưa có loại ghế.">
        {catalog.seatClasses.map((seatClass, index) => (
          <Row key={seatClass.id} title={seatClass.id}>
            <div className="grid gap-3 md:grid-cols-2">
              <Editor label="Tên loại ghế" value={seatClass.name} readOnly={readOnly} onChange={(name) => replace('seatClasses', index, { ...seatClass, name })} />
              <Editor
                label="Hệ số giá (10000 = 1.0×)"
                value={String(seatClass.priceMultiplierBps)}
                type="number"
                readOnly={readOnly}
                onChange={(value) => replace('seatClasses', index, { ...seatClass, priceMultiplierBps: Number(value) })}
              />
            </div>
            <p className="text-xs text-[var(--muted)]">
              {countSeatsInClass(catalog, seatClass.id)} ghế · ×{(seatClass.priceMultiplierBps / 10_000).toFixed(2)}
            </p>
          </Row>
        ))}
      </EditableRows>
    )
  }

  if (tab === 'schedules') {
    return (
      <EditableRows empty="Chưa có lịch chạy.">
        {catalog.schedules.map((schedule, index) => (
          <Row key={schedule.id} title={schedule.id}>
            <div className="grid gap-3 md:grid-cols-2">
              <Editor label="Mã tuyến" value={schedule.routeId} readOnly={readOnly} onChange={(routeId) => replace('schedules', index, { ...schedule, routeId })} />
              <Editor label="Mã xe" value={schedule.vehicleId} readOnly={readOnly} onChange={(vehicleId) => replace('schedules', index, { ...schedule, vehicleId })} />
              <Editor
                label="Thứ trong tuần (0=CN, ngăn bằng ,)"
                value={schedule.weekdays.join(',')}
                readOnly={readOnly}
                onChange={(value) => replace('schedules', index, { ...schedule, weekdays: parseWeekdays(value) })}
              />
              <Editor label="Giờ khởi hành (HH:mm)" value={schedule.departureTime} readOnly={readOnly} onChange={(departureTime) => replace('schedules', index, { ...schedule, departureTime })} />
              <Editor
                label="Thời lượng (phút)"
                value={String(schedule.durationMinutes)}
                type="number"
                readOnly={readOnly}
                onChange={(value) => replace('schedules', index, { ...schedule, durationMinutes: Number(value) })}
              />
              <Editor label="Hiệu lực từ (ISO)" value={schedule.activeFrom} readOnly={readOnly} onChange={(activeFrom) => replace('schedules', index, { ...schedule, activeFrom })} />
            </div>
            <p className="text-xs text-[var(--muted)]">{describeWeekdays(schedule.weekdays)} · {schedule.departureTime}</p>
          </Row>
        ))}
      </EditableRows>
    )
  }

  if (tab === 'trips') {
    return (
      <EditableRows empty="Chưa có chuyến.">
        {catalog.trips.map((trip, index) => {
          const derived = deriveTripCapacity(catalog, trip)
          return (
            <Row key={trip.id} title={trip.id}>
              <div className="grid gap-3 md:grid-cols-2">
                <Editor label="Mã tuyến" value={trip.routeId} readOnly={readOnly} onChange={(routeId) => replace('trips', index, { ...trip, routeId })} />
                <Editor label="Mã xe" value={trip.vehicleId} readOnly={readOnly} onChange={(vehicleId) => replace('trips', index, { ...trip, vehicleId })} />
                <Editor label="Khởi hành ISO" value={trip.departureAt} readOnly={readOnly} onChange={(departureAt) => replace('trips', index, { ...trip, departureAt })} />
                <Editor label="Đến nơi ISO" value={trip.arrivalAt} readOnly={readOnly} onChange={(arrivalAt) => replace('trips', index, { ...trip, arrivalAt })} />
                <Editor
                  label="Sức chứa khai báo"
                  value={trip.declaredCapacity === null ? '' : String(trip.declaredCapacity)}
                  type="number"
                  readOnly={readOnly}
                  onChange={(value) => replace('trips', index, { ...trip, declaredCapacity: value === '' ? null : Number(value) })}
                />
              </div>
              <p className="text-xs text-[var(--muted)]">
                {formatDate(trip.departureAt)} · sức chứa theo sơ đồ ghế: {derived ?? '—'}
                {trip.scheduleId ? ` · sinh từ lịch ${trip.scheduleId}` : ''}
              </p>
            </Row>
          )
        })}
      </EditableRows>
    )
  }

  if (tab === 'vehicles') {
    return (
      <div>
        <EditableRows empty="Chưa có xe.">
          {catalog.vehicles.map((vehicle, index) => (
            <Row key={vehicle.id} title={vehicle.id}>
              <div className="grid gap-3 md:grid-cols-2">
                <Editor label="Tên hiển thị" value={vehicle.label} readOnly={readOnly} onChange={(label) => replace('vehicles', index, { ...vehicle, label })} />
                <Editor label="Mã mẫu ghế" value={vehicle.templateId} readOnly={readOnly} onChange={(templateId) => replace('vehicles', index, { ...vehicle, templateId })} />
              </div>
              <p className="text-xs text-[var(--muted)]">Sức chứa: {templateCapacity(catalog, vehicle.templateId) ?? '—'}</p>
            </Row>
          ))}
        </EditableRows>
        <Link href="/admin/vehicles" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[var(--hairline)] px-4 text-sm font-medium">
          Mở trình thiết kế sơ đồ ghế
        </Link>
      </div>
    )
  }

  return (
    <EditableRows empty="Chưa có bảng giá.">
      {catalog.fares.map((fare, index) => (
        <Row key={fare.id} title={fare.id}>
          <div className="grid gap-3 md:grid-cols-2">
            <Editor label="Mã tuyến" value={fare.routeId} readOnly={readOnly} onChange={(routeId) => replace('fares', index, { ...fare, routeId })} />
            <Editor
              label="Giá vé (VND)"
              value={String(fare.priceVnd)}
              type="number"
              readOnly={readOnly}
              onChange={(value) => replace('fares', index, { ...fare, priceVnd: Number(value) })}
            />
            <Editor
              label="Loại ghế (trống = mọi loại)"
              value={fare.seatClassId ?? ''}
              readOnly={readOnly}
              onChange={(value) => replace('fares', index, { ...fare, seatClassId: value || null })}
            />
            <Editor
              label="Hiệu lực từ (ISO, trống = không giới hạn)"
              value={fare.effectiveFrom ?? ''}
              readOnly={readOnly}
              onChange={(value) => replace('fares', index, { ...fare, effectiveFrom: value || null })}
            />
            <Editor
              label="Hiệu lực đến (ISO, trống = không giới hạn)"
              value={fare.effectiveTo ?? ''}
              readOnly={readOnly}
              onChange={(value) => replace('fares', index, { ...fare, effectiveTo: value || null })}
            />
          </div>
        </Row>
      ))}
    </EditableRows>
  )
}

function EditableRows({ children, empty }: { children: ReactNode; empty: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <div className="divide-y divide-[var(--divider)]">
      {children}
      {!hasChildren ? <p className="py-10 text-center text-sm text-[var(--muted)]">{empty}</p> : null}
    </div>
  )
}

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="grid gap-3 py-4 lg:grid-cols-[140px_1fr] lg:items-start">
      <p className="pt-2 text-sm font-semibold">{title}</p>
      <div className="space-y-3">{children}</div>
    </article>
  )
}

function Editor({
  label,
  value,
  readOnly,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  readOnly: boolean
  onChange: (value: string) => void
  type?: 'text' | 'number'
}) {
  return (
    <label className="block text-xs font-medium text-[var(--muted)]">
      {label}
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] read-only:bg-[var(--pearl)]"
      />
    </label>
  )
}

/** `stopId:role:offsetMinutes`, pipe-separated, same grammar as the CSV `stops` column. */
function formatRouteStops(stops: RouteStop[]): string {
  return stops.map((stop) => `${stop.stopId}:${stop.role}:${stop.offsetMinutes}`).join(' | ')
}

function parseRouteStops(value: string): RouteStop[] {
  return value
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const [stopId, role, offset] = entry.split(':').map((part) => part.trim())
      return {
        stopId: stopId ?? '',
        role: (role === 'pickup' || role === 'dropoff' || role === 'both' ? role : 'both'),
        sequence: index,
        offsetMinutes: Number(offset ?? 0) || 0,
      }
    })
}

function countRole(stops: RouteStop[], role: 'pickup' | 'dropoff'): number {
  return stops.filter((stop) => stop.role === role || stop.role === 'both').length
}

function parseWeekdays(value: string): number[] {
  return value.split(',').map((part) => part.trim()).filter(Boolean).map(Number)
}

const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function describeWeekdays(weekdays: number[]): string {
  const labels = weekdays.map((day) => weekdayLabels[day] ?? String(day))
  return labels.length > 0 ? labels.join(', ') : 'Chưa chọn ngày'
}

function countSeatsInClass(catalog: Catalog, seatClassId: string): number {
  return catalog.vehicleTemplates
    .flatMap((template) => template.seats)
    .filter((seat) => seat.seatClassId === seatClassId)
    .length
}

function templateCapacity(catalog: Catalog, templateId: string): number | null {
  const template = catalog.vehicleTemplates.find((item) => item.id === templateId)
  return template ? deriveTemplateCapacity(template) : null
}

function deriveTripCapacity(catalog: Catalog, trip: Catalog['trips'][number]): number | null {
  const vehicle = catalog.vehicles.find((item) => item.id === trip.vehicleId)
  return vehicle ? templateCapacity(catalog, vehicle.templateId) : null
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}
