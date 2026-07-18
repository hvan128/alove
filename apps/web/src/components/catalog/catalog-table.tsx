import type { CatalogVersion } from '@ordervoice/contracts'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { CatalogTab } from './types'

export function CatalogTable({
  catalog,
  tab,
  readOnly,
  onChange,
}: {
  catalog: CatalogVersion
  tab: CatalogTab
  readOnly: boolean
  onChange: (catalog: CatalogVersion) => void
}) {
  if (tab === 'locations') {
    return <EditableRows empty="Chưa có chi nhánh.">{catalog.branches.map((branch, index) => <Row key={branch.id} title={branch.id}><Editor label="Tên chi nhánh" value={branch.name} readOnly={readOnly} onChange={(name) => onChange({ ...catalog, branches: catalog.branches.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item) })} /><p className="text-xs text-[var(--muted)]">{catalog.stops.filter((stop) => stop.branchId === branch.id).length} điểm đón/trả</p></Row>)}</EditableRows>
  }
  if (tab === 'routes') {
    return <EditableRows empty="Chưa có tuyến.">{catalog.routes.map((route, index) => <Row key={route.id} title={route.id}><div className="grid gap-3 md:grid-cols-2"><Editor label="Điểm đi" value={route.origin} readOnly={readOnly} onChange={(origin) => updateRoute(index, { ...route, origin })} /><Editor label="Điểm đến" value={route.destination} readOnly={readOnly} onChange={(destination) => updateRoute(index, { ...route, destination })} /></div><Editor label="Điểm dừng theo thứ tự" value={route.stopIds.join(' | ')} readOnly={readOnly} onChange={(value) => updateRoute(index, { ...route, stopIds: value.split('|').map((item) => item.trim()).filter(Boolean) })} /></Row>)}</EditableRows>
  }
  if (tab === 'trips') {
    return <EditableRows empty="Chưa có chuyến.">{catalog.trips.map((trip, index) => <Row key={trip.id} title={trip.id}><div className="grid gap-3 md:grid-cols-2"><Editor label="Mã tuyến" value={trip.routeId} readOnly={readOnly} onChange={(routeId) => updateTrip(index, { ...trip, routeId })} /><Editor label="Mã xe" value={trip.vehicleId} readOnly={readOnly} onChange={(vehicleId) => updateTrip(index, { ...trip, vehicleId })} /><Editor label="Khởi hành ISO" value={trip.departureAt} readOnly={readOnly} onChange={(departureAt) => updateTrip(index, { ...trip, departureAt })} /><Editor label="Đến nơi ISO" value={trip.arrivalAt} readOnly={readOnly} onChange={(arrivalAt) => updateTrip(index, { ...trip, arrivalAt })} /></div><p className="text-xs text-[var(--muted)]">{formatDate(trip.departureAt)}</p></Row>)}</EditableRows>
  }
  if (tab === 'vehicles') {
    return (
      <div>
        <EditableRows empty="Chưa có xe.">{catalog.vehicles.map((vehicle, index) => <Row key={vehicle.id} title={vehicle.id}><div className="grid gap-3 md:grid-cols-2"><Editor label="Tên hiển thị" value={vehicle.label} readOnly={readOnly} onChange={(label) => onChange({ ...catalog, vehicles: catalog.vehicles.map((item, itemIndex) => itemIndex === index ? { ...item, label } : item) })} /><Editor label="Mã mẫu ghế" value={vehicle.templateId} readOnly={readOnly} onChange={(templateId) => onChange({ ...catalog, vehicles: catalog.vehicles.map((item, itemIndex) => itemIndex === index ? { ...item, templateId } : item) })} /></div></Row>)}</EditableRows>
        <Link href="/admin/vehicles" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[var(--hairline)] px-4 text-sm font-medium">Mở trình thiết kế sơ đồ ghế</Link>
      </div>
    )
  }
  return <EditableRows empty="Chưa có bảng giá.">{catalog.fares.map((fare, index) => <Row key={fare.id} title={fare.id}><div className="grid gap-3 md:grid-cols-2"><Editor label="Mã tuyến" value={fare.routeId} readOnly={readOnly} onChange={(routeId) => onChange({ ...catalog, fares: catalog.fares.map((item, itemIndex) => itemIndex === index ? { ...item, routeId } : item) })} /><Editor label="Giá vé (VND)" value={String(fare.priceVnd)} type="number" readOnly={readOnly} onChange={(value) => onChange({ ...catalog, fares: catalog.fares.map((item, itemIndex) => itemIndex === index ? { ...item, priceVnd: Number(value) } : item) })} /></div></Row>)}</EditableRows>

  function updateRoute(index: number, route: CatalogVersion['routes'][number]) {
    onChange({ ...catalog, routes: catalog.routes.map((item, itemIndex) => itemIndex === index ? route : item) })
  }

  function updateTrip(index: number, trip: CatalogVersion['trips'][number]) {
    onChange({ ...catalog, trips: catalog.trips.map((item, itemIndex) => itemIndex === index ? trip : item) })
  }
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
  return <article className="grid gap-3 py-4 lg:grid-cols-[140px_1fr] lg:items-start"><p className="pt-2 text-sm font-semibold">{title}</p><div className="space-y-3">{children}</div></article>
}

function Editor({ label, value, readOnly, onChange, type = 'text' }: { label: string; value: string; readOnly: boolean; onChange: (value: string) => void; type?: 'text' | 'number' }) {
  return <label className="block text-xs font-medium text-[var(--muted)]">{label}<input type={type} value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] read-only:bg-[var(--pearl)]" /></label>
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
}
