import type { OperatorActor } from '@ordervoice/contracts'
import {
  BusIcon,
  ChartBarIcon,
  HeadsetIcon,
  HouseIcon,
  MapTrifoldIcon,
  SeatIcon,
} from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'

type ShellMode = 'memory' | 'neon'

type NavigationItem = {
  href: string
  label: string
  icon: ComponentType<{ 'aria-hidden'?: boolean; size?: number; weight?: 'fill' | 'regular' }>
}

const staffNavigation: NavigationItem[] = [
  { href: '/operations', label: 'Tổng quan', icon: HouseIcon },
  { href: '/operations#calls', label: 'Cuộc gọi', icon: HeadsetIcon },
  { href: '/reports', label: 'Báo cáo', icon: ChartBarIcon },
]

const adminNavigation: NavigationItem[] = [
  { href: '/admin/catalog', label: 'Tuyến & chuyến', icon: MapTrifoldIcon },
  { href: '/admin/vehicles', label: 'Xe & sơ đồ ghế', icon: SeatIcon },
]

function NavigationLink({ href, label, icon: Icon }: NavigationItem) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--action-soft)] hover:text-[var(--action)] focus-visible:outline-2 focus-visible:outline-[var(--action-focus)]"
    >
      <Icon size={18} aria-hidden />
      {label}
    </Link>
  )
}

export function OperationsShell({
  actor,
  mode,
  children,
}: {
  actor: OperatorActor
  mode: ShellMode
  children: ReactNode
}) {
  const canManageCatalog = actor.role === 'admin' || actor.role === 'dispatcher'

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] lg:grid lg:grid-cols-[228px_1fr]">
      <aside className="border-b border-[var(--divider)] bg-[var(--glass-surface)] px-4 py-3 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0 lg:p-4">
        <Link
          href="/operations"
          className="inline-flex min-h-11 items-center gap-3 rounded-2xl px-3 font-semibold tracking-[-0.02em]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[var(--ink)] text-[var(--on-ink)]">
            <BusIcon size={18} weight="fill" aria-hidden />
          </span>
          VéĐi
        </Link>

        <nav aria-label="Vận hành" className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:mt-8 lg:block lg:space-y-1">
          {staffNavigation.map((item) => <NavigationLink key={item.href} {...item} />)}
          {canManageCatalog ? adminNavigation.map((item) => <NavigationLink key={item.href} {...item} />) : null}
        </nav>

        <div className="mt-3 border-t border-[var(--divider)] pt-3 text-xs text-[var(--muted)] lg:absolute lg:inset-x-4 lg:bottom-4 lg:mt-8">
          <p className="px-3 font-medium text-[var(--ink)]">{actor.id}</p>
          <p className="mt-1 px-3">
            {mode === 'memory' ? 'Mô phỏng · không bền vững' : `Vai trò · ${actor.role}`}
          </p>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  )
}

export function OperationsAccessUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] p-6 text-[var(--ink)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-8 shadow-[var(--metric-shadow)]">
        <p className="text-sm font-medium text-[var(--danger)]">Dịch vụ vận hành chưa sẵn sàng</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Chưa cấu hình xác thực nhân viên</h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">
          Khu vực này đóng mặc định. Cấu hình bộ xác thực nhà xe hoặc bật chế độ demo có chủ đích để tiếp tục.
        </p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--ink)] px-5 text-sm font-medium text-[var(--on-ink)]">
          Về trang chính
        </Link>
      </section>
    </main>
  )
}
