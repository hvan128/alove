import Link from 'next/link'
import { PhoneCall } from 'lucide-react'
import { cn } from '@/lib/cn'

const PILL_CLASSES =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--action)] px-6 text-base font-semibold text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]'

type CallOverlayProps = {
  /** Vị trí CTA để theo dõi nguồn điều hướng, không còn mở modal tại landing. */
  layoutKey: string
  label?: string
  className?: string
}

/**
 * CTA gọi trên landing luôn đưa người dùng vào màn Web Call đầy đủ. Việc xin
 * microphone và bắt đầu phiên gọi chỉ diễn ra trong /console.
 */
export function CallOverlay({ layoutKey, label = 'Gọi để đặt xe', className }: CallOverlayProps) {
  return (
    <Link
      href="/console"
      data-cta-location={layoutKey}
      className={cn(PILL_CLASSES, className)}
    >
      <PhoneCall size={19} aria-hidden />
      {label}
    </Link>
  )
}
