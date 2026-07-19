import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'

import { Sparkline } from '@/components/dashboard/charts/sparkline'
import type { ChartTone } from '@/components/dashboard/charts/chart-tone'
import { cn } from '@/lib/cn'
import { deltaPercent, formatPercent } from '@/lib/dashboard-format'
import type { MetricDelta } from '@/lib/db/dashboard-store'

type KpiCardProps = {
  label: string
  /** Chuỗi đã format sẵn — thẻ không tự quyết định cách hiển thị số. */
  value: string
  /** Bản đọc đầy đủ cho screen reader khi value bị rút gọn ("1,25 tr"). */
  valueLabel?: string
  icon: LucideIcon
  delta: MetricDelta
  deltaSuffix: string
  spark: number[]
  sparkTone: ChartTone
  sparkLabel: string
  sparkAriaLabel: string
}

export function KpiCard({
  label,
  value,
  valueLabel,
  icon: Icon,
  delta,
  deltaSuffix,
  spark,
  sparkTone,
  sparkLabel,
  sparkAriaLabel,
}: KpiCardProps) {
  return (
    <article className="flex min-h-32 flex-col rounded-xl border border-white/80 bg-[var(--surface)] p-4 shadow-[var(--elevation-card)] ring-1 ring-black/[0.05] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--elevation-panel)] motion-reduce:transform-none sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-ui font-medium text-[var(--muted)]">{label}</p>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--action-soft)] text-[var(--action)] ring-1 ring-[color-mix(in_srgb,var(--action)_10%,transparent)]">
          <Icon size={18} aria-hidden />
        </span>
      </div>

      {/* aria-label bị bỏ qua trên <p> (role=paragraph), nên bản đọc đầy đủ phải
          là chữ thật trong DOM: số rút gọn cho mắt, số đầy đủ cho screen reader. */}
      <p className="mt-2 text-3xl font-semibold leading-none tabular-nums tracking-tight text-[var(--ink)]">
        {valueLabel ? (
          <>
            <span aria-hidden>{value}</span>
            <span className="sr-only">{valueLabel}</span>
          </>
        ) : (
          value
        )}
      </p>

      <div className="mt-1.5">
        <DeltaLine delta={delta} suffix={deltaSuffix} />
      </div>

      <div className="mt-auto flex items-end gap-3 pt-4">
        <div className="h-9 min-w-0 flex-1 [&_svg]:h-full [&_svg]:w-full">
          {spark.length > 1 ? (
            <Sparkline points={spark} tone={sparkTone} ariaLabel={sparkAriaLabel} />
          ) : (
            <span className="block h-px w-full bg-[var(--divider)]" aria-hidden />
          )}
        </div>
        <span className="shrink-0 text-metric text-[var(--muted)]">{sparkLabel}</span>
      </div>
    </article>
  )
}

function DeltaLine({ delta, suffix }: { delta: MetricDelta; suffix: string }) {
  const ratio = deltaPercent(delta)

  if (ratio === null) {
    return <p className="text-metric text-[var(--muted)]">Chưa có mốc so sánh</p>
  }

  const rising = ratio > 0
  const falling = ratio < 0
  const Icon = rising ? ArrowUpRight : falling ? ArrowDownRight : Minus

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-metric">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-medium tabular-nums',
          rising && 'text-[var(--success)]',
          falling && 'text-[var(--danger)]',
          !rising && !falling && 'text-[var(--muted)]',
        )}
      >
        {/* Mũi tên mang nghĩa hình dạng, chữ ẩn mang nghĩa cho screen reader —
            người mù màu không phải đoán qua xanh/đỏ. */}
        <Icon size={13} aria-hidden />
        <span className="sr-only">{rising ? 'tăng ' : falling ? 'giảm ' : 'không đổi '}</span>
        {formatPercent(Math.abs(ratio))}
      </span>
      <span className="text-[var(--muted)]">{suffix}</span>
    </p>
  )
}
